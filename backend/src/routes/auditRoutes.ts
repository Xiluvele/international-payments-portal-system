import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { auditLog, readRecentAuditEntries } from '../utils/auditLogger.js';

export const auditRouter = Router();

auditRouter.use(requireAuth);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    auditLog('audit_access_denied', { ip: req.ip, userId: req.user?.id, role: req.user?.role });
    return res.status(403).json({ message: 'Access denied. Audit access is restricted to administrators.' });
  }
  next();
}

auditRouter.get('/recent', requireAdmin, (req, res) => {
  const requested = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 200) : 50;
  const entries = readRecentAuditEntries(limit);
  auditLog('audit_log_viewed', { ip: req.ip, adminId: req.user?.id, returned: entries.length });
  return res.json({ entries });
});
