# Demo Video Script for Lecturer

## Goal
This script helps you record a clear demonstration showing that the Task 3 secure international payments portal works and that every required security control is in place. It mirrors `FINAL-VIDEO-README.md` section 11 but with explicit "say this / do this" steps.

## Suggested recording tool
Use OBS Studio and record your full screen or the application window.

## Total recording length
Aim for **6 to 8 minutes**.

## Before recording
- The project is running (`npm run dev`)
- Browser is open at `https://localhost:5173`
- A second browser or incognito window is ready (you will need it for the lockout demo and the least-privilege demo)
- Dev tools are bound to F12 so you can quickly show the Network / Cookies tabs
- Terminal is visible when you need to show CI files
- **No** test user needs to be registered — accounts are pre-seeded on backend startup

---

## Recording script

### 1. Introduction
Say:

> Hello, this is our APDS7311 Task 3 secure international payments portal. The stack is React and TypeScript on the frontend, and Node.js, Express, and SQLite on the backend. The brief required us to remove self-registration, pre-provision all accounts, secure the API against the listed attacks, and add a DevSecOps pipeline. I'll walk through each of those now.

### 2. Static login — no registration
Open the login page.

Say:

> The brief explicitly says no registration process should be possible. There is no Register link in the navigation, and the route was removed from the React router.

Open dev tools → Network tab, send a POST to `/api/auth/register`.

Say:

> If anyone probes the backend directly, the server returns HTTP 403 with a clear message, and writes a `register_attempt_blocked` entry into the audit log. All accounts are seeded on first backend startup.

### 3. HTTPS and secure cookies
Log in as a pre-seeded customer (`Jane Smith` / account `20000001` / password `Customer@2026`).

Say:

> The browser shows the padlock — we serve every request over HTTPS using a self-signed certificate locally, and we would use a Let's Encrypt certificate in production.

Open dev tools → Application → Cookies.

Say:

> The auth cookie is HttpOnly, Secure, and SameSite=Strict. JavaScript cannot read it, so an injected XSS payload cannot steal the session. The JWT inside expires after 15 minutes, and logout adds its JTI to a blacklist so the token cannot be reused even within that window.

### 4. Regex whitelist validation
Submit a valid payment, then try an invalid one (e.g. angle brackets in the beneficiary name).

Say:

> Every field is validated against a strict regex whitelist on both the React client and the Express server using Zod. Watch what happens with angle brackets in the beneficiary name. The client blocks it instantly...

Bypass the client and send the same payload via the Network tab.

Say:

> ...and even if I bypass the client, the server rejects it with HTTP 400 and audits the validation failure. SQL injection is impossible here too — every database query uses parameterised placeholders, never string concatenation.

### 5. Password security + account lockout
Log out. Attempt to log in with the wrong password 5 times in a row.

Say:

> Passwords are hashed with bcrypt at 12 salt rounds before they ever touch the database. Beyond that, we added per-account lockout. After 5 failed attempts on the same account the server responds with HTTP 423 Locked and the account is unusable for 15 minutes.

Show the 423 response in the Network tab.

Say:

> This is independent of the per-IP rate limit, so it stops slow distributed credential-stuffing that flies under the rate-limit radar.

### 6. Employee console — customer-to-staff flow
Log in as `Bank Employee` / account `10000000` / password `BankEmployee@1`.

Say:

> Switching to the employee console. Employees see every customer's payments and verify SWIFT details. The payment Jane Smith just submitted is here.

Click **Verify** on her payment, then click **Submit to SWIFT**.

Say:

> I verify the payment, then push the verified batch to SWIFT. Notice the employee dashboard has no access to the audit log — only payment operations. That is least privilege in action.

### 7. Admin console — deeper monitoring
Log out. Log in as `Audit Admin` / account `30000001` / password `AuditAdmin@2026`.

Say:

> This is the admin role we added for Task 3. Its only job is read-only access to the append-only security audit log. It cannot view payments or process transactions, so even if these credentials leak, an attacker cannot move money.

Show the summary counters and refresh the list.

Say:

> Refreshing now I can see the customer login, the failed attempts, the lockout event, the payment creation, verification, and the SWIFT submission. I can also enable a 10-second auto-refresh to watch events arrive live.

Click **Enable auto-refresh**, then in a second browser trigger another failed login.

Say:

> There's the new `login_failed` entry appearing in real time. We also log when the admin views the log — the `audit_log_viewed` event — so the trail records who watched it.

### 8. Role separation — least privilege proof
In a second tab logged in as the employee, send a GET to `/api/audit/recent`.

Say:

> As a final demonstration, here is the employee trying to read the audit endpoint directly. The server returns 403, and back in the admin's audit feed there is a fresh `audit_access_denied` event with the employee's user ID. Customers, employees, and admins each have non-overlapping permissions.

### 9. Code walkthrough (quick)
Open `backend/src/services/authService.ts`.

Say:

> Here is the bcrypt hashing and the account-lockout logic. Five strikes and the account is locked for 15 minutes.

Open `backend/src/utils/validators.ts`.

Say:

> Here are the regex whitelist patterns for every user-facing field.

Open `backend/src/middleware/security.ts`.

Say:

> And here is the Helmet configuration with CSP, frameguard, HSTS, and the rate-limit policies.

### 10. DevSecOps pipeline
Open the GitHub Actions run for the most recent commit.

Say:

> On the DevSecOps side, our CI pipeline runs on every push and pull request. It performs static application security testing, software composition analysis on the dependency tree, and API security testing. The full configuration is in `.github/workflows/`.

### 11. Link back to Parts 1 and 2
Say:

> This implementation extends our Part 1 design and Part 2 codebase. We addressed the Part 2 feedback by adding deployment-level hardening, the per-account lockout, and the dedicated admin role for deeper monitoring.

### 12. Closing
Say:

> In conclusion, this project addresses every requirement of Task 3 — static login, password hashing, regex input whitelisting, HTTPS everywhere, defence against the listed attacks, and a DevSecOps pipeline — plus role-separated monitoring as the deeper-security extension. Thank you.

---

## Tips for a better mark
- Speak slowly and clearly
- Zoom in when showing code or the cookie details
- Keep the browser and terminal readable
- Do not spend too long on any single file
- Always explain how the code matches the requirement
- If the lockout demo is taking too many tries, you can speed it up by hitting the API directly from the Network tab — just narrate that's what you're doing
