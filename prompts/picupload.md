Please read PLAN.md and review my existing code before starting.

I'm currently working on the feature/picupload branch. Build ONLY Feature 8: Photo Uploads.

1. Photo Upload Functionality

Add the ability for logged-in users to upload crochet inspiration photos directly from their devices.

Requirements:

Add an "Upload Photo" button to the existing Add Inspiration form.

Allow users to select a photo from their computer or phone.

Support JPG, PNG, and WebP images.

Show an image preview before saving.

Allow users to save an inspiration with an uploaded photo.

Make photo uploads optional so users can still save inspirations without images.

Keep the existing option to paste an image URL.

2. Managing Photos

Allow users to:

View uploaded photos in the existing inspiration gallery.

See larger versions of their photos on inspiration detail pages.

Replace an existing inspiration photo with a new upload.

Remove an uploaded photo without deleting the inspiration.

See a clean placeholder when no image is provided.

3. Photo Storage

Use Replit App Storage or the persistent object storage solution specified in PLAN.md.

Requirements:

Photos must remain available after refreshing, logging out and back in, and publishing the website.

Do not store image files directly in the PostgreSQL database.

Store the image reference in the existing inspirations table.

Ensure users can only upload, modify, or delete photos associated with their own inspirations.

Validate uploaded file types and enforce a reasonable file-size limit of 5 MB.

Use secure server-side authorization and storage access.

Do not replace my existing database or authentication system.

Maintain The Crochet Edit's existing design:

Warm cream background

Sage green and lavender accents

Clean, Pinterest-inspired gallery

Rounded image cards

Minimalist typography

Make uploaded photos display beautifully within the existing inspiration cards while preserving their proportions. . Testing

Manually verify that:

I can upload a photo when adding an inspiration.

The image appears correctly in the gallery.

The image persists after refreshing.

I can replace an existing image.

I can remove an image without deleting the inspiration.

I can still save inspirations without images.

Unsupported file types and oversized files display helpful error messages.

One user cannot modify another user's photos.

Existing CRUD, favorites, search, dashboard, and authentication features continue working.

Do not write automated tests yet. I will complete my assignment's required automated tests separately.

6. Documentation

Create prompts/picupload.md and save this entire prompt inside it.

Update schema.md only if the database structure changes.
