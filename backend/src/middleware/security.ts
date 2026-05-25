import cookieParser from 'cookie-parser';
import cors from 'cors';
import csrf from 'csurf';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Express, Request, Response, NextFunction } from 'express';
import { env, isProduction } from '../config/env.js';

const devFrontendOrigins = new Set([
  env.frontendOrigin,
  'https://localhost:5173',
  'https://127.0.0.1:5173',
]);

function corsOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (isProduction) {
    callback(null, origin === env.frontendOrigin);
    return;
  }
  callback(null, devFrontendOrigins.has(origin));
}

export function applySecurity(app: Express) {
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  const connectSrc = isProduction
    ? ["'self'", env.frontendOrigin]
    : ["'self'", ...devFrontendOrigins];

  app.use(
    helmet({
      frameguard: { action: 'deny' },
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc,
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Permissions-Policy: restrict browser feature access
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests. Please try again later.' },
    }),
  );
}

// Stricter limiter for login and register — 10 attempts per 15 minutes.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Payment limiter — 30 submissions per 15 minutes per IP.
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment requests. Please try again later.' },
});

export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  },
});
