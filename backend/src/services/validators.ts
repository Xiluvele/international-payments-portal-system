// ============================================================================
// 🔐 SECURITY LAYER 1: REGEX WHITELIST PATTERNS (Guide Requirement)
// Exported for frontend + backend reuse (defense in depth)
// Every pattern restricts input to ONLY allowed characters (prevents injection)
// ============================================================================
export const validationPatterns = {
    // === AUTH FIELDS ===
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    fullName: /^[A-Za-z\s'\-]{2,50}$/,
    idNumber: /^\d{13}$/,
    accountNumber: /^\d{8,20}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,64}$/,

    // === PAYMENT FIELDS ===
    // NOTE: these MUST stay consistent with the route-level contract in
    // utils/validators.ts (and the frontend) — otherwise valid input that
    // passes the route gets rejected here, in the service "defence-in-depth" layer.
    beneficiaryName: /^[A-Za-z0-9 .,'-]{2,80}$/,
    iban: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/,
    swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
    currency: /^[A-Z]{3}$/,
    allowedCurrencies: ['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'CNY'] as const,
    amount: /^\d+(\.\d{1,2})?$/,
    minAmount: 0.01,
    maxAmount: 1_000_000,
    reference: /^[A-Za-z0-9 .,_-]{2,120}$/,
};

// ============================================================================
// 🔐 SECURITY LAYER 2: SANITIZATION HELPERS
// Clean input BEFORE validation (defense in depth)
// ============================================================================
export const sanitizers = {
    toUpperCaseTrimmed: (v: string) => v.trim().toUpperCase(),
    digitsOnly: (v: string) => v.replace(/\D/g, ''),
    normalizeName: (v: string) => v.trim().replace(/\s+/g, ' '),
    stripSpaces: (v: string) => v.replace(/\s/g, ''),
};

// ============================================================================
// 🔐 SECURITY LAYER 3: STRUCTURED VALIDATION RESULTS
// Returns { valid: boolean, error?: string } for clear UX + safe error handling
// ============================================================================
type ValidationResult = { valid: true } | { valid: false; error: string };

export const validators = {
    email: (v: unknown): ValidationResult => {
        if (typeof v !== 'string' || v.length > 254) {
            return { valid: false, error: 'Email must be a valid string under 254 characters' };
        }
        return validationPatterns.email.test(v)
            ? { valid: true }
            : { valid: false, error: 'Valid email required (e.g. user@example.com)' };
    },

    fullName: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'Name must be text' };
        const sanitized = sanitizers.normalizeName(v);
        return validationPatterns.fullName.test(sanitized)
            ? { valid: true }
            : { valid: false, error: 'Name must be 2-50 letters, spaces, apostrophes, or hyphens only' };
    },

    idNumber: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'ID must be text' };
        const digits = sanitizers.digitsOnly(v);
        return validationPatterns.idNumber.test(digits)
            ? { valid: true }
            : { valid: false, error: 'ID must be exactly 13 digits' };
    },

    accountNumber: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'Account number must be text' };
        const digits = sanitizers.digitsOnly(v);
        return validationPatterns.accountNumber.test(digits)
            ? { valid: true }
            : { valid: false, error: 'Account number must be 8-20 digits only' };
    },

    password: (v: unknown): ValidationResult => {
        if (typeof v !== 'string' || v.length < 8 || v.length > 64) {
            return { valid: false, error: 'Password must be 8-64 characters' };
        }
        return validationPatterns.password.test(v)
            ? { valid: true }
            : { valid: false, error: 'Password must include uppercase, lowercase, number, and special character' };
    },

    beneficiaryName: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'Beneficiary name must be text' };
        const sanitized = sanitizers.normalizeName(v);
        return validationPatterns.beneficiaryName.test(sanitized)
            ? { valid: true }
            : { valid: false, error: 'Name must be 2-80 characters: letters, numbers, spaces, and . , \' - only' };
    },

    beneficiaryAccount: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'Account/IBAN must be text' };
        const sanitized = sanitizers.stripSpaces(v).toUpperCase();
        if (/^\d{8,20}$/.test(sanitized)) return { valid: true };
        return validationPatterns.iban.test(sanitized)
            ? { valid: true }
            : { valid: false, error: 'Invalid account/IBAN format (e.g., 123456789 or GB29NWBK60161331926819)' };
    },

    swiftCode: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'SWIFT code must be text' };
        const sanitized = sanitizers.toUpperCaseTrimmed(sanitizers.stripSpaces(v));
        return validationPatterns.swiftCode.test(sanitized)
            ? { valid: true }
            : { valid: false, error: 'Invalid SWIFT/BIC format (e.g., DEUTDEFF or DEUTDEFF500)' };
    },

    currency: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'Currency must be text' };
        const sanitized = sanitizers.toUpperCaseTrimmed(v);
        return validationPatterns.currency.test(sanitized) &&
            validationPatterns.allowedCurrencies.includes(sanitized as typeof validationPatterns.allowedCurrencies[number])
            ? { valid: true }
            : { valid: false, error: `Currency must be one of: ${validationPatterns.allowedCurrencies.join(', ')}` };
    },

    amount: (v: unknown): ValidationResult => {
        const num = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : NaN);
        if (isNaN(num)) return { valid: false, error: 'Amount must be a number' };
        if (num < validationPatterns.minAmount || num > validationPatterns.maxAmount) {
            return { valid: false, error: `Amount must be ${validationPatterns.minAmount}–${validationPatterns.maxAmount}` };
        }
        return validationPatterns.amount.test(String(v))
            ? { valid: true }
            : { valid: false, error: 'Amount must have max 2 decimal places (e.g., 100.50)' };
    },

    reference: (v: unknown): ValidationResult => {
        if (typeof v !== 'string') return { valid: false, error: 'Reference must be text' };
        const sanitized = v.trim();
        return validationPatterns.reference.test(sanitized)
            ? { valid: true }
            : { valid: false, error: 'Reference must be 2-120 characters: letters, numbers, spaces, and . , _ - only' };
    },
};

