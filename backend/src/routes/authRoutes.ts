import { Router, type Response } from 'express';
import { env, isProduction } from '../config/env.js';
import { auditLog } from '../utils/auditLogger.js';
import { loginSchema, registerSchema } from '../utils/validators.js';
import { loginUser, registerUser, revokeToken, signJwt } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimit, csrfProtection } from '../middleware/security.js';

export const authRouter = Router();

function setAuthCookie(res: Response, token: string) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
}

authRouter.post('/register', authRateLimit, csrfProtection, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    auditLog('register_validation_failed', { ip: req.ip, issues: parsed.error.flatten() });
    return res.status(400).json({
      message: 'Invalid registration input.',
      ...(isProduction ? {} : { errors: parsed.error.flatten() }),
    });
  }

  try {
    const user = await registerUser(parsed.data);
    auditLog('register_success', { ip: req.ip, username: user.username });
    return res.status(201).json({ message: 'Registration successful.', user });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
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
    auditLog('login_failed', { ip: req.ip, username: parsed.data.username });
    return res.status(401).json({ message: (error as Error).message });
  }
});

// ✅ async added, await added to revokeToken
authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[env.cookieName];
  if (token) await revokeToken(token);
  res.clearCookie(env.cookieName);
  return res.json({ message: 'Logged out successfully.' });
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});