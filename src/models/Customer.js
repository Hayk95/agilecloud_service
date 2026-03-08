import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true },
    companyId: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ companyId: 1, createdAt: -1 });
customerSchema.index({ companyId: 1, email: 1 });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

function generateId() {
  return 'CU-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function mapDoc(doc) {
  return {
    customerId: doc.customerId,
    companyId: doc.companyId,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    company: doc.company,
    address: doc.address,
    notes: doc.notes,
    isActive: doc.isActive,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
  };
}

export async function createCustomer({ companyId, name, email, phone, company, address, notes }) {
  const doc = await Customer.create({
    customerId: generateId(),
    companyId,
    name: name || '',
    email: email || '',
    phone: phone || '',
    company: company || '',
    address: address || '',
    notes: notes || '',
    isActive: true,
  });
  return mapDoc(doc.toObject());
}

export async function getAllCustomers(companyId) {
  const list = await Customer.find({ companyId }).sort({ createdAt: -1 }).lean();
  return list.map(mapDoc);
}

export async function getCustomerById(customerId, companyId) {
  const query = { customerId };
  if (companyId) query.companyId = companyId;
  const doc = await Customer.findOne(query).lean();
  return doc ? mapDoc(doc) : null;
}

export async function updateCustomer(customerId, updates, companyId) {
  delete updates.customerId;
  delete updates.companyId;
  const doc = await Customer.findOneAndUpdate(
    { customerId, companyId },
    { $set: updates },
    { new: true }
  ).lean();
  return doc ? mapDoc(doc) : null;
}

export async function deleteCustomer(customerId, companyId) {
  const result = await Customer.findOneAndDelete({ customerId, companyId });
  return !!result;
}
