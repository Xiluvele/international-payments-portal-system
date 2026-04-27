# APDS7311 Task 2 Submission README

## Project title
Secure Customer International Payments Portal

## Student project context
This repository contains Part 2 of the APDS7311 assignment. The system is a secure customer international payments portal with a React frontend and a Node.js/Express backend API.

This implementation was built to reflect the security architecture and controls described in Part 1, including:
- password hashing and salting
- regex whitelist validation
- SSL or HTTPS communication
- protection against common web attacks

## What the system does
The portal allows a customer to:
- register a new account
- log in securely
- submit an international payment
- view payment history
- test validation and security controls during the demonstration

## Tech stack
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
- SQLite for local development and demonstration

### Security controls implemented
- bcrypt password hashing with salting
- regex whitelist validation on client and server
- HTTPS local certificates for development demo
- JWT authentication stored in HttpOnly cookie
- CSRF protection
- Helmet security headers
- HSTS in production mode
- X-Frame-Options DENY
- Content Security Policy
- rate limiting
- parameterized SQL queries
- audit logging for suspicious events

## Mapping to assignment requirements
### 1. Password security is enforced with hashing and salting
Passwords are hashed using bcrypt before storage. Plain text passwords are never stored.

Main files:
- `backend/src/services/authService.ts`
- `backend/src/services/db.ts`

### 2. Whitelist all input using RegEx patterns
Inputs are validated using whitelist patterns on both the frontend and backend.

Examples:
- username allows only approved characters
- account number allows digits only
- SWIFT code allows uppercase letters and digits in valid lengths
- currency code allows 3 uppercase letters

Main files:
- `backend/src/utils/validators.ts`
- frontend form pages in `frontend/src/pages/`

### 3. Ensure all traffic is served over SSL
The application is configured for HTTPS local development using self-signed certificates.

Main files:
- `backend/src/server.ts`
- `certs/localhost.pem`
- `certs/localhost-key.pem`

### 4. Ensure that you protect against attacks
The following attacks are addressed in the implementation:

#### SQL Injection
- parameterized database queries
- server-side validation

#### Cross-Site Scripting (XSS)
- React output escaping
- CSP headers
- validation and safe rendering

#### Clickjacking
- `X-Frame-Options: DENY`
- `frame-ancestors 'none'` in CSP

#### Session hijacking reduction
- HttpOnly cookies
- Secure cookies in HTTPS
- SameSite cookies
- token expiry

#### CSRF
- CSRF middleware and token endpoint

#### Brute force and basic DDoS mitigation
- rate limiting middleware

#### Sensitive header protection
- Helmet configuration

### 5. Include a video showing the system works
A demo script is included in:
- `docs/DEMO-VIDEO-SCRIPT.md`

## How to run the project
### Prerequisites
Install:
- Node.js 20 or later
- npm 10 or later

### Installation
Open a terminal in the root folder and run:

```bash
npm install
npm run install:all
```

### Start the project
```bash
npm run dev
```

Expected local URLs:
- Frontend: `https://localhost:5173`
- Backend: `https://localhost:5001`

### Build the project
```bash
npm run build
```

## Suggested demonstration flow
1. Open the registration page
2. Create a user
3. Log in
4. Show HTTPS in the browser
5. Submit a valid international payment
6. Show payment history
7. Enter invalid values to show regex validation blocking them
8. Explain that passwords are hashed before storage
9. Explain the use of secure cookies, headers, CSRF, and rate limiting

## Team collaboration notes
This repository can be used as a shared team repo.

Suggested work split:
- member 1: authentication and session security
- member 2: payments API and validation
- member 3: frontend UI and user experience
- member 4: testing and DevOps pipeline

## Important note
This is an academic demonstration project designed to satisfy assignment requirements. It is not a production banking platform.

For real production deployment, the following should still be added:
- MFA
- stronger secrets management
- production certificate management
- WAF at the edge
- cloud deployment hardening
- centralized logging and monitoring
- stronger fraud controls

## Included supporting documents
- `docs/SECURITY-MAPPING.md`
- `docs/TEAM-HANDOFF.md`
- `docs/AZURE-DEVOPS-SETUP.md`
- `docs/DEMO-VIDEO-SCRIPT.md`

