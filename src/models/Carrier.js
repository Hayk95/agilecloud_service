import mongoose from 'mongoose';

const carrierSchema = new mongoose.Schema(
  {
    carrierId: { type: String, required: true, unique: true },
    companyId: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    companyName: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    mcNumber: { type: String, default: '' },
    dotNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

carrierSchema.index({ companyId: 1, createdAt: -1 });

const Carrier = mongoose.models.Carrier || mongoose.model('Carrier', carrierSchema);

function generateId() {
  return 'CR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function mapDoc(doc) {
  return {
    carrierId: doc.carrierId,
    companyId: doc.companyId,
    name: doc.name,
    companyName: doc.companyName,
    phone: doc.phone,
    email: doc.email,
    mcNumber: doc.mcNumber,
    dotNumber: doc.dotNumber,
    address: doc.address,
    notes: doc.notes,
    isActive: doc.isActive,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
  };
}

export async function createCarrier({ companyId, name, companyName, phone, email, mcNumber, dotNumber, address, notes }) {
  const doc = await Carrier.create({
    carrierId: generateId(),
    companyId,
    name: name || '',
    companyName: companyName || '',
    phone: phone || '',
    email: email || '',
    mcNumber: mcNumber || '',
    dotNumber: dotNumber || '',
    address: address || '',
    notes: notes || '',
    isActive: true,
  });
  return mapDoc(doc.toObject());
}

export async function getAllCarriers(companyId) {
  const list = await Carrier.find({ companyId }).sort({ createdAt: -1 }).lean();
  return list.map(mapDoc);
}

export async function getCarrierById(carrierId, companyId) {
  const query = { carrierId };
  if (companyId) query.companyId = companyId;
  const doc = await Carrier.findOne(query).lean();
  return doc ? mapDoc(doc) : null;
}

export async function updateCarrier(carrierId, updates, companyId) {
  delete updates.carrierId;
  delete updates.companyId;
  const doc = await Carrier.findOneAndUpdate(
    { carrierId, companyId },
    { $set: updates },
    { new: true }
  ).lean();
  return doc ? mapDoc(doc) : null;
}

export async function deleteCarrier(carrierId, companyId) {
  const result = await Carrier.findOneAndDelete({ carrierId, companyId });
  return !!result;
}
