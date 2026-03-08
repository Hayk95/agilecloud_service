import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const selectOptionSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    companyId: { type: String, default: null, index: true },
    options: [optionSchema],
  },
  { timestamps: true }
);

selectOptionSchema.index({ category: 1, companyId: 1 }, { unique: true });

const SelectOption = mongoose.models.SelectOption || mongoose.model('SelectOption', selectOptionSchema);

const DEFAULT_OPTIONS = {
  paymentStatus: [
    { value: 'pending', label: 'Pending', order: 1 },
    { value: 'partial', label: 'Partial', order: 2 },
    { value: 'paid', label: 'Paid', order: 3 },
    { value: 'refunded', label: 'Refunded', order: 4 },
    { value: 'cancelled', label: 'Cancelled', order: 5 },
  ],
  status: [
    { value: 'new', label: 'New', order: 1 },
    { value: 'quoted', label: 'Quoted', order: 2 },
    { value: 'booked', label: 'Booked', order: 3 },
    { value: 'dispatched', label: 'Dispatched', order: 4 },
    { value: 'picked_up', label: 'Picked Up', order: 5 },
    { value: 'in_transit', label: 'In Transit', order: 6 },
    { value: 'delivered', label: 'Delivered', order: 7 },
    { value: 'cancelled', label: 'Cancelled', order: 8 },
    { value: 'on_hold', label: 'On Hold', order: 9 },
  ],
  dispatchedVia: [
    { value: 'central_dispatch', label: 'Central Dispatch', order: 1 },
    { value: 'super_dispatch', label: 'Super Dispatch', order: 2 },
    { value: 'ship_cars', label: 'Ship Cars', order: 3 },
    { value: 'direct', label: 'Direct', order: 4 },
    { value: 'broker', label: 'Broker', order: 5 },
    { value: 'other', label: 'Other', order: 6 },
  ],
  feedback: [
    { value: 'none', label: 'None', order: 1 },
    { value: 'positive', label: 'Positive', order: 2 },
    { value: 'negative', label: 'Negative', order: 3 },
    { value: 'neutral', label: 'Neutral', order: 4 },
    { value: 'pending', label: 'Pending', order: 5 },
    { value: 'do_not_ask', label: 'Do Not Ask', order: 6 },
  ],
  questionFilled: [
    { value: 'yes', label: 'Yes', order: 1 },
    { value: 'no', label: 'No', order: 2 },
    { value: 'call', label: 'Call', order: 3 },
    { value: 'text', label: 'Text', order: 4 },
    { value: 'na', label: 'N/A', order: 5 },
  ],
  callOnBooking: [
    { value: 'yes', label: 'Yes', order: 1 },
    { value: 'no', label: 'No', order: 2 },
    { value: 'na', label: 'N/A', order: 3 },
  ],
};

export async function getOptionsByCategory(category, companyId = null) {
  let doc = null;
  if (companyId) doc = await SelectOption.findOne({ category, companyId }).lean();
  if (!doc) doc = await SelectOption.findOne({ category, companyId: null }).lean();
  if (!doc) return (DEFAULT_OPTIONS[category] || []).filter(o => o.isActive !== false);
  return (doc.options || []).filter(o => o.isActive !== false).sort((a, b) => a.order - b.order);
}

export async function getAllSelectOptions(companyId = null) {
  const result = {};
  for (const [cat, opts] of Object.entries(DEFAULT_OPTIONS)) result[cat] = [...opts];
  const globalDocs = await SelectOption.find({ companyId: null }).lean();
  globalDocs.forEach(doc => { result[doc.category] = doc.options || []; });
  if (companyId) {
    const companyDocs = await SelectOption.find({ companyId }).lean();
    companyDocs.forEach(doc => { result[doc.category] = doc.options || []; });
  }
  return result;
}

export async function addOption(category, option, companyId = null) {
  const query = { category, companyId: companyId || null };
  const doc = await SelectOption.findOne(query).lean();
  const currentOptions = doc?.options || DEFAULT_OPTIONS[category] || [];
  const maxOrder = Math.max(...currentOptions.map(o => o.order || 0), 0);
  const newOption = { value: option.value, label: option.label, order: option.order ?? maxOrder + 1, isActive: true };
  if (!doc && companyId) {
    const defaultOpts = DEFAULT_OPTIONS[category] || [];
    await SelectOption.create({ category, companyId, options: [...defaultOpts, newOption] });
    return SelectOption.findOne(query).lean();
  }
  return SelectOption.findOneAndUpdate(query, { $push: { options: newOption } }, { upsert: true, new: true }).lean();
}

export async function updateOption(category, optionValue, updates, companyId = null) {
  const query = { category, companyId: companyId || null, 'options.value': optionValue };
  const $set = {};
  if (updates.label !== undefined) $set['options.$.label'] = updates.label;
  if (updates.order !== undefined) $set['options.$.order'] = updates.order;
  if (updates.isActive !== undefined) $set['options.$.isActive'] = updates.isActive;
  if (Object.keys($set).length === 0) return SelectOption.findOne(query).lean();
  return SelectOption.findOneAndUpdate(query, { $set }, { new: true }).lean();
}

export async function deleteOption(category, optionValue, companyId = null) {
  const query = { category, companyId: companyId || null };
  return SelectOption.findOneAndUpdate(query, { $pull: { options: { value: optionValue } } }, { new: true }).lean();
}

export async function setOptionsForCategory(category, options, companyId = null) {
  const query = { category, companyId: companyId || null };
  return SelectOption.findOneAndUpdate(query, { $set: { options } }, { upsert: true, new: true }).lean();
}

export async function initializeDefaultOptions(companyId = null) {
  for (const [category, options] of Object.entries(DEFAULT_OPTIONS)) {
    const query = { category, companyId: companyId || null };
    const existing = await SelectOption.findOne(query);
    if (!existing) await SelectOption.create({ category, companyId: companyId || null, options });
  }
}
