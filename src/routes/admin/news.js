import { Router } from 'express';
import { requireSuperAdmin } from '../../middleware/admin-auth.js';
import * as News from '../../models/News.js';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const news = await News.getAllNews(req.adminUser.companyId);
    res.json({ news });
  } catch (err) {
    console.error('GET /api/admin/news:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body;
    if (!body.title?.trim()) return res.status(400).json({ error: 'Title is required' });
    const article = await News.createNews({
      title: body.title.trim(),
      excerpt: body.excerpt || '',
      content: body.content || '',
      coverImage: body.coverImage || '',
      author: body.author || req.adminUser.name || 'MidasWay Logistics',
      companyId: req.adminUser.companyId,
      published: body.published ?? false,
      tags: body.tags || [],
    });
    res.json({ article });
  } catch (err) {
    console.error('POST /api/admin/news:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.get('/:newsId', requireSuperAdmin, async (req, res) => {
  try {
    const article = await News.getNewsById(req.params.newsId);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

router.put('/:newsId', requireSuperAdmin, async (req, res) => {
  try {
    const article = await News.updateNews(req.params.newsId, req.body);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed to update' });
  }
});

router.delete('/:newsId', requireSuperAdmin, async (req, res) => {
  try {
    await News.deleteNews(req.params.newsId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed to delete' });
  }
});

export default router;
