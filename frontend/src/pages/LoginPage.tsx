import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import type { User } from "../types";
import { useTouchedFields } from "../hooks/useTouchedFields";
import { setFieldError } from "../utils/liveValidate";

const patterns = {
  identifier:
    /^(?:[A-Za-z ]{2,50}|[A-Za-z0-9._%+-]{3,64}@[A-Za-z0-9.-]{2,253}\.[A-Za-z]{2,24})$/,
  accountNumber: /^\d{8,20}$/,
};

const fieldErrorMessages = {
  identifier: "Enter a valid full name or email address.",
  accountNumber: "8–20 digits. Numbers only.",
  password: "Password must be 8–64 characters.",
};

type LoginFieldKey = keyof typeof patterns | "password";
type FieldErrors = Partial<Record<LoginFieldKey, string>>;

function loginPasswordValid(v: string) {
  return v.length >= 8 && v.length <= 64;
}

export function LoginPage({
  onLogin,
  csrfToken,
}: {
  onLogin: (user: User) => void;
  csrfToken: string;
}) {
  const navigate = useNavigate();
  const { markTouched, isTouched, markAllTouched } =
    useTouchedFields<LoginFieldKey>();
  const [identifier, setIdentifier] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const errors: FieldErrors = {};
    if (!patterns.identifier.test(identifier))
      errors.identifier = fieldErrorMessages.identifier;
    if (!patterns.accountNumber.test(accountNumber))
      errors.accountNumber = fieldErrorMessages.accountNumber;
    if (!loginPasswordValid(password))
      errors.password = fieldErrorMessages.password;

    if (Object.keys(errors).length > 0) {
      markAllTouched(Object.keys(errors) as LoginFieldKey[]);
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const response = await loginUser(csrfToken, {
        username: identifier,
        accountNumber,
        password,
      });
      onLogin(response.user);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="card narrow">
      <h2>Login</h2>
      <p>
        Use your <strong>full name</strong> as your username. The session is
        stored in a Secure, HttpOnly cookie.
      </p>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Full name or email <span className="field-hint">(your username)</span>
          <input
            value={identifier}
            onChange={(e) => {
              const v = e.target.value;
              setIdentifier(v);
              if (isTouched("identifier")) {
                setFieldError(
                  setFieldErrors,
                  "identifier",
                  v,
                  patterns.identifier.test(v),
                  fieldErrorMessages.identifier,
                );
              }
            }}
            onBlur={(e) => {
              markTouched("identifier");
              const v = e.target.value;
              setFieldError(
                setFieldErrors,
                "identifier",
                v,
                patterns.identifier.test(v),
                fieldErrorMessages.identifier,
              );
            }}
            className={fieldErrors.identifier ? "input-error" : ""}
            placeholder="e.g. Jane Smith or jane@example.com"
            required
          />
          {fieldErrors.identifier && (
            <span className="field-error">{fieldErrors.identifier}</span>
          )}
        </label>
        <label>
          Account number
          <input
            value={accountNumber}
            onChange={(e) => {
              const v = e.target.value;
              setAccountNumber(v);
              if (isTouched("accountNumber")) {
                setFieldError(
                  setFieldErrors,
                  "accountNumber",
                  v,
                  patterns.accountNumber.test(v),
                  fieldErrorMessages.accountNumber,
                );
              }
            }}
            onBlur={(e) => {
              markTouched("accountNumber");
              const v = e.target.value;
              setFieldError(
                setFieldErrors,
                "accountNumber",
                v,
                patterns.accountNumber.test(v),
                fieldErrorMessages.accountNumber,
              );
            }}
            className={fieldErrors.accountNumber ? "input-error" : ""}
            inputMode="numeric"
            required
          />
          {fieldErrors.accountNumber && (
            <span className="field-error">{fieldErrors.accountNumber}</span>
          )}
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => {
              const v = e.target.value;
              setPassword(v);
              if (isTouched("password")) {
                setFieldError(
                  setFieldErrors,
                  "password",
                  v,
                  loginPasswordValid(v),
                  fieldErrorMessages.password,
                );
              }
            }}
            onBlur={(e) => {
              markTouched("password");
              const v = e.target.value;
              setFieldError(
                setFieldErrors,
                "password",
                v,
                loginPasswordValid(v),
                fieldErrorMessages.password,
              );
            }}
            className={fieldErrors.password ? "input-error" : ""}
            required
          />
          {fieldErrors.password && (
            <span className="field-error">{fieldErrors.password}</span>
          )}
        </label>
        <button type="submit">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
