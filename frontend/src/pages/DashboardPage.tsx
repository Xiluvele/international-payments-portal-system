import { useEffect, useState } from 'react';
import { createPayment, fetchPayments } from '../api/payments';
import type { Payment, User } from '../types';

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'CNY'];

const step1Patterns = {
  amount: /^(?!0+(\.0+)?$)\d+(\.\d{1,2})?$/,
};

const step2Patterns = {
  beneficiaryName: /^[A-Za-z0-9 .,'-]{2,80}$/,
  beneficiaryAccount: /^\d{8,20}$/,
  swiftCode: /^[A-Z0-9]{8}([A-Z0-9]{3})?$/,
  reference: /^[A-Za-z0-9 .,_-]{2,120}$/,
};

const step1ErrorMsgs: Record<keyof typeof step1Patterns, string> = {
  amount: 'Enter a positive number with up to 2 decimal places (e.g. 1500.00).',
};

const step2ErrorMsgs: Record<keyof typeof step2Patterns, string> = {
  beneficiaryName: "Enter 2–80 characters. Letters, numbers, spaces, and . , ' - are allowed.",
  beneficiaryAccount: 'Account number must be 8–20 digits only.',
  swiftCode: 'SWIFT/BIC code must be 8 or 11 uppercase letters and digits (e.g. FIRNZAJJ).',
  reference: 'Enter 2–120 characters. Letters, numbers, spaces, and . , _ - are allowed.',
};

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

type Step1Errors = Partial<Record<keyof typeof step1Patterns, string>>;
type Step2Errors = Partial<Record<keyof typeof step2Patterns, string>>;

export function DashboardPage({ user, csrfToken }: { user: User; csrfToken: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [s1Errors, setS1Errors] = useState<Step1Errors>({});
  const [s2Errors, setS2Errors] = useState<Step2Errors>({});

  useEffect(() => {
    if (!csrfToken) return;
    fetchPayments(csrfToken)
      .then((res) => setPayments(res.payments))
      .catch((err) => setSubmitError((err as Error).message));
  }, [csrfToken]);

  function handleContinue(event: { preventDefault(): void }) {
    event.preventDefault();
    const errors: Step1Errors = {};
    for (const key of Object.keys(step1Patterns) as Array<keyof typeof step1Patterns>) {
      if (!step1Patterns[key].test(form[key])) errors[key] = step1ErrorMsgs[key];
    }
    if (Object.keys(errors).length > 0) { setS1Errors(errors); return; }
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
    if (Object.keys(errors).length > 0) { setS2Errors(errors); return; }
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
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                required
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
                onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                className={s2Errors.beneficiaryName ? 'input-error' : ''}
                required
              />
              {s2Errors.beneficiaryName && <span className="field-error">{s2Errors.beneficiaryName}</span>}
            </label>
            <label>
              Beneficiary account number
              <input
                value={form.beneficiaryAccount}
                onChange={(e) => setForm({ ...form, beneficiaryAccount: e.target.value })}
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
                onChange={(e) => setForm({ ...form, swiftCode: e.target.value.toUpperCase() })}
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
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
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
