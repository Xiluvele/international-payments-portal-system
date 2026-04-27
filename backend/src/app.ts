import express from 'express';
import { applySecurity, csrfProtection } from './middleware/security.js';
import { authRouter } from './routes/authRoutes.js';
import { paymentRouter } from './routes/paymentRoutes.js';
import { securityRouter } from './routes/securityRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Trust one hop from a reverse proxy (nginx/load balancer) so Express reads
  // the real client IP from X-Forwarded-For instead of the proxy's address.
  app.set('trust proxy', 1);

  applySecurity(app);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/security', securityRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/payments', csrfProtection, paymentRouter);

  app.use(errorHandler);

  return app;
}
