# GitHub and Azure DevOps Repo Setup Guide

## Purpose
This guide explains how to take the project folder, create a repository, push it to GitHub or Azure DevOps, and let a team collaborate on it.

## 1. Unzip and open the project
1. Extract the ZIP file.
2. Open the project in VS Code.
3. Open a terminal in the root folder.

## 2. Initialize Git if needed
If the folder is not already a Git repository, run:

```bash
git init
git add .
git commit -m "Initial commit - APDS7311 secure international payments portal"
```

## 3. Create the remote repository
### Option A: GitHub
1. Sign in to GitHub.
2. Create a new repository.
3. Give it a name such as:
   - `secure-international-payments-portal`
4. Do not add a README if the local project already has one.
5. Copy the repository URL.

### Option B: Azure DevOps
1. Sign in to Azure DevOps.
2. Open your project.
3. Go to **Repos**.
4. Create a new repository.
5. Copy the repository URL.

## 4. Connect local repo to remote
Replace the URL with your actual repository URL.

```bash
git remote add origin <your-repository-url>
git branch -M main
git push -u origin main
```

## 5. Suggested branch structure for the team
Use `main` as the protected branch.

Suggested feature branches:
- `feature/authentication`
- `feature/payments`
- `feature/frontend-ui`
- `feature/security-testing`
- `feature/devops`

## 6. Suggested task split
### Team member 1
Authentication and registration
- improve login flow
- improve session handling
- add logout polish

### Team member 2
Payments backend
- add more payment checks
- add transaction status
- improve audit logs

### Team member 3
Frontend and user experience
- improve styling
- improve dashboard layout
- add loading and error messages

### Team member 4
DevOps and quality
- add tests
- add pipeline
- prepare deployment notes

## 7. Recommended pull request process
1. Pull the latest `main`
2. Create a feature branch
3. Commit small logical changes
4. Push your branch
5. Open a pull request
6. Ask one teammate to review
7. Merge only after review

## 8. Good commit message examples
- `Add bcrypt password hashing for registration`
- `Add regex whitelist validation for payment form`
- `Configure Helmet and CSP headers`
- `Add CSRF protection to payments API`
- `Improve dashboard payment history layout`

## 9. Example .gitignore items
Make sure the repo does not include unnecessary files. Typical ignored files include:
- `node_modules/`
- build output folders
- local environment files containing secrets

## 10. Azure DevOps pipeline starter idea
You can create a simple pipeline later that does this:
1. install Node.js
2. install dependencies
3. run lint
4. run build
5. optionally run tests

Example high-level steps:
- Use Node.js
- Run `npm run install:all`
- Run `npm run build`

## 11. Team rules to avoid problems
- Do not commit secrets
- Do not work directly on `main`
- Pull before you push
- Keep PRs small and clear
- Test locally before opening a PR
- Use one branch per task

## 12. Suggested repo folders
- `frontend/` for React app
- `backend/` for API
- `docs/` for assignment notes and scripts
- `certs/` for local development certificates only

## 13. Submission preparation
Before final submission:
- make sure the app runs
- make sure the README is updated
- make sure your video is recorded
- make sure the security mapping is easy to explain
- create a final ZIP from the latest clean version of the repo

