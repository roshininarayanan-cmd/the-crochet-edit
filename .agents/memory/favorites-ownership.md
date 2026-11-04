---
name: Favorites ownership and schema
description: Ownership and migration constraints for the shared favorites table.
---

Star and favorites operations must derive the user ID from the verified session, verify inspiration ownership before mutations, and filter results by that user. Keep a single shared stars table with a unique user/inspiration pair and cascading inspiration cleanup.

**Why:** Adding a redundant composite uniqueness constraint to the existing inspirations table caused Drizzle to offer truncating its existing rows. The prompt was declined, and the ownership boundary stays in the authenticated API.

**How to apply:** When extending favorites, preserve the existing inspirations rows; retain the required direct foreign keys and unique pair, and keep ownership checks on every star and favorites route.
