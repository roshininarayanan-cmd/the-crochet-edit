# The Crochet Edit database schema

The schema is defined in `shared/schema.ts` with Drizzle ORM. The table columns,
types, defaults, and constraints below were checked against the current
development PostgreSQL database.

## Tables

### `users`

Clerk manages account credentials; this table stores the app's user ID and email.
It has no password column.

| Column | PostgreSQL type | Nullable | Default | Key or rule |
| --- | --- | --- | --- | --- |
| `id` | `text` | No | — | Primary key; Clerk user ID |
| `email` | `text` | No | — | Unique |
| `created_at` | `timestamp with time zone` | No | `now()` | — |

### `categories`

| Column | PostgreSQL type | Nullable | Default | Key or rule |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `text` | No | — | Foreign key to `users.id`; `ON DELETE RESTRICT` |
| `name` | `text` | No | — | Unique per user with `user_id` |
| `created_at` | `timestamp with time zone` | No | `now()` | — |

The database also makes `(id, user_id)` unique so inspirations can reference
their category and owner together.

### `inspirations`

| Column | PostgreSQL type | Nullable | Default | Key or rule |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `text` | No | — | Foreign key to `users.id`; `ON DELETE RESTRICT` |
| `category_id` | `uuid` | No | — | Part of the composite category/owner foreign key |
| `title` | `text` | No | — | — |
| `pattern_url` | `text` | Yes | — | Optional pattern link |
| `image_key` | `text` | Yes | — | Optional private Replit App Storage object key |
| `image_url` | `text` | Yes | — | Optional external image URL |
| `difficulty` | `text` | Yes | — | `Beginner`, `Intermediate`, or `Advanced` |
| `notes` | `text` | Yes | — | — |
| `status` | `text` | No | `'Want to Make'` | `Want to Make`, `In Progress`, or `Completed` |
| `created_at` | `timestamp with time zone` | No | `now()` | — |
| `updated_at` | `timestamp with time zone` | No | `now()` | Updated by the app when an inspiration is edited |

The database checks that `difficulty` and `status` contain only the listed
values. Uploaded image bytes are stored in App Storage, not in PostgreSQL.

### `stars`

This is one shared table for all users' favorites.

| Column | PostgreSQL type | Nullable | Default | Key or rule |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `text` | No | — | Foreign key to `users.id`; `ON DELETE CASCADE` |
| `inspiration_id` | `uuid` | No | — | Foreign key to `inspirations.id`; `ON DELETE CASCADE` |
| `created_at` | `timestamp with time zone` | No | `now()` | — |

The pair `(user_id, inspiration_id)` is unique, so a user cannot star the same
inspiration more than once.

## Keys and relationships

- One user has many categories and many inspirations.
- One category has many inspirations. The composite foreign key
  `(inspirations.category_id, inspirations.user_id)` references
  `(categories.id, categories.user_id)`, so an inspiration cannot use another
  user's category.
- Users and inspirations are connected through the `stars` table. The app
  checks that a user owns an inspiration before allowing that user to star it.
- Deleting a user is restricted while they have categories or inspirations.
  Deleting a user or inspiration cascades to its star rows.
- Category names are unique per user. The database includes owner and
  category-owner indexes for lookups.

The API derives ownership from the verified Clerk session and applies it to
inspiration, category, photo, dashboard, and favorite requests. PostgreSQL
row-level security is not enabled; access control is enforced by the app's
backend.

## Differences from the original plan

- The plan described `(user_id, inspiration_id)` as the stars table's composite
  primary key. The final table uses a generated UUID `id` primary key and keeps
  the pair as a unique constraint.
- The final inspirations table includes `image_url` for pasted image links in
  addition to `image_key` for uploaded photos in App Storage.
- The final categories table has a unique `(id, user_id)` constraint to support
  the composite ownership foreign key from inspirations.
