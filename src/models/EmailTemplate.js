import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true },
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, default: '' },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    placeholders: { type: [String], default: [] },
  },
  { timestamps: true }
);

schema.index({ companyId: 1, slug: 1 });

const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model('EmailTemplate', schema);

function id() {
  return 'ET-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function map(doc) {
  return {
    templateId: doc.templateId,
    companyId: doc.companyId,
    name: doc.name,
    slug: doc.slug,
    subject: doc.subject,
    body: doc.body,
    bodyHtml: doc.bodyHtml,
    placeholders: doc.placeholders || [],
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
  };
}

export async function createEmailTemplate({ companyId, name, slug, subject, body, bodyHtml, placeholders }) {
  const slugVal = (slug || name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
  const doc = await EmailTemplate.create({
    templateId: id(),
    companyId,
    name: name || 'Untitled',
    slug: slugVal,
    subject: subject || '',
    body: body || '',
    bodyHtml: bodyHtml || '',
    placeholders: Array.isArray(placeholders) ? placeholders : [],
  });
  return map(doc.toObject());
}

export async function getAllEmailTemplates(companyId) {
  const list = await EmailTemplate.find({ companyId }).sort({ createdAt: -1 }).lean();
  return list.map(map);
}

export async function getEmailTemplateById(templateId, companyId) {
  const q = { templateId };
  if (companyId) q.companyId = companyId;
  const doc = await EmailTemplate.findOne(q).lean();
  return doc ? map(doc) : null;
}

export async function updateEmailTemplate(templateId, updates, companyId) {
  delete updates.templateId;
  delete updates.companyId;
  if (updates.slug !== undefined) updates.slug = (updates.slug || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
  const doc = await EmailTemplate.findOneAndUpdate({ templateId, companyId }, { $set: updates }, { new: true }).lean();
  return doc ? map(doc) : null;
}

export async function deleteEmailTemplate(templateId, companyId) {
  const result = await EmailTemplate.findOneAndDelete({ templateId, companyId });
  return !!result;
}
