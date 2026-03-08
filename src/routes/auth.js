import { Router } from 'express';
import jwt from 'jsonwebtoken';
import AppUser from '../models/AppUser.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'midas-app-secret-key';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, lastName, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await AppUser.create({
      email: email.toLowerCase().trim(),
      password,
      name: (name && String(name).trim()) || null,
      lastName: (lastName && String(lastName).trim()) || null,
      phone: (phone && String(phone).trim()) || null,
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — get current user from token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await AppUser.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PATCH /api/auth/me — update profile (name, lastName, email, phone)
router.patch('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await AppUser.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, lastName, email, phone } = req.body;

    if (name !== undefined) user.name = String(name).trim() || null;
    if (lastName !== undefined) user.lastName = String(lastName).trim() || null;
    if (phone !== undefined) user.phone = String(phone).trim() || null;
    if (email !== undefined) {
      const newEmail = email ? String(email).toLowerCase().trim() : '';
      if (!newEmail) {
        return res.status(400).json({ error: 'Email is required' });
      }
      if (newEmail !== user.email) {
        const existing = await AppUser.findOne({ email: newEmail });
        if (existing) {
          return res.status(409).json({ error: 'An account with this email already exists' });
        }
        user.email = newEmail;
      }
    }

    await user.save();

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
