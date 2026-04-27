import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { verifyJwt } from '../services/authService.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}
