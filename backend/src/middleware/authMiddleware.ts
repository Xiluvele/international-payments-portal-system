import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { verifyJwt } from '../services/authService.js';

// ✅ Now async to match verifyJwt being async
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = await verifyJwt(token); // ✅ await added
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}