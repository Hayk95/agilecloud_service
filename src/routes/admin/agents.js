import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.js';
import { createAgent, getAllAgents, getAgentById, updateAgent, deleteAgent } from '../../models/Agent.js';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const agents = await getAllAgents(req.adminUser.companyId);
    res.json({ ok: true, agents });
  } catch (err) {
    console.error('GET /api/admin/agents:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.email || !body.name || !body.password) {
      return res.status(400).json({ error: 'Email, name and password are required' });
    }
    const agent = await createAgent({
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role || 'agent',
      companyId: req.adminUser.companyId,
    });
    res.json({ ok: true, agent });
  } catch (err) {
    console.error('POST /api/admin/agents:', err);
    const status = err?.message?.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:agentId', requireSuperAdmin, async (req, res) => {
  try {
    const agent = await getAgentById(req.params.agentId, req.adminUser.companyId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ ok: true, agent });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.patch('/:agentId', requireSuperAdmin, async (req, res) => {
  try {
    const agent = await updateAgent(req.params.agentId, req.body, req.adminUser.companyId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ ok: true, agent });
  } catch (err) {
    const status = err?.message?.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:agentId', requireSuperAdmin, async (req, res) => {
  try {
    const deleted = await deleteAgent(req.params.agentId, req.adminUser.companyId);
    if (!deleted) return res.status(404).json({ error: 'Agent not found' });
    res.json({ ok: true });
  } catch (err) {
    const status = err?.message?.includes('Cannot delete') ? 403 : 500;
    res.status(status).json({ error: err?.message || 'Failed' });
  }
});

export default router;
