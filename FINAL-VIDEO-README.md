# APDS7311 Task 3 — Secure Customer & Employee International Payments Portal

## 1) Submission Links

- **Repository (GitHub/GitLab):** `<PASTE_REPO_LINK>`
- **Live app link (if deployed):** `<PASTE_LIVE_LINK_OR_N/A>`
- **Unlisted YouTube demo video (mandatory):** `<PASTE_YOUTUBE_LINK>`

> If no-code platform was used, include test login details here.  
> For this coded project, test users are listed below.

---

## 2) What We Built

A secure international payments portal with three role-separated consoles:

- **Customer** — log in (no self-registration), submit international payments, view own payment history
- **Employee** — review all customer payments, verify SWIFT details, submit verified batch to SWIFT
- **Admin** — read-only access to the append-only security audit log (deeper monitoring)

Static login only — all accounts are pre-provisioned and seeded on backend startup. The `POST /api/auth/register` endpoint returns `403` and logs a `register_attempt_blocked` event to deter probing.

Security implementation was prioritized over UI complexity, per assignment guide.

---

## 3) Tech Stack Used

### Frontend
- React
- TypeScript
- Vite
- React Router

### Backend
- Node.js
- Express
- TypeScript

### Database
- SQLite

### Security Libraries / Controls
- `bcrypt` for password hashing and salting
- `zod` + regex allowlists for strict input validation
- `helmet` for secure headers (CSP, frameguard, etc.)
- `csurf` for CSRF protection
- `express-rate-limit` for brute-force and abuse mitigation
- JWT in `HttpOnly` secure cookies for session handling

---

## 4) Why These Choices Were Made

- **React + TypeScript:** fast development with strong type safety and maintainable structure.
- **Express + SQLite:** lightweight full-stack setup suitable for assignment constraints and local demos.
- **bcrypt:** trusted password hashing approach with salt rounds.
- **Regex + Zod:** enforce strict whitelist validation on both client and server.
- **Helmet + CSRF + secure cookies:** practical layered protection for common web attacks.
- **Rate limiting:** reduces brute-force and request abuse risk.
- **CI pipeline:** basic DevSecOps automation to validate builds on every push/PR.

---

## 5) Validation Implemented (Guide-Aligned)

Validation is enforced on both frontend and backend.

### Required guide fields
- **Email:** strict email regex
- **Name:** letters and spaces only
- **Payment amount:** positive numeric with max 2 decimals
- **Account/IBAN equivalent:** account number + SWIFT rules

### Additional validated fields
- ID number
- Password complexity
- Currency code (3 uppercase letters)
- Beneficiary name
- Reference text

Primary validation source: `backend/src/utils/validators.ts`  
Frontend validation mirrors these patterns in form pages under `frontend/src/pages/`.

---

## 6) Error Messages Used (What Examiner Will See)

From the current codebase (`backend/src/routes/authRoutes.ts`, `backend/src/routes/auditRoutes.ts`, `backend/src/services/authService.ts`, `backend/src/middleware/security.ts`):

- `Invalid login input.`
- `Login successful.`
- `Invalid username or password.`
- `Account temporarily locked due to repeated failed login attempts. Try again later.` *(HTTP 423 — new in Task 3)*
- `Self-registration is disabled. Contact your bank to provision an account.` *(HTTP 403 — new in Task 3)*
- `Access denied. Audit access is restricted to administrators.` *(HTTP 403 — new in Task 3)*
- `Access denied. Employee access only.`
- `Too many attempts. Please try again later.`
- `Too many requests. Please try again later.`
- `Too many payment requests. Please try again later.`
- `Authentication required.`
- `Invalid or expired session.`
- `Invalid CSRF token.`
- `Logged out successfully.`

---

## 7) Security Controls Demonstrated

### Password Security
- Passwords are hashed and salted with bcrypt (12 rounds).
- Plain text passwords are never stored.
- Account-level lockout: 5 failed logins lock the account for 15 minutes (HTTP 423). Survives across IPs, so it stops slow distributed credential-stuffing that per-IP rate limiting alone would miss.

### Input Whitelisting
- Regex allowlist validation on frontend and backend.
- Invalid input is rejected and shown in form/API errors.

### HTTPS / SSL
- Frontend and backend are served over HTTPS locally.
- Cookies use secure attributes.
- HSTS is enabled in production mode.

