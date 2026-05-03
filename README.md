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
1. Register a user
2. Log in
3. View CSRF-secured payment form
4. Submit a valid payment
5. Try invalid input and show validation blocking it
6. Open browser dev tools and show the auth cookie is HttpOnly
7. Show HTTPS running locally

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
Create one through the Register page.

## Repository scripts

```bash           # start backend + frontend
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
