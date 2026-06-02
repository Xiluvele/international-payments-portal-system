# Secure Customer International Payments Portal

A full-stack starter repository for APDS7311 Task 2. It includes:

- React customer portal
- Node.js + Express API
- SQLite database for local development
- Password hashing and salting with bcrypt
- Regex whitelist validation on both client and server
- HTTPS for local SSL testing
- Security headers, CSRF protection, rate limiting, secure cookies, and basic audit logging

## Tech stack

- Frontend: React, TypeScript, Vite, React Router
- Backend: Node.js, Express, TypeScript
- Database: SQLite
- Auth: JWT in HttpOnly cookie
- Security: Helmet, HSTS, CSP, X-Frame-Options, CSRF, bcrypt, input validation, rate limiting

## Assignment mapping

### 1. Password security with hashing and salting
- Implemented in `backend/src/services/authService.ts`
- Uses `bcrypt` with salt rounds
- Passwords are never stored in plain text

### 2. Whitelist all input using RegEx patterns
- Implemented in `backend/src/utils/validators.ts`
- Enforced again in the React forms for early feedback
- Examples:
  - Username: letters, numbers, dot, underscore, hyphen
  - Account number: digits only
  - SWIFT: uppercase letters and digits, 8 or 11 chars
  - Currency: ISO-style 3 uppercase letters

### 3. Ensure all traffic is served over SSL
- The API runs on HTTPS using the certificate files in `/certs`
- Frontend dev server can also run over HTTPS
- HSTS is enabled in production mode

### 4. Protect against attacks
Implemented protections include:

- SQL injection: parameterized SQLite queries
- XSS: React auto-escaping, CSP, server-side validation
- Clickjacking: `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`
- CSRF: CSRF token route + `csurf`
- Session theft reduction: HttpOnly cookies, SameSite, short JWT expiry
- Brute force / basic DDoS mitigation: rate limiting
- Sensitive headers: Helmet
- Logging: audit log for suspicious validation failures and auth events

### 5. Demo video guidance
Use OBS to record:
1. Log in with a pre-seeded customer account (no registration UI exists)
2. Submit a valid payment via the CSRF-secured form
3. Try invalid input and show validation blocking it on both client and server
4. Open browser dev tools and show the auth cookie is HttpOnly + Secure + SameSite=Strict
5. Show HTTPS running locally
6. Log in as an employee, verify a payment, submit it to SWIFT
7. Log out, then log in as the **Audit Admin** account to show the security-monitoring dashboard
8. Deliberately fail login 5 times on a customer account to demonstrate account lockout (423) — then go back to the admin view and show the `login_blocked_account_locked` event appearing live
9. Try to hit `/api/audit/recent` as the employee — show the 403 + `audit_access_denied` entry — to demonstrate least-privilege separation

## Project structure

```text
international-payments-portal/
  backend/
  frontend/
  certs/
  docs/
```

## Quick start

### Prerequisites
- Node.js 20+
- npm 10+

### Install

```bash
npm install
npm run install:all
```

### Run both apps

```bash
npm run dev
```

Frontend:
- https://localhost:5173

Backend:
- https://localhost:5001

### Demo users

> **Self-registration is disabled** by policy — the brief requires that no registration process is possible. All accounts are pre-provisioned on backend startup. `POST /api/auth/register` returns `403` and writes a `register_attempt_blocked` event to the audit log.

**Pre-seeded employee accounts:**

| Full name       | Login identifier (name or email)          | Account number | Password           |
|---|---|---|---|
| Bank Employee   | `Bank Employee` or `employee0@bank.local` | `10000000`     | `BankEmployee@1`   |
| TalinUser       | `TalinUser` or `employee1@bank.local`     | `10000001`     | `BankEmployee@1`   |
| NokubongaUser   | `NokubongaUser` or `employee2@bank.local` | `10000002`     | `BankEmployee@1`   |
| SimaUser        | `SimaUser` or `employee3@bank.local`      | `10000003`     | `BankEmployee@1`   |

**Pre-seeded customer accounts:**

| Full name       | Login identifier (name or email)             | Account number | Password         |
|---|---|---|---|
| Jane Smith      | `Jane Smith` or `jane.smith@example.com`     | `20000001`     | `Customer@2026`  |
| John Doe        | `John Doe` or `john.doe@example.com`         | `20000002`     | `Customer@2026`  |
| Amara Naidoo    | `Amara Naidoo` or `amara.naidoo@example.com` | `20000003`     | `Customer@2026`  |

**Pre-seeded administrator account (audit console only):**

| Full name    | Login identifier (name or email)         | Account number | Password           |
|---|---|---|---|
| Audit Admin  | `Audit Admin` or `audit.admin@bank.local` | `30000001`     | `AuditAdmin@2026`  |

Use the **exact full name** (case-sensitive) or the **email** shown, plus the matching **account number** and password.

### Role separation (least privilege)

| Role       | What they see                                                                 | What they cannot do |
|---|---|---|
| `customer` | Their own payments + the new-payment form                                     | View other customers, verify, see audit log |
| `employee` | All customer payments, verify, submit batch to SWIFT                          | View audit log |
| `admin`    | Append-only security audit log + summary counters (read-only)                 | View or process payments |

The audit endpoint `/api/audit/recent` enforces `role === 'admin'`. Any non-admin attempt is rejected with HTTP `403` and writes an `audit_access_denied` event. Successful admin reads also write an `audit_log_viewed` event — so the audit trail records who watched it.

### Account lockout

After **5 consecutive failed login attempts** on the same account, the account is locked for **15 minutes**. Locked logins respond with HTTP `423 Locked` and a `login_blocked_account_locked` audit event. A successful login clears the counter. This is independent of the per-IP rate limit and protects against slow distributed credential-stuffing attacks.

## Repository scripts

```bash
npm run dev            # start backend + frontend
npm run build          # build both
npm run lint           # lint both
npm run install:all    # install workspace dependencies
```

## Notes for your team

- This is a solid academic starter, not a production banking system.
- For production, add MFA, WAF, managed database secrets, certificate rotation, SIEM integration, and cloud DDoS edge protection.
- The local self-signed certificate is included only for development and demo purposes.

## Suggested team branches

- `feature/authentication`
- `feature/payments-ui`
- `feature/audit-logging`
- `feature/tests`
- `feature/deployment`

## Hand-in checklist

- Zip the repository
- Include screenshots or screen recording
- Show the mapping between your Part 1 design and the code in this repo
- Mention limitations and future improvements clearly
