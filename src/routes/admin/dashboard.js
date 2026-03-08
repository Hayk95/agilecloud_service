import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAdmin } from '../../middleware/admin-auth.js';
import * as Quote from '../../models/Quote.js';
import * as Load from '../../models/Load.js';
import * as Task from '../../models/Task.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const companyId = req.adminUser.companyId;

    const allQuotes = await Quote.getAllQuotes(companyId);
    const quoteStats = {
      total: allQuotes.length,
      pending: allQuotes.filter(q => q.status === 'pending').length,
      priced: allQuotes.filter(q => q.status === 'priced').length,
      accepted: allQuotes.filter(q => q.status === 'accepted').length,
      paid: allQuotes.filter(q => q.status === 'paid').length,
    };
    const totalRevenue = allQuotes.reduce((sum, q) => sum + (q.paidAmount || 0), 0);
    const totalPriced = allQuotes.reduce((sum, q) => sum + (q.price || 0), 0);
    const outstanding = totalPriced - totalRevenue;
    const recentQuotes = allQuotes
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
      .map(q => ({
        quoteId: q.quoteId,
        from: q.formData?.from || '—',
        to: q.formData?.to || '—',
        email: q.formData?.email || '—',
        status: q.status,
        price: q.price,
        paidAmount: q.paidAmount || 0,
        createdAt: q.createdAt,
      }));

    const allLoads = await Load.getAllLoads({ companyId });
    const loadStats = {
      total: allLoads.length,
      active: allLoads.filter(l => !['delivered', 'cancelled'].includes(l.status)).length,
      delivered: allLoads.filter(l => l.status === 'delivered').length,
      cancelled: allLoads.filter(l => l.status === 'cancelled').length,
    };
    const loadRevenue = allLoads.reduce((sum, l) => sum + (l.bookingRate || 0), 0);
    const loadCost = allLoads.reduce((sum, l) => sum + (l.carrierRate || 0), 0);
    const loadProfit = loadRevenue - loadCost;

    const taskStats = await Task.getTasksStats({ companyId });

    const Agent = mongoose.models.Agent || mongoose.model('Agent', new mongoose.Schema({}, { strict: false }));
    const allAgents = await Agent.find({ companyId }).lean();
    const agentStats = {
      total: allAgents.length,
      active: allAgents.filter(a => a.isActive !== false).length,
    };

    const appUserSchema = new mongoose.Schema(
      { email: String, name: String, lastName: String, phone: String },
      { strict: false, timestamps: true, collection: 'appusers' }
    );
    const AppUser = mongoose.models.AppUser || mongoose.model('AppUser', appUserSchema);
    const allAppUsers = await AppUser.find({}).select('-password').sort({ createdAt: -1 }).lean();
    const userCount = allAppUsers.length;
    const recentUsers = allAppUsers.slice(0, 10).map(u => ({
      uid: u._id?.toString(),
      email: u.email || '—',
      displayName: [u.name, u.lastName].filter(Boolean).join(' ').trim() || null,
      photoURL: null,
      createdAt: u.createdAt,
    }));

    const now = new Date();
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = monthStart.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const monthQuotes = allQuotes.filter(q => {
        const d = new Date(q.createdAt || 0);
        return d >= monthStart && d <= monthEnd;
      });
      revenueByMonth.push({
        month: monthLabel,
        quotes: monthQuotes.length,
        revenue: monthQuotes.reduce((sum, q) => sum + (q.paidAmount || 0), 0),
        priced: monthQuotes.reduce((sum, q) => sum + (q.price || 0), 0),
      });
    }

    res.json({
      ok: true,
      quoteStats,
      loadStats,
      taskStats,
      agentStats,
      recentQuotes,
      recentUsers,
      userCount,
      revenue: {
        total: totalRevenue,
        priced: totalPriced,
        outstanding,
        loadRevenue,
        loadCost,
        loadProfit,
      },
      revenueByMonth,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard:', err);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

export default router;
