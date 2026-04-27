# Security Mapping to Part 1

This file helps you explain how the code matches the architecture and security discussion from Part 1.

## Input protection
- Client-side regex validation in React forms
- Server-side regex validation using Zod in `backend/src/utils/validators.ts`
- SQLite queries use parameters rather than string concatenation

## Password storage
- `bcrypt.hash(password, 12)` stores a salted hash
- Passwords are verified with `bcrypt.compare`

## Data in transit
- Backend served with HTTPS using the certificates in `/certs`
- Secure cookie settings enabled
- Helmet adds key headers

## Session protection
- JWT expires after 15 minutes
- Cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`

## Clickjacking protection
- `X-Frame-Options: DENY`
- CSP `frame-ancestors 'none'`

## XSS reduction
- Input validation
- React output escaping
- CSP to restrict scripts

## CSRF protection
- `csurf` middleware
- CSRF token endpoint and token header on payment calls

## DDoS and brute-force reduction
- Express rate limiter
- Can be extended with Cloudflare or Azure Front Door in production

## Audit and monitoring
- Security events logged to `backend/data/audit.log`
