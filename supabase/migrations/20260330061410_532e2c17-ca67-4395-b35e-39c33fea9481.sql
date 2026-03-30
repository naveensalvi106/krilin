-- Create storage bucket for user sticker PNGs
INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', true);

-- RLS: Users can upload their own stickers (path starts with their user_id)
CREATE POLICY "Users can upload own stickers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stickers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Anyone can view stickers (public bucket)
CREATE POLICY "Anyone can view stickers"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'stickers');

-- RLS: Users can delete own stickers
CREATE POLICY "Users can delete own stickers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'stickers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add icon_url column to tasks
ALTER TABLE public.tasks ADD COLUMN icon_url text DEFAULT NULL;