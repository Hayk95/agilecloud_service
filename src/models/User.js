import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    displayName: { type: String, default: null },
    photoURL: { type: String, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

/**
 * Upsert user from Firebase decoded token (same logic as Firebase Auth, saved in MongoDB).
 * Call after verifying ID token so every authenticated request syncs the user.
 */
export async function upsertUserFromDecoded(decoded) {
  if (!decoded?.uid) return null;
  const doc = await User.findOneAndUpdate(
    { uid: decoded.uid },
    {
      $set: {
        email: decoded.email ?? null,
        displayName: decoded.name ?? decoded.displayName ?? null,
        photoURL: decoded.picture ?? decoded.photoURL ?? null,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).lean();
  return doc;
}

export async function getUserByUid(uid) {
  if (!uid) return null;
  const doc = await User.findOne({ uid }).lean();
  return doc;
}

export default User;
