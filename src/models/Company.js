import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    mcNumber: { type: String, default: '' },
    dotNumber: { type: String, default: '' },
    plan: { type: String, default: 'free', enum: ['free', 'starter', 'pro', 'enterprise'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

companySchema.index({ companyId: 1 });
companySchema.index({ email: 1 });

function generateCompanyId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CO-${timestamp}-${random}`;
}

const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

export async function createCompany({ name, email, phone, address, mcNumber, dotNumber }) {
  const company = new Company({
    companyId: generateCompanyId(),
    name,
    email: (email || '').toLowerCase(),
    phone: phone || '',
    address: address || '',
    mcNumber: mcNumber || '',
    dotNumber: dotNumber || '',
  });
  await company.save();
  return company.toObject();
}

export async function getCompanyById(companyId) {
  return Company.findOne({ companyId }).lean();
}

export default Company;
