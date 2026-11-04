# The Crochet Edit — Feature 2 data model

The schema source of truth is `shared/schema.ts`, using PostgreSQL and Drizzle.
Only `users`, `categories`, and `inspirations` are part of this feature.

## users (existing table, reused without changing its columns)

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| id | text | Primary key; verified Clerk user ID |
| email | text | Required, unique |
| created_at | timestamptz | Required; defaults to current time |

Clerk stores credentials; this database never stores passwords. The existing
`POST /api/auth/sync` continues to synchronize the app user after signup/login.

## categories

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| id | uuid | Primary key; generated automatically |
| user_id | text | Required; references users.id |
| name | text | Required |
| created_at | timestamptz | Required; defaults to current time |

Category names are unique **within a user**, not globally. Two users can both
have a category named "Gifts". Uniqueness is case-sensitive. The additional
unique constraint on `(id, user_id)` supports the ownership foreign key below.
The unique `(user_id, name)` index also supports owner-scoped category queries.

PLAN.md's Plushies, Clothing, Bags, Accessories, Home Decor, and Gifts are example
categories; no shared or automatic category records are seeded in this feature.

## inspirations

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| id | uuid | Primary key; generated automatically |
| user_id | text | Required; references users.id |
| category_id | uuid | Required; category must belong to the same user |
| title | text | Required |
| pattern_url | text | Optional |
| image_key | text | Optional storage reference; no upload feature yet |
| difficulty | text | Optional; Beginner, Intermediate, or Advanced |
| notes | text | Optional |
| status | text | Required; Want to Make, In Progress, or Completed; defaults to Want to Make |
| created_at | timestamptz | Required; defaults to current time |
| updated_at | timestamptz | Required; defaults to current time |

Difficulty and status have PostgreSQL CHECK constraints, not just TypeScript
types. Future edit operations must explicitly refresh `updated_at`; there are
no edit operations or automatic update triggers in Feature 2.

Indexes support owner filtering and category/owner lookups.

## Relationships and deletion behavior

```text
users 1 ── many categories
users 1 ── many inspirations
categories 1 ── many inspirations
```

The composite foreign key
`inspirations(category_id, user_id) → categories(id, user_id)` makes it impossible
to assign an inspiration to another user's category, even with direct SQL.
Foreign keys use RESTRICT: a user with dependent records, or a category with
inspirations, cannot be deleted accidentally. Deletion behavior/UI belongs in a
later feature. Drizzle relationship definitions mirror these foreign keys.

## Backend privacy

`server/data-ownership.ts` derives ownership only from `getAuth(request)` after
the existing Clerk middleware has verified the session. It never takes an owner
from request parameters, query strings, or JSON bodies.

- Missing authenticated user: 401.
- `categoryFilter` and `inspirationFilter`: reusable authenticated-user SQL
  predicates for future backend queries.
- `requireCategory(id)` and `requireInspiration(id)`: owner-scoped authorization
  checks. Both a missing record and someone else's record return the same 404.
- The future `/api/categories` and `/api/inspirations` namespaces require a
  session now, but expose **no CRUD routes**. Signed-out requests receive 401;
  authenticated requests receive 404 until those features are implemented.

Future resource handlers must use this authenticated ownership scope for every
query, call the ownership checks for record IDs, and set write ownership from
`scope.userId`, never from submitted user IDs. Database credentials remain
server-only. This is backend-enforced access control, not PostgreSQL row-level
security: the existing workspace database role is privileged and would bypass
RLS. Direct SQL/admin access is trusted and can inspect all users' records.

## Apply and verify (development database only)

```bash
npm run db:push
npm run test:datamodel
npm run typecheck
npm run build
```

The database test uses temporary fixture users/categories/inspirations inside
one rolled-back transaction. It does not create Clerk accounts, leave test
records behind, or change existing users. It tests constraints, ownership
authorization, cross-user isolation, default values, and relationships.

You can also inspect the **development** database tables and foreign keys in
Replit's Database tool. Administrative table browsing is not a user-facing API
and does not apply app-user filters.

Do not add schema commands to production build/startup. Nothing in this feature
publishes or modifies the production database. No gallery, category interface,
CRUD, stars table, favorites, search, dashboard, or uploads are implemented.
