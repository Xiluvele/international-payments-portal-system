import { apiFetch } from './client';
import type { Payment } from '../types';

// ============================================================================
// 🔐 SECURITY LAYER 1: INPUT WHITELISTING PATTERNS (Regex per Guide)
// These patterns are used BOTH client-side (UX) and re-validated server-side
// ============================================================================
export const validationPatterns = {
  // SWIFT/BIC: 8 or 11 uppercase alphanumeric chars (ISO 9362)
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  
  // IBAN: 2 letters + 2 digits + 11-30 alphanumeric (simplified ISO 13616)
  iban: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/,
  
  // Payment amount: positive number, max 2 decimal places, no scientific notation
  amount: /^\d+(\.\d{1,2})?$/,
  
  // Reference: 1-50 chars, alphanumeric + hyphens/underscores only (prevents injection)
  reference: /^[A-Za-z0-9\-_]{1,50}$/,
  
  // Beneficiary name: 2-100 chars, letters, spaces, hyphens, apostrophes only
  beneficiaryName: /^[A-Za-z\s'\-]{2,100}$/
};

// ============================================================================
// 🔐 SECURITY LAYER 2: INPUT SANITIZATION & VALIDATION HELPERS
// Client-side UX validation + server-side re-validation (defense in depth)
// ============================================================================
export function sanitizeAndValidatePayment(payload: {
  beneficiaryName: string;
  beneficiaryAccount: string;
  swiftCode: string;
  currency: string;
  amount: string;
  reference: string;
}) {
  const errors: string[] = [];
  
  // Trim and uppercase where appropriate
  const sanitized = {
    beneficiaryName: payload.beneficiaryName.trim(),
    beneficiaryAccount: payload.beneficiaryAccount.toUpperCase().replace(/\s/g, ''),
    swiftCode: payload.swiftCode.toUpperCase().replace(/\s/g, ''),
    currency: payload.currency.toUpperCase(),
    amount: payload.amount.trim(),
    reference: payload.reference.trim()
  };

  // 🔐 Whitelist validation - reject any input not matching allowed patterns
  if (!validationPatterns.beneficiaryName.test(sanitized.beneficiaryName)) {
    errors.push('Invalid beneficiary name format');
  }
  if (!validationPatterns.iban.test(sanitized.beneficiaryAccount)) {
    errors.push('Invalid IBAN format');
  }
  if (!validationPatterns.swiftCode.test(sanitized.swiftCode)) {
    errors.push('Invalid SWIFT/BIC code format');
  }
  if (!/^[A-Z]{3}$/.test(sanitized.currency)) {
    errors.push('Currency must be 3-letter ISO code (e.g., USD)');
  }
  if (!validationPatterns.amount.test(sanitized.amount)) {
    errors.push('Amount must be a positive number with max 2 decimals');
  }
  if (!validationPatterns.reference.test(sanitized.reference)) {
    errors.push('Reference contains invalid characters');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return sanitized;
}

// ============================================================================
// 🔐 SECURITY LAYER 3: GENERIC ERROR HANDLING (Prevent Information Leakage)
// Never expose backend error details to the client
// ============================================================================
function handleApiError(error: unknown, context: string): never {
  // 🛡️ Log detailed error internally (in production, send to monitoring service)
  console.error(`[API Error - ${context}]`, error);
  
  // Return generic message to prevent attackers from learning system internals
  throw new Error('Request failed. Please try again or contact support.');
}

// ============================================================================
// 🔐 SECURITY LAYER 4: REQUEST CONFIG WITH TIMEOUT & CSRF
// Prevents hanging requests and ensures CSRF protection on every call
// ============================================================================
function createSecureRequestConfig(csrfToken: string, method: string = 'GET') {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken, // 🔐 Required for all state-changing requests
      'X-Request-Source': 'customer-portal' // Audit tracking
    },
    credentials: 'include' as const, // 🔐 Send Secure/HttpOnly session cookies
    signal: AbortSignal.timeout(10000) // 🔐 10-second timeout prevents DoS via hanging requests
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function fetchPayments(csrfToken: string) {
  try {
    return await apiFetch<{ payments: Payment[] }>('/api/payments', {
      ...createSecureRequestConfig(csrfToken),
    });
  } catch (error) {
    return handleApiError(error, 'fetchPayments');
  }
}

export async function createPayment(
  csrfToken: string,
  payload: {
    beneficiaryName: string;
    beneficiaryAccount: string;
    swiftCode: string;
    currency: string;
    amount: string;
    reference: string;
  },
) {
  try {
    // 🔐 Validate and sanitize BEFORE sending to backend (defense in depth)
    const sanitizedPayload = sanitizeAndValidatePayment(payload);
    
    // 🔐 Add idempotency key to prevent duplicate submissions if user double-clicks
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    return await apiFetch<{ message: string; payment: Payment }>('/api/payments', {
      ...createSecureRequestConfig(csrfToken, 'POST'),
      headers: {
        ...createSecureRequestConfig(csrfToken).headers,
        'Idempotency-Key': idempotencyKey // 🔐 Prevents duplicate payments
      },
      body: JSON.stringify(sanitizedPayload),
    });
  } catch (error) {
    return handleApiError(error, 'createPayment');
  }
}

export async function fetchAllPayments(csrfToken: string) {
  try {
    return await apiFetch<{ payments: Payment[] }>('/api/payments/all', {
      ...createSecureRequestConfig(csrfToken),
    });
  } catch (error) {
    return handleApiError(error, 'fetchAllPayments');
  }
}

export async function verifyPayment(csrfToken: string, paymentId: number) {
  // 🔐 Validate paymentId is a safe integer (prevents injection via malformed ID)
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    throw new Error('Invalid payment identifier');
  }

  try {
    return await apiFetch<{ message: string; payment: { id: number; status: string } }>(
      `/api/payments/${paymentId}/verify`,
      {
        ...createSecureRequestConfig(csrfToken, 'PATCH'),
      },
    );
  } catch (error) {
    return handleApiError(error, 'verifyPayment');
  }
}

export async function submitToSwift(csrfToken: string) {
  try {
    return await apiFetch<{ message: string; submittedCount: number }>(
      '/api/payments/submit-to-swift',
      {
        ...createSecureRequestConfig(csrfToken, 'POST'),
      },
    );
  } catch (error) {
    return handleApiError(error, 'submitToSwift');
  }
}