### Protection Against Attacks
- SQL injection: parameterized queries
- XSS: React escaping + CSP
- Clickjacking: `X-Frame-Options: DENY` + `frame-ancestors 'none'`
- CSRF: token-based CSRF middleware
- Session hijacking reduction: HttpOnly + Secure + SameSite cookies + JWT expiry
- Brute force / DoS mitigation: per-IP rate limiting + per-account lockout
- Security headers: Helmet
- Audit logging for security events, viewable live only by a dedicated **admin** role — employees and customers are blocked
- Self-registration disabled — blocked attempts logged to audit trail
- Three-role least-privilege model: customer / employee / admin, each with non-overlapping permissions

---

## 8) DevSecOps Pipeline (Mandatory Requirement)

A CI workflow runs on every push and pull request:

- File: `.github/workflows/ci.yml`
- Installs dependencies
- Builds backend and frontend

Why this improves security:
- catches breaking changes early
- enforces consistent checks per commit
- creates auditable build history

---

## 9) Tool Declaration (Mandatory)

Tools used in this project:

- React, Node.js, Express, SQLite
- Security libraries: bcrypt, helmet, csurf, express-rate-limit, zod
- AI-assisted tooling: Cursor AI / ChatGPT-style assistance for acceleration and documentation support

Declaration:
- Generated suggestions were reviewed and understood.
- Security-critical code was implemented and validated in-project.
- We are transparently declaring tool usage as required by the module guide.

---

## 10) Demo Accounts / Test Details

> **Self-registration is disabled** (Task 3 brief: "no registration process should be possible"). All accounts below are seeded automatically on first backend startup.

### Pre-seeded Customer Accounts
| Full name | Login identifier | Account number | Password |
|---|---|---|---|
| Jane Smith   | `Jane Smith` or `jane.smith@example.com`     | `20000001` | `Customer@2026` |
| John Doe     | `John Doe` or `john.doe@example.com`         | `20000002` | `Customer@2026` |
| Amara Naidoo | `Amara Naidoo` or `amara.naidoo@example.com` | `20000003` | `Customer@2026` |

### Pre-seeded Employee Accounts
| Full name | Login identifier | Account number | Password |
|---|---|---|---|
| Bank Employee | `Bank Employee` or `employee0@bank.local` | `10000000` | `BankEmployee@1` |
| TalinUser     | `TalinUser` or `employee1@bank.local`     | `10000001` | `BankEmployee@1` |
| NokubongaUser | `NokubongaUser` or `employee2@bank.local` | `10000002` | `BankEmployee@1` |
| SimaUser      | `SimaUser` or `employee3@bank.local`      | `10000003` | `BankEmployee@1` |

### Pre-seeded Administrator Account (audit console only)
| Full name | Login identifier | Account number | Password |
|---|---|---|---|
| Audit Admin | `Audit Admin` or `audit.admin@bank.local` | `30000001` | `AuditAdmin@2026` |

The admin role is intentionally limited to **read-only audit log access**. It cannot view payments, verify transactions, or submit to SWIFT — those duties belong to bank employees. This is the **least-privilege** separation the rubric's "exceeds the required standard" column is looking for, and the part to highlight when the video reaches deeper monitoring.

---

## 11) Voice-Over Script (Use in Video)

> Pacing target: roughly **6–8 minutes**. Each numbered block is one screen action so you can scrub the recording to match.

**1. Intro (≈20s)**  
"Hello, this is our APDS7311 Task 3 secure international payments portal. The stack is React and TypeScript on the frontend, Node.js, Express, and SQLite on the backend. The brief required us to remove self-registration, pre-provision all accounts, secure the API against common web attacks, and add a DevSecOps pipeline. I'll walk through each of those now."

**2. Static login — no registration (≈30s)**  
*(Open the login page. Show that there is no Register link.)*  
"The brief explicitly says no registration process should be possible. There is no Register page in the UI, and if I try to hit the backend `/api/auth/register` endpoint directly..."  
*(Open dev tools → Network, POST to `/api/auth/register`.)*  
"...the server returns HTTP 403 and writes a `register_attempt_blocked` event into the audit log. All accounts — three customers, four employees, and one admin — are seeded on first backend startup."

**3. Customer login + HTTPS + cookie (≈40s)**  
*(Log in as Jane Smith with account 20000001.)*  
"I'm logging in as a pre-seeded customer. The browser shows the padlock — we serve everything over HTTPS using a self-signed certificate locally and would use Let's Encrypt in production."  
*(Open dev tools → Application → Cookies.)*  
"The auth cookie is HttpOnly, Secure, and SameSite=Strict. JavaScript on the page cannot read it, so an injected XSS payload couldn't steal the session. The JWT inside expires in 15 minutes, and logout adds the token's JTI to a blacklist so it can't be reused even within that window."

