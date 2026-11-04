---
name: Welcome onboarding state
description: How the first-time welcome page differs from later visits.
---

The first-time welcome view is tracked per Clerk user in browser local storage and only applies while that user's collection is empty. Existing users with saved inspirations retain the returning-user actions.

**Why:** This avoids a database migration while keeping the signup landing simple; browser-local persistence means the first-time view can appear again on another device.

**How to apply:** Keep the first-visit marker user-scoped. If onboarding must synchronize across devices, replace this with a server-side persisted flag rather than changing the current behavior silently.
