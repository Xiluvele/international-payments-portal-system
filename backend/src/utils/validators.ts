import { z } from 'zod';

export const regexRules = {
  username: /^[A-Za-z0-9._-]{3,30}$/,
  email: /^[A-Za-z0-9._%+-]{3,64}@[A-Za-z0-9.-]{2,253}\.[A-Za-z]{2,24}$/,
  fullName: /^[A-Za-z ]{2,50}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,64}$/,
  idNumber: /^\d{13}$/,
  accountNumber: /^\d{8,20}$/,
  // SWIFT/BIC: 6 letters + 2 alphanumeric (+ optional branch 3)
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  beneficiaryName: /^[A-Za-z0-9 .,'-]{2,80}$/,
  currency: /^[A-Z]{3}$/,
  amount: /^(?!0+(\.0+)?$)\d+(\.\d{1,2})?$/,
  reference: /^[A-Za-z0-9 .,_-]{2,120}$/,
};

const loginIdentifierSchema = z.string().refine(
  (value) => regexRules.fullName.test(value) || regexRules.email.test(value),
  { message: 'Identifier must be a valid full name or email address.' },
);

export const loginSchema = z.object({
  username: loginIdentifierSchema,
  accountNumber: z.string().regex(regexRules.accountNumber),
  password: z.string().min(8).max(64),
});

export const paymentSchema = z.object({
  beneficiaryName: z.string().regex(regexRules.beneficiaryName),
  beneficiaryAccount: z.string().regex(regexRules.accountNumber),
  swiftCode: z.string().regex(regexRules.swiftCode),
  currency: z.string().regex(regexRules.currency),
  amount: z.string().regex(regexRules.amount),
  reference: z.string().regex(regexRules.reference),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