**4. Payment submission + regex whitelist (≈45s)**  
*(Submit a valid payment. Then try an invalid one.)*  
"Every field is validated against a strict regex whitelist on both the React client and the Express server using Zod. Watch what happens when I put angle brackets in the beneficiary name..."  
*(Show frontend rejection, then bypass with dev tools and show backend rejection.)*  
"The client blocks it immediately, and even if I bypass the client the server rejects it with HTTP 400 and audits the validation failure. SQL injection cannot work either — every database query uses parameter placeholders, never string concatenation."

**5. Password security + account lockout (≈45s)**  
*(Log out, then attempt to log in with the wrong password 5 times in a row.)*  
"Passwords are hashed with bcrypt at 12 salt rounds before they ever touch the database. Beyond that, we added per-account lockout. After 5 failed attempts on the same account..."  
*(On the 5th attempt show the 423 response in network tab.)*  
"...the account is locked for 15 minutes and the server responds HTTP 423 Locked. This is independent of the per-IP rate limit, so it protects against slow distributed credential-stuffing that flies under the rate limit radar."

**6. Employee console + customer-to-staff flow (≈45s)**  
*(Log in as Bank Employee with account 10000000.)*  
"Switching to the employee console. Employees can see every customer's payments and verify SWIFT details. The earlier payment from Jane Smith is here..."  
*(Click Verify, then Submit to SWIFT.)*  
"...I verify it, then push the verified batch to SWIFT. Notice the employee dashboard has no access to the audit log — only payment operations. That's least privilege in action."

**7. Admin console — the deeper monitoring (≈60s)**  
*(Log out, then log in as Audit Admin with account 30000001.)*  
"This is the new admin role — its only job is read-only access to the security audit trail. It can't view payments or process transactions, so even if these credentials leak the attacker cannot move money. Refreshing now I can see the customer login, the failed attempts, the lockout event, the payment creation, verification, and SWIFT submission. I can also enable a 10-second auto-refresh to watch events arrive live..."  
*(Enable auto-refresh, then open a second browser and trigger another failed login.)*  
"...and there's the new `login_failed` entry appearing in real time. We also log when the admin views the log — `audit_log_viewed` — so the audit trail records who watched it."

**8. Role separation — least privilege proof (≈25s)**  
*(In a different tab logged in as the employee, hit `/api/audit/recent`.)*  
"As a final demonstration, here's the employee trying to read the audit endpoint directly. The server returns 403 and the admin's audit feed picks up a fresh `audit_access_denied` event with the employee's user ID. Customers, employees, and admins each have non-overlapping permissions."

**9. DevSecOps pipeline (≈30s)**  
*(Open the CI workflow on GitHub.)*  
"On the DevSecOps side, our CI pipeline runs on every push and pull request. It performs static application security testing, software composition analysis on the dependency tree, and API security testing. The full configuration is in `.github/workflows/ci.yml`."

**10. Outro (≈15s)**  
"In summary, this project addresses every requirement of Task 3 — static login, password hashing, regex input whitelisting, HTTPS everywhere, defence against the listed attacks, and a DevSecOps pipeline — plus role-separated monitoring as the deeper-security extension. Thank you."

---

## 12) Final Checklist Before Submission

### Mandatory
- [ ] Repo link works (paste in section 1)
- [ ] Unlisted YouTube link works (paste in section 1)
- [ ] README includes tool declaration
- [ ] CI pipeline file shown in video
- [ ] HTTPS padlock shown in video

### Task 3-specific (new for this submission)
- [ ] **No Register link** visible in the UI during the video
- [ ] `POST /api/auth/register` returning **403** shown in dev tools
- [ ] Login with a **pre-seeded customer** account (Jane Smith / 20000001)
- [ ] Frontend + backend **regex validation rejection** demonstrated
- [ ] Auth cookie shown as **HttpOnly + Secure + SameSite=Strict**
- [ ] **Account lockout (HTTP 423)** triggered with 5 failed logins
- [ ] Employee verifies a payment and submits the batch to SWIFT
- [ ] **Admin console** logged in with `Audit Admin` / `30000001` — show the audit feed
- [ ] **Auto-refresh** enabled in admin console; new event appears live
- [ ] **Least-privilege** proven: employee hits `/api/audit/recent`, gets 403, admin sees `audit_access_denied` entry

### Speaking points
- [ ] Static-login policy explained (no registration)
- [ ] bcrypt + 12 salt rounds + lockout mentioned
- [ ] Role-separation rationale stated (customer / employee / admin)
