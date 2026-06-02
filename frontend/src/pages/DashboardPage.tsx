import { useEffect, useState } from 'react';
import { createPayment, fetchPayments } from '../api/payments';
import type { Payment, User } from '../types';
import { useTouchedFields } from '../hooks/useTouchedFields';
import { setFieldError } from '../utils/liveValidate';

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'CNY'];

const step1Patterns = {
  amount: /^(?!0+(\.0+)?$)\d+(\.\d{1,2})?$/,
};

const step2Patterns = {
  beneficiaryName: /^[A-Za-z0-9 .,'-]{2,80}$/,
  beneficiaryAccount: /^\d{8,20}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  reference: /^[A-Za-z0-9 .,_-]{2,120}$/,
};

type Step1Key = keyof typeof step1Patterns | 'currency';

const step1ErrorMsgs: Record<Step1Key, string> = {
  amount: 'Enter a positive number with up to 2 decimal places (e.g. 1500.00).',
  currency: 'Choose a valid currency from the list.',
};

const step2ErrorMsgs: Record<keyof typeof step2Patterns, string> = {
  beneficiaryName: "Enter 2–80 characters. Letters, numbers, spaces, and . , ' - are allowed.",
  beneficiaryAccount: 'Account number must be 8–20 digits only.',
  swiftCode:
    'SWIFT/BIC must be 8 or 11 characters: 6 letters + 2 characters (+ optional 3). Example: DEUTDEFF or FIRNZAJJ.',
  reference: 'Enter 2–120 characters. Letters, numbers, spaces, and . , _ - are allowed.',
};

function currencyOk(code: string) {
  return /^[A-Z]{3}$/.test(code) && CURRENCIES.includes(code);
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Verified',
  submitted: 'Submitted to SWIFT',
};

const initialForm = {
  amount: '',
  currency: 'ZAR',
  beneficiaryName: '',
  beneficiaryAccount: '',
  swiftCode: '',
  reference: '',
};

type Step1Errors = Partial<Record<Step1Key, string>>;
type Step2Errors = Partial<Record<keyof typeof step2Patterns, string>>;

export function DashboardPage({ user, csrfToken }: { user: User; csrfToken: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [s1Errors, setS1Errors] = useState<Step1Errors>({});
  const [s2Errors, setS2Errors] = useState<Step2Errors>({});
  const step1Touches = useTouchedFields<Step1Key>();
  const step2Touches = useTouchedFields<keyof typeof step2Patterns>();

  useEffect(() => {
    if (!csrfToken) return;
    fetchPayments(csrfToken)
      .then((res) => setPayments(res.payments))
      .catch((err) => setSubmitError((err as Error).message));
  }, [csrfToken]);

  function handleContinue(event: { preventDefault(): void }) {
    event.preventDefault();
    const errors: Step1Errors = {};
    if (!step1Patterns.amount.test(form.amount)) errors.amount = step1ErrorMsgs.amount;
    if (!currencyOk(form.currency)) errors.currency = step1ErrorMsgs.currency;
    if (Object.keys(errors).length > 0) {
      step1Touches.markAllTouched(Object.keys(errors) as Step1Key[]);
      setS1Errors(errors);
      return;
    }
    setS1Errors({});
    setStep(2);
  }

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setMessage('');
    setSubmitError('');
    const errors: Step2Errors = {};
    for (const key of Object.keys(step2Patterns) as Array<keyof typeof step2Patterns>) {
      if (!step2Patterns[key].test(form[key])) errors[key] = step2ErrorMsgs[key];
    }
    if (Object.keys(errors).length > 0) {
      step2Touches.markAllTouched(Object.keys(errors) as Array<keyof typeof step2Patterns>);
      setS2Errors(errors);
      return;
    }
    setS2Errors({});

    try {
      const response = await createPayment(csrfToken, {
        beneficiaryName: form.beneficiaryName,
        beneficiaryAccount: form.beneficiaryAccount,
        swiftCode: form.swiftCode,
        currency: form.currency,
        amount: form.amount,
        reference: form.reference,
      });
      setPayments((current) => [response.payment, ...current]);
      setForm(initialForm);
      setStep(1);
      step1Touches.resetTouched();
      step2Touches.resetTouched();
      setS1Errors({});
      setS2Errors({});
      setMessage(response.message);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  return (
    <div className="grid two-col">
      <section className="card">
        <h2>Welcome, {user.fullName}</h2>
        <p>Submit international payments securely. All transactions are encrypted and stored safely.</p>
        <p>In South Africa, international transfers are processed through the <strong>SWIFT</strong> network.</p>
      </section>

      <section className="card">
        <h2>New payment</h2>
        <p className="step-indicator">Step {step} of 2 — {step === 1 ? 'Payment details' : 'Beneficiary information'}</p>

        {step === 1 && (
          <form onSubmit={handleContinue} className="form-grid">
            <label>
              Amount
              <input
                value={form.amount}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, amount: v });
                  if (step1Touches.isTouched('amount')) {
                    setFieldError(setS1Errors, 'amount', v, step1Patterns.amount.test(v), step1ErrorMsgs.amount);
                  }
                }}
                onBlur={(e) => {
                  step1Touches.markTouched('amount');
                  const v = e.target.value;
                  setFieldError(setS1Errors, 'amount', v, step1Patterns.amount.test(v), step1ErrorMsgs.amount);
                }}
                className={s1Errors.amount ? 'input-error' : ''}
                inputMode="decimal"
                placeholder="e.g. 1500.00"
                required
              />
              {s1Errors.amount && <span className="field-error">{s1Errors.amount}</span>}
            </label>
            <label>
              Currency
              <select
                value={form.currency}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, currency: v });
                  if (step1Touches.isTouched('currency')) {
                    setFieldError(setS1Errors, 'currency', v, currencyOk(v), step1ErrorMsgs.currency);
                  }
                }}
                onBlur={(e) => {
                  step1Touches.markTouched('currency');
                  const v = e.target.value;
                  setFieldError(setS1Errors, 'currency', v, currencyOk(v), step1ErrorMsgs.currency);
                }}
                className={s1Errors.currency ? 'input-error' : ''}
                required
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {s1Errors.currency && <span className="field-error">{s1Errors.currency}</span>}
            </label>
            <label>
              Payment provider
              <select disabled>
                <option>SWIFT</option>
              </select>
              <span className="field-hint">SWIFT is the standard network for international transfers in South Africa.</span>
            </label>
            <button type="submit">Continue →</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Beneficiary name
              <input
                value={form.beneficiaryName}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, beneficiaryName: v });
                  if (step2Touches.isTouched('beneficiaryName')) {
                    setFieldError(
                      setS2Errors,
                      'beneficiaryName',
                      v,
                      step2Patterns.beneficiaryName.test(v),
                      step2ErrorMsgs.beneficiaryName,
                    );
                  }
                }}
                onBlur={(e) => {
                  step2Touches.markTouched('beneficiaryName');
                  const v = e.target.value;
                  setFieldError(
                    setS2Errors,
                    'beneficiaryName',
                    v,
                    step2Patterns.beneficiaryName.test(v),
                    step2ErrorMsgs.beneficiaryName,
                  );
                }}
                className={s2Errors.beneficiaryName ? 'input-error' : ''}
                required
              />
              {s2Errors.beneficiaryName && <span className="field-error">{s2Errors.beneficiaryName}</span>}
            </label>
            <label>
              Beneficiary account number
              <input
                value={form.beneficiaryAccount}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, beneficiaryAccount: v });
                  if (step2Touches.isTouched('beneficiaryAccount')) {
                    setFieldError(
                      setS2Errors,
                      'beneficiaryAccount',
                      v,
                      step2Patterns.beneficiaryAccount.test(v),
                      step2ErrorMsgs.beneficiaryAccount,
                    );
                  }
                }}
                onBlur={(e) => {
                  step2Touches.markTouched('beneficiaryAccount');
                  const v = e.target.value;
                  setFieldError(
                    setS2Errors,
                    'beneficiaryAccount',
                    v,
                    step2Patterns.beneficiaryAccount.test(v),
                    step2ErrorMsgs.beneficiaryAccount,
                  );
                }}
                className={s2Errors.beneficiaryAccount ? 'input-error' : ''}
                inputMode="numeric"
                required
              />
              {s2Errors.beneficiaryAccount && <span className="field-error">{s2Errors.beneficiaryAccount}</span>}
            </label>
            <label>
              SWIFT / BIC code
              <input
                value={form.swiftCode}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setForm({ ...form, swiftCode: v });
                  if (step2Touches.isTouched('swiftCode')) {
                    setFieldError(setS2Errors, 'swiftCode', v, step2Patterns.swiftCode.test(v), step2ErrorMsgs.swiftCode);
                  }
                }}
                onBlur={(e) => {
                  step2Touches.markTouched('swiftCode');
                  const v = e.target.value.toUpperCase();
                  setFieldError(setS2Errors, 'swiftCode', v, step2Patterns.swiftCode.test(v), step2ErrorMsgs.swiftCode);
                }}
                className={s2Errors.swiftCode ? 'input-error' : ''}
                placeholder="e.g. FIRNZAJJ"
                required
              />
              {s2Errors.swiftCode && <span className="field-error">{s2Errors.swiftCode}</span>}
            </label>
            <label>
              Reference
              <input
                value={form.reference}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, reference: v });
                  if (step2Touches.isTouched('reference')) {
                    setFieldError(setS2Errors, 'reference', v, step2Patterns.reference.test(v), step2ErrorMsgs.reference);
                  }
                }}
                onBlur={(e) => {
                  step2Touches.markTouched('reference');
                  const v = e.target.value;
                  setFieldError(setS2Errors, 'reference', v, step2Patterns.reference.test(v), step2ErrorMsgs.reference);
                }}
                className={s2Errors.reference ? 'input-error' : ''}
                required
              />
              {s2Errors.reference && <span className="field-error">{s2Errors.reference}</span>}
            </label>
            <div className="button-row">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button type="submit">Pay Now</button>
            </div>
          </form>
        )}

        {message && <p className="success">{message}</p>}
        {submitError && <p className="error">{submitError}</p>}
      </section>

      <section className="card wide">
        <h2>My payments</h2>
        {payments.length === 0 ? (
          <p>No payments submitted yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Beneficiary</th>
                  <th>Account</th>
                  <th>SWIFT</th>
                  <th>Currency</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.createdAt).toLocaleString()}</td>
                    <td>{payment.beneficiaryName}</td>
                    <td>{payment.beneficiaryAccount}</td>
                    <td>{payment.swiftCode}</td>
                    <td>{payment.currency}</td>
                    <td>{payment.amount.toFixed(2)}</td>
                    <td>{payment.reference}</td>
                    <td>
                      <span className={`status-badge status-${payment.status}`}>
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
