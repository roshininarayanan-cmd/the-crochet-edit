# The Crochet Edit — Feature 2 data model

The schema source of truth is `shared/schema.ts`, using PostgreSQL and Drizzle.
Feature 2 established `users`, `categories`, and `inspirations`. Feature 5 adds
one shared `stars` junction table for favorites.

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
| image_url | text | Optional external HTTP(S) image URL, added for Feature 3; distinct from image_key |
| difficulty | text | Optional; Beginner, Intermediate, or Advanced |
| notes | text | Optional |
| status | text | Required; Want to Make, In Progress, or Completed; defaults to Want to Make |
| created_at | timestamptz | Required; defaults to current time |
| updated_at | timestamptz | Required; defaults to current time |

Difficulty and status have PostgreSQL CHECK constraints, not just TypeScript
types. Future edit operations must explicitly refresh `updated_at`; there are
no edit operations or automatic update triggers in Feature 2.

Indexes support owner filtering and category/owner lookups.

## stars

There is one shared table for every user's favorites; it is not duplicated per
account.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| id | uuid | Primary key; generated automatically |
| user_id | text | Required; foreign key to users.id |
| inspiration_id | uuid | Required; foreign key to inspirations.id |
| created_at | timestamptz | Required; defaults to current time |

The unique constraint on `(user_id, inspiration_id)` prevents a user from
starring the same inspiration more than once. The star API checks that the
authenticated user owns the inspiration before creating or removing a star. Its
`ON DELETE CASCADE` behavior removes favorites when their inspiration is deleted.

## Relationships and deletion behavior

```text
users 1 ── many categories
users 1 ── many inspirations
categories 1 ── many inspirations
users 1 ── many stars ── many inspirations
```

The composite foreign key
`inspirations(category_id, user_id) → categories(id, user_id)` makes it impossible
to assign an inspiration to another user's category, even with direct SQL.
Foreign keys use RESTRICT for users/categories with dependent records. Deleting
an inspiration cascades to its stars so a favorite cannot point at a deleted
idea. Drizzle relationship definitions mirror these foreign keys.

## Backend privacy

`server/data-ownership.ts` derives ownership only from `getAuth(request)` after
the existing Clerk middleware has verified the session. It never takes an owner
from request parameters, query strings, or JSON bodies.

- Missing authenticated user: 401.
- `categoryFilter` and `inspirationFilter`: reusable authenticated-user SQL
  predicates for future backend queries.
- `requireCategory(id)` and `requireInspiration(id)`: owner-scoped authorization
  checks. Both a missing record and someone else's record return the same 404.
- Feature 3 now exposes authenticated inspiration CRUD routes. All record
  queries and mutations include the verified user's ownership predicate.
  Category choices are private to the user, with the six PLAN.md defaults
  inserted idempotently; no category-management routes are exposed.
- Feature 5 exposes owner-scoped star/unstar endpoints and `/api/favorites`.
  The authenticated user's ID comes only from the verified Clerk session; other
  users' favorites are not returned or modifiable.

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
npm run test:crud
npm run typecheck
npm run build
```

The database tests use temporary fixture users/categories/inspirations/stars
inside rolled-back transactions. They do not create Clerk accounts, leave test
records behind, or change existing users. They test constraints, ownership
authorization, cross-user isolation, default values, relationships, favorite
uniqueness, and cascading cleanup.

You can also inspect the **development** database tables and foreign keys in
Replit's Database tool. Administrative table browsing is not a user-facing API
and does not apply app-user filters.

Do not add schema commands to production build/startup. This feature only adds
the stars table to the development schema; publishing applies schema changes to
the managed production database. Feature 3 provides the inspiration gallery and
CRUD; search, dashboard, uploads, and other future features remain out of scope.
