import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin-auth.js';
import * as Quote from '../../models/Quote.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const quotes = await Quote.getAllQuotes(req.adminUser.companyId);
    res.json({ ok: true, quotes });
  } catch (err) {
    console.error('GET /api/admin/quotes:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:quoteId/price', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const quote = await Quote.updateQuotePricing(req.params.quoteId, {
      totalPrice: body.totalPrice ?? body.price,
      acceptPrice: body.acceptPrice,
      paidAmount: body.paidAmount,
    });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json({ ok: true, quote });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
