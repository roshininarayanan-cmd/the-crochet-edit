---
name: Preview verification
description: Verify external preview routing in addition to local app screenshots.
---

Do not treat a successful local screenshot as proof that the user's preview works.

**Why:** The homepage rendered locally while the external development URL returned HTTP 426 because preview routing selected a hot-reload listener rather than the website.

**How to apply:** Check the externally forwarded development URL when configuring or changing development servers. An unexpected external response must be investigated even when local screenshots and health checks pass. Keep hot reload on the app's HTTP server where practical to avoid competing preview listeners.

Authenticated browser verification must not be replaced with an auth bypass
when the advertised browser-testing helper is unavailable.

**Why:** This environment rejected the documented testing helper kind. An
isolated real Chromium session authenticated through a temporary Clerk sign-in
ticket verified the protected UI without changing application authentication.

**How to apply:** If that helper is unavailable, use a real authenticated browser
session, keep generated credentials out of files/logs, and remove temporary
Clerk accounts plus their owned database records after verification.
