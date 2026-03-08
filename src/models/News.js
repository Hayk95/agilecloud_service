import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    author: { type: String, default: 'MidasWay Logistics' },
    companyId: { type: String, index: true },
    published: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

const News = mongoose.models.News || mongoose.model('News', newsSchema);

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export async function createNews({ title, excerpt, content, coverImage, author, companyId, published, tags }) {
  let slug = generateSlug(title);
  const existing = await News.findOne({ slug }).lean();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;
  const doc = await News.create({
    title,
    slug,
    excerpt: excerpt || '',
    content: content || '',
    coverImage: coverImage || '',
    author: author || 'MidasWay Logistics',
    companyId: companyId || null,
    published: published ?? false,
    tags: tags || [],
  });
  return doc.toObject();
}

export async function updateNews(id, data) {
  const update = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.content !== undefined) update.content = data.content;
  if (data.coverImage !== undefined) update.coverImage = data.coverImage;
  if (data.author !== undefined) update.author = data.author;
  if (data.published !== undefined) update.published = data.published;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.title !== undefined) {
    let slug = generateSlug(data.title);
    const existing = await News.findOne({ slug, _id: { $ne: id } }).lean();
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;
    update.slug = slug;
  }
  return News.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
}

export async function deleteNews(id) {
  await News.findByIdAndDelete(id);
}

export async function getAllNews(companyId) {
  const filter = companyId ? { companyId } : {};
  return News.find(filter).sort({ createdAt: -1 }).lean();
}

export async function getNewsById(id) {
  return News.findById(id).lean();
}
