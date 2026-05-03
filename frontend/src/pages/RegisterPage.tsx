import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';
import type { User } from '../types';

// ============================================================================
// 🔐 INPUT WHITELISTING (Regex per Guide Requirements)
// ============================================================================
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  fullName: /^[A-Za-z\s'\-]{2,50}$/,
  idNumber: /^\d{13}$/, // ✅ ID Number: exactly 13 digits
  accountNumber: /^\d{8,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,64}$/,
};

const fieldErrorMessages = {
  email: 'Valid email required (e.g. user@example.com).',
  fullName: '2–50 letters/spaces only. No numbers or symbols.',
  idNumber: 'ID must be exactly 13 digits.', // ✅ ID Number error message
  accountNumber: '8–20 digits only. No letters or symbols.',
  password: '8–64 chars. Must include uppercase, lowercase, number, and special character.',
};

type FieldName = keyof typeof patterns;
type FieldErrors = Partial<Record<FieldName, string>>;

type RegisterForm = {
  fullName: string;
  email: string;
  idNumber: string; // ✅ Added to form type
  accountNumber: string;
  password: string;
};

export function RegisterPage({ csrfToken }: { csrfToken: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    idNumber: '', // ✅ Added to initial state
    accountNumber: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError('');
    setMessage('');
    setIsLoading(true);

    const errors: FieldErrors = {};
    (Object.keys(patterns) as FieldName[]).forEach((key) => {
      if (!patterns[key].test(form[key])) {
        errors[key] = fieldErrorMessages[key];
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }
    setFieldErrors({});

    try {
      // ✅ ID Number included in registration payload
      const response = await registerUser(csrfToken, form);
      setMessage(response.message || 'Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setSubmitError('Registration failed. Please check your details or try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  const updateField = <K extends keyof RegisterForm>(key: K, value: string) => {
    let sanitized = value;
    if (key === 'email') sanitized = value.trim();
    if (key === 'fullName') sanitized = value.replace(/[^A-Za-z\s'\-]/g, '').slice(0, 50);
    if (key === 'idNumber') sanitized = value.replace(/\D/g, '').slice(0, 13); // ✅ Sanitize: digits only, max 13
    if (key === 'accountNumber') sanitized = value.replace(/\D/g, '').slice(0, 20);
    
    setForm(prev => ({ ...prev, [key]: sanitized }));
    if (patterns[key].test(sanitized)) {
      setFieldErrors(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <section className="card narrow">
      <h2>Create Account</h2>
      
      <form onSubmit={handleSubmit} className="form-grid" autoComplete="off" noValidate>
        <label>
          Full Name <span className="field-hint">(as on official ID)</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            className={fieldErrors.fullName ? 'input-error' : ''}
            placeholder="e.g. Jane Smith"
            required
            pattern="[A-Za-z\s'\-]{2,50}"
            aria-describedby="name-error"
            maxLength={50}
          />
          {fieldErrors.fullName && (
            <span id="name-error" className="field-error" role="alert">
              {fieldErrors.fullName}
            </span>
          )}
        </label>

        <label>
          Email Address <span className="field-hint">(used for login & verification)</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={fieldErrors.email ? 'input-error' : ''}
            placeholder="e.g. jane.smith@email.com"
            required
            autoComplete="email"
            aria-describedby="email-error"
            onBlur={(e) => {
              if (e.target.value && !patterns.email.test(e.target.value)) {
                setFieldErrors(prev => ({ ...prev, email: fieldErrorMessages.email }));
              }
            }}
          />
          {fieldErrors.email && (
            <span id="email-error" className="field-error" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </label>

        {/* ✅ ID NUMBER FIELD - New */}
        <label>
          ID Number <span className="field-hint">(13 digits)</span>
          <input
            value={form.idNumber}
            onChange={(e) => updateField('idNumber', e.target.value)}
            className={fieldErrors.idNumber ? 'input-error' : ''}
            inputMode="numeric"
            pattern="\d{13}"
            placeholder="e.g. 1234567890123"
            required
            aria-describedby="id-error"
            maxLength={13}
          />
          {fieldErrors.idNumber && (
            <span id="id-error" className="field-error" role="alert">
              {fieldErrors.idNumber}
            </span>
          )}
        </label>

        <label>
          Account Number
          <input
            value={form.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value)}
            className={fieldErrors.accountNumber ? 'input-error' : ''}
            inputMode="numeric"
            pattern="\d{8,20}"
            placeholder="8–20 digits only"
            required
            aria-describedby="account-error"
            maxLength={20}
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
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={fieldErrors.password ? 'input-error' : ''}
              placeholder="Min 8 chars with uppercase, lowercase, number, symbol"
              required
              autoComplete="new-password"
              aria-describedby="password-error"
              minLength={8}
              maxLength={64}
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
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      {message && <p className="success" role="status">{message}</p>}
      {submitError && <p className="error" role="alert">{submitError}</p>}
      
      <p className="form-footer">
        Already have an account? <a href="/login">Login here</a>
      </p>
    </section>
  );
}