// ============================================================================
// 🔐 SECURITY LAYER 4: TYPE-SAFE VALIDATION WRAPPERS
// ============================================================================
export type ValidationErrors = Record<string, string>;

export type RegisterSanitized = {
    email: string;
    fullName: string;
    idNumber: string;
    accountNumber: string;
};

export type PaymentSanitized = {
    beneficiaryName: string;
    beneficiaryAccount: string;
    swiftCode: string;
    currency: string;
    amount: number;
    reference: string;
};

export type PaymentInput = {
    beneficiaryName: string;
    beneficiaryAccount: string;
    swiftCode: string;
    currency: string;
    amount: string | number;
    reference: string;
};

const GENERIC_VALIDATION_ERROR = 'Invalid input. Please check all fields and try again.';

// ============================================================================
// ✅ validateRegister - User Registration Validation
// ============================================================================
export function validateRegister(input: Record<string, unknown>): {
    valid: boolean;
    errors?: ValidationErrors;
    sanitized?: RegisterSanitized;
} {
    const errors: ValidationErrors = {};
    const sanitized: Partial<RegisterSanitized> = {};

    const emailResult = validators.email(input.email);
    if (!emailResult.valid) errors.email = emailResult.error;
    else sanitized.email = String(input.email);

    const nameResult = validators.fullName(input.fullName);
    if (!nameResult.valid) errors.fullName = nameResult.error;
    else sanitized.fullName = sanitizers.normalizeName(String(input.fullName));

    const idResult = validators.idNumber(input.idNumber);
    if (!idResult.valid) errors.idNumber = idResult.error;
    else sanitized.idNumber = sanitizers.digitsOnly(String(input.idNumber));

    const accountResult = validators.accountNumber(input.accountNumber);
    if (!accountResult.valid) errors.accountNumber = accountResult.error;
    else sanitized.accountNumber = sanitizers.digitsOnly(String(input.accountNumber));

    const passwordResult = validators.password(input.password);
    if (!passwordResult.valid) errors.password = passwordResult.error;

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
    }

    return { valid: true, sanitized: sanitized as RegisterSanitized };
}

// ============================================================================
// ✅ validateLogin - User Login Validation
// ============================================================================
export function validateLogin(input: Record<string, unknown>): {
    valid: boolean;
    errors?: ValidationErrors;
} {
    const errors: ValidationErrors = {};

    if (!validators.email(input.email).valid) errors.email = 'Invalid credentials';
    if (!validators.accountNumber(input.accountNumber).valid) errors.accountNumber = 'Invalid credentials';
    if (!validators.password(input.password).valid) errors.password = 'Invalid credentials';

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors: { general: GENERIC_VALIDATION_ERROR } };
    }

    return { valid: true };
}

// ============================================================================
// ✅ validatePayment - Payment Form Validation (THE MISSING EXPORT)
// ============================================================================
export function validatePayment(input: Record<string, unknown>): {
    valid: boolean;
    errors?: ValidationErrors;
    sanitized?: PaymentSanitized;
} {
    const errors: ValidationErrors = {};
    const sanitized: Partial<PaymentSanitized> = {};

    // Beneficiary Name
    const nameResult = validators.beneficiaryName(input.beneficiaryName);
    if (!nameResult.valid) errors.beneficiaryName = nameResult.error;
    else sanitized.beneficiaryName = sanitizers.normalizeName(String(input.beneficiaryName));

    // Beneficiary Account (IBAN or numeric)
    const accountResult = validators.beneficiaryAccount(input.beneficiaryAccount);
    if (!accountResult.valid) errors.beneficiaryAccount = accountResult.error;
    else sanitized.beneficiaryAccount = sanitizers.stripSpaces(String(input.beneficiaryAccount)).toUpperCase();

    // SWIFT Code
    const swiftResult = validators.swiftCode(input.swiftCode);
    if (!swiftResult.valid) errors.swiftCode = swiftResult.error;
    else sanitized.swiftCode = sanitizers.toUpperCaseTrimmed(sanitizers.stripSpaces(String(input.swiftCode)));

    // Currency
    const currencyResult = validators.currency(input.currency);
    if (!currencyResult.valid) errors.currency = currencyResult.error;
    else sanitized.currency = sanitizers.toUpperCaseTrimmed(String(input.currency));

    // Amount
    const amountResult = validators.amount(input.amount);
    if (!amountResult.valid) errors.amount = amountResult.error;
    else sanitized.amount = typeof input.amount === 'string' ? parseFloat(input.amount) : Number(input.amount);

    // Reference
    const refResult = validators.reference(input.reference);
    if (!refResult.valid) errors.reference = refResult.error;
    else sanitized.reference = String(input.reference).trim();

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
    }

    return { valid: true, sanitized: sanitized as PaymentSanitized };
}

// ============================================================================
// 🔐 SECURITY LAYER 5: SAFE ERROR THROWING (For API Layer)
// Never expose raw validation details to client
// ============================================================================
export function throwIfInvalid(errors: ValidationErrors, context: 'register' | 'login' | 'payment') {
    if (Object.keys(errors).length > 0) {
        console.error(`[Validation Error - ${context}]`, errors);
        throw new Error(GENERIC_VALIDATION_ERROR);
    }
}

// Helper for frontend: get user-friendly error map from validation result
export function getErrorMap(result: ReturnType<typeof validateRegister | typeof validatePayment>) {
    return result.valid ? {} : (result.errors ?? {});
}