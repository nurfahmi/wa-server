import {
  WarmerCampaign,
  WarmerConversationTemplate,
  WarmerConversationLog,
  Device,
  sequelize,
} from "../models/index.js";
import warmerService from "../services/WarmerService.js";
import { Op } from "sequelize";

class WarmerController {
  // Campaign Management
  async createCampaign(req, res) {
    try {
      const { userId } = req.query;
      const {
        name,
        description,
        selectedDevices,
        dailyMessageSettings,
        timingSettings,
      } = req.body;

      // Validate required fields
      if (!name || !selectedDevices || selectedDevices.length < 3) {
        return res.status(400).json({
          success: false,
          error: "Campaign name and at least 3 devices are required",
        });
      }

      // Verify devices belong to user
      const userDevices = await Device.findAll({
        where: {
          userId,
          id: { [Op.in]: selectedDevices },
        },
      });

      if (userDevices.length !== selectedDevices.length) {
        return res.status(400).json({
          success: false,
          error: "Some selected devices do not belong to this user",
        });
      }

      // Create campaign
      const campaignData = {
        name,
        description,
        selectedDevices,
        dailyMessageSettings,
        timingSettings,
      };

      const campaign = await warmerService.createCampaign(userId, campaignData);

      res.json({
        success: true,
        data: campaign,
        message: "Warmer campaign created successfully",
      });
    } catch (error) {
      console.error("Error creating warmer campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create warmer campaign",
      });
    }
  }

  async getCampaigns(req, res) {
    try {
      const { userId } = req.query;
      const { status } = req.query;

      const whereClause = { userId };
      if (status) {
        whereClause.status = status;
      }

      const campaigns = await WarmerCampaign.findAll({
        where: whereClause,
        include: [
          {
            model: WarmerConversationTemplate,
            as: "conversationTemplates",
            attributes: ["id", "name", "category", "isActive", "usageCount"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch campaigns",
      });
    }
  }

  async getCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
        include: [
          {
            model: WarmerConversationTemplate,
            as: "conversationTemplates",
          },
        ],
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      // Get campaign statistics
      const stats = await warmerService.getCampaignStats(campaignId);

      res.json({
        success: true,
        data: {
          campaign,
          stats,
        },
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch campaign",
      });
    }
  }

  async updateCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;
      const updateData = req.body;

      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      // If updating selectedDevices, validate them
      if (updateData.selectedDevices) {
        const userDevices = await Device.findAll({
          where: {
            userId,
            id: { [Op.in]: updateData.selectedDevices },
          },
        });

        if (userDevices.length !== updateData.selectedDevices.length) {
          return res.status(400).json({
            success: false,
            error: "Some selected devices do not belong to this user",
          });
        }
      }

      await campaign.update(updateData);

      res.json({
        success: true,
        data: campaign,
        message: "Campaign updated successfully",
      });
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update campaign",
      });
    }
  }

  async pauseCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      // Verify ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const updatedCampaign = await warmerService.pauseCampaign(campaignId);

      res.json({
        success: true,
        data: updatedCampaign,
        message: "Campaign paused successfully",
      });
    } catch (error) {
      console.error("Error pausing campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to pause campaign",
      });
    }
  }

  async resumeCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      // Verify ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const updatedCampaign = await warmerService.resumeCampaign(campaignId);

      res.json({
        success: true,
        data: updatedCampaign,
        message: "Campaign resumed successfully",
      });
    } catch (error) {
      console.error("Error resuming campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to resume campaign",
      });
    }
  }

  async stopCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      // Verify ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const updatedCampaign = await warmerService.stopCampaign(campaignId);

      res.json({
        success: true,
        data: updatedCampaign,
        message: "Campaign stopped successfully",
      });
    } catch (error) {
      console.error("Error stopping campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to stop campaign",
      });
    }
  }

  async deleteCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      // Stop campaign if active before deleting
      if (campaign.status === "active") {
        await warmerService.stopCampaign(campaignId);
      }

      await campaign.destroy();

      res.json({
        success: true,
        message: "Campaign deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete campaign",
      });
    }
  }

  // Conversation Template Management
  async createTemplate(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;
      const { name, category, conversationFlow, variables, settings } =
        req.body;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      // Validate conversation flow
      if (
        !conversationFlow ||
        !Array.isArray(conversationFlow) ||
        conversationFlow.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Conversation flow is required and must be an array with at least one message",
        });
      }

      const template = await WarmerConversationTemplate.create({
        campaignId,
        name,
        category,
        conversationFlow,
        variables,
        settings,
      });

      res.json({
        success: true,
        data: template,
        message: "Conversation template created successfully",
      });
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create template",
      });
    }
  }

  async getTemplates(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const templates = await WarmerConversationTemplate.findAll({
        where: { campaignId },
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch templates",
      });
    }
  }

  async getTemplate(req, res) {
    try {
      const { campaignId, templateId } = req.params;
      const { userId } = req.query;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const template = await WarmerConversationTemplate.findOne({
        where: { id: templateId, campaignId },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch template",
      });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { campaignId, templateId } = req.params;
      const { userId } = req.query;
      const updateData = req.body;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const template = await WarmerConversationTemplate.findOne({
        where: { id: templateId, campaignId },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      await template.update(updateData);

      res.json({
        success: true,
        data: template,
        message: "Template updated successfully",
      });
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update template",
      });
    }
  }

  async deleteTemplate(req, res) {
    try {
      const { campaignId, templateId } = req.params;
      const { userId } = req.query;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const template = await WarmerConversationTemplate.findOne({
        where: { id: templateId, campaignId },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      await template.destroy();

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete template",
      });
    }
  }

  // Analytics and Logs
  async getCampaignStats(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const stats = await warmerService.getCampaignStats(campaignId);

      // Get additional analytics
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const weeklyStats = await WarmerConversationLog.findAll({
        where: {
          campaignId,
          sentAt: { [Op.gte]: last7Days },
        },
        attributes: [
          [sequelize.fn("DATE", sequelize.col("sentAt")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "messageCount"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN status = 'sent' THEN 1 END")
            ),
            "successCount",
          ],
        ],
        group: [sequelize.fn("DATE", sequelize.col("sentAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("sentAt")), "ASC"]],
      });

      const templateStats = await WarmerConversationTemplate.findAll({
        where: { campaignId },
        attributes: ["id", "name", "category", "usageCount", "lastUsedAt"],
        order: [["usageCount", "DESC"]],
      });

      res.json({
        success: true,
        data: {
          ...stats,
          weeklyStats,
          templateStats,
        },
      });
    } catch (error) {
      console.error("Error fetching campaign stats:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch campaign stats",
      });
    }
  }

  async getConversationLogs(req, res) {
    try {
      const { campaignId } = req.params;
      const { userId } = req.query;
      const { page = 1, limit = 50, status, conversationId } = req.query;

      // Verify campaign ownership
      const campaign = await WarmerCampaign.findOne({
        where: { id: campaignId, userId },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: "Campaign not found",
        });
      }

      const whereClause = { campaignId };
      if (status) whereClause.status = status;
      if (conversationId) whereClause.conversationId = conversationId;

      const offset = (page - 1) * limit;

      const { count, rows: logs } = await WarmerConversationLog.findAndCountAll(
        {
          where: whereClause,
          include: [
            {
              model: WarmerConversationTemplate,
              as: "template",
              attributes: ["id", "name", "category"],
            },
          ],
          order: [["sentAt", "DESC"]],
          limit: parseInt(limit),
          offset: offset,
        }
      );

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalLogs: count,
            hasNext: offset + logs.length < count,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching conversation logs:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch conversation logs",
      });
    }
  }

  // Utility endpoints
  async getAvailableDevices(req, res) {
    try {
      const { userId } = req.query;

      const devices = await Device.findAll({
        where: { userId },
        attributes: [
          "id",
          "sessionId",
          "alias",
          "phoneNumber",
          "status",
          "lastConnection",
        ],
        order: [["alias", "ASC"]],
      });

      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      console.error("Error fetching available devices:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch available devices",
      });
    }
  }

  async getDefaultTemplates(req, res) {
    try {
      // Return predefined conversation templates that users can use as starting points
      const defaultTemplates = [
        {
          name: "Casual Morning Chat",
          category: "casual_chat",
          conversationFlow: [
            {
              message: "Selamat pagi! Apa kabar hari ini?",
              senderType: "random",
              receiverType: "random",
            },
            {
              message: "Pagi! Alhamdulillah baik, kamu gimana?",
              senderType: "receiver",
              receiverType: "sender",
            },
            {
              message: "Baik juga, siap untuk hari yang produktif!",
              senderType: "sender",
              receiverType: "receiver",
            },
          ],
          variables: {},
          settings: {
            minDevicesRequired: 2,
            maxDevicesInConversation: 2,
            messageDelaySeconds: { min: 10, max: 30 },
            canBeRepeated: true,
            weight: 1,
          },
        },
        {
          name: "Business Update Discussion",
          category: "business_talk",
          conversationFlow: [
            {
              message: "Ada update terbaru tentang project kita?",
              senderType: "random",
              receiverType: "random",
            },
            {
              message:
                "Iya, progress sudah 75%. Target minggu depan bisa selesai",
              senderType: "receiver",
              receiverType: "sender",
            },
            {
              message: "Bagus! Kalau ada yang perlu bantuan kabarin ya",
              senderType: "sender",
              receiverType: "receiver",
            },
            {
              message: "Siap, makasih!",
              senderType: "receiver",
              receiverType: "sender",
            },
          ],
          variables: {},
          settings: {
            minDevicesRequired: 2,
            maxDevicesInConversation: 3,
            messageDelaySeconds: { min: 15, max: 45 },
            canBeRepeated: true,
            weight: 2,
          },
        },
      ];

      res.json({
        success: true,
        data: defaultTemplates,
      });
    } catch (error) {
      console.error("Error fetching default templates:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch default templates",
      });
    }
  }
}

export default new WarmerController();
