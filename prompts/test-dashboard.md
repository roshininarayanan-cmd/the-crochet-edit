I'm completing Test 2 for my class assignment for The Crochet Edit, my crochet inspiration website.

Please read `PLAN.md` and review the existing Dashboard implementation and testing framework before starting.

I'm currently working on the `test/dashboard` branch.

**Build ONLY Test 2: Dashboard Calculation. Do not add any new website features.**

### Test Scenario

Given a user has exactly 3 saved crochet inspirations,

When the dashboard calculates the Total Inspirations statistic,

Then the result should equal 3.

### Requirements

1. Write an automated test using the existing testing framework.
2. Create an isolated test user with exactly 3 crochet inspirations.
3. Test the actual Total Inspirations calculation used by my dashboard, including the data returned to the UI.
4. Verify that the dashboard correctly returns 3.
5. Ensure the test uses isolated test data and does not modify my real account or production database.
6. Make sure the test is not simply checking a hardcoded number.

### Red Test — Demonstrate Failure

My professor requires me to demonstrate that the automated test can catch a bug.

Please:

1. Implement the correct automated test and verify it passes initially.
2. Temporarily introduce a deliberate bug into the dashboard calculation in the development/test environment. For example, make the calculation incorrectly add 1 to the total.
3. Run the automated test so that it FAILS because the expected total is 3 but the actual total is incorrect.
4. Display the real failed test output clearly in Replit, including the test name, expected result, and actual result.
5. STOP so I can take a screenshot of the failing test.

Do not restore the code until I tell you I've captured the screenshot.

Do not commit or push the deliberately broken code. If an automatic checkpoint is created, ensure the broken code is not included in the final PR.

### Documentation

Create `prompts/test-dashboard.md` and save this entire prompt in the file.

### Important

- Keep all changes on `test/dashboard`.
- Do not modify or push to `main`.
- Do not open a Pull Request.
- Do not publish the website.
- Do not ask me to use Shell.

When the test fails, explain the failure and tell me where to capture my screenshot.

---

I've captured the screenshot of the failing Dashboard Calculation test.

Now please:

1. Restore the correct dashboard calculation and remove the deliberate bug completely.
2. Run the exact same automated test again.
3. Verify that the test PASSES and correctly calculates 3 inspirations.
4. Display the real passing test output so I can capture my green screenshot.
5. Run the existing test suite to ensure all previously built features still work.
6. Confirm that no deliberately broken code remains.
7. Append this follow-up prompt to `prompts/test-dashboard.md`.

Please explain in plain English:
- What the automated test checks.
- Why it failed when the dashboard calculation was intentionally incorrect.
- One realistic code change that could make the test fail in the future.

Do not modify `main`, push, merge, or publish anything yet. Do not ask me to use Shell.
