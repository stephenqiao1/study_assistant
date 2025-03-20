-- Add images column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN notes.images IS 'Array of image objects with URLs and metadata';

-- Create storage bucket for note images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('note_images', 'note_images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated users to upload images
CREATE POLICY "Users can upload note images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'note_images' AND auth.uid() = owner);

-- Set up storage policy to allow public access to note images
CREATE POLICY "Note images are publicly accessible" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'note_images');

-- Set up storage policy to allow users to update their own images
CREATE POLICY "Users can update their own note images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'note_images' AND auth.uid() = owner);

-- Set up storage policy to allow users to delete their own images
CREATE POLICY "Users can delete their own note images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'note_images' AND auth.uid() = owner); 