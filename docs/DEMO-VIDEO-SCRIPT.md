# Demo Video Script for Lecturer

## Goal
This script helps you record a clear demonstration showing that the secure customer international payments portal works and that security controls were implemented.

## Suggested recording tool
Use OBS Studio and record your full screen or the application window.

## Total recording length
Aim for 4 to 7 minutes.

## Before recording
Make sure:
- the project is running
- the browser is open
- the terminal is visible when needed
- one test user can be registered

## Recording script

### 1. Introduction
Say:

Hello, this is our APDS7311 Task 2 project. We developed a secure customer international payments portal using React for the frontend and a backend API. In this demo I will show the main features and explain how the required security controls were implemented.

### 2. Show the project structure briefly
Say:

This is the project folder. It includes a frontend, a backend, certificates for HTTPS local testing, and documentation that maps the implementation back to the security design from Part 1.

You can briefly show:
- `frontend/`
- `backend/`
- `docs/`

### 3. Start the application
Show the terminal and say:

I am now starting the application.

Run:
```bash
npm run dev
```

Then say:

The frontend and backend are now running locally over HTTPS.

### 4. Open the portal
Open the browser and say:

This is the customer portal interface.

Show the URL bar and say:

The application is running over HTTPS, which supports the assignment requirement that traffic must be served securely over SSL or TLS.

### 5. Register a user
Go to the register page and say:

First I will register a new user.

Enter sample values and submit.
Then say:

At registration, passwords are not stored in plain text. They are hashed and salted using bcrypt before storage.

### 6. Log in
Go to login and say:

Now I will log in with the registered account.

After login say:

Authentication uses a token stored in a secure HttpOnly cookie to reduce exposure to client-side script attacks.

### 7. Show the payment form
Say:

This is the international payment form.

Explain fields such as:
- beneficiary name
- account number
- SWIFT code
- currency
- amount

### 8. Demonstrate valid input
Enter valid values and submit.
Then say:

The payment was accepted and stored successfully.

Open the payment history and say:

This shows the recorded payment history.

### 9. Demonstrate invalid input and whitelist validation
Say:

Now I will show input validation using whitelist regex patterns.

Try examples like:
- letters in account number
- invalid SWIFT code
- invalid currency format
- special characters where not allowed

Then say:

The system blocks invalid values on the frontend and validates again on the backend. This helps prevent malicious input and enforces the required regex whitelist patterns.

### 10. Explain attack protections
Say:

This project also includes protections against common web attacks.

Then explain briefly:
- SQL injection is reduced by parameterized queries
- XSS is reduced by React escaping, CSP, and validation
- clickjacking is reduced with X-Frame-Options DENY and frame-ancestors none
- CSRF protection is enabled
- rate limiting helps against brute force and basic denial of service attempts
- security headers are set using Helmet

### 11. Show one code example
Open one or two files and say:

Here is the password hashing implementation.

Show:
- `backend/src/services/authService.ts`

Then say:

Here is the regex validation logic.

Show:
- `backend/src/utils/validators.ts`

Optional:
Show security middleware in:
- `backend/src/middleware/security.ts`

### 12. Link back to Part 1
Say:

This implementation was based on the security architecture and controls identified in Part 1, including secure input handling, protection of data in transit, secure session handling, and hardening against common attacks.

### 13. Closing
Say:

In conclusion, this project demonstrates a secure customer international payments portal that meets the main Task 2 requirements. Thank you.

## Tips for a better mark
- speak slowly and clearly
- zoom in when showing code
- keep the browser and terminal readable
- do not spend too long on one file
- always explain how the code matches the requirement

