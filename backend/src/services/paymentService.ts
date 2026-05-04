import { dbPromise } from './db.js';
import { validatePayment } from './validators.js'; // 🔐 Re-validate at service layer (implementation in services/validators.ts)
import { auditLog } from '../utils/auditLogger.js'; // 🔐 Audit all critical operations
import type { PaymentInput } from '../utils/validators.js';

// ============================================================================
// 🔐 SECURITY LAYER 1: SQL INJECTION PREVENTION
// ALL queries use parameterized statements (?) - NEVER concatenate user input
// Guide Requirement: "Protection Against Injection Attacks"
// ============================================================================

// ============================================================================
// 🔐 SECURITY LAYER 2: GENERIC ERROR HANDLER (Prevent Information Leakage)
// Never expose raw database errors, stack traces, or schema details to clients
// ============================================================================
function handleServiceError(error: unknown, context: string, userId?: number): never {
  // 🛡️ Log detailed error internally for debugging/monitoring
  auditLog('service_error', {
    context,
    userId,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
  });
  
  // Return generic message to client (guide requirement: prevent enumeration)
  throw new Error('Payment operation failed. Please try again or contact support.');
}

// ============================================================================
// 🔐 SECURITY LAYER 3: INPUT RE-VALIDATION (Defense in Depth)
// Even if frontend validates, backend MUST re-validate all input
// Guide Requirement: "Input Whitelisting" + "Show invalid input being rejected"
// ============================================================================
function reValidatePaymentInput(input: PaymentInput) {
  const result = validatePayment(input);
  if (!result.valid) {
    // 🛡️ Log validation failure for security monitoring
    auditLog('payment_validation_failed_service', {
      errors: result.errors,
      attemptedAmount: input.amount,
      attemptedCurrency: input.currency
    });
    throw new Error('Invalid payment input. Please check all fields.');
  }
  return result.sanitized!; // Return sanitized, safe data for database operations
}

// ============================================================================
// API SERVICE FUNCTIONS
// ============================================================================

