import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import type { User } from '../types';

const patterns = {
  identifier: /^(?:[A-Za-z ]{2,50}|[A-Za-z0-9._%+-]{3,64}@[A-Za-z0-9.-]{2,253}\.[A-Za-z]{2,24})$/,
  accountNumber: /^\d{8,20}$/,
};

const fieldErrorMessages = {
  identifier: 'Enter a valid full name or email address.',
  accountNumber: '8–20 digits. Numbers only.',
};

type FieldErrors = Partial<Record<keyof typeof patterns, string>>;

export function LoginPage({ onLogin, csrfToken }: { onLogin: (user: User) => void; csrfToken: string }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const errors: FieldErrors = {};
    if (!patterns.identifier.test(identifier)) errors.identifier = fieldErrorMessages.identifier;
    if (!patterns.accountNumber.test(accountNumber)) errors.accountNumber = fieldErrorMessages.accountNumber;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const response = await loginUser(csrfToken, { username: identifier, accountNumber, password });
      onLogin(response.user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="card narrow">
      <h2>Login</h2>
      <p>Use your <strong>full name</strong> as your username. The session is stored in a Secure, HttpOnly cookie.</p>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Full name or email <span className="field-hint">(your username)</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={fieldErrors.identifier ? 'input-error' : ''}
            placeholder="e.g. Jane Smith or jane@example.com"
            required
          />
          {fieldErrors.identifier && <span className="field-error">{fieldErrors.identifier}</span>}
        </label>
        <label>
          Account number
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={fieldErrors.accountNumber ? 'input-error' : ''}
            inputMode="numeric"
            required
          />
          {fieldErrors.accountNumber && <span className="field-error">{fieldErrors.accountNumber}</span>}
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
