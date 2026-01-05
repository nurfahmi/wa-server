import { Sequelize } from "sequelize";
import config from "../config/config.js";

// Create Sequelize instance for MySQL
const sequelize = new Sequelize({
  ...config.database,
  timezone: "+07:00", // Jakarta timezone offset (fixes MySQL2 warning)
  dialectOptions: {
    ...config.database.dialectOptions,
  },
  logging: false, // Set to console.log to see SQL queries
});

// Import models
import DeviceModel from "./Device.js";
import MessageModel from "./Message.js";
import ContactDataModel from "./ContactData.js";
import ContactModel from "./Contact.js";
import ChatModel from "./Chat.js";
import ChatSettingsModel from "./ChatSettings.js";
import AIConversationMemoryModel from "./AIConversationMemory.js";
import AIUsageLogModel from "./AIUsageLog.js";
import AICostAlertModel from "./AICostAlert.js";
import UserAISettingsModel from "./UserAISettings.js";
import BusinessTemplateModel from "./BusinessTemplate.js";
import AIProviderModel from "./AIProvider.js";
import AIModelModel from "./AIModel.js";
import StoredFileModel from "./StoredFile.js";
import AuthDataModel from "./AuthData.js";

// Warmer models
import WarmerCampaignModel from "./WarmerCampaign.js";
import WarmerConversationTemplateModel from "./WarmerConversationTemplate.js";
import WarmerConversationLogModel from "./WarmerConversationLog.js";

const Device = DeviceModel(sequelize);
const Message = MessageModel(sequelize);
const ContactData = ContactDataModel(sequelize);
const Contact = ContactModel(sequelize);
const Chat = ChatModel(sequelize);
const ChatSettings = ChatSettingsModel(sequelize);
const AIConversationMemory = AIConversationMemoryModel(sequelize);
const AIUsageLog = AIUsageLogModel(sequelize);
const AICostAlert = AICostAlertModel(sequelize);
const UserAISettings = UserAISettingsModel(sequelize);
const BusinessTemplate = BusinessTemplateModel(sequelize);
const AIProvider = AIProviderModel(sequelize);
const AIModel = AIModelModel(sequelize);
const StoredFile = StoredFileModel(sequelize);
const AuthData = AuthDataModel(sequelize);

// Warmer models
const WarmerCampaign = WarmerCampaignModel(sequelize);
const WarmerConversationTemplate = WarmerConversationTemplateModel(sequelize);
const WarmerConversationLog = WarmerConversationLogModel(sequelize);

// Define associations
Device.hasMany(Message, { foreignKey: "sessionId", sourceKey: "sessionId" });
Message.belongsTo(Device, { foreignKey: "sessionId", targetKey: "sessionId" });

Device.hasMany(ChatSettings, { foreignKey: "deviceId", onDelete: "CASCADE" });
ChatSettings.belongsTo(Device, { foreignKey: "deviceId" });

// AI Usage Log associations
Device.hasMany(AIUsageLog, { foreignKey: "deviceId", onDelete: "CASCADE" });
AIUsageLog.belongsTo(Device, { foreignKey: "deviceId" });

// AI Conversation Memory associations
Device.hasMany(AIConversationMemory, { foreignKey: "deviceId", onDelete: "CASCADE" });
AIConversationMemory.belongsTo(Device, { foreignKey: "deviceId" });

// AI Provider associations
AIProvider.hasMany(AIModel, { foreignKey: "providerId", as: "models" });
AIModel.belongsTo(AIProvider, { foreignKey: "providerId", as: "provider" });

// StoredFile associations
Device.hasMany(StoredFile, { foreignKey: "deviceId", as: "storedFiles" });
StoredFile.belongsTo(Device, { foreignKey: "deviceId", as: "device" });

// Call associate methods for warmer models
if (WarmerCampaign.associate) {
  WarmerCampaign.associate({
    WarmerConversationTemplate,
    WarmerConversationLog,
  });
}
if (WarmerConversationTemplate.associate) {
  WarmerConversationTemplate.associate({
    WarmerCampaign,
  });
}
if (WarmerConversationLog.associate) {
  WarmerConversationLog.associate({
    WarmerCampaign,
    WarmerConversationTemplate,
  });
}

export {
  sequelize,
  Device,
  Message,
  ContactData,
  Contact,
  Chat,
  ChatSettings,
  AIConversationMemory,
  AIUsageLog,
  AICostAlert,
  UserAISettings,
  BusinessTemplate,
  AIProvider,
  AIModel,
  WarmerCampaign,
  WarmerConversationTemplate,
  WarmerConversationLog,
  StoredFile,
  AuthData,
};
