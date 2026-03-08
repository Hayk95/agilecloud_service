import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.js';
import * as Customer from '../../models/Customer.js';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const customers = await Customer.getAllCustomers(req.adminUser.companyId);
    res.json({ ok: true, customers });
  } catch (err) {
    console.error('GET /api/admin/customers:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    const customer = await Customer.createCustomer({
      companyId: req.adminUser.companyId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      address: body.address,
      notes: body.notes,
    });
    res.json({ ok: true, customer });
  } catch (err) {
    console.error('POST /api/admin/customers:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:customerId', requireSuperAdmin, async (req, res) => {
  try {
    const customer = await Customer.getCustomerById(req.params.customerId, req.adminUser.companyId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ok: true, customer });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:customerId', requireSuperAdmin, async (req, res) => {
  try {
    const customer = await Customer.updateCustomer(req.params.customerId, req.body, req.adminUser.companyId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ok: true, customer });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:customerId', requireSuperAdmin, async (req, res) => {
  try {
    const deleted = await Customer.deleteCustomer(req.params.customerId, req.adminUser.companyId);
    if (!deleted) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
