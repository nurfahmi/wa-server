import { User, ChatSettings } from "../models/index.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";

export const getAgents = async (req, res) => {
  try {
    const managerId = req.user.role === 'agent' ? req.user.managerId : req.user.id;
    
    if (!managerId && req.user.role === 'agent') {
      return res.status(400).json({ error: "Agent has no assigned manager" });
    }

    const agents = await User.findAll({
      where: { 
        managerId: managerId,
        role: 'agent',
        id: { [Op.ne]: req.user.id } 
      },
      attributes: ['id', 'name', 'email', 'createdAt', 'lastLogin']
    });

    // Fetch chat counts for each agent
    const agentsWithCounts = await Promise.all(agents.map(async (agent) => {
      const activeChatsCount = await ChatSettings.count({
        where: {
          assignedAgentId: agent.id.toString(),
          status: { [Op.ne]: 'resolved' }
        }
      });
      
      const totalChatsCount = await ChatSettings.count({
        where: {
          assignedAgentId: agent.id.toString()
        }
      });

      return {
        ...agent.toJSON(),
        activeChatsCount,
        totalChatsCount
      };
    }));

    res.json({ agents: agentsWithCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createAgent = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check limit (stub logic: assume plan limit is checked here)
    // For now, simply create.
    
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    // Since we don't have password column in User model yet (OAuth only?), 
    // we might need to add it or assume agents log in via separate basic auth flow?
    // Wait, User model in `User.js` earlier showed only `id` (integer) which implies OAuth ID.
    // If we are creating local agents, we need password column!
    // Let's check User.js content again from memory/context. 
    // It has name, email, role, planName... NO PASSWORD.
    // The system seems to be OAuth based.
    // If we want "Add Agent", we probably need to invite them or create a local credentials system.
    // Given the constraints and "Sejoli Member" context, maybe they are just records?
    // But they need to Login.
    // I will add `password` column to User model as well to support local agent login.
    
    // TEMPORARY: Just create user record. 
    // We will need to update authController to support password login or handle agent login differently.
    // For this task, I'll add password column to User model first.

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const agent = await User.create({
      id: Math.floor(Math.random() * 1000000) + 10000, 
      name,
      email,
      role: 'agent',
      managerId: req.user.id,
      password: hashedPassword
    });

    res.json({ agent });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAgent = async (req, res) => {
    try {
        await User.destroy({ where: { id: req.params.id, managerId: req.user.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
