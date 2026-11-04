# The Crochet Edit

The Crochet Edit is a private crochet inspiration library for collecting project
ideas, finding patterns, and keeping track of what you want to make.

**Published website:** [the-crochet-edit.replit.app](https://the-crochet-edit.replit.app)

## Features

- Create an account, sign in, and sign out with Clerk. Each account has a private collection.
- Add, view, edit, and delete crochet inspirations with a title, category, optional pattern URL, difficulty, notes, and image.
- Upload optional JPG, PNG, or WebP photos, preview them, replace or remove them, and keep them available using persistent storage.
- Search by title; filter by category and difficulty; sort by newest, oldest, or title; and clear filters.
- Star and unstar projects and browse them on the Favorites page.
- See collection totals, starred totals, categories used, and a category chart on the dashboard, which is also shown on the welcome page after login.
- Track projects as Want to Make, In Progress, or Completed.
- Use Surprise Me to pick a project that is still marked Want to Make.
- Validate required fields and URLs, and enforce private ownership in the backend.

## Technologies

- React and TypeScript, built with Vite
- Node.js and Express
- PostgreSQL with Drizzle ORM
- Clerk authentication
- Replit App Storage for uploaded photos
- Recharts for the dashboard chart
- Wouter for page routing and Multer for photo uploads

## Run the application

In Replit, use **Run**; the configured application workflow runs `npm run dev`.

For a fresh workspace:

```sh
npm install
npm run db:push
npm run dev
```

The app needs its PostgreSQL connection and Clerk settings configured in Replit.
Photo uploads also require a default App Storage bucket.

## Automated tests

The two assignment tests use temporary database fixtures and roll them back:

- `npm run test:data-isolation` checks that one user cannot view, edit, or delete another user's inspirations.
- `npm run test:dashboard` checks that a user with three inspirations receives a dashboard total of 3, without counting another user's project.
