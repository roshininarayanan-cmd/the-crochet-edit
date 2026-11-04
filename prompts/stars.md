Please read PLAN.md and review my existing code before starting.

I'm currently working on the feature/stars branch. Build ONLY Feature 5: Stars & Favorites.

Requirements

Add a clickable star icon to every crochet inspiration card in my existing gallery.

Allow logged-in users to star and unstar any of their saved inspirations.

Display filled stars for favorited inspirations and outlined stars for non-favorited inspirations.

Create a dedicated Favorites page where users can see all the inspirations they've starred.

Users should be able to remove an inspiration from Favorites by clicking its star again.

Favorites must be saved in the database and persist after refreshing or logging out and back in.

Database Requirements

Create ONE shared stars table that functions as a junction table connecting users and inspirations.

Each row should include:

A unique ID (primary key)

User ID (foreign key)

Inspiration ID (foreign key)

Creation timestamp

Ensure:

Each user can star an inspiration only once.

Users can only star and view their own inspirations.

One user's favorites never appear in another user's account.

Favorites are removed appropriately if an inspiration is deleted.

Do not create separate stars tables for individual users.

Design

Maintain The Crochet Edit's existing cream, sage green, and lavender aesthetic.

Make the stars visually appealing and consistent with the Pinterest-inspired gallery. Add a Favorites link to the existing navigation.

Testing

Verify that:

A user can star and unstar an inspiration.

Starred inspirations appear on the Favorites page.

Favorites persist after refreshing.

The same inspiration cannot be starred twice by the same user.

One user cannot access another user's favorites.

All existing functionality continues working.

Documentation

Update schema.md to include the new stars table and its relationships.

Create prompts/stars.md and save this entire prompt inside it.
