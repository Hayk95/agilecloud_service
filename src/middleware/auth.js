/**
 * Verify Firebase ID token from Authorization: Bearer <token>.
 * Syncs user to MongoDB (same logic as Firebase Auth, saved in DB). Attaches req.uid when valid.
 */
import { getAdminAuth } from '../config/firebase-admin.js';
import { upsertUserFromDecoded } from '../models/User.js';

export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
  }
  try {
    const auth = getAdminAuth();
    if (!auth) {
      return res.status(503).json({ error: 'Auth not configured', message: 'FIREBASE_SERVICE_ACCOUNT_JSON not set' });
    }
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded?.uid ?? null;
    if (!req.uid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
    try {
      await upsertUserFromDecoded(decoded);
    } catch (dbErr) {
      console.error('auth: sync user to MongoDB failed', dbErr);
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Optional auth: if token present and valid, set req.uid and sync user to MongoDB; otherwise req.uid = null.
 */
export async function optionalFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  req.uid = null;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7).trim();
  if (!token) return next();
  try {
    const auth = getAdminAuth();
    if (!auth) return next();
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded?.uid ?? null;
    if (req.uid) {
      try {
        await upsertUserFromDecoded(decoded);
      } catch (dbErr) {
        console.error('auth: sync user to MongoDB failed', dbErr);
      }
    }
  } catch (_) {
    // ignore invalid token for optional auth
  }
  next();
}
