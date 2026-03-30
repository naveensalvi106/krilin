
-- Create custom_sections table
CREATE TABLE public.custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom_sections" ON public.custom_sections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom_sections" ON public.custom_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom_sections" ON public.custom_sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom_sections" ON public.custom_sections FOR DELETE USING (auth.uid() = user_id);

-- Add custom_section_id to tasks (nullable - when set, task belongs to custom section)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_section_id uuid REFERENCES public.custom_sections(id) ON DELETE CASCADE;

-- Enable realtime for custom_sections
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_sections;

-- Create storage bucket for section icons
INSERT INTO storage.buckets (id, name, public) VALUES ('section-icons', 'section-icons', true);

-- Storage RLS policies
CREATE POLICY "Users can upload section icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'section-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view section icons" ON storage.objects FOR SELECT USING (bucket_id = 'section-icons');
CREATE POLICY "Users can delete own section icons" ON storage.objects FOR DELETE USING (bucket_id = 'section-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
