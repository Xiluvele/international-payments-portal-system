import express from 'express';
import helmet from 'helmet';

import { applySecurity, csrfProtection } from './middleware/security.js';
import { authRouter } from './routes/authRoutes.js';
import { paymentRouter } from './routes/paymentRoutes.js';
import { securityRouter } from './routes/securityRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Trust proxy (keep this if you're behind nginx / hosting platform)
  app.set('trust proxy', 1);

  // Step 1: Basic Helmet protection (including X-Frame-Options)
  app.use(
    helmet({
      frameguard: { action: "deny" }, // adds X-Frame-Options: DENY
    })
  );

  // Step 2: Strong CSP clickjacking protection (modern standard)
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors 'none';"
    );
    next();
  });

  // Your existing security middleware
  applySecurity(app);

  // Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/security', securityRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/payments', csrfProtection, paymentRouter);

  // Error handler (must stay last)
  app.use(errorHandler);

  return app;
}