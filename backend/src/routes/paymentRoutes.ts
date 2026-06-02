import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { auditLog } from '../utils/auditLogger.js';
import { paymentRateLimit } from '../middleware/security.js';
import {
  createPayment,
  findRecentSimilarPayment,
  getAllPayments,
  getPaymentsForUser,
  submitPaymentsToSwift,
  verifyPayment,
} from '../services/paymentService.js';
import { paymentSchema, regexRules } from '../utils/validators.js';

export const paymentRouter = Router();

paymentRouter.use(requireAuth);

function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'employee') {
    return res.status(403).json({ message: 'Access denied. Employee access only.' });
  }
  next();
}

// Customer: get their own payments
paymentRouter.get('/', async (req, res) => {
  // Wrapped: a service-layer throw here must return a clean error, not become an
  // unhandled promise rejection that crashes the whole process (Node 22 behaviour).
  try {
    const payments = await getPaymentsForUser(req.user!.id);
    return res.json({ payments });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
});

// Customer: check for a recent similar payment (same beneficiary account + SWIFT
// within the last 24h). GET so no CSRF token is needed — it's a read-only convenience
// check used to warn the user before they submit a possible duplicate.
paymentRouter.get('/check-duplicate', async (req, res) => {
  const account = String(req.query.beneficiaryAccount ?? '').replace(/\s/g, '');
  const swift = String(req.query.swiftCode ?? '').replace(/\s/g, '').toUpperCase();

  if (!regexRules.accountNumber.test(account) || !regexRules.swiftCode.test(swift)) {
    return res.status(400).json({ message: 'Invalid account or SWIFT code.' });
  }

  try {
    const previous = await findRecentSimilarPayment(req.user!.id, account, swift);
    return res.json({ duplicate: Boolean(previous), previous: previous ?? null });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
});

// Customer: submit a new payment
paymentRouter.post('/', paymentRateLimit, async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    auditLog('payment_validation_failed', { ip: req.ip, userId: req.user?.id, issues: parsed.error.flatten() });
    return res.status(400).json({ message: 'Invalid payment input.', errors: parsed.error.flatten() });
  }

  // Wrapped: createPayment re-validates + hits the DB and throws on failure. Without
  // this catch the rejection is unhandled and the entire server crashes (taking down
  // login and every other route), instead of failing just this one request.
  try {
    const payment = await createPayment(req.user!.id, parsed.data);
    auditLog('payment_created', { ip: req.ip, userId: req.user?.id, paymentId: payment?.id });
    return res.status(201).json({ message: 'Payment submitted successfully.', payment });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
});

// Employee: get all payments across all customers
paymentRouter.get('/all', requireEmployee, async (_req, res) => {
  const payments = await getAllPayments();
  return res.json({ payments });
});

// Employee: submit all verified payments to SWIFT — registered before /:id to avoid route conflict
paymentRouter.post('/submit-to-swift', requireEmployee, async (req, res) => {
  try {
    const result = await submitPaymentsToSwift();
    auditLog('payments_submitted_to_swift', { ip: req.ip, employeeId: req.user?.id, count: result.submittedCount });
    return res.json({ message: `${result.submittedCount} payment(s) submitted to SWIFT successfully.`, ...result });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});

// Employee: verify a single payment
paymentRouter.patch('/:id/verify', requireEmployee, async (req, res) => {
  const paymentId = Number(req.params.id);
  if (!Number.isInteger(paymentId) || paymentId < 1) {
    return res.status(400).json({ message: 'Invalid payment ID.' });
  }
  try {
    const payment = await verifyPayment(paymentId, req.user!.id);
    auditLog('payment_verified', { ip: req.ip, employeeId: req.user?.id, paymentId });
    return res.json({ message: 'Payment verified.', payment });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});
