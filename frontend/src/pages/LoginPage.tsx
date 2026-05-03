import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import type { User } from '../types';

// ============================================================================
// 🔐 INPUT WHITELISTING (Regex)
// Guide Requirement: "Use Regex to restrict input" for Email, Account Number, Password
// ============================================================================
// Match backend `loginIdentifierSchema` (email OR full name) and password policy.
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  fullName: /^[A-Za-z ]{2,50}$/,
  accountNumber: /^\d{8,20}$/, // 8-20 digits only
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]).{8,64}$/,
};

function isValidLoginIdentifier(value: string): boolean {
  const v = value.trim();
  return patterns.email.test(v) || patterns.fullName.test(v);
}

const fieldErrorMessages = {
  identifier: 'Enter a valid email (e.g. talinuser@bank.local) or full name (e.g. TalinUser).',
  accountNumber: '8–20 digits only. No letters or symbols.',
  password: '8–64 chars. Must include uppercase, lowercase, number, and special character (same rules as registration).',
};

type FieldErrors = Partial<Record<'identifier' | 'accountNumber' | 'password', string>>;

export function LoginPage({ onLogin, csrfToken }: { onLogin: (user: User) => void; csrfToken: string }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const errors: FieldErrors = {};
    if (!isValidLoginIdentifier(identifier)) errors.identifier = fieldErrorMessages.identifier;
    if (!patterns.accountNumber.test(accountNumber)) errors.accountNumber = fieldErrorMessages.accountNumber;
    if (!patterns.password.test(password)) errors.password = fieldErrorMessages.password;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }
    setFieldErrors({});

    try {
      const response = await loginUser(csrfToken, { identifier, accountNumber, password });
      onLogin(response.user);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials or account locked. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="card narrow">
      <h2>Secure Login</h2>
      
      <form 
        onSubmit={handleSubmit} 
        className="form-grid" 
        autoComplete="off" 
        noValidate
      >
        <label>
          Email or full name <span className="field-hint">(must match registration)</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={fieldErrors.identifier ? 'input-error' : ''}
            placeholder="e.g. TalinUser or talinuser@bank.local"
            required
            autoComplete="username"
            aria-describedby="identifier-error"
            onBlur={(e) => {
              if (e.target.value && !isValidLoginIdentifier(e.target.value)) {
                setFieldErrors(prev => ({ ...prev, identifier: fieldErrorMessages.identifier }));
              }
            }}
          />
          {fieldErrors.identifier && (
            <span id="identifier-error" className="field-error" role="alert">
              {fieldErrors.identifier}
            </span>
          )}
        </label>

        {/* ✅ Account Number Only - No IBAN */}
        <label>
          Account Number
          <input
            value={accountNumber}
            onChange={(e) => {
              // 🔐 WHITELISTING: Strip ALL non-digit characters instantly
              const digitsOnly = e.target.value.replace(/\D/g, '');
              setAccountNumber(digitsOnly);
              // Clear error if now valid
              if (patterns.accountNumber.test(digitsOnly)) {
                setFieldErrors(prev => { const { accountNumber, ...rest } = prev; return rest; });
              }
            }}
            className={fieldErrors.accountNumber ? 'input-error' : ''}
            inputMode="numeric"
            pattern="\d{8,20}"
            placeholder="8–20 digits only"
            required
            aria-describedby="account-error"
          />
          {fieldErrors.accountNumber && (
            <span id="account-error" className="field-error" role="alert">
              {fieldErrors.accountNumber}
            </span>
          )}
        </label>

        <label>
          Password
          <span className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldErrors.password ? 'input-error' : ''}
              placeholder="Same rules as when you registered"
              required
              autoComplete="current-password"
              aria-describedby="password-error"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
          {fieldErrors.password && (
            <span id="password-error" className="field-error" role="alert">
              {fieldErrorMessages.password}
            </span>
          )}
        </label>

        <button 
          type="submit" 
          disabled={isLoading || Object.keys(fieldErrors).length > 0}
          aria-busy={isLoading}
        >
          {isLoading ? 'Authenticating...' : 'Login'}
        </button>
      </form>

      {error && (
        <p className="error" role="alert" data-testid="login-error">
          {error}
        </p>
      )}
    </section>
  );
}