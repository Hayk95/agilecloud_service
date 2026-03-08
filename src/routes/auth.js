import { Router } from 'express';
import jwt from 'jsonwebtoken';
import AppUser from '../models/AppUser.js';
import { createCompany, getCompanyById } from '../models/Company.js';
import { createAgent, authenticateAgent } from '../models/Agent.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'midas-app-secret-key';

// POST /api/auth/register – app/customer signup. Only creates AppUser.
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, lastName, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

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

// POST /api/auth/register-company
// Create Company + Agent (super_admin). Same flow as midas_admin register.
router.post('/register-company', async (req, res) => {
  try {
    const { companyName, name, email, password, phone, mcNumber, dotNumber } = req.body;

    if (!companyName?.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Your name is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const company = await createCompany({
      name: companyName.trim(),
      email: (email || '').trim().toLowerCase(),
      phone: phone || '',
      mcNumber: mcNumber || '',
      dotNumber: dotNumber || '',
    });

    const agent = await createAgent({
      email: (email || '').trim(),
      password,
      name: name.trim(),
      role: 'super_admin',
      companyId: company.companyId,
    });

    const token = jwt.sign(
      {
        agentId: agent.agentId,
        companyId: company.companyId,
        email: agent.email,
        name: agent.name,
        role: agent.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.status(201).json({
      ok: true,
      token,
      user: {
        agentId: agent.agentId,
        companyId: company.companyId,
        companyName: company.name,
        email: agent.email,
        name: agent.name,
        role: agent.role,
      },
    });
  } catch (err) {
    console.error('Register company error:', err);
    const msg = err?.message || 'Registration failed';
    const status = msg.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: msg });
  }
});

// POST /api/auth/admin-login – Agent login (for admin dashboard)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }
    const agent = await authenticateAgent(email, password);
    if (!agent) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }
    const company = await getCompanyById(agent.companyId);
    if (!company || !company.isActive) {
      return res.status(403).json({ ok: false, error: 'Company account is inactive' });
    }
    const token = jwt.sign(
      { agentId: agent.agentId, companyId: agent.companyId, email: agent.email, name: agent.name, role: agent.role },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    res.json({
      ok: true,
      token,
      user: {
        agentId: agent.agentId,
        companyId: agent.companyId,
        companyName: company.name,
        email: agent.email,
        name: agent.name,
        role: agent.role,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    const status = err?.message?.includes('deactivated') ? 403 : 500;
    res.status(status).json({ ok: false, error: err?.message || 'Login failed' });
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
