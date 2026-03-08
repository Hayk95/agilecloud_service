/**
 * Sync quotes to Firestore (same logic as Next.js quotes-backend).
 * Optional: only runs when FIREBASE_SERVICE_ACCOUNT_JSON is set.
 */
import { getAdminFirestore } from '../config/firebase-admin.js';

const QUOTES_COLLECTION = 'quotes';

function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map((item) => sanitizeForFirestore(item)).filter((v) => v !== undefined);
  if (typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val === undefined) continue;
      const sanitized = sanitizeForFirestore(val);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return obj;
}

export async function syncQuoteToFirestore({ quoteId, userId, formData, vehicles, status, price, priceUpdatedAt }) {
  try {
    const db = getAdminFirestore();
    if (!db) return false;
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    await ref.set({
      userId: userId ?? null,
      formData: sanitizeForFirestore(formData ?? {}),
      vehicles: sanitizeForFirestore(vehicles ?? []),
      status: status ?? 'pending',
      price: price ?? null,
      priceUpdatedAt: priceUpdatedAt ?? null,
      createdAt: new Date(),
    });
    return true;
  } catch (err) {
    console.error('firestore-sync: create error', err);
    return false;
  }
}

export async function syncQuotePriceToFirestore(quoteId, price) {
  try {
    const db = getAdminFirestore();
    if (!db) return false;
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.update({
      price,
      status: 'priced',
      priceUpdatedAt: new Date(),
    });
    return true;
  } catch (err) {
    console.error('firestore-sync: update price error', err);
    return false;
  }
}
