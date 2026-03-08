import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.js';
import * as Carrier from '../../models/Carrier.js';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const carriers = await Carrier.getAllCarriers(req.adminUser.companyId);
    res.json({ ok: true, carriers });
  } catch (err) {
    console.error('GET /api/admin/carriers:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    const carrier = await Carrier.createCarrier({
      companyId: req.adminUser.companyId,
      name: body.name,
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      mcNumber: body.mcNumber,
      dotNumber: body.dotNumber,
      address: body.address,
      notes: body.notes,
    });
    res.json({ ok: true, carrier });
  } catch (err) {
    console.error('POST /api/admin/carriers:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:carrierId', requireSuperAdmin, async (req, res) => {
  try {
    const carrier = await Carrier.getCarrierById(req.params.carrierId, req.adminUser.companyId);
    if (!carrier) return res.status(404).json({ error: 'Carrier not found' });
    res.json({ ok: true, carrier });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:carrierId', requireSuperAdmin, async (req, res) => {
  try {
    const carrier = await Carrier.updateCarrier(req.params.carrierId, req.body, req.adminUser.companyId);
    if (!carrier) return res.status(404).json({ error: 'Carrier not found' });
    res.json({ ok: true, carrier });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:carrierId', requireSuperAdmin, async (req, res) => {
  try {
    const deleted = await Carrier.deleteCarrier(req.params.carrierId, req.adminUser.companyId);
    if (!deleted) return res.status(404).json({ error: 'Carrier not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
