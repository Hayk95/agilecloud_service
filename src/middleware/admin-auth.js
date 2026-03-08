/**
 * Admin/Agent JWT auth middleware for Express.
 * Verifies Bearer token with agentId, companyId in payload.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'midas-app-secret-key';

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.agentId || !decoded.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.adminUser = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export function requireSuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.agentId || !decoded.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (decoded.role !== 'super_admin' && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    }
    req.adminUser = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
