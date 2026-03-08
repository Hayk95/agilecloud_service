import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const appUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: null },
    lastName: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
appUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
appUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const AppUser = mongoose.models.AppUser || mongoose.model('AppUser', appUserSchema);

export default AppUser;
