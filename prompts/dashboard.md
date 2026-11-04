Please read PLAN.md and review my existing code before starting.

I'm currently working on the feature/dashboard branch. Build ONLY Feature 7: Dashboard & Analytics.

1. Dashboard Summary Statistics

Create a dashboard with three statistics calculated from the logged-in user's actual database records:

Total Inspirations: Total number of crochet inspirations I've saved.

Starred Inspirations: Total number of inspirations I've favorited.

Categories Used: Number of distinct categories containing at least one saved inspiration.

Display these statistics in visually appealing cards.

Do not use hardcoded numbers or placeholder statistics. All numbers must be calculated from my existing PostgreSQL database.

2. Dashboard Chart

Add a chart showing the number of saved crochet inspirations in each category.

Requirements:

Use Recharts or another compatible charting library.

Display category names and inspiration counts.

Only include the logged-in user's data.

Update when inspirations are added, edited, or deleted.

Show a friendly message if the user has no inspirations.

3. Design

Maintain The Crochet Edit's existing aesthetic:

Warm cream background

Sage green and lavender accents

Elegant, minimalist typography

Rounded statistic cards

Clean, Pinterest-inspired design

Add a Dashboard page accessible through the existing navigation.

Make the dashboard responsive on desktop and mobile.

4. Privacy and Functionality

Ensure all statistics and charts only use data belonging to the logged-in user.

Reuse the existing authentication system and database.

Preserve all existing CRUD, favorites, search, filter, and sort functionality.

Do not add fake or placeholder inspirations to my database.

5. Prompt Documentation

Create prompts/dashboard.md and save this entire prompt inside it.
