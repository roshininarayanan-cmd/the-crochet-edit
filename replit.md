# The Crochet Edit

## Current scope
Features 1 and 2 from `PLAN.md` are implemented: homepage/authentication and the PostgreSQL data model. Feature 2 adds no resource CRUD routes or interfaces. Do not add galleries, category interfaces, favorites, dashboards, or other features unless requested.

## Visual direction
The user changed the palette to soft yellow, soft pink, sage green, and light blue; this supersedes the original cream/lavender direction in `PLAN.md`. The homepage headline is “Your next pretty project.” Yarn should look like wound strands, not smooth spheres. Do not restore the removed hands-itching line.

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
- `npm run test:datamodel` — verify database constraints and backend ownership with rolled-back fixtures

`schema.md` describes the data model. Future category/inspiration backend handlers must use the authenticated ownership guards in `server/data-ownership.ts`. The composite category/owner foreign key prevents cross-user category assignments. Do not trust submitted owner IDs.

Required environment variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`. Clerk keys are managed by Replit. The production Clerk proxy is mounted before body parsing.

The class assignment's original signup prompt is saved in `prompts/signup.md`.
The Feature 2 prompt is saved in `prompts/datamodel.md`.
