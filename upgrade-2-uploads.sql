-- REIGN upgrade 2: logo and screenshot uploads.
-- Run once in Supabase → SQL Editor (after upgrade-1-email.sql).

-- Screenshots for each listing.
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "screenshot_urls" text[] DEFAULT '{}'::text[] NOT NULL;

-- A public Supabase Storage bucket for the images. Only the server (with the secret key)
-- can upload; anyone can view, which is what a public listing needs.
-- Images are converted to WebP by the app before upload, so only that type is allowed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('uploads', 'uploads', true, 2097152, ARRAY['image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/webp'];
  END IF;
END $$;
