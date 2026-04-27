import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';

const patterns = {
  fullName: /^[A-Za-z ]{2,50}$/,
  idNumber: /^\d{13}$/,
  accountNumber: /^\d{8,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,64}$/,
};

const fieldErrorMessages: Record<keyof typeof patterns, string> = {
  fullName: '2–50 characters. Letters and spaces only — no numbers or special characters.',
  idNumber: 'Must be exactly 13 digits.',
  accountNumber: '8–20 digits. Numbers only.',
  password: '8–64 characters. Must include an uppercase letter, a lowercase letter, a number, and a special character (e.g. @, !, #, $).',
};

type FieldErrors = Partial<Record<keyof typeof patterns, string>>;

export function RegisterPage({ csrfToken }: { csrfToken: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', idNumber: '', accountNumber: '', password: '' });
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setSubmitError('');
    setMessage('');

    const errors: FieldErrors = {};
    for (const key of Object.keys(patterns) as Array<keyof typeof patterns>) {
      if (!patterns[key].test(form[key])) {
        errors[key] = fieldErrorMessages[key];
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      const response = await registerUser(csrfToken, form);
      setMessage(response.message);
      setTimeout(() => navigate('/login'), 700);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  return (
    <section className="card narrow">
      <h2>Create account</h2>
      <p>Passwords are hashed and salted on the server with bcrypt.</p>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Full name
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className={fieldErrors.fullName ? 'input-error' : ''}
            required
          />
          {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
        </label>
        <label>
          ID number
          <input
            value={form.idNumber}
            onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            className={fieldErrors.idNumber ? 'input-error' : ''}
            inputMode="numeric"
            maxLength={13}
            required
          />
          {fieldErrors.idNumber && <span className="field-error">{fieldErrors.idNumber}</span>}
        </label>
        <label>
          Account number
          <input
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            className={fieldErrors.accountNumber ? 'input-error' : ''}
            inputMode="numeric"
            required
          />
          {fieldErrors.accountNumber && <span className="field-error">{fieldErrors.accountNumber}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={fieldErrors.password ? 'input-error' : ''}
            required
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>
        <button type="submit">Register securely</button>
      </form>
      {message && <p className="success">{message}</p>}
      {submitError && <p className="error">{submitError}</p>}
    </section>
  );
}
