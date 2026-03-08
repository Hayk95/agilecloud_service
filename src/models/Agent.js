import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const agentSchema = new mongoose.Schema(
  {
    agentId: { type: String, required: true, unique: true },
    companyId: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'agent', enum: ['super_admin', 'admin', 'agent'] },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

agentSchema.index({ email: 1 });
agentSchema.index({ companyId: 1, role: 1 });

function generateAgentId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `AG-${timestamp}-${random}`;
}

const Agent = mongoose.models.Agent || mongoose.model('Agent', agentSchema);

export async function createAgent({ email, password, name, role = 'agent', companyId }) {
  if (!companyId) throw new Error('companyId is required');

  const existing = await Agent.findOne({ email: (email || '').toLowerCase() });
  if (existing) {
    throw new Error('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const agent = new Agent({
    agentId: generateAgentId(),
    companyId,
    email: (email || '').toLowerCase(),
    password: hashedPassword,
    name,
    role,
  });
  await agent.save();

  const obj = agent.toObject();
  delete obj.password;
  return obj;
}

export async function getAllAgents(companyId) {
  const query = companyId ? { companyId } : {};
  const list = await Agent.find(query).select('-password').sort({ createdAt: -1 }).lean();
  return list.map(doc => ({
    id: doc.agentId,
    agentId: doc.agentId,
    companyId: doc.companyId,
    email: doc.email,
    name: doc.name,
    role: doc.role,
    isActive: doc.isActive,
    lastLogin: doc.lastLogin ? doc.lastLogin.toISOString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  }));
}

export async function getAgentById(agentId, companyId = null) {
  const query = { agentId };
  if (companyId) query.companyId = companyId;
  const doc = await Agent.findOne(query).select('-password').lean();
  if (!doc) return null;
  return {
    id: doc.agentId,
    agentId: doc.agentId,
    companyId: doc.companyId,
    email: doc.email,
    name: doc.name,
    role: doc.role,
    isActive: doc.isActive,
    lastLogin: doc.lastLogin ? doc.lastLogin.toISOString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  };
}

export async function authenticateAgent(email, password) {
  const doc = await Agent.findOne({ email: (email || '').toLowerCase() });
  if (!doc) return null;
  const isValid = await bcrypt.compare(password, doc.password);
  if (!isValid) return null;
  if (!doc.isActive) throw new Error('Account is deactivated');
  doc.lastLogin = new Date();
  await doc.save();
  return { id: doc.agentId, agentId: doc.agentId, companyId: doc.companyId, email: doc.email, name: doc.name, role: doc.role };
}

export async function updateAgent(agentId, updates, companyId = null) {
  if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
  delete updates.companyId;
  if (updates.email) {
    updates.email = updates.email.toLowerCase();
    const existing = await Agent.findOne({ email: updates.email, agentId: { $ne: agentId } });
    if (existing) throw new Error('Email already exists');
  }
  const query = { agentId };
  if (companyId) query.companyId = companyId;
  const doc = await Agent.findOneAndUpdate(query, { $set: updates }, { new: true }).select('-password').lean();
  return doc;
}

export async function deleteAgent(agentId, companyId = null) {
  const query = { agentId };
  if (companyId) query.companyId = companyId;
  const agent = await Agent.findOne(query);
  if (!agent) return false;
  const companyFilter = companyId ? { companyId, role: 'super_admin' } : { role: 'super_admin' };
  const superAdmins = await Agent.countDocuments(companyFilter);
  if (agent.role === 'super_admin' && superAdmins <= 1) throw new Error('Cannot delete the last super admin');
  const result = await Agent.deleteOne(query);
  return result.deletedCount > 0;
}

export default Agent;
