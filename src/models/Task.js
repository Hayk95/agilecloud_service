import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true },
    companyId: { type: String, default: null, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, enum: ['pickup', 'delivery', 'documents', 'customer', 'carrier', 'payment', 'issue', 'other'], default: 'other' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedTo: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    loadId: { type: String, default: null },
    quoteId: { type: String, default: null },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    comments: [commentSchema],
    checklist: [{ text: { type: String }, completed: { type: Boolean, default: false }, completedAt: { type: Date, default: null } }],
    seenBy: [{ type: String }],
  },
  { timestamps: true }
);

taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ companyId: 1 });
taskSchema.index({ createdAt: -1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

function formatTask(doc) {
  return {
    id: doc.taskId,
    taskId: doc.taskId,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    priority: doc.priority,
    assignedTo: doc.assignedTo,
    createdBy: doc.createdBy,
    loadId: doc.loadId,
    quoteId: doc.quoteId,
    companyId: doc.companyId,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    customerEmail: doc.customerEmail,
    dueDate: doc.dueDate ? doc.dueDate.toISOString() : null,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
    comments: doc.comments || [],
    commentsCount: (doc.comments || []).length,
    checklist: doc.checklist || [],
    checklistProgress: doc.checklist?.length ? Math.round((doc.checklist.filter(c => c.completed).length / doc.checklist.length) * 100) : 0,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
  };
}

function generateTaskId() {
  return 'TSK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function createTask(data = {}) {
  const taskId = generateTaskId();
  const task = await Task.create({ taskId, ...data });
  return formatTask(task.toObject());
}

export async function getAllTasks(filters = {}) {
  const query = {};
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.status) query.status = filters.status;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.category) query.category = filters.category;
  if (filters.priority) query.priority = filters.priority;
  if (filters.loadId) query.loadId = filters.loadId;
  const list = await Task.find(query).sort({ createdAt: -1 }).lean();
  return list.map(formatTask);
}

export async function getTaskById(taskId, companyId = null) {
  const query = { taskId };
  if (companyId) query.companyId = companyId;
  const doc = await Task.findOne(query).lean();
  return doc ? formatTask(doc) : null;
}

export async function updateTask(taskId, updates, companyId = null) {
  if (updates.status === 'completed' && !updates.completedAt) updates.completedAt = new Date();
  if (updates.status && updates.status !== 'completed') updates.completedAt = null;
  delete updates.companyId;
  const query = { taskId };
  if (companyId) query.companyId = companyId;
  const doc = await Task.findOneAndUpdate(query, { $set: updates }, { new: true }).lean();
  return doc ? formatTask(doc) : null;
}

export async function deleteTask(taskId, companyId = null) {
  const query = { taskId };
  if (companyId) query.companyId = companyId;
  const result = await Task.deleteOne(query);
  return result.deletedCount > 0;
}

export async function getTasksStats(filters = {}) {
  const query = {};
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  const all = await Task.find(query).lean();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return {
    total: all.length,
    pending: all.filter(t => t.status === 'pending').length,
    inProgress: all.filter(t => t.status === 'in_progress').length,
    completed: all.filter(t => t.status === 'completed').length,
    cancelled: all.filter(t => t.status === 'cancelled').length,
    urgent: all.filter(t => t.priority === 'urgent' && !['completed', 'cancelled'].includes(t.status)).length,
    overdue: all.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed').length,
    dueToday: all.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow).length,
    dueThisWeek: all.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) >= today && new Date(t.dueDate) < nextWeek).length,
  };
}
