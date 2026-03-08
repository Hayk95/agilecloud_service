/**
 * Quote routes – same logic as Next.js API (create, list by user, update price).
 * Works with MongoDB; optionally syncs to Firestore for same logic as Firebase.
 * Supports both Firebase tokens (website) and App JWT tokens (mobile app).
 */
import { Router } from 'express';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { verifyFirebaseToken, optionalFirebaseToken } from '../middleware/auth.js';
import * as Quote from '../models/Quote.js';
import { syncQuoteToFirestore, syncQuotePriceToFirestore } from '../lib/firestore-sync.js';
import { emitQuoteUpdate } from '../lib/socket.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'midas-app-secret-key';
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

/**
 * Middleware: Try Firebase token first, then fallback to App JWT.
 * Sets req.uid (Firebase uid or app userId) and req.appEmail.
 */
async function optionalAnyToken(req, res, next) {
  req.uid = null;
  req.appUserId = null;
  req.appEmail = null;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7).trim();
  if (!token) return next();

  // 1. Try Firebase token
  try {
    const { getAdminAuth } = await import('../config/firebase-admin.js');
    const auth = getAdminAuth();
    if (auth) {
      const decoded = await auth.verifyIdToken(token);
      if (decoded?.uid) {
        req.uid = decoded.uid;
        return next();
      }
    }
  } catch (_) {
    // Not a valid Firebase token – try app JWT
  }

  // 2. Try App JWT token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.uid = `app:${decoded.userId}`;
    req.appUserId = decoded.userId;
    req.appEmail = decoded.email;
  } catch (_) {
    // Invalid token – continue without auth
  }

  next();
}

/** POST /api/quotes – create a quote (optional auth; if present, sets userId). Same as Next.js POST /api/quotes. */
router.post('/', optionalAnyToken, async (req, res) => {
  try {
    // Use actual user id (app userId or Firebase uid) so website and app see the same quotes
    const userId = req.appUserId ? String(req.appUserId) : (req.uid || null);
    const { formData, vehicles } = req.body || {};
    const quoteId = nanoid(10);
    await Quote.createQuote({
      quoteId,
      userId,
      formData: formData || {},
      vehicles: vehicles || [],
    });
    await syncQuoteToFirestore({
      quoteId,
      userId,
      formData: formData || {},
      vehicles: vehicles || [],
      status: 'pending',
      price: null,
    });
    res.status(201).json({ quoteId });
  } catch (err) {
    console.error('POST /api/quotes:', err);
    res.status(500).json({ error: err?.message || 'Failed to create quote' });
  }
});

/** GET /api/quotes – list quotes for the authenticated user (Firebase). */
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.uid;
    const quotes = await Quote.getQuotesByUserId(uid);
    res.json({ quotes });
  } catch (err) {
    console.error('GET /api/quotes:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch quotes', quotes: [] });
  }
});

/** GET /api/quotes/my – list quotes for mobile app user (App JWT). */
router.get('/my', optionalAnyToken, async (req, res) => {
  try {
    if (!req.uid) {
      return res.status(401).json({ error: 'Authentication required', quotes: [] });
    }
    // Same userId as website (actual id, not "app:xxx") so quotes are shared
    const userId = req.appUserId ? String(req.appUserId) : req.uid;
    const quotes = await Quote.getQuotesByUserId(userId);

    // Also search by email in formData (catches old quotes submitted before auth was linked)
    let emailQuotes = [];
    if (req.appEmail) {
      emailQuotes = await Quote.getQuotesByEmail(req.appEmail);
    }

    // Merge and deduplicate by quoteId
    const allQuotes = [...quotes];
    const existingIds = new Set(allQuotes.map(q => q.quoteId));
    for (const q of emailQuotes) {
      if (!existingIds.has(q.quoteId)) {
        allQuotes.push(q);
        existingIds.add(q.quoteId);
      }
    }

    // Sort newest first
    allQuotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ quotes: allQuotes });
  } catch (err) {
    console.error('GET /api/quotes/my:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch quotes', quotes: [] });
  }
});

/**
 * PATCH /api/quotes/:quoteId/price – update quote pricing.
 * Supports both old format { price } and new format { totalPrice, acceptPrice, paidAmount }.
 */
