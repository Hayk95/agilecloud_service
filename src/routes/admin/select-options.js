import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.js';
import * as SelectOption from '../../models/SelectOption.js';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const options = await SelectOption.getAllSelectOptions(req.adminUser.companyId);
    res.json({ ok: true, options });
  } catch (err) {
    console.error('GET /api/admin/select-options:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    await SelectOption.initializeDefaultOptions(req.adminUser.companyId);
    const options = await SelectOption.getAllSelectOptions(req.adminUser.companyId);
    res.json({ ok: true, options });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:category', requireSuperAdmin, async (req, res) => {
  try {
    const options = await SelectOption.getOptionsByCategory(req.params.category, req.adminUser.companyId);
    res.json({ ok: true, category: req.params.category, options });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/:category', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.value || !body.label) return res.status(400).json({ error: 'Value and label are required' });
    await SelectOption.addOption(req.params.category, { value: body.value, label: body.label, order: body.order }, req.adminUser.companyId);
    const options = await SelectOption.getOptionsByCategory(req.params.category, req.adminUser.companyId);
    res.json({ ok: true, category: req.params.category, options });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:category', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.value) return res.status(400).json({ error: 'Option value is required' });
    await SelectOption.updateOption(req.params.category, body.value, {
      label: body.label,
      order: body.order,
      isActive: body.isActive,
    }, req.adminUser.companyId);
    const options = await SelectOption.getOptionsByCategory(req.params.category, req.adminUser.companyId);
    res.json({ ok: true, category: req.params.category, options });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:category', requireSuperAdmin, async (req, res) => {
  try {
    const value = req.query.value;
    if (!value) return res.status(400).json({ error: 'Option value is required' });
    await SelectOption.deleteOption(req.params.category, value, req.adminUser.companyId);
    const options = await SelectOption.getOptionsByCategory(req.params.category, req.adminUser.companyId);
    res.json({ ok: true, category: req.params.category, options });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.put('/:category', requireSuperAdmin, async (req, res) => {
  try {
    if (!Array.isArray(req.body.options)) return res.status(400).json({ error: 'Options array is required' });
    await SelectOption.setOptionsForCategory(req.params.category, req.body.options, req.adminUser.companyId);
    const options = await SelectOption.getOptionsByCategory(req.params.category, req.adminUser.companyId);
    res.json({ ok: true, category: req.params.category, options });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
