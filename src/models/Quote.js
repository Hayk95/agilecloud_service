import mongoose from 'mongoose';

const DEFAULT_COMPANY_ID = 'CO-MLC8W97N-J7R';

const quoteSchema = new mongoose.Schema(
  {
    quoteId: { type: String, required: true, unique: true },
    companyId: { type: String, default: DEFAULT_COMPANY_ID, index: true },
    userId: { type: String, default: null, index: true },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    vehicles: { type: Array, default: [] },
    status: { type: String, default: 'pending', enum: ['pending', 'priced', 'accepted', 'partial', 'paid'] },
    price: { type: Number, default: null },
    acceptPrice: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    priceUpdatedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    stripePaymentId: { type: String, default: null },
  },
  { timestamps: true }
);

quoteSchema.index({ userId: 1, createdAt: -1 });

const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);

export async function createQuote({ quoteId, userId, formData, vehicles }) {
  const doc = await Quote.create({
    quoteId,
    companyId: DEFAULT_COMPANY_ID,
    userId: userId || null,
    formData: formData || {},
    vehicles: vehicles || [],
    status: 'pending',
    price: null,
  });
  return doc.toObject();
}

function mapQuoteDoc(doc) {
  return {
    id: doc.quoteId,
    quoteId: doc.quoteId,
    userId: doc.userId,
    formData: doc.formData,
    vehicles: doc.vehicles,
    status: doc.status,
    price: doc.price,
    acceptPrice: doc.acceptPrice ?? 0,
    paidAmount: doc.paidAmount ?? 0,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    priceUpdatedAt: doc.priceUpdatedAt ? doc.priceUpdatedAt.toISOString() : null,
    acceptedAt: doc.acceptedAt ? doc.acceptedAt.toISOString() : null,
    paidAt: doc.paidAt ? doc.paidAt.toISOString() : null,
    stripePaymentId: doc.stripePaymentId ?? null,
  };
}

export async function getQuotesByUserId(userId) {
  const list = await Quote.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
  return list.map(mapQuoteDoc);
}

/**
 * Get quotes by email in formData (for mobile app users whose old quotes had no userId).
 */
export async function getQuotesByEmail(email) {
  if (!email) return [];
  const list = await Quote.find({
    $or: [
      { 'formData.email': email },
      { 'formData.email': email.toLowerCase() },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
  return list.map(mapQuoteDoc);
}

export async function updateQuotePrice(quoteId, price) {
  const doc = await Quote.findOneAndUpdate(
    { quoteId },
    { $set: { price, status: 'priced', priceUpdatedAt: new Date() } },
    { new: true }
  ).lean();
  return doc;
}

/**
 * Update quote with full pricing (totalPrice, acceptPrice, paidAmount).
 * Auto-determines status. Same logic as admin/website.
 */
export async function updateQuotePricing(quoteId, { totalPrice, acceptPrice, paidAmount }) {
  const updateData = { priceUpdatedAt: new Date() };

  if (totalPrice !== undefined && totalPrice !== null) updateData.price = totalPrice;
  if (acceptPrice !== undefined && acceptPrice !== null) updateData.acceptPrice = acceptPrice;
  if (paidAmount !== undefined && paidAmount !== null) updateData.paidAmount = paidAmount;

  const doc = await Quote.findOne({ quoteId }).lean();
  if (!doc) return null;

  const newTotal = updateData.price ?? doc.price ?? 0;
  const newAccept = updateData.acceptPrice ?? doc.acceptPrice ?? 0;
  const newPaid = updateData.paidAmount ?? doc.paidAmount ?? 0;

  if (newTotal > 0) {
    if (newPaid >= newTotal) {
      updateData.status = 'paid';
      updateData.paidAt = new Date();
    } else if (newAccept > 0 && newPaid >= newAccept) {
      updateData.status = 'accepted';
      if (!doc.acceptedAt) updateData.acceptedAt = new Date();
    } else if (newPaid > 0) {
      updateData.status = 'partial';
    } else {
      updateData.status = 'priced';
    }
  }

  const updated = await Quote.findOneAndUpdate(
    { quoteId },
    { $set: updateData },
    { new: true },
  ).lean();
  return updated;
}

export default Quote;
