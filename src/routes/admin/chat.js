import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin-auth.js';
import * as Chat from '../../models/Chat.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const userId = req.query.userId;
    const conversations = userId
      ? await Chat.getAllConversations(req.adminUser.companyId) // filter by participant in service if needed
      : await Chat.getAllConversations(req.adminUser.companyId);
    res.json({ ok: true, conversations });
  } catch (err) {
    console.error('GET /api/admin/chat:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const conv = await Chat.createConversation({
      name: body.name || 'New Group',
      type: body.type || 'group',
      participants: body.participants || [],
      createdBy: req.adminUser.name || req.adminUser.agentId,
      companyId: req.adminUser.companyId,
    });
    res.json({ ok: true, conversation: conv });
  } catch (err) {
    console.error('POST /api/admin/chat:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:conversationId', requireAdmin, async (req, res) => {
  try {
    const conv = await Chat.getConversationById(req.params.conversationId, req.adminUser.companyId);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:conversationId/messages', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const before = req.query.before || null;
    const messages = await Chat.getMessages(req.params.conversationId, { limit, before });
    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/:conversationId/messages', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.content) return res.status(400).json({ error: 'Content is required' });
    const result = await Chat.addMessage(req.params.conversationId, {
      content: body.content,
      senderId: req.adminUser.agentId,
      senderName: req.adminUser.name || 'Admin',
      senderRole: req.adminUser.role || 'agent',
      type: body.type || 'text',
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
    });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.delete('/:conversationId', requireAdmin, async (req, res) => {
  try {
    const deleted = await Chat.deleteConversation(req.params.conversationId);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
