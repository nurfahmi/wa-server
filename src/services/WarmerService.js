import cron from "node-cron";
import { Op } from "sequelize";
import {
  WarmerCampaign,
  WarmerConversationTemplate,
  WarmerConversationLog,
  Device,
} from "../models/index.js";
import whatsappService from "./WhatsAppService.js";
import { v4 as uuidv4 } from "uuid";

class WarmerService {
  constructor() {
    this.activeCampaigns = new Map();
    this.isInitialized = false;
    this.cronJobs = new Map();
  }

  async init() {
    try {
      console.log("[WARMER] Initializing Warmer Service...");

      // Load active campaigns
      await this.loadActiveCampaigns();

      // Setup cron job for warmer execution
      this.setupCronJobs();

      this.isInitialized = true;
      console.log("[WARMER] Warmer Service initialized successfully");
    } catch (error) {
      console.error("[WARMER] Failed to initialize Warmer Service:", error);
      throw error;
    }
  }

  async loadActiveCampaigns() {
    try {
      const campaigns = await WarmerCampaign.findAll({
        where: { status: "active" },
        include: [
          {
            model: WarmerConversationTemplate,
            as: "conversationTemplates",
            where: { isActive: true },
            required: false,
          },
        ],
      });

      this.activeCampaigns.clear();
      for (const campaign of campaigns) {
        this.activeCampaigns.set(campaign.id, campaign);
        console.log(
          `[WARMER] Loaded active campaign: ${campaign.name} (ID: ${campaign.id})`
        );
      }

      console.log(`[WARMER] Loaded ${campaigns.length} active campaigns`);
    } catch (error) {
      console.error("[WARMER] Error loading active campaigns:", error);
      throw error;
    }
  }

  setupCronJobs() {
    // Run warmer every 15 minutes
    const warmerJob = cron.schedule(
      "*/15 * * * *",
      async () => {
        try {
          await this.executeWarmerRound();
        } catch (error) {
          console.error("[WARMER] Error in cron execution:", error);
        }
      },
      {
        scheduled: false,
      }
    );

    this.cronJobs.set("main", warmerJob);
    warmerJob.start();
    console.log("[WARMER] Cron job scheduled to run every 15 minutes");
  }

  async executeWarmerRound() {
    if (!this.isInitialized) return;

    console.log("[WARMER] Starting warmer execution round...");

    for (const [campaignId, campaign] of this.activeCampaigns) {
      try {
        await this.executeCampaign(campaign);
      } catch (error) {
        console.error(
          `[WARMER] Error executing campaign ${campaignId}:`,
          error
        );
      }
    }
  }

  async executeCampaign(campaign) {
    // Check if it's time to send messages for this campaign
    const now = new Date();
    const timingSettings = campaign.timingSettings;

    if (!this.isWithinWorkingHours(now, timingSettings)) {
      return;
    }

    // Get connected devices for this campaign
    const connectedDevices = await this.getConnectedDevices(
      campaign.selectedDevices
    );

    if (connectedDevices.length < 2) {
      console.log(
        `[WARMER] Campaign ${campaign.name}: Not enough connected devices (${connectedDevices.length}/2 minimum)`
      );
      return;
    }

    // Calculate how many messages to send today
    const dailyTarget = this.calculateDailyTarget(campaign);
    const sentToday = await this.getTodayMessageCount(campaign.id);

    if (sentToday >= dailyTarget) {
      console.log(
        `[WARMER] Campaign ${campaign.name}: Daily target reached (${sentToday}/${dailyTarget})`
      );
      return;
    }

    // Check if enough time has passed since last message
    if (!this.shouldSendMessage(campaign, timingSettings)) {
      return;
    }

    // Select random conversation template
    const template = await this.selectRandomTemplate(campaign.id);
    if (!template) {
      console.log(`[WARMER] Campaign ${campaign.name}: No available templates`);
      return;
    }

    // Execute conversation
    await this.executeConversation(campaign, template, connectedDevices);
  }

