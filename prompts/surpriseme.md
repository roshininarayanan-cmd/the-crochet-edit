Please read PLAN.md and review the existing code before starting.

I'm currently working on the feature/surpriseme branch. Build ONLY Feature 10: Surprise Me Random Project Picker.

1. Surprise Me Functionality

Add a fun, interactive "Surprise Me!" button that helps users decide what crochet project to make next.

When clicked:

Randomly select one inspiration belonging to the logged-in user.

Only include inspirations with the status "Want to Make."

Exclude projects marked "In Progress" or "Completed."

Display the selected inspiration in an attractive card or modal.

The selected project should display:

Project title

Inspiration photo, if available

Category

Difficulty level, if available

Pattern link, if available

A button to open the project's existing detail page

2. Random Selection

Each eligible inspiration should have an equal chance of being selected.

Add a "Pick Again" button to choose another random inspiration.

If there is more than one eligible project, try not to select the same project twice in a row.

If there is only one eligible project, allow it to be selected again.

If there are no "Want to Make" inspirations, display a friendly message encouraging users to save more crochet ideas.

Do not modify project statuses or any other saved data when selecting a project.

3. User Privacy

Only select inspirations belonging to the currently logged-in user.

Use the existing authentication and database systems. Do not expose another user's projects.Testing

Manually verify that:

Clicking Surprise Me selects a saved inspiration.

Only Want to Make projects are selected.

Pick Again generates another suggestion.

No eligible projects produces a friendly empty-state message.

The selected project's information is accurate.

Users cannot see another user's inspirations.

Existing authentication, CRUD, favorites, search, dashboard, photo uploads, and project status tracking continue working.

Do not write automated tests yet. I will complete my assignment's required automated tests in a separate branch after finishing all features.

6. Prompt Documentation

Create prompts/surpriseme.md and save this entire prompt inside it.
