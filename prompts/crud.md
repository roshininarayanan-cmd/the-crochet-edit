Please read PLAN.md and review the existing code before starting.

I'm currently working on the feature/crud branch. Build ONLY Feature 3: Create, Read, Update, and Delete Crochet Inspirations.

Requirements

Add inspirations: Allow logged-in users to save a crochet inspiration with:

Title (required)

Category (required)

Pattern URL (optional)

Difficulty: Beginner, Intermediate, or Advanced (optional)

Notes (optional)

Image URL (optional)

View inspirations: Create a beautiful, Pinterest-inspired gallery displaying saved crochet projects in cards. Each card should show the image (if provided), title, category, and difficulty.

Inspiration details: Users should be able to click a card to open a detail page showing all the saved information and a link to the original pattern.

Edit inspirations: Allow users to update the information for an existing inspiration.

Delete inspirations: Allow users to delete an inspiration only after displaying an "Are you sure?" confirmation.

Database: Use the existing PostgreSQL inspirations and categories tables from Feature 2. Do not recreate the database or replace the existing authentication system.

Privacy: Each user must only be able to view, edit, and delete their own inspirations. Enforce ownership checks in the backend.

Design: Maintain The Crochet Edit's existing cream, sage green, and lavender aesthetic, elegant typography, rounded cards, and responsive layout.

Prompt Documentation: Create prompts/crud.md and save this entire prompt inside it.

Can you make the "card" that shows the added idea more distinct? Like a box around the info

Make it smaller so more things can be added
