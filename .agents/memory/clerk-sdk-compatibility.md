---
name: Managed Clerk SDK compatibility
description: Avoid mistaking older Clerk SDK APIs for a problem with the managed-auth setup instructions.
---

Check current Clerk SDK compatibility before replacing the prescribed managed-auth wiring.

**Why:** Older installable SDK lines lacked the setup reference's host-resolution APIs and request-option callbacks, and an older React/shared combination failed to bundle. Updating compatible SDKs resolved the mismatch without removing host-aware publishable-key resolution or the production proxy.

**How to apply:** If a managed Clerk reference import is missing, compare installed SDK majors with current package versions first. Preserve the prescribed host-aware key resolution and unconditional client proxy URL configuration.
