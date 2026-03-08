import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const loadSchema = new mongoose.Schema(
  {
    loadId: { type: String, required: true, unique: true },
    companyId: { type: String, default: null, index: true },
    paymentStatus: { type: String, default: 'pending' },
    status: { type: String, default: 'new' },
    orderId: { type: String, default: '' },
    listingId: { type: String, default: '' },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    bookingDate: { type: Date, default: null },
    fad: { type: Date, default: null },
    dispatchedDate: { type: Date, default: null },
    pickupDate: { type: Date, default: null },
    deliveryDate: { type: Date, default: null },
    agentName: { type: String, default: '' },
    dispatchedVia: { type: String, default: '' },
    bookingRate: { type: Number, default: 0 },
    carrierRate: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    dimensions: { type: String, default: '' },
    weight: { type: Number, default: 0 },
    customerContact: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    feedback: { type: String, default: 'none' },
    questionFilled: { type: String, default: 'N/A' },
    callOnBooking: { type: String, default: 'N/A' },
    specialInstructions: [noteSchema],
    quoteId: { type: String, default: null },
  },
  { timestamps: true }
);

loadSchema.index({ loadId: 1 });
loadSchema.index({ status: 1 });
loadSchema.index({ agentName: 1 });
loadSchema.index({ createdAt: -1 });

const Load = mongoose.models.Load || mongoose.model('Load', loadSchema);

function safeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  try { return new Date(val).toISOString(); } catch { return null; }
}

function formatLoad(doc) {
  return {
    id: doc.loadId,
    loadId: doc.loadId,
    companyId: doc.companyId,
    paymentStatus: doc.paymentStatus,
    status: doc.status,
    orderId: doc.orderId,
    listingId: doc.listingId,
    from: doc.from,
    to: doc.to,
    bookingDate: safeDate(doc.bookingDate),
    fad: safeDate(doc.fad),
    dispatchedDate: safeDate(doc.dispatchedDate),
    pickupDate: safeDate(doc.pickupDate),
    deliveryDate: safeDate(doc.deliveryDate),
    agentName: doc.agentName,
    dispatchedVia: doc.dispatchedVia,
    bookingRate: doc.bookingRate,
    carrierRate: doc.carrierRate,
    profit: doc.profit,
    dimensions: doc.dimensions,
    weight: doc.weight,
    customerContact: doc.customerContact,
    customerEmail: doc.customerEmail,
    customerPhone: doc.customerPhone,
    feedback: doc.feedback,
    questionFilled: doc.questionFilled,
    callOnBooking: doc.callOnBooking,
    specialInstructions: doc.specialInstructions || [],
    specialInstructionsCount: (doc.specialInstructions || []).length,
    quoteId: doc.quoteId,
    createdAt: safeDate(doc.createdAt),
    updatedAt: safeDate(doc.updatedAt),
  };
}

function generateLoadId() {
  return 'LD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function createLoad(data = {}) {
  const loadId = generateLoadId();
  const load = await Load.create({ loadId, ...data });
  return formatLoad(load.toObject());
}

export async function getAllLoads(filters = {}) {
  const query = {};
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.status) query.status = filters.status;
  if (filters.agentName) query.agentName = filters.agentName;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  const list = await Load.find(query).sort({ createdAt: -1 }).lean();
  return list.map(formatLoad);
}

export async function getLoadById(loadId, companyId = null) {
  const query = { loadId };
  if (companyId) query.companyId = companyId;
  const doc = await Load.findOne(query).lean();
  return doc ? formatLoad(doc) : null;
}

export async function updateLoad(loadId, updates, companyId = null) {
  const query = { loadId };
  if (companyId) query.companyId = companyId;
  if (updates.bookingRate !== undefined || updates.carrierRate !== undefined) {
    const current = await Load.findOne(query).lean();
    if (!current) return null;
    updates.profit = (updates.bookingRate ?? current?.bookingRate ?? 0) - (updates.carrierRate ?? current?.carrierRate ?? 0);
  }
  delete updates.companyId;
  const doc = await Load.findOneAndUpdate(query, { $set: updates }, { new: true }).lean();
  return doc ? formatLoad(doc) : null;
}

export async function addSpecialInstruction(loadId, text, createdBy, companyId = null) {
  const query = { loadId };
  if (companyId) query.companyId = companyId;
  const doc = await Load.findOneAndUpdate(
    query,
    { $push: { specialInstructions: { text, createdBy, createdAt: new Date() } } },
    { new: true }
  ).lean();
  return doc ? formatLoad(doc) : null;
}

export async function deleteSpecialInstruction(loadId, noteIndex, companyId = null) {
  const query = { loadId };
  if (companyId) query.companyId = companyId;
  const load = await Load.findOne(query);
  if (!load) return null;
  load.specialInstructions.splice(noteIndex, 1);
  await load.save();
  return formatLoad(load.toObject());
}

export async function deleteLoad(loadId, companyId = null) {
  const query = { loadId };
  if (companyId) query.companyId = companyId;
  const result = await Load.deleteOne(query);
  return result.deletedCount > 0;
}
