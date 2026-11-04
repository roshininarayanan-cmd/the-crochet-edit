# The Crochet Edit

## Current scope
Only Feature 1 from `PLAN.md` is implemented: a public homepage, email/password signup and login, logout, and a signed-in welcome page. Do not add galleries, categories, favorites, dashboards, or other features unless requested.

## Stack and authentication
- React + TypeScript with Vite
- Node.js + Express, serving the frontend and same-origin API
- PostgreSQL + Drizzle ORM
- Replit-managed Clerk handles credentials and sessions. The app never stores passwords.
- After signup/login, the browser calls `POST /api/auth/sync`. The server verifies the Clerk session and gets the primary email from Clerk, then creates/updates the app's `users` row.
- `users` contains the unique Clerk user ID, unique email, and creation timestamp.

## Run and checks
- `npm run dev` — development server on port 5000
- `npm run typecheck` — TypeScript validation
- `npm run build` — frontend production bundle
- `npm start` — Express serving the production frontend
- `npm run db:push` — apply the Drizzle schema to the development database; do not run production schema changes at startup

Required environment variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`. Clerk keys are managed by Replit. The production Clerk proxy is mounted before body parsing.

The class assignment's original signup prompt is saved in `prompts/signup.md`.
