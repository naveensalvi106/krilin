
-- Add icon_urls array column to tasks (replacing single icon_url)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS icon_urls text[] DEFAULT '{}'::text[];

-- Migrate existing icon_url data to icon_urls
UPDATE public.tasks SET icon_urls = ARRAY[icon_url] WHERE icon_url IS NOT NULL AND icon_url != '';

-- Add task_id to visualizations for per-task visualizations
ALTER TABLE public.visualizations ADD COLUMN IF NOT EXISTS task_id uuid;
