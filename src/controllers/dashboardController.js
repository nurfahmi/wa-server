import { 
  Device, 
  ChatSettings, 
  User, 
  AIUsageLog,
  Message,
  sequelize
} from "../models/index.js";
import { Op } from "sequelize";
import WhatsAppService from "../services/WhatsAppService.js";

/**
 * Get unified dashboard statistics for the authenticated user
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userId = String(req.user.role === 'agent' ? req.user.managerId : req.user.id);
    const isSuperAdmin = req.user.role === 'superadmin';

    // 1. Device Stats
    const deviceWhere = isSuperAdmin ? {} : { userId };
    const devices = await Device.findAll({ where: deviceWhere });
    const totalDevices = devices.length;
    
    let activeDevices = 0;
    devices.forEach(d => {
       if (WhatsAppService.isSessionActive(d.sessionId)) {
          activeDevices++;
       }
    });

    // 2. Chat Stats (Open Chats)
    const chatWhere = isSuperAdmin ? { status: 'open' } : { userId, status: 'open' };
    const activeChats = await ChatSettings.count({ where: chatWhere });

    // 3. Message Stats (Last 24 Hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messageWhere = {
        createdAt: { [Op.gte]: oneDayAgo }
    };
    if (!isSuperAdmin) {
        messageWhere.userId = userId;
    }
    const dailyMessages = await Message.count({ where: messageWhere });

    // 4. Agent Stats (If Manager)
    let agentsCount = 0;
    if (isSuperAdmin) {
        agentsCount = await User.count({ where: { role: 'agent' } });
    } else {
        agentsCount = await User.count({ where: { managerId: req.user.id, role: 'agent' } });
    }

    // 4b. AI Cost Stats (Last 24 Hours)
    // 4b. AI Cost Stats (Last 24 Hours)
    // AIUsageLog doesn't have userId directly, so we need to filter by associated devices if not superadmin
    let aiCostWhere = {
        createdAt: { [Op.gte]: oneDayAgo }
    };
    
    if (!isSuperAdmin) {
        // Find all devices owned by this user
        const userDevices = await Device.findAll({ 
            where: { userId },
            attributes: ['id']
        });
        const deviceIds = userDevices.map(d => d.id);
        
        // If user has no devices, cost is 0
        if (deviceIds.length > 0) {
           aiCostWhere.deviceId = { [Op.in]: deviceIds };
        } else {
           // Impossible condition to return 0
           aiCostWhere.deviceId = -1;
        }
    }

    const dailyCost = await AIUsageLog.sum('costUSD', { where: aiCostWhere }) || 0;

    // 5. Traffic Analysis (Hourly stats for the last 24 hours)
    // We group by hour
    const trafficStats = await Message.findAll({
        where: messageWhere,
        attributes: [
            [sequelize.fn('HOUR', sequelize.col('createdAt')), 'hour'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            'type' // incoming vs outgoing
        ],
        group: [sequelize.fn('HOUR', sequelize.col('createdAt')), 'type'],
        order: [[sequelize.fn('HOUR', sequelize.col('createdAt')), 'ASC']]
    });

    // Format traffic data for frontend (24 hours)
    const hourlyTraffic = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        incoming: 0,
        outgoing: 0
    }));

    trafficStats.forEach(stat => {
        const hour = stat.getDataValue('hour');
        const count = parseInt(stat.getDataValue('count'));
        const type = stat.getDataValue('type');
        
        const entry = hourlyTraffic.find(h => h.hour === hour);
        if (entry) {
            if (type === 'incoming') entry.incoming = count;
            else entry.outgoing = count;
        }
    });

    // 6. Recent Activity Feed
    // Get latest messages and AI logs
    const recentMessages = await Message.findAll({
        where: isSuperAdmin ? {} : { userId },
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'type', 'phoneNumber', 'createdAt']
    });

    const recentAILogs = await AIUsageLog.findAll({
        where: isSuperAdmin ? {} : { 
            deviceId: { [Op.in]: devices.map(d => d.id) }
        },
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'chatId', 'provider', 'model', 'createdAt']
    });

    // Combine and format activity
    const activityFeed = [
        ...recentMessages.map(m => {
            const cleanNumber = (m.phoneNumber || "").split("@")[0];
            return {
                id: `msg-${m.id}`,
                type: m.type === 'incoming' ? 'message_in' : 'message_out',
                title: m.type === 'incoming' ? `New message from ${cleanNumber}` : `Sent message to ${cleanNumber}`,
                time: m.createdAt,
                icon: 'MessageSquare'
            };
        }),
        ...recentAILogs.map(l => ({
            id: `ai-${l.id}`,
            type: 'ai_response',
            title: `AI Response via ${l.provider} (${l.model})`,
            time: l.createdAt,
            icon: 'Zap'
        }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    res.json({
        success: true,
        stats: {
            totalDevices,
            activeDevices,
            activeChats,
            dailyMessages,
            agentsOnline: agentsCount,
            dailyCost,
            traffic: hourlyTraffic,
            activity: activityFeed
        }
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
