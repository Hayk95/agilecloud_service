import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin-auth.js';
import * as Task from '../../models/Task.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const filters = {
      companyId: req.adminUser.companyId,
      status: req.query.status,
      assignedTo: req.query.assignedTo,
      category: req.query.category,
      priority: req.query.priority,
      loadId: req.query.loadId,
    };
    const [tasks, stats] = await Promise.all([
      Task.getAllTasks(filters),
      Task.getTasksStats({ companyId: req.adminUser.companyId, assignedTo: req.query.assignedTo }),
    ]);
    res.json({ ok: true, tasks, stats });
  } catch (err) {
    console.error('GET /api/admin/tasks:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body, companyId: req.adminUser.companyId };
    const task = await Task.createTask(body);
    res.json({ ok: true, task });
  } catch (err) {
    console.error('POST /api/admin/tasks:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:taskId', requireAdmin, async (req, res) => {
  try {
    const task = await Task.getTaskById(req.params.taskId, req.adminUser.companyId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true, task });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:taskId', requireAdmin, async (req, res) => {
  try {
    const task = await Task.updateTask(req.params.taskId, req.body, req.adminUser.companyId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true, task });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:taskId', requireAdmin, async (req, res) => {
  try {
    const deleted = await Task.deleteTask(req.params.taskId, req.adminUser.companyId);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
