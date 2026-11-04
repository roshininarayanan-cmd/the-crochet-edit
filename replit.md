# The Crochet Edit

## Current scope
Features 1–3 from `PLAN.md` are implemented: homepage/authentication, PostgreSQL data model, and private inspiration CRUD/gallery/forms/details. Do not add category management, favorites, search/filtering, status editing, dashboards, uploads, or other features unless requested.

## Visual direction
The user changed the palette to soft yellow, soft pink, sage green, and light blue; this supersedes the original cream/lavender direction in `PLAN.md`. The homepage headline is “Your next pretty project.” Yarn should look like wound strands, not smooth spheres. Do not restore the removed hands-itching line.
For Feature 3 the user requested cream, sage green, and lavender. Apply that to the inspiration pages while preserving the existing public homepage.

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
- `npm run test:crud` — exercise actual inspiration HTTP handlers, CRUD persistence, and two-user privacy with rolled-back fixtures

`schema.md` describes the data model. Future category/inspiration backend handlers must use the authenticated ownership guards in `server/data-ownership.ts`. The composite category/owner foreign key prevents cross-user category assignments. Do not trust submitted owner IDs.

Required environment variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`. Clerk keys are managed by Replit. The production Clerk proxy is mounted before body parsing.

The class assignment's original signup prompt is saved in `prompts/signup.md`.
The Feature 2 prompt is saved in `prompts/datamodel.md`.
The Feature 3 prompt is saved in `prompts/crud.md`.

Feature 3 uses the existing categories/inspirations tables. `image_url` stores optional remote images while `image_key` remains reserved for future uploads; these fields are not interchangeable. `/api/categories` provides idempotent per-user default choices but no category management. `/api/inspirations` and `/api/inspirations/:id` are private; never remove owner predicates from reads, updates, or deletes. `updated_at` is refreshed on edits.
