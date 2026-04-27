import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { auditLog } from '../utils/auditLogger.js';
import { paymentRateLimit } from '../middleware/security.js';
import {
  createPayment,
  getAllPayments,
  getPaymentsForUser,
  submitPaymentsToSwift,
  verifyPayment,
} from '../services/paymentService.js';
import { paymentSchema } from '../utils/validators.js';

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
  const payments = await getPaymentsForUser(req.user!.id);
  return res.json({ payments });
});

// Customer: submit a new payment
paymentRouter.post('/', paymentRateLimit, async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    auditLog('payment_validation_failed', { ip: req.ip, userId: req.user?.id, issues: parsed.error.flatten() });
    return res.status(400).json({ message: 'Invalid payment input.', errors: parsed.error.flatten() });
  }

  const payment = await createPayment(req.user!.id, parsed.data);
  auditLog('payment_created', { ip: req.ip, userId: req.user?.id, paymentId: payment?.id });
  return res.status(201).json({ message: 'Payment submitted successfully.', payment });
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
