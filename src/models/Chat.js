import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, default: 'agent' },
  type: { type: String, default: 'text', enum: ['text', 'system', 'file', 'image', 'video', 'link'] },
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number },
  linkUrl: { type: String },
  linkTitle: { type: String },
  linkDescription: { type: String },
  linkImage: { type: String },
  readBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true },
    companyId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    type: { type: String, default: 'group', enum: ['direct', 'group'] },
    participants: [{
      odId: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, default: 'agent' },
      joinedAt: { type: Date, default: Date.now },
    }],
    messages: [messageSchema],
    lastMessage: { content: String, senderName: String, createdAt: Date },
    createdBy: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

conversationSchema.index({ 'participants.odId': 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

function generateConversationId() {
  return 'CONV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
}

function formatConversation(doc) {
  return {
    id: doc.conversationId,
    conversationId: doc.conversationId,
    name: doc.name,
    type: doc.type,
    participants: doc.participants || [],
    participantCount: (doc.participants || []).length,
    lastMessage: doc.lastMessage || null,
    messageCount: (doc.messages || []).length,
    createdBy: doc.createdBy,
    isActive: doc.isActive,
    companyId: doc.companyId,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
  };
}

export async function createConversation({ name, type = 'group', participants = [], createdBy, companyId }) {
  const doc = await Conversation.create({
    conversationId: generateConversationId(),
    companyId: companyId || null,
    name,
    type,
    participants,
    createdBy,
    messages: [{ content: `Group "${name}" created`, senderId: 'system', senderName: 'System', type: 'system' }],
  });
  return formatConversation(doc.toObject());
}

export async function getAllConversations(companyId = null) {
  const query = { isActive: true };
  if (companyId) query.companyId = companyId;
  const list = await Conversation.find(query).sort({ updatedAt: -1 }).lean();
  return list.map(formatConversation);
}

export async function getConversationById(conversationId, companyId = null) {
  const query = { conversationId };
  if (companyId) query.companyId = companyId;
  const doc = await Conversation.findOne(query).lean();
  return doc ? formatConversation(doc) : null;
}

export async function addMessage(conversationId, msg) {
  const message = {
    content: msg.content,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole || 'agent',
    type: msg.type || 'text',
    readBy: [msg.senderId],
    createdAt: new Date(),
  };
  if (msg.fileUrl) message.fileUrl = msg.fileUrl;
  if (msg.fileName) message.fileName = msg.fileName;
  if (msg.fileType) message.fileType = msg.fileType;
  if (msg.fileSize) message.fileSize = msg.fileSize;
  const lastContent = msg.type === 'image' ? '📷 Image' : msg.type === 'file' ? `📎 ${msg.fileName || 'File'}` : msg.content;
  const doc = await Conversation.findOneAndUpdate(
    { conversationId },
    {
      $push: { messages: message },
      $set: { lastMessage: { content: lastContent, senderName: msg.senderName, createdAt: message.createdAt } },
    },
    { new: true }
  ).lean();
  return doc ? { conversation: formatConversation(doc), message: { ...message, conversationId } } : null;
}

export async function deleteConversation(conversationId) {
  const result = await Conversation.updateOne({ conversationId }, { $set: { isActive: false } });
  return result.modifiedCount > 0;
}

export async function addParticipant(conversationId, participant) {
  const doc = await Conversation.findOneAndUpdate(
    { conversationId },
    {
      $push: {
        participants: { odId: participant.odId, name: participant.name, role: participant.role || 'agent', joinedAt: new Date() },
        messages: { content: `${participant.name} joined the group`, senderId: 'system', senderName: 'System', type: 'system', createdAt: new Date() },
      },
    },
    { new: true }
  ).lean();
  return doc ? formatConversation(doc) : null;
}

export async function removeParticipant(conversationId, odId) {
  const conv = await Conversation.findOne({ conversationId }).lean();
  const participant = conv?.participants?.find(p => p.odId === odId);
  const doc = await Conversation.findOneAndUpdate(
    { conversationId },
    {
      $pull: { participants: { odId } },
      $push: { messages: { content: `${participant?.name || 'User'} left the group`, senderId: 'system', senderName: 'System', type: 'system', createdAt: new Date() } },
    },
    { new: true }
  ).lean();
  return doc ? formatConversation(doc) : null;
}

export async function getMessages(conversationId, { limit = 50, before = null } = {}) {
  const doc = await Conversation.findOne({ conversationId }).lean();
  if (!doc) return [];
  let messages = doc.messages || [];
  if (before) messages = messages.filter(m => new Date(m.createdAt) < new Date(before));
  return messages.slice(-limit).map(m => ({ ...m, conversationId, createdAt: m.createdAt?.toISOString?.() || m.createdAt }));
}