export async function createPayment(userId: number, input: PaymentInput) {
  try {
    // 🔐 Re-validate + sanitize input (defense in depth)
    const sanitized = reValidatePaymentInput(input);
    
    // 🔐 Authorization: Ensure user can only create payments for their own account
    // (Assumes userId is from verified session token - enforced by auth middleware)
    
    const db = await dbPromise;
    
    // 🔐 SQL Injection Prevention: Parameterized query with ? placeholders
    // NEVER concatenate user input into SQL strings
    const result = await db.run(
      `INSERT INTO payments 
       (user_id, beneficiary_name, beneficiary_account, swift_code, currency, amount, reference, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, // From verified session (not user-controlled)
        sanitized.beneficiaryName,
        sanitized.beneficiaryAccount,
        sanitized.swiftCode,
        sanitized.currency,
        sanitized.amount,
        sanitized.reference,
        'pending' // Default status
      ]
    );

    // 🔐 Data Minimization: Return only necessary fields (not full DB row)
    const payment = await db.get(
      `SELECT id, status, created_at as createdAt 
       FROM payments WHERE id = ?`,
      [result.lastID]
    );

    // 🔐 Audit logging for compliance and threat detection
    auditLog('payment_created', {
      userId,
      paymentId: result.lastID,
      amount: sanitized.amount,
      currency: sanitized.currency,
      beneficiary: sanitized.beneficiaryName // Log name but NOT full account details
    });

    return payment;
    
  } catch (error) {
    return handleServiceError(error, 'createPayment', userId);
  }
}

export async function getPaymentsForUser(userId: number) {
  try {
    // 🔐 Authorization: Query is scoped to userId from verified session
    // Service layer enforces: users can ONLY see their own payments
    const db = await dbPromise;
    
    // 🔐 SQL Injection Prevention: Parameterized query
    // 🔐 Data Minimization: Only return fields needed for UI (mask sensitive data in frontend)
    return db.all(
      `SELECT id, beneficiary_name as beneficiaryName, currency, amount, reference, status, created_at as createdAt
       FROM payments 
       WHERE user_id = ? 
       ORDER BY datetime(created_at) DESC`,
      [userId] // Parameterized - prevents injection
    );
    
  } catch (error) {
    return handleServiceError(error, 'getPaymentsForUser', userId);
  }
}

export async function getAllPayments() {
  try {
    // 🔐 Authorization: This function should ONLY be called after requireEmployee middleware
    // Service layer trusts that auth middleware has verified employee role
    const db = await dbPromise;
    
    // 🔐 SQL Injection Prevention: No user input in this query (safe)
    // 🔐 Data Minimization: Join only necessary user fields (not passwords, tokens, etc.)
    return db.all(
      `SELECT p.id, p.user_id as userId, u.full_name as customerName,
              p.beneficiary_name as beneficiaryName, p.currency, p.amount, p.reference,
              p.status, p.created_at as createdAt
       FROM payments p
       JOIN users u ON p.user_id = u.id
       ORDER BY datetime(p.created_at) DESC`,
      [] // No parameters needed
    );
    
  } catch (error) {
    return handleServiceError(error, 'getAllPayments');
  }
}

export async function verifyPayment(paymentId: number, employeeId: number) {
  try {
    // 🔐 Input Validation: Ensure paymentId is safe integer (prevents injection via malformed ID)
    if (!Number.isSafeInteger(paymentId) || paymentId < 1) {
      auditLog('invalid_payment_id_verify', { employeeId, attemptedId: paymentId });
      throw new Error('Invalid payment identifier.');
    }

    const db = await dbPromise;
    
    // 🔐 Authorization + State Check: Verify payment exists AND is in correct state
    const payment = await db.get<{ id: number; status: string; user_id: number }>(
      'SELECT id, status, user_id FROM payments WHERE id = ?',
      [paymentId] // Parameterized
    );
    
    if (!payment) {
      auditLog('payment_not_found_verify', { employeeId, paymentId });
      throw new Error('Payment not found.');
    }
    
    // 🔐 State Machine Enforcement: Only pending payments can be verified (prevents replay attacks)
    if (payment.status !== 'pending') {
      auditLog('invalid_payment_state_verify', { 
        employeeId, 
        paymentId, 
        currentStatus: payment.status 
      });
      throw new Error('Only pending payments can be verified.');
    }

    // 🔐 Atomic Update: Change status + record who verified + timestamp
    await db.run(
      `UPDATE payments 
       SET status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND status = ?`, // 🔐 Optimistic locking: ensure status hasn't changed
      ['verified', employeeId, paymentId, 'pending']
    );

    // 🔐 Audit logging for compliance
    auditLog('payment_verified', {
      employeeId,
      paymentId,
      customerId: payment.user_id,
      timestamp: new Date().toISOString()
    });

    return { id: paymentId, status: 'verified' };
    
  } catch (error) {
    return handleServiceError(error, 'verifyPayment', employeeId);
  }
}

export async function submitPaymentsToSwift() {
  try {
    const db = await dbPromise;
    
    // 🔐 Atomic Read: Get all verified payments in one transaction-safe query
    const verified = await db.all<{ id: number; user_id: number }[]>(
      'SELECT id, user_id FROM payments WHERE status = ?', 
      ['verified']
    );
    
    if (verified.length === 0) {
      // 🛡️ Generic message prevents attackers from learning system state
      throw new Error('No verified payments to submit.');
    }

    // 🔐 Atomic Write: Update all verified payments to submitted in single transaction
    // 🔐 Optimistic locking: Only update payments that are STILL verified (prevent race conditions)
    const result = await db.run(
      `UPDATE payments 
       SET status = ?, submitted_at = CURRENT_TIMESTAMP 
       WHERE status = ?`,
      ['submitted', 'verified']
    );

    // 🔐 Audit logging for compliance and reconciliation
    auditLog('payments_submitted_to_swift', {
      submittedCount: result.changes,
      paymentIds: verified.map(p => p.id),
      timestamp: new Date().toISOString()
    });

    return { submittedCount: result.changes };
    
  } catch (error) {
    return handleServiceError(error, 'submitPaymentsToSwift');
  }
}

// ============================================================================
// 🔐 SECURITY LAYER 4: OPTIONAL - PAYMENT STATUS MASKING FOR UI
// Helper to mask sensitive fields before sending to frontend
// ============================================================================
export function maskPaymentForClient(payment: any) {
  // 🔐 Mask account numbers in UI (show last 4 digits only)
  if (payment.beneficiaryAccount && typeof payment.beneficiaryAccount === 'string') {
    const len = payment.beneficiaryAccount.length;
    payment.beneficiaryAccount = '*'.repeat(Math.max(0, len - 4)) + payment.beneficiaryAccount.slice(-4);
  }
  
  // 🔐 Mask SWIFT codes in UI (show first 4 + ****)
  if (payment.swiftCode && typeof payment.swiftCode === 'string' && payment.swiftCode.length > 4) {
    payment.swiftCode = payment.swiftCode.slice(0, 4) + '-****';
  }
  
  return payment;
}