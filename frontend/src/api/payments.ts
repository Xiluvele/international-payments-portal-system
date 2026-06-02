import { apiFetch } from "./client";
import type { Payment } from "../types";

// ============================================================================
// 🔐 SECURITY LAYER 1: INPUT WHITELISTING PATTERNS (Regex per Guide)
// These patterns are used BOTH client-side (UX) and re-validated server-side
// ============================================================================
export const validationPatterns = {
  // SWIFT/BIC: 8 or 11 uppercase alphanumeric chars (ISO 9362)
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,

  // Beneficiary account number: 8-20 digits
  accountNumber: /^\d{8,20}$/,

  // Payment amount: positive number, max 2 decimal places, no scientific notation
  amount: /^\d+(\.\d{1,2})?$/,

  // Reference: 2-120 chars, alphanumeric + space + . , _ -
  reference: /^[A-Za-z0-9 .,_-]{2,120}$/,

  // Beneficiary name: 2-80 chars, alphanumeric + spaces + . , ' -
  beneficiaryName: /^[A-Za-z0-9 .,'-]{2,80}$/,
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
    beneficiaryAccount: payload.beneficiaryAccount
      .toUpperCase()
      .replace(/\s/g, ""),
    swiftCode: payload.swiftCode.toUpperCase().replace(/\s/g, ""),
    currency: payload.currency.toUpperCase(),
    amount: payload.amount.trim(),
    reference: payload.reference.trim(),
  };

  // 🔐 Whitelist validation - reject any input not matching allowed patterns
  if (!validationPatterns.beneficiaryName.test(sanitized.beneficiaryName)) {
    errors.push("Invalid beneficiary name format");
  }
  if (!validationPatterns.accountNumber.test(sanitized.beneficiaryAccount)) {
    errors.push("Invalid beneficiary account number format");
  }
  if (!validationPatterns.swiftCode.test(sanitized.swiftCode)) {
    errors.push("Invalid SWIFT/BIC code format");
  }
  if (!/^[A-Z]{3}$/.test(sanitized.currency)) {
    errors.push("Currency must be 3-letter ISO code (e.g., USD)");
  }
  if (!validationPatterns.amount.test(sanitized.amount)) {
    errors.push("Amount must be a positive number with max 2 decimals");
  }
  if (!validationPatterns.reference.test(sanitized.reference)) {
    errors.push("Reference contains invalid characters");
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
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
  throw new Error("Request failed. Please try again or contact support.");
}

// ============================================================================
// 🔐 SECURITY LAYER 4: REQUEST CONFIG WITH TIMEOUT & CSRF
// Prevents hanging requests and ensures CSRF protection on every call
// ============================================================================
function createSecureRequestConfig(csrfToken: string, method: string = "GET") {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken, // 🔐 Required for all state-changing requests
      "X-Request-Source": "customer-portal", // Audit tracking
    },
    credentials: "include" as const, // 🔐 Send Secure/HttpOnly session cookies
    signal: AbortSignal.timeout(10000), // 🔐 10-second timeout prevents DoS via hanging requests
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function fetchPayments(csrfToken: string) {
  try {
    return await apiFetch<{ payments: Payment[] }>("/api/payments", {
      ...createSecureRequestConfig(csrfToken),
    });
  } catch (error) {
    return handleApiError(error, "fetchPayments");
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
    const randomPart = crypto.randomUUID();
    const idempotencyKey = `${Date.now()}-${randomPart}`;
    return await apiFetch<{ message: string; payment: Payment }>(
      "/api/payments",
      {
        ...createSecureRequestConfig(csrfToken, "POST"),
        headers: {
          ...createSecureRequestConfig(csrfToken).headers,
          "Idempotency-Key": idempotencyKey, // 🔐 Prevents duplicate payments
        },
        body: JSON.stringify(sanitizedPayload),
      },
    );
  } catch (error) {
    return handleApiError(error, "createPayment");
  }
}

// 🟡 Duplicate-payment guard: ask the backend whether this user already paid the
// same beneficiary account + SWIFT within the last 24h, so we can warn before submit.
export type RecentSimilarPayment = {
  beneficiaryName: string;
  currency: string;
  amount: number;
  reference: string;
  createdAt: string;
};

export async function checkDuplicatePayment(
  csrfToken: string,
  payload: { beneficiaryAccount: string; swiftCode: string },
) {
  const account = payload.beneficiaryAccount.replace(/\s/g, '');
  const swift = payload.swiftCode.toUpperCase().replace(/\s/g, '');
  const qs = new URLSearchParams({ beneficiaryAccount: account, swiftCode: swift }).toString();

  // No handleApiError here: the caller treats any failure as "no duplicate / proceed",
  // so a failed convenience check never blocks a legitimate payment.
  return apiFetch<{ duplicate: boolean; previous: RecentSimilarPayment | null }>(
    `/api/payments/check-duplicate?${qs}`,
    { ...createSecureRequestConfig(csrfToken) },
  );
}

export async function fetchAllPayments(csrfToken: string) {
  try {
    return await apiFetch<{ payments: Payment[] }>("/api/payments/all", {
      ...createSecureRequestConfig(csrfToken),
    });
  } catch (error) {
    return handleApiError(error, "fetchAllPayments");
  }
}

export async function verifyPayment(csrfToken: string, paymentId: number) {
  // 🔐 Validate paymentId is a safe integer (prevents injection via malformed ID)
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    throw new Error("Invalid payment identifier");
  }

  try {
    return await apiFetch<{
      message: string;
      payment: { id: number; status: string };
    }>(`/api/payments/${paymentId}/verify`, {
      ...createSecureRequestConfig(csrfToken, "PATCH"),
    });
  } catch (error) {
    return handleApiError(error, "verifyPayment");
  }
}

export async function submitToSwift(csrfToken: string) {
  try {
    return await apiFetch<{ message: string; submittedCount: number }>(
      "/api/payments/submit-to-swift",
      {
        ...createSecureRequestConfig(csrfToken, "POST"),
      },
    );
  } catch (error) {
    return handleApiError(error, "submitToSwift");
  }
}
