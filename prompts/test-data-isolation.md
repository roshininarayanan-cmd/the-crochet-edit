I'm completing the automated testing requirements for The Crochet Edit, my crochet inspiration website.

Please read `PLAN.md` and review my existing application before starting.

I'm currently working on the `test/data-isolation` branch.

**Build ONLY Test 1: Data Isolation. Do not add new website features.**

### Test Scenario

Given User A has saved a crochet inspiration,
When User B logs in and attempts to access User A's inspiration,
Then User B cannot view, edit, or delete User A's data.

### Requirements

1. Write an automated test using my existing testing framework, preferably Vitest if that's what the application already uses.
2. Create two separate test users with different user IDs.
3. Create a crochet inspiration belonging to User A using isolated test data.
4. Verify that User A can access their inspiration.
5. Verify that User B cannot see User A's inspiration in their list.
6. Verify that User B cannot access, edit, or delete User A's inspiration through backend requests.
7. Use the application's actual authorization logic rather than a hardcoded or mocked privacy result.
8. Do not modify my real user accounts or production database.

### Red and Green Test Requirement

My professor requires proof that the automated test can detect a real bug.

Please follow this order:

1. First, implement the test and verify it passes with the correct application code.
2. Temporarily introduce a deliberate authorization bug in the test environment, such as removing an ownership check.
3. Run the automated test again so it FAILS.
4. Clearly display the failing test results in Replit, including the test name and failure message.
5. STOP at this point so I can take a screenshot of the failing test.

Do not restore the bug or commit any changes until I have captured my screenshot and instructed you to continue.

### Documentation

Save this entire prompt in `prompts/test-data-isolation.md`.

### Important

- Keep all changes on `test/data-isolation`.
- Do not commit or push anything while the deliberate bug is present.
- Do not modify `main`.
- Do not open a Pull Request or publish.
- Do not ask me to use Shell.

When the test is visibly failing, explain why and tell me where to take my screenshot.

I've captured my screenshot of the failing Data Isolation test.

Now please:

1. Restore the original secure authorization logic and completely remove the deliberate bug.
2. Run the same automated Data Isolation test again.
3. Verify that all test assertions PASS.
4. Display the successful test result clearly so I can capture my green screenshot.
5. Verify that the existing application still works.
6. Confirm there are no deliberate bugs remaining in the code.
7. Add this follow-up prompt to `prompts/test-data-isolation.md` so my AI development process is documented.

Please also explain in plain English:
- What the test checks.
- Why it failed when the authorization check was removed.
- What realistic code change could make it fail in the future.

Keep all changes on `test/data-isolation`. Do not push or merge anything yet. Do not ask me to use Shell.
