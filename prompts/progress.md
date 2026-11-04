Please read PLAN.md and review my existing code before starting.

I'm currently working on the feature/progress branch. Build ONLY Feature 9: Project Status Tracking.

1. Project Status Functionality

Add the ability to track the progress of my saved crochet inspirations using three statuses:

Want to Make: Projects I've saved but haven't started.

In Progress: Crochet projects I'm currently working on.

Completed: Projects I've finished making.

Requirements:

Every inspiration should have a project status.

New inspirations should default to "Want to Make."

Allow users to change a project's status using a dropdown or another intuitive control.

Allow statuses to be changed from the inspiration detail page.

Display the current status as a small, aesthetically pleasing label on each inspiration card.

Save status changes immediately to the database.

Ensure statuses persist after refreshing or logging back in.

2. Database

Use the existing PostgreSQL database and inspirations table.

If the status column already exists, reuse it instead of creating a duplicate.

Ensure users can only view or modify the status of their own inspirations. Enforce authorization on the backend.

Preserve all existing inspiration data, categories, photos, and favorites.

3. Design

Maintain The Crochet Edit's existing Pinterest-inspired aesthetic:

Warm cream background

Sage green and lavender accents

Rounded cards and elegant typography

Clean, minimal layout Testing

Manually verify that:

New inspirations default to Want to Make.

Users can change a project to In Progress or Completed.

Status changes appear correctly on inspiration cards.

Status changes persist after refreshing.

Users can change a status multiple times.

Users cannot modify another user's project status.

Existing CRUD, favorites, search, dashboard, photo uploads, and authentication continue working.

Do not write automated tests yet. I will complete my assignment's required automated tests separately.

5. Prompt Documentation

Create prompts/progress.md and save this entire prompt inside it.

Update schema.md only if the database structure changes.

Follow-up prompt:

After I edit details, I want to route back to My collection

Follow-up prompt:

Whenever I update Progress, I want it to ask me "Return to My Collection?" Yes or No and for yes, return to my collection, and no, stay on the details page
