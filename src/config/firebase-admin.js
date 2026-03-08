import admin from 'firebase-admin';

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const serviceAccount = typeof json === 'string' ? JSON.parse(json) : json;
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    if (!admin.apps?.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    initialized = true;
    return admin;
  } catch (err) {
    console.error('firebase-admin init error:', err);
    return null;
  }
}

export function getAdminAuth() {
  const adminInstance = initFirebaseAdmin();
  return adminInstance?.auth() ?? null;
}

export function getAdminFirestore() {
  const adminInstance = initFirebaseAdmin();
  if (!adminInstance) return null;
  return adminInstance.firestore();
}
