import { Router, type Response } from 'express';
import { env, isProduction } from '../config/env.js';
import { auditLog } from '../utils/auditLogger.js';
import { loginSchema } from '../utils/validators.js';
import { AccountLockedError, loginUser, revokeToken, signJwt } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimit, csrfProtection } from '../middleware/security.js';

export const authRouter = Router();

function setAuthCookie(res: Response, token: string) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000,
  });
}

// Self-registration is disabled by policy. All accounts are pre-provisioned by the bank.
// Endpoint kept (returns 403 + audit event) so probes are logged rather than 404-ing.
authRouter.post('/register', authRateLimit, (req, res) => {
  auditLog('register_attempt_blocked', { ip: req.ip });
  return res.status(403).json({
    message: 'Self-registration is disabled. Contact your bank to provision an account.',
  });
});

authRouter.post('/login', authRateLimit, csrfProtection, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    auditLog('login_validation_failed', { ip: req.ip, issues: parsed.error.flatten() });
    return res.status(400).json({
      message: 'Invalid login input.',
      ...(isProduction ? {} : { errors: parsed.error.flatten() }),
    });
  }

  try {
    const user = await loginUser(parsed.data);
    const token = signJwt(user);
    setAuthCookie(res, token);
    auditLog('login_success', { ip: req.ip, username: user.username });
    return res.json({ message: 'Login successful.', user });
  } catch (error) {
    if (error instanceof AccountLockedError) {
      auditLog('login_blocked_account_locked', {
        ip: req.ip,
        username: parsed.data.username,
        lockedUntil: error.lockedUntil.toISOString(),
      });
      return res.status(423).json({ message: error.message });
    }
    auditLog('login_failed', { ip: req.ip, username: parsed.data.username });
    return res.status(401).json({ message: (error as Error).message });
  }
});

//  async added, await added to revokeToken
authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[env.cookieName];
  if (token) await revokeToken(token);
res.clearCookie(env.cookieName,{
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });
  return res.json({ message: 'Logged out successfully.' });
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});