# Security Policy

This repository implements the APDS7311 Secure International Payments Portal. The policy below describes how vulnerabilities should be reported and what security controls are enforced at runtime.

## Reporting a Vulnerability

If you believe you have found a security vulnerability:

1. **Do not** open a public GitHub issue.
2. Email the maintainers privately with:
   - a description of the issue,
   - steps to reproduce,
   - the commit / version affected,
   - any proof-of-concept payload.
3. Allow up to 14 days for an initial response and 30 days for a fix before any public disclosure.

We follow coordinated disclosure: reporters are credited in release notes unless they request anonymity.

## Supported Versions

| Branch | Status |
|---|---|
| `main` | Active development, security fixes applied here first |
| Older release branches | Not supported |

## Runtime Security Controls

A full mapping of controls to attack vectors is in [SECURITY-REPORT.md](SECURITY-REPORT.md). Highlights:

- Passwords hashed with bcrypt at 12 salt rounds; never stored in plaintext.
- Account lockout after 5 failed login attempts (15-minute window), in addition to per-IP rate limits.
- JWT sessions stored only in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. 15-minute expiry. Per-token `jti` blacklist on logout.
- CSRF synchroniser tokens (`csurf`) on every state-changing route.
- Strict CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` lockdown.
- Production startup refuses to run if `JWT_SECRET` is the development default, is shorter than 32 characters, or if `FRONTEND_ORIGIN` is not `https://`.
- All database access uses parameterised SQL placeholders — no string concatenation.
- Whitelist regex validation on every user input, enforced on both the React client and the Express server.
- Append-only structured JSON audit log for register/login/payment/verify/swift events, plus blocked-registration probes and account-lockout events.
- Self-registration is **disabled**: `POST /api/auth/register` returns `403` and writes a `register_attempt_blocked` audit event. All user accounts are provisioned by seeding.
- **Three-role least-privilege model:**
  - `customer` — own payments only.
  - `employee` — read/verify all customer payments + push to SWIFT. No audit-log access.
  - `admin` — read-only audit-log console. No payment access.
  Non-admin access to `/api/audit/recent` returns `403` and writes `audit_access_denied`. Successful admin reads write `audit_log_viewed` so the audit trail records who watched it.

## Operational Security Recommendations

When deploying this portal:

- Run the backend as a non-root user behind a TLS-terminating reverse proxy that forwards `X-Forwarded-For`.
- Mount the SQLite database file on encrypted storage; rotate backups offsite.
- Rotate `JWT_SECRET` on any suspected compromise — all existing sessions are invalidated.
- Forward the audit log to a centralised SIEM (Splunk / ELK / Datadog) for alerting on `login_blocked_account_locked` and `register_attempt_blocked` events.
- Enable Dependabot or equivalent SCA scanning on the GitHub repository.

## Threat Model Scope

In scope: web application controls (authentication, session management, input validation, transport security, audit trail).

Out of scope for this academic submission: physical security, HSM-backed key storage, fraud-detection rules, AML/KYC processes, regulatory reporting integrations.