router.patch('/:quoteId/price', async (req, res) => {
  try {
    const { quoteId } = req.params;
    if (!quoteId) return res.status(400).json({ error: 'quoteId required' });

    const totalPrice = req.body?.totalPrice ?? req.body?.price;
    const acceptPrice = req.body?.acceptPrice;
    const paidAmount = req.body?.paidAmount;

    // Parse
    const parsedTotal = totalPrice != null ? parseFloat(totalPrice) : undefined;
    const parsedAccept = acceptPrice != null ? parseFloat(acceptPrice) : undefined;
    const parsedPaid = paidAmount != null ? parseFloat(paidAmount) : undefined;

    if (parsedTotal === undefined && parsedAccept === undefined && parsedPaid === undefined) {
      return res.status(400).json({ error: 'totalPrice, acceptPrice, or paidAmount required' });
    }

    const updated = await Quote.updateQuotePricing(quoteId, {
      totalPrice: parsedTotal,
      acceptPrice: parsedAccept,
      paidAmount: parsedPaid,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    try { await syncQuotePriceToFirestore(quoteId, updated.price); } catch (_) {}

    // Emit socket event for real-time update to all connected clients
    emitQuoteUpdate(updated.userId, {
      quoteId: updated.quoteId,
      userId: updated.userId,
      status: updated.status,
      price: updated.price,
      acceptPrice: updated.acceptPrice ?? 0,
      paidAmount: updated.paidAmount ?? 0,
      priceUpdatedAt: updated.priceUpdatedAt,
    });

    res.json({
      ok: true,
      quoteId,
      totalPrice: updated.price,
      acceptPrice: updated.acceptPrice,
      paidAmount: updated.paidAmount,
      status: updated.status,
    });
  } catch (err) {
    console.error('PATCH /api/quotes/:quoteId/price:', err);
    res.status(500).json({ error: err?.message || 'Failed to update price' });
  }
});

/** POST /api/quotes/:quoteId/pay – create Stripe checkout session (mobile app). */
router.post('/:quoteId/pay', optionalAnyToken, async (req, res) => {
  try {
    if (!req.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const { quoteId } = req.params;
    const QuoteModel = (await import('../models/Quote.js')).default;
    const quote = await QuoteModel.findOne({ quoteId }).lean();

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const totalPrice = Number(quote.price) || 0;
    if (totalPrice <= 0) {
      return res.status(400).json({ error: 'Quote has no price set yet' });
    }

    const paidAmount = Number(quote.paidAmount) || 0;
    const remaining = totalPrice - paidAmount;
    if (remaining <= 0) {
      return res.status(400).json({ error: 'Quote already fully paid' });
    }

    // Use provided amount or remaining balance
    let paymentAmount = req.body?.amount ? Number(req.body.amount) : remaining;
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      paymentAmount = remaining;
    }
    if (paymentAmount > remaining) {
      paymentAmount = remaining;
    }

    const from = quote.formData?.from || quote.formData?.zipFrom || '—';
    const to = quote.formData?.to || quote.formData?.zipTo || '—';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Quote ${quoteId}`,
              description: `Shipment: ${from} → ${to}`,
            },
            unit_amount: Math.round(paymentAmount * 100),
          },
          quantity: 1,
        },
      ],
      // For mobile, use a deep link or a success page
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?paid=1`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`,
      metadata: { quoteId, paymentAmount: String(paymentAmount) },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('POST /api/quotes/:quoteId/pay:', err);
    res.status(500).json({ error: err?.message || 'Payment session failed' });
  }
});

/** POST /api/quotes/stripe-webhook – handle Stripe webhooks for payment completion. */
router.post('/stripe-webhook', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const quoteId = session.metadata?.quoteId;
    const paymentAmount = session.metadata?.paymentAmount
      ? parseFloat(session.metadata.paymentAmount)
      : session.amount_total ? session.amount_total / 100 : 0;

    if (quoteId && paymentAmount > 0) {
      try {
        const QuoteModel = (await import('../models/Quote.js')).default;
        const current = await QuoteModel.findOne({ quoteId }).lean();
        if (current) {
          const newPaid = (current.paidAmount || 0) + paymentAmount;
          const total = current.price || 0;
          const accept = current.acceptPrice || 0;

          let newStatus = current.status;
          let paidAt = current.paidAt;
          let acceptedAt = current.acceptedAt;

          if (newPaid >= total) {
            newStatus = 'paid';
            paidAt = new Date();
          } else if (accept > 0 && newPaid >= accept) {
            newStatus = 'accepted';
            if (!acceptedAt) acceptedAt = new Date();
          } else if (newPaid > 0) {
            newStatus = 'partial';
          }

          const updated = await QuoteModel.findOneAndUpdate(
            { quoteId },
            {
              $set: {
                paidAmount: newPaid,
                status: newStatus,
                paidAt,
                acceptedAt,
                stripePaymentId: session.payment_intent || current.stripePaymentId,
              },
            },
            { new: true },
          ).lean();

          // Emit socket update
          if (updated) {
            emitQuoteUpdate(updated.userId, {
              quoteId: updated.quoteId,
              userId: updated.userId,
              status: updated.status,
              price: updated.price,
              acceptPrice: updated.acceptPrice ?? 0,
              paidAmount: updated.paidAmount ?? 0,
              paidAt: updated.paidAt,
              acceptedAt: updated.acceptedAt,
            });
          }
        }
      } catch (dbErr) {
        console.error('Stripe webhook DB update failed:', dbErr);
      }
    }
  }

  res.json({ received: true });
});

export default router;
