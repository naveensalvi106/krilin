
CREATE TABLE public.task_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  section_id TEXT NOT NULL,
  reminder_time TEXT,
  icon_urls TEXT[] DEFAULT '{}'::TEXT[],
  bandaids TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presets" ON public.task_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own presets" ON public.task_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presets" ON public.task_presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own presets" ON public.task_presets FOR DELETE USING (auth.uid() = user_id);