  isWithinWorkingHours(now, timingSettings) {
    const workingHours = timingSettings.workingHours;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = workingHours.start.split(":").map(Number);
    const [endHour, endMinute] = workingHours.end.split(":").map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Check if current day is paused
    const currentDay = now.getDay();
    if (timingSettings.pauseDays.includes(currentDay)) {
      return false;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  async getConnectedDevices(deviceIds) {
    try {
      const devices = await Device.findAll({
        where: {
          id: deviceIds,
          status: "connected",
        },
      });

      return devices.filter((device) => {
        // Check if device has active WhatsApp session
        return whatsappService.getSession(device.sessionId) !== null;
      });
    } catch (error) {
      console.error("[WARMER] Error getting connected devices:", error);
      return [];
    }
  }

  calculateDailyTarget(campaign) {
    const startDate = new Date(campaign.startedAt);
    const now = new Date();
    const daysSinceStart =
      Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const settings = campaign.dailyMessageSettings;

    let targetRange;
    if (daysSinceStart <= 7) {
      targetRange = settings.day1_7;
    } else if (daysSinceStart <= 14) {
      targetRange = settings.day8_14;
    } else if (daysSinceStart <= 21) {
      targetRange = settings.day15_21;
    } else {
      targetRange = settings.day22_plus;
    }

    return (
      Math.floor(Math.random() * (targetRange.max - targetRange.min + 1)) +
      targetRange.min
    );
  }

  async getTodayMessageCount(campaignId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await WarmerConversationLog.count({
      where: {
        campaignId,
        sentAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
    });

    return count;
  }

  shouldSendMessage(campaign, timingSettings) {
    if (!campaign.lastActivityAt) return true;

    const now = new Date();
    const lastActivity = new Date(campaign.lastActivityAt);
    const minutesSinceLastActivity = (now - lastActivity) / (1000 * 60);

    const intervalSettings = timingSettings.intervalMinutes;
    const minInterval = intervalSettings.min;

    return minutesSinceLastActivity >= minInterval;
  }

  async selectRandomTemplate(campaignId) {
    try {
      const templates = await WarmerConversationTemplate.findAll({
        where: {
          campaignId,
          isActive: true,
        },
      });

      if (templates.length === 0) return null;

      // Weighted random selection based on template weight
      const totalWeight = templates.reduce(
        (sum, template) => sum + template.settings.weight,
        0
      );
      let random = Math.random() * totalWeight;

      for (const template of templates) {
        random -= template.settings.weight;
        if (random <= 0) {
          return template;
        }
      }

      return templates[0]; // fallback
    } catch (error) {
      console.error("[WARMER] Error selecting template:", error);
      return null;
    }
  }

  async executeConversation(campaign, template, connectedDevices) {
    try {
      const conversationId = uuidv4();
      const conversationFlow = template.conversationFlow;

      console.log(
        `[WARMER] Starting conversation for campaign ${campaign.name} using template ${template.name}`
      );

      // Select devices for this conversation
      const participatingDevices = this.selectParticipatingDevices(
        connectedDevices,
        template.settings
      );

      if (participatingDevices.length < template.settings.minDevicesRequired) {
        console.log(
          `[WARMER] Not enough devices for template ${template.name}`
        );
        return;
      }

      // Execute conversation flow
      let sequenceNumber = 1;
      for (const step of conversationFlow) {
        const senderDevice = this.selectSenderDevice(
          participatingDevices,
          step
        );
        const receiverDevice = this.selectReceiverDevice(
          participatingDevices,
          step,
          senderDevice
        );

        if (!senderDevice || !receiverDevice) {
          console.log("[WARMER] Could not select sender/receiver devices");
          continue;
        }

        // Process message content (replace variables)
        const messageContent = this.processMessageContent(
          step.message,
          template.variables
        );

        // Send message
        await this.sendMessage(
          campaign,
          template,
          conversationId,
          senderDevice,
          receiverDevice,
          messageContent,
          sequenceNumber
        );

        // Wait before next message
        const delay = this.calculateMessageDelay(template.settings);
        await this.sleep(delay * 1000);

        sequenceNumber++;
      }

      // Update template usage
      await this.updateTemplateUsage(template);

      // Update campaign statistics
      await this.updateCampaignStats(campaign, conversationFlow.length);

      console.log(
        `[WARMER] Completed conversation for campaign ${campaign.name}`
      );
    } catch (error) {
      console.error("[WARMER] Error executing conversation:", error);
    }
  }

  selectParticipatingDevices(connectedDevices, templateSettings) {
    const maxDevices = Math.min(
      connectedDevices.length,
      templateSettings.maxDevicesInConversation
    );

    // Shuffle and select random devices
    const shuffled = [...connectedDevices].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxDevices);
  }

  selectSenderDevice(devices, step) {
    if (step.senderType === "random") {
      return devices[Math.floor(Math.random() * devices.length)];
    }

    // Could implement more logic here for specific sender selection
    return devices[0];
  }

  selectReceiverDevice(devices, step, senderDevice) {
    const availableReceivers = devices.filter(
      (d) => d.sessionId !== senderDevice.sessionId
    );

    if (availableReceivers.length === 0) return null;

    if (step.receiverType === "random") {
      return availableReceivers[
        Math.floor(Math.random() * availableReceivers.length)
      ];
    }

    return availableReceivers[0];
  }

  processMessageContent(message, variables) {
    let processedMessage = message;

    // Replace variables
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{${key}}`, "g");
        processedMessage = processedMessage.replace(regex, value);
      }
    }

    // Replace common dynamic variables
    const now = new Date();
    processedMessage = processedMessage.replace(
      /{time}/g,
      now.toLocaleTimeString()
    );
    processedMessage = processedMessage.replace(
      /{date}/g,
      now.toLocaleDateString()
    );
    processedMessage = processedMessage.replace(
      /{day}/g,
      now.toLocaleDateString("id-ID", { weekday: "long" })
    );

    return processedMessage;
  }

  async sendMessage(
    campaign,
    template,
    conversationId,
    senderDevice,
    receiverDevice,
    messageContent,
    sequenceNumber
  ) {
    try {
      // Get receiver's phone number
      const receiverPhoneNumber = receiverDevice.phoneNumber;
      if (!receiverPhoneNumber) {
        throw new Error(
          `Receiver device ${receiverDevice.sessionId} has no phone number`
        );
      }

      // Send via WhatsApp service
      const result = await whatsappService.sendMessage(
        senderDevice.sessionId,
        receiverPhoneNumber,
        messageContent
      );

      // Log the conversation
      await WarmerConversationLog.create({
        campaignId: campaign.id,
        templateId: template.id,
        conversationId,
        senderSessionId: senderDevice.sessionId,
        receiverSessionId: receiverDevice.sessionId,
        messageContent,
        messageType: "text",
        sequenceNumber,
        status: result.success ? "sent" : "failed",
        errorMessage: result.success ? null : result.error,
        metadata: {
          templateName: template.name,
          senderAlias: senderDevice.alias,
          receiverAlias: receiverDevice.alias,
        },
      });

      console.log(
        `[WARMER] Message sent: ${senderDevice.alias} → ${receiverDevice.alias}`
      );
    } catch (error) {
      console.error("[WARMER] Error sending message:", error);

      // Log failed attempt
      await WarmerConversationLog.create({
        campaignId: campaign.id,
        templateId: template.id,
        conversationId,
        senderSessionId: senderDevice.sessionId,
        receiverSessionId: receiverDevice.sessionId,
        messageContent,
        messageType: "text",
        sequenceNumber,
        status: "failed",
        errorMessage: error.message,
      });
    }
  }

  calculateMessageDelay(templateSettings) {
    const delaySettings = templateSettings.messageDelaySeconds;
    return (
      Math.floor(Math.random() * (delaySettings.max - delaySettings.min + 1)) +
      delaySettings.min
    );
  }

  async updateTemplateUsage(template) {
    try {
      await template.update({
        usageCount: template.usageCount + 1,
        lastUsedAt: new Date(),
      });
    } catch (error) {
      console.error("[WARMER] Error updating template usage:", error);
    }
  }

  async updateCampaignStats(campaign, messageCount) {
    try {
      await campaign.update({
        totalMessagesSent: campaign.totalMessagesSent + messageCount,
        totalConversations: campaign.totalConversations + 1,
        lastActivityAt: new Date(),
      });
    } catch (error) {
      console.error("[WARMER] Error updating campaign stats:", error);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API methods for campaign management
  async createCampaign(userId, campaignData) {
    try {
      const campaign = await WarmerCampaign.create({
        userId,
        ...campaignData,
      });

      // Add to active campaigns if status is active
      if (campaign.status === "active") {
        this.activeCampaigns.set(campaign.id, campaign);
      }

      return campaign;
    } catch (error) {
      console.error("[WARMER] Error creating campaign:", error);
      throw error;
    }
  }

  async pauseCampaign(campaignId) {
    try {
      const campaign = await WarmerCampaign.findByPk(campaignId);
      if (!campaign) throw new Error("Campaign not found");

      await campaign.update({ status: "paused" });
      this.activeCampaigns.delete(campaignId);

      return campaign;
    } catch (error) {
      console.error("[WARMER] Error pausing campaign:", error);
      throw error;
    }
  }

  async resumeCampaign(campaignId) {
    try {
      const campaign = await WarmerCampaign.findByPk(campaignId, {
        include: [
          {
            model: WarmerConversationTemplate,
            as: "conversationTemplates",
            where: { isActive: true },
            required: false,
          },
        ],
      });

      if (!campaign) throw new Error("Campaign not found");

      await campaign.update({ status: "active" });
      this.activeCampaigns.set(campaignId, campaign);

      return campaign;
    } catch (error) {
      console.error("[WARMER] Error resuming campaign:", error);
      throw error;
    }
  }

  async stopCampaign(campaignId) {
    try {
      const campaign = await WarmerCampaign.findByPk(campaignId);
      if (!campaign) throw new Error("Campaign not found");

      await campaign.update({
        status: "stopped",
        completedAt: new Date(),
      });
      this.activeCampaigns.delete(campaignId);

      return campaign;
    } catch (error) {
      console.error("[WARMER] Error stopping campaign:", error);
      throw error;
    }
  }

  async getCampaignStats(campaignId) {
    try {
      const campaign = await WarmerCampaign.findByPk(campaignId);
      if (!campaign) throw new Error("Campaign not found");

      const todayMessages = await this.getTodayMessageCount(campaignId);
      const totalLogs = await WarmerConversationLog.count({
        where: { campaignId },
      });

      return {
        campaign,
        todayMessages,
        totalLogs,
        connectedDevices: (
          await this.getConnectedDevices(campaign.selectedDevices)
        ).length,
      };
    } catch (error) {
      console.error("[WARMER] Error getting campaign stats:", error);
      throw error;
    }
  }

  // Cleanup method
  destroy() {
    for (const [name, job] of this.cronJobs) {
      job.destroy();
    }
    this.cronJobs.clear();
    this.activeCampaigns.clear();
    console.log("[WARMER] Warmer Service destroyed");
  }
}

// Export singleton instance
export default new WarmerService();
