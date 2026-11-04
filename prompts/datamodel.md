I'm building The Crochet Edit, my personal crochet inspiration website. Please read PLAN.md before starting.

I am currently working on the feature/datamodel branch. Build only Feature 2: Data Model.

Requirements:

Set up or extend the PostgreSQL database according to PLAN.md.

Create the required database tables: users, categories, and inspirations. Reuse the existing users table if it already exists.

Define primary keys, foreign keys, column types, and relationships:

One user can have many categories.

One user can have many inspirations.

One category can contain many inspirations.

Each category and inspiration belongs to an individual user.

Ensure that each user's data remains private and that ownership is enforced on the backend.

Preserve the existing sign-up, login, logout, and homepage functionality.

Create a schema.md file explaining the database tables, columns, and relationships.

Save this entire prompt in prompts/datamodel.md on the current branch.

Verify that the database tables and relationships work correctly.

Important: Do not build the categories interface, inspiration gallery, CRUD functionality, favorites, search, dashboard, or any other features yet. Those will be built in separate Pull Requests.

Do not modify main, open a Pull Request, or publish the website.

When finished, explain what you built, what database tables exist, and how I can verify that the data model works.
