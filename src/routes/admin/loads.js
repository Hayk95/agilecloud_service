import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin-auth.js';
import * as Load from '../../models/Load.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const filters = {
      companyId: req.adminUser.companyId,
      status: req.query.status,
      agentName: req.query.agentName,
      paymentStatus: req.query.paymentStatus,
    };
    const loads = await Load.getAllLoads(filters);
    res.json({ ok: true, loads });
  } catch (err) {
    console.error('GET /api/admin/loads:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body, companyId: req.adminUser.companyId };
    const load = await Load.createLoad(body);
    res.json({ ok: true, load });
  } catch (err) {
    console.error('POST /api/admin/loads:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

// Notes routes must come before /:loadId to avoid conflict
router.get('/:loadId/notes', requireAdmin, async (req, res) => {
  try {
    const load = await Load.getLoadById(req.params.loadId, req.adminUser.companyId);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json({ ok: true, notes: load.specialInstructions || [], count: (load.specialInstructions || []).length });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/:loadId/notes', requireAdmin, async (req, res) => {
  try {
    const text = req.body?.text;
    if (!text) return res.status(400).json({ error: 'Note text is required' });
    const load = await Load.addSpecialInstruction(
      req.params.loadId,
      text,
      req.body.createdBy || req.adminUser.name || 'Admin',
      req.adminUser.companyId
    );
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json({ ok: true, notes: load.specialInstructions || [], count: (load.specialInstructions || []).length });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:loadId/notes', requireAdmin, async (req, res) => {
  try {
    const index = parseInt(req.query.index, 10);
    if (isNaN(index) || index < 0) return res.status(400).json({ error: 'Invalid note index' });
    const load = await Load.deleteSpecialInstruction(req.params.loadId, index, req.adminUser.companyId);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json({ ok: true, notes: load.specialInstructions || [], count: (load.specialInstructions || []).length });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:loadId', requireAdmin, async (req, res) => {
  try {
    const load = await Load.getLoadById(req.params.loadId, req.adminUser.companyId);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json({ ok: true, load });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:loadId', requireAdmin, async (req, res) => {
  try {
    const load = await Load.updateLoad(req.params.loadId, req.body, req.adminUser.companyId);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json({ ok: true, load });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:loadId', requireAdmin, async (req, res) => {
  try {
    const deleted = await Load.deleteLoad(req.params.loadId, req.adminUser.companyId);
    if (!deleted) return res.status(404).json({ error: 'Load not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
