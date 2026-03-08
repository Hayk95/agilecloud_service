import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.js';
import * as EmailTemplate from '../../models/EmailTemplate.js';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const templates = await EmailTemplate.getAllEmailTemplates(req.adminUser.companyId);
    res.json({ ok: true, templates });
  } catch (err) {
    console.error('GET /api/admin/email-templates:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    const template = await EmailTemplate.createEmailTemplate({
      companyId: req.adminUser.companyId,
      name: body.name,
      slug: body.slug,
      subject: body.subject,
      body: body.body,
      bodyHtml: body.bodyHtml,
      placeholders: body.placeholders,
    });
    res.json({ ok: true, template });
  } catch (err) {
    console.error('POST /api/admin/email-templates:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:templateId', requireSuperAdmin, async (req, res) => {
  try {
    const template = await EmailTemplate.getEmailTemplateById(req.params.templateId, req.adminUser.companyId);
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, template });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:templateId', requireSuperAdmin, async (req, res) => {
  try {
    const template = await EmailTemplate.updateEmailTemplate(req.params.templateId, req.body, req.adminUser.companyId);
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, template });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:templateId', requireSuperAdmin, async (req, res) => {
  try {
    const deleted = await EmailTemplate.deleteEmailTemplate(req.params.templateId, req.adminUser.companyId);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
