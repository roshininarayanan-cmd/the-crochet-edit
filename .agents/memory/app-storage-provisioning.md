---
name: App Storage provisioning
description: Default bucket setup and SDK startup behavior for persistent private uploads.
---

Create the app's default bucket in the Replit App Storage tool before attempting object operations. The JavaScript SDK does not create buckets; it uses a configured default bucket. Initialize and cache its client lazily after a successful operation so the application can start before storage is provisioned and can retry after setup.

**Why:** The SDK resolves the default bucket as part of client initialization and fails when none is provisioned; eagerly constructing it at module load can prevent unrelated app routes from starting.

**How to apply:** For Replit App Storage features, verify the bucket exists in the Project Editor's App Storage tool, keep objects private behind owner-checked app routes, and avoid asking for storage credentials.
