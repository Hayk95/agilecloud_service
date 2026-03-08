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

export default Agent;
