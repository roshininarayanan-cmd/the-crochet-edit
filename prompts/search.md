Please read PLAN.md and review my existing code before starting.

I'm currently working on the feature/search branch. Build ONLY Feature 6: Search, Filter & Sort.

Requirements

1. Search functionality

Add a search bar to my existing crochet inspiration gallery.

Allow users to search their saved inspirations by project title.

Make search case-insensitive.

Update the displayed results as the user types.

If no inspirations match, display a friendly message such as "No crochet inspirations found."

2. Filter functionality

Allow users to filter their saved inspirations by:

Category (Plushies, Clothing, Bags, Accessories, Home Decor, Gifts, and any custom categories)

Difficulty (Beginner, Intermediate, Advanced)

Include an "All Categories" and "All Difficulties" option.

Users should be able to combine filters, such as viewing only Beginner projects in the Plushies category.

3. Sort functionality

Add a dropdown allowing users to sort inspirations by:

Newest first (default)

Oldest first

Title A–Z

Title Z–A

4. Combined functionality

Search, filters, and sorting should work together.

Add a "Clear Filters" button to reset the search and filters.

Results should update without requiring a page refresh.

Filtering or sorting must not modify or delete any saved inspirations.

Users should only see their own inspirations.

5. Design

Maintain The Crochet Edit's existing Pinterest-inspired aesthetic, including:

Warm cream background

Sage green and lavender accents

Rounded buttons and dropdowns

Clean, minimalist layout

Place the search bar and filtering controls above the existing inspiration gallery.Testing

Verify that:

Searching by title returns the correct inspirations.

Searching is not case-sensitive.

Category filters work correctly.

Difficulty filters work correctly.

Multiple filters can be applied simultaneously.

Sorting by newest, oldest, and alphabetical order works.

Clearing filters restores the full gallery.

Users cannot search or view another user's inspirations.

Existing CRUD, authentication, and favorites functionality continues working.

Prompt Documentation

Create prompts/search-filter.md and save this entire prompt inside it.
