# Inspiration CRUD verification

Run `npm run test:crud` against the configured development database.

The test runs the real `createLibraryRouter` on a temporary loopback-only server.
Only the fixture server supplies simulated *already-verified* Clerk request
objects; the actual application still requires Clerk middleware and real
sessions. There is no test login or authentication bypass in the application.
Fixture users, categories, and inspirations live in one rolled-back transaction.

## Checks

- All CRUD methods require authentication.
- Category options are owned by the current user; default creation is idempotent.
- Create, list, detail, edit, clear optional fields, and delete persist correctly.
- A submitted `userId` cannot change ownership; `status` cannot be edited through
  this feature's API.
- User B's list excludes User A's inspiration. User B receives the same 404
  response for User A's item as for a nonexistent ID.
- User B cannot modify/delete User A's item or reference User A's category.
- Basic required fields, UUIDs, difficulty values, and URL protocols are checked
  on the backend regardless of browser validation.
- Editing external-image URLs does not overwrite the future-upload `image_key`.
- All fixtures are removed by rollback.

These privacy checks must fail if a future list/detail/update/delete implementation
omits an ownership predicate, or if a future writer trusts a submitted owner ID
instead of the verified Clerk session.

The separate `npm run test:datamodel` suite continues to verify SQL constraints
and Drizzle relationships. Browser verification covers navigation, responsive
forms/cards, persistence after reload, and cancellation versus confirmation of
deletion. The built-in node test runner does not test UI confirmation dialogs.

## Recorded failure/passing evidence

The original suite passes all 12 checks. To verify that the isolation assertion
really detects a regression, an isolated **in-memory copy** of the router was
tested with the list ownership filter deliberately removed. The same test then
failed at "User B cannot list or open User A's inspiration". Testing the original
router again passed. No vulnerable route or bypass was added to the running app.

Screenshots and a self-contained evidence report are saved under the ignored
`generated-artifacts/` directory (`privacy-failing.png`, `privacy-passing.png`,
and `privacy-verification.html`). They can be attached to a future PR without
putting generated binaries into Git history. Browser screenshots of gallery,
forms, detail, and deletion confirmation are stored there as well.
