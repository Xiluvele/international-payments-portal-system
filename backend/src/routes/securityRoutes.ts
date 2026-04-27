import { Router } from 'express';
import { csrfProtection } from '../middleware/security.js';

export const securityRouter = Router();

securityRouter.get('/csrf-token', csrfProtection, (req, res) => {
  return res.json({ csrfToken: req.csrfToken() });
});
