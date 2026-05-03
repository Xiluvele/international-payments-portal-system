# Security Report — International Payments Portal

**Module:** APDS7311  
**Application:** Secure International Payments Portal  
**Stack:** Node.js · Express · TypeScript · React · SQLite  
**Date:** 2026-05-03

---

## Table of Contents

1. [Overview](#overview)
2. [Attack 1 — Password Attacks (Brute Force / Credential Stuffing)](#attack-1--password-attacks)
3. [Attack 2 — SQL Injection](#attack-2--sql-injection)
4. [Attack 3 — Cross-Site Scripting (XSS)](#attack-3--cross-site-scripting-xss)
5. [Attack 4 — Cross-Site Request Forgery (CSRF)](#attack-4--cross-site-request-forgery-csrf)
6. [Attack 5 — Clickjacking](#attack-5--clickjacking)
7. [Attack 6 — Man-in-the-Middle (MitM) / SSL Stripping](#attack-6--man-in-the-middle-mitm--ssl-stripping)
8. [Attack 7 — Session Hijacking / Token Theft](#attack-7--session-hijacking--token-theft)
9. [Attack 8 — Input Injection / Malformed Data](#attack-8--input-injection--malformed-data)
10. [Attack 9 — Information Disclosure](#attack-9--information-disclosure)
11. [Attack 10 — Denial of Service (DoS) via Rate Abuse](#attack-10--denial-of-service-dos-via-rate-abuse)
12. [Attack 11 — Privilege Escalation / Unauthorised Access](#attack-11--privilege-escalation--unauthorised-access)
13. [Attack 12 — Audit Trail Tampering](#attack-12--audit-trail-tampering)
14. [Security Controls Summary Table](#security-controls-summary-table)

---

## Overview

This document describes the security threats considered during development of the International Payments Portal and the specific countermeasures implemented in the codebase to address each threat.

The application handles sensitive financial data (account numbers, ID numbers, SWIFT codes, and payment amounts) for customers and bank employees. Each layer of the stack — database, API, authentication, and frontend — implements independent controls so that a failure in one layer does not immediately compromise the system.

---

## Attack 1 — Password Attacks

### Threat
Attackers attempt to gain access to accounts through brute force guessing, dictionary attacks, or by using leaked credential lists (credential stuffing).

### Countermeasures Implemented

**bcrypt hashing with 12 salt rounds**  
Passwords are never stored in plaintext. Every password is hashed using `bcrypt` with a salt cost factor of 12 before being written to the database. The salt is automatically embedded in the hash, making rainbow table attacks ineffective.

```typescript
// backend/src/services/authService.ts
const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
```

**Secure comparison**  
Password verification uses `bcrypt.compare`, which performs a constant-time comparison and prevents timing attacks.

```typescript
const isValid = await bcrypt.compare(input.password, user.password_hash);
```

**Common password blocklist**  
A blocklist of known weak passwords is checked before any hash is stored.

```typescript
const WEAK_PASSWORDS = ['Password1!', 'Admin123!', 'Welcome1@'];
if (WEAK_PASSWORDS.includes(input.password)) {
  throw new Error('Password is too common. Choose a stronger one.');
}
```

**Password complexity enforced by RegEx**  
Both the frontend and backend enforce that passwords are 8–64 characters and must contain an uppercase letter, lowercase letter, digit, and special character from a specific allowed set.

```typescript
// backend/src/utils/validators.ts
password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,64}$/,
```

**Rate limiting on auth endpoints**  
Login and registration endpoints are limited to 10 attempts per IP per 15 minutes, making automated brute force impractical.

```typescript
// backend/src/middleware/security.ts
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
```

---

## Attack 2 — SQL Injection

### Threat
An attacker injects malicious SQL into a user-supplied field (e.g. `' OR '1'='1`) to manipulate database queries, bypass authentication, or extract data.

### Countermeasures Implemented

**Parameterised queries throughout**  
Every database interaction uses the `sqlite` library's parameterised query interface. User input is passed as separate parameters — never interpolated into the SQL string — so it is always treated as data, not as executable SQL.

```typescript
// backend/src/services/authService.ts
const user = await db.get(
  'SELECT id, username, email, full_name, role, password_hash FROM users WHERE (full_name = ? OR email = ?) AND username = ?',
  input.username,
  input.username,
  input.accountNumber,
);
```

```typescript
// backend/src/services/paymentService.ts
await db.run(
  `INSERT INTO payments (user_id, beneficiary_name, beneficiary_account, swift_code, currency, amount, reference)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  userId, input.beneficiaryName, input.beneficiaryAccount,
  input.swiftCode, input.currency, Number(input.amount), input.reference,
);
```

No raw string concatenation is used anywhere in the data access layer. All 14 database queries across `authService.ts` and `paymentService.ts` use the `?` placeholder pattern.

---

## Attack 3 — Cross-Site Scripting (XSS)

### Threat
An attacker injects malicious JavaScript into content that other users view. This can steal session cookies, redirect users to phishing pages, or perform actions on their behalf.

### Countermeasures Implemented

**React auto-escaping**  
All user-supplied content rendered in JSX (payment references, beneficiary names, customer names) goes through React's built-in HTML escaping. No component uses `dangerouslySetInnerHTML`.

**Content Security Policy (CSP)**  
A strict CSP is applied via Helmet to every response, blocking inline scripts, third-party scripts, and any source not explicitly listed.

```typescript
// backend/src/middleware/security.ts
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc:  ["'self'"],          // no inline or external scripts
    styleSrc:   ["'self'", "'unsafe-inline'"],
    imgSrc:     ["'self'", 'data:'],
    connectSrc: ["'self'", env.frontendOrigin],
    frameAncestors: ["'none'"],
  },
},
```

**Strict input whitelisting**  
All user inputs are validated against RegEx whitelists on both the frontend and backend before they reach the database. Characters that could form HTML or script tags (e.g. `<`, `>`) are not in any allowed set.

```typescript
beneficiaryName: /^[A-Za-z0-9 .,'-]{2,80}$/,   // no < > & " etc.
reference:       /^[A-Za-z0-9 .,_-]{2,120}$/,
```

**X-Powered-By removed**  
The `X-Powered-By: Express` header is removed to reduce fingerprinting information available to attackers.

```typescript
app.disable('x-powered-by');
```

---

## Attack 4 — Cross-Site Request Forgery (CSRF)

### Threat
An attacker tricks a logged-in user's browser into submitting a forged request to the application (e.g. submitting a payment to a different beneficiary) using the user's active session cookie.

### Countermeasures Implemented

**csurf middleware on all state-changing routes**  
The `csurf` package enforces the synchroniser token pattern. A CSRF secret is stored in a secure HttpOnly cookie. A corresponding token must be sent in the `CSRF-Token` request header for every POST/PATCH request. Register, login, payment submission, payment verification, and SWIFT submission all require a valid token.

```typescript
// backend/src/app.ts
app.use('/api/payments', csrfProtection, paymentRouter);

// backend/src/routes/authRoutes.ts
authRouter.post('/register', authRateLimit, csrfProtection, async (req, res) => { ... });
authRouter.post('/login',    authRateLimit, csrfProtection, async (req, res) => { ... });
```

**CSRF token sent from the frontend on every request**

```typescript
// frontend/src/api/auth.ts
headers: { 'CSRF-Token': csrfToken }

// frontend/src/api/payments.ts
headers: { 'CSRF-Token': csrfToken }
```

**SameSite=Strict cookie attribute**  
Both the authentication cookie and the CSRF secret cookie are set with `SameSite: 'strict'`, preventing the browser from attaching them to any cross-origin request.

```typescript
// backend/src/middleware/security.ts — CSRF cookie
export const csrfProtection = csrf({
  cookie: { httpOnly: true, sameSite: 'strict', secure: true },
});

// backend/src/routes/authRoutes.ts — session cookie
res.cookie(env.cookieName, token, {
  httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000,
});
```

---

## Attack 5 — Clickjacking

### Threat
An attacker embeds the application in a hidden `<iframe>` on a malicious page, overlaying deceptive UI elements so that the user unknowingly interacts with the real application (e.g. unwittingly confirming a payment).

### Countermeasures Implemented

**X-Frame-Options: DENY**  
Set via Helmet's `frameguard` to block the page from being embedded in any frame or iframe, in any origin.

```typescript
helmet({ frameguard: { action: 'deny' } })
```

**CSP frame-ancestors: 'none'**  
The CSP `frame-ancestors` directive provides the modern equivalent of `X-Frame-Options`, also blocking all embedding. Both are present for broad browser compatibility.

```typescript
frameAncestors: ["'none'"]
```

---

## Attack 6 — Man-in-the-Middle (MitM) / SSL Stripping

### Threat
An attacker intercepts network traffic between the user and the server to read credentials, payment data, or session tokens — or downgrades the connection from HTTPS to HTTP to achieve this.

### Countermeasures Implemented

**TLS enforced at the server level**  
The backend is an HTTPS-only server. The HTTP server is never started; the application cannot accept plain HTTP connections.

```typescript
// backend/src/server.ts
const httpsServer = https.createServer({ cert, key }, app);
httpsServer.listen(env.port, ...);
```

**HTTP Strict Transport Security (HSTS)**  
In production, the `Strict-Transport-Security` header tells browsers to only connect over HTTPS for the next year and to include subdomains. Once a browser sees this header it will refuse plain HTTP connections to the domain.

```typescript
hsts: isProduction
  ? { maxAge: 31536000, includeSubDomains: true, preload: true }
  : false,
```

**Secure cookie flag**  
Session and CSRF cookies are flagged `secure: true`, meaning they will never be transmitted over a plain HTTP connection.

**FRONTEND_ORIGIN validated at startup**  
In production, the server refuses to start if `FRONTEND_ORIGIN` does not begin with `https://`, ensuring no CORS allowance is accidentally made to an unencrypted origin.

```typescript
// backend/src/config/env.ts
if (isProduction && !env.frontendOrigin.startsWith('https://')) {
  throw new Error('FRONTEND_ORIGIN must use HTTPS in production.');
}
```

---

## Attack 7 — Session Hijacking / Token Theft

### Threat
An attacker steals a valid session token — via network interception, XSS, or local storage theft — and uses it to impersonate the victim without knowing their password.

### Countermeasures Implemented

**HttpOnly cookie storage**  
The JWT session token is stored exclusively in an HttpOnly cookie. JavaScript running on the page (including any injected by XSS) cannot read or steal it via `document.cookie` or `localStorage`.

```typescript
res.cookie(env.cookieName, token, { httpOnly: true, secure: true, sameSite: 'strict' });
```

**Short JWT expiry (15 minutes)**  
Tokens expire after 15 minutes, limiting the window of opportunity if a token is somehow obtained.

```typescript
jwt.sign({ ...user, jti: crypto.randomUUID() }, env.jwtSecret, { expiresIn: '15m' });
```

**Token blacklist on logout**  
On logout, the token's unique `jti` identifier is added to an in-memory blacklist and the auth cookie is cleared. Any subsequent request using the revoked token is rejected even if the 15-minute expiry has not elapsed.

```typescript
// backend/src/services/authService.ts
const tokenBlacklist = new Map<string, number>();

export function revokeToken(token: string) {
  const payload = jwt.decode(token) as { jti?: string; exp?: number } | null;
  if (payload?.jti) {
    tokenBlacklist.set(payload.jti, payload.exp ? payload.exp * 1000 : Date.now() + 900_000);
  }
}
```

**JWT secret strength enforced**  
In production, the server refuses to start if `JWT_SECRET` is the default value or is shorter than 32 characters, preventing weak signing keys.

```typescript
if (env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
```

---

## Attack 8 — Input Injection / Malformed Data

### Threat
An attacker submits specially crafted input — oversized payloads, unexpected characters, or invalid formats — to crash the server, corrupt stored records, or bypass business logic.

### Countermeasures Implemented

**RegEx whitelist validation on every user input**  
Every field is validated against a strict allowlist pattern on both the frontend (immediate feedback) and backend (enforcement). Fields only accept the minimum character set required for their purpose.

| Field | Pattern | Allowed |
|---|---|---|
| Email | `/^[A-Za-z0-9._%+-]{3,64}@[A-Za-z0-9.-]{2,253}\.[A-Za-z]{2,24}$/` | Standard email format with strict allowlist |
| Full name | `/^[A-Za-z ]{2,50}$/` | Letters and spaces only |
| ID number | `/^\d{13}$/` | Exactly 13 digits |
| Account number | `/^\d{8,20}$/` | 8–20 digits only |
| Password | Complex RegEx | 8–64 chars, mixed case + digit + special char |
| SWIFT code | `/^[A-Z0-9]{8}([A-Z0-9]{3})?$/` | 8 or 11 alphanumeric uppercase |
| Beneficiary name | `/^[A-Za-z0-9 .,'-]{2,80}$/` | Limited punctuation |
| Currency | `/^[A-Z]{3}$/` | Exactly 3 uppercase letters |
| Amount | `/^(?!0+(\.0+)?$)\d+(\.\d{1,2})?$/` | Positive number, max 2 decimal places |
| Reference | `/^[A-Za-z0-9 .,_-]{2,120}$/` | Limited punctuation |

**Zod schema validation on every backend route**

```typescript
// backend/src/routes/authRoutes.ts
const parsed = registerSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ message: 'Invalid registration input.' });
}
```

**Request body size limit**  
Express is configured to reject request bodies larger than 100 KB, preventing large payload attacks.

```typescript
app.use(express.json({ limit: '100kb' }));
```

**Payment ID parameter validation**  
Employee route parameters are validated as positive integers before being used in a query.

```typescript
const paymentId = Number(req.params.id);
if (!Number.isInteger(paymentId) || paymentId < 1) {
  return res.status(400).json({ message: 'Invalid payment ID.' });
}
```

---

## Attack 9 — Information Disclosure

### Threat
An attacker extracts sensitive information about the system — stack traces, framework versions, validation schemas, database structure — from error responses or HTTP headers.

### Countermeasures Implemented

**Validation error details hidden in production**  
In development, Zod error details are returned to aid debugging. In production, only a generic message is returned so the request schema is not exposed.

```typescript
return res.status(400).json({
  message: 'Invalid registration input.',
  ...(isProduction ? {} : { errors: parsed.error.flatten() }),
});
```

**X-Powered-By header removed**  
The default Express fingerprint header is disabled.

```typescript
app.disable('x-powered-by');
```

**Referrer-Policy: no-referrer**  
The `Referrer-Policy` header prevents the browser from leaking the application URL in requests to third parties.

```typescript
referrerPolicy: { policy: 'no-referrer' }
```

**Cross-Origin-Opener-Policy: same-origin**  
Prevents cross-origin pages from accessing the application's browsing context via `window.opener`, blocking cross-origin data leakage attacks.

```typescript
crossOriginOpenerPolicy: { policy: 'same-origin' }
```

**Permissions-Policy header**  
Explicitly disables browser features that the application does not use, preventing feature-based side-channel attacks.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

**Generic authentication error messages**  
Login always returns the same error regardless of whether the full name, account number, or password was wrong. This prevents user enumeration — an attacker cannot determine whether an account exists.

```typescript
throw new Error('Invalid username or password.');
```

---

## Attack 10 — Denial of Service (DoS) via Rate Abuse

### Threat
An attacker floods the server with requests to exhaust server resources, lock out legitimate users through repeated failed login attempts, or spam the payment submission endpoint.

### Countermeasures Implemented

**Global rate limit**  
All API endpoints are limited to 100 requests per IP per 15-minute window.

```typescript
rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 })
```

**Strict authentication rate limit**  
Login and registration are independently limited to 10 attempts per IP per 15 minutes — substantially reducing the feasibility of brute force or credential stuffing.

```typescript
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
```

**Payment submission rate limit**  
Payment creation is independently limited to 30 submissions per IP per 15 minutes, preventing payment spam.

```typescript
export const paymentRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
```

**Request body size cap**  
Requests with a body larger than 100 KB are rejected before parsing, preventing memory exhaustion via oversized payloads.

---

## Attack 11 — Privilege Escalation / Unauthorised Access

### Threat
A customer attempts to access employee-only functionality (viewing all transactions, verifying payments, submitting to SWIFT), or an unauthenticated user accesses protected routes.

### Countermeasures Implemented

**JWT-based authentication middleware**  
Every protected route uses `requireAuth`, which verifies the JWT on every request. An expired, malformed, or revoked token results in a 401 response.

```typescript
// backend/src/middleware/authMiddleware.ts
export function requireAuth(req, res, next) {
  const token = req.cookies?.[env.cookieName];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}
```

**Role-based access control on employee routes**  
A `requireEmployee` guard is applied to all employee-only endpoints. A customer JWT (role: `customer`) is rejected with 403.

```typescript
// backend/src/routes/paymentRoutes.ts
function requireEmployee(req, res, next) {
  if (req.user?.role !== 'employee') {
    return res.status(403).json({ message: 'Access denied. Employee access only.' });
  }
  next();
}

paymentRouter.get('/all',             requireEmployee, ...);
paymentRouter.patch('/:id/verify',    requireEmployee, ...);
paymentRouter.post('/submit-to-swift',requireEmployee, ...);
```

**Role stored in JWT payload**  
The user role is embedded in the signed JWT so it cannot be tampered with by a client without invalidating the signature.

```typescript
jwt.sign({ id, username, fullName, role, jti: crypto.randomUUID() }, env.jwtSecret, { expiresIn: '15m' });
```

**Frontend role-based routing**  
The React frontend renders the customer dashboard or employee dashboard based on the role from the verified session, preventing customers from seeing employee UI even if they guess the route.

```tsx
// frontend/src/App.tsx
{user?.role === 'employee'
  ? <EmployeeDashboard user={user} csrfToken={csrfToken} />
  : <DashboardPage     user={user} csrfToken={csrfToken} />
}
```

---

## Attack 12 — Audit Trail Tampering

### Threat
An attacker (including a malicious insider) attempts to cover their tracks by deleting or modifying log records after performing unauthorised actions.

### Countermeasures Implemented

**Append-only audit log**  
All security-relevant events are written to `data/audit.log` using `fs.appendFileSync`. Entries are never overwritten or deleted by the application.

```typescript
// backend/src/utils/auditLogger.ts
fs.appendFileSync(logPath, `${line}\n`, 'utf8');
```

**Structured JSON log entries**  
Every entry includes an ISO timestamp, event type, IP address, and relevant context (user ID, payment ID, etc.), providing a complete and queryable audit trail.

```json
{ "timestamp": "2026-04-27T10:00:00.000Z", "event": "payment_verified",
  "ip": "127.0.0.1", "employeeId": 2, "paymentId": 7 }
```

**Events logged**

| Event | Trigger |
|---|---|
| `register_validation_failed` | Invalid registration input submitted |
| `register_success` | New customer account created |
| `login_validation_failed` | Invalid login input submitted |
| `login_success` | Successful login |
| `login_failed` | Incorrect credentials |
| `payment_validation_failed` | Invalid payment input submitted |
| `payment_created` | Customer submits a payment |
| `payment_verified` | Employee marks a payment as verified |
| `payments_submitted_to_swift` | Employee submits verified payments |

---

## Security Controls Summary Table

| Attack Category | Control | Location |
|---|---|---|
| Brute force / credential stuffing | bcrypt (12 rounds), rate limiting (10/15 min), common password blocklist | `authService.ts`, `security.ts` |
| SQL injection | Parameterised queries (`?` placeholders) on all DB operations | `authService.ts`, `paymentService.ts` |
| XSS | CSP `script-src: 'self'`, React auto-escaping, input whitelists | `security.ts`, all components |
| CSRF | csurf synchroniser token on all POST/PATCH routes, SameSite=Strict cookies | `security.ts`, `authRoutes.ts`, `app.ts` |
| Clickjacking | `X-Frame-Options: DENY`, `frame-ancestors: 'none'` | `security.ts` (Helmet) |
| MitM / SSL stripping | HTTPS-only server, HSTS (1 year, preload), Secure cookie flag | `server.ts`, `security.ts` |
| Session hijacking | HttpOnly cookie, 15-min JWT expiry, token blacklist on logout | `authRoutes.ts`, `authService.ts` |
| Malformed input | RegEx whitelist on every field (frontend + backend), 100 KB body limit | `validators.ts`, all pages |
| Information disclosure | Generic error messages, no stack traces in production, headers cleaned | `authRoutes.ts`, `security.ts` |
| DoS via rate abuse | Three-tier rate limiting (global, auth, payment) | `security.ts`, route files |
| Privilege escalation | JWT `requireAuth` guard, `requireEmployee` role guard, role in JWT | `authMiddleware.ts`, `paymentRoutes.ts` |
| Audit trail tampering | Append-only structured JSON log with timestamps and IP addresses | `auditLogger.ts` |

---

## DevSecOps CI/CD Evidence

### Pipeline implemented
A CI pipeline is configured in GitHub Actions and runs automatically on every push and pull request:

```yaml
# .github/workflows/ci.yml
on:
  push:
    branches: ["**"]
  pull_request:
```

### Security value
- **Consistency:** every change follows the same build checks, reducing release drift.
- **Early detection:** broken or risky changes are caught before merge/deployment.
- **Traceability:** CI logs provide an auditable history of build validation for each commit.

### Pipeline checks
- Install dependencies (`npm ci` + workspace install)
- Build backend and frontend (`npm run build`)

---

*Generated for APDS7311 — International Payments Portal*
