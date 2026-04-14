-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create sections table
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sections" ON public.sections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sections" ON public.sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sections" ON public.sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sections" ON public.sections FOR DELETE USING (auth.uid() = user_id);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  bandaids TEXT[] DEFAULT '{}',
  problems JSONB DEFAULT '[]',
  reminder_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Create visualizations table
CREATE TABLE public.visualizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own visualizations" ON public.visualizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own visualizations" ON public.visualizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own visualizations" ON public.visualizations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own visualizations" ON public.visualizations FOR DELETE USING (auth.uid() = user_id);

-- Create revival_videos table
CREATE TABLE public.revival_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  channel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.revival_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own revival_videos" ON public.revival_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revival_videos" ON public.revival_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own revival_videos" ON public.revival_videos FOR DELETE USING (auth.uid() = user_id);

-- Create revival_steps table
CREATE TABLE public.revival_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.revival_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own revival_steps" ON public.revival_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revival_steps" ON public.revival_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revival_steps" ON public.revival_steps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revival_steps" ON public.revival_steps FOR DELETE USING (auth.uid() = user_id);

-- Create notepad_sections table
CREATE TABLE public.notepad_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notepad_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notepad_sections" ON public.notepad_sections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notepad_sections" ON public.notepad_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notepad_sections" ON public.notepad_sections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notepad_sections" ON public.notepad_sections FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for notepad updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notepad_sections_updated_at
  BEFORE UPDATE ON public.notepad_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON public.push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add missing UPDATE policy for push_subscriptions (needed for upsert)
CREATE POLICY "Users can update own subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DELETE FROM push_subscriptions;
ALTER TABLE public.tasks ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
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
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
ON public.chat_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visualizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revival_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revival_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notepad_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add icon_urls array column to tasks (replacing single icon_url)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS icon_urls text[] DEFAULT '{}'::text[];

-- Migrate existing icon_url data to icon_urls
UPDATE public.tasks SET icon_urls = ARRAY[icon_url] WHERE icon_url IS NOT NULL AND icon_url != '';

-- Add task_id to visualizations for per-task visualizations
ALTER TABLE public.visualizations ADD COLUMN IF NOT EXISTS task_id uuid;

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
ALTER TABLE public.tasks ADD COLUMN task_date TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');

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
ALTER TABLE public.revival_steps ADD COLUMN description text NOT NULL DEFAULT '';

-- Add problems to presets
ALTER TABLE public.task_presets ADD COLUMN problems jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Mind map nodes (text-based outline/tree)
CREATE TABLE public.mind_map_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.mind_map_nodes(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mind_map_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mind_map_nodes" ON public.mind_map_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mind_map_nodes" ON public.mind_map_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mind_map_nodes" ON public.mind_map_nodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mind_map_nodes" ON public.mind_map_nodes FOR DELETE USING (auth.uid() = user_id);

-- Tick lists
CREATE TABLE public.tick_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tick_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tick_lists" ON public.tick_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tick_lists" ON public.tick_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tick_lists" ON public.tick_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tick_lists" ON public.tick_lists FOR DELETE USING (auth.uid() = user_id);

-- Tick list items
CREATE TABLE public.tick_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.tick_lists(id) ON DELETE CASCADE,
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tick_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tick_list_items" ON public.tick_list_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tick_list_items" ON public.tick_list_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tick_list_items" ON public.tick_list_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tick_list_items" ON public.tick_list_items FOR DELETE USING (auth.uid() = user_id);
ALTER TABLE public.task_presets ADD COLUMN visualizations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Table to link app users to their Telegram chat_id
CREATE TABLE public.telegram_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_id bigint NOT NULL,
  username text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(chat_id)
);

ALTER TABLE public.telegram_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telegram link"
  ON public.telegram_user_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram link"
  ON public.telegram_user_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram link"
  ON public.telegram_user_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram link"
  ON public.telegram_user_links FOR UPDATE
  USING (auth.uid() = user_id);

-- Singleton table for polling offset
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bot state"
  ON public.telegram_bot_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Table for incoming messages
CREATE TABLE public.telegram_messages (
  update_id bigint PRIMARY KEY,
  chat_id bigint NOT NULL,
  text text,
  raw_update jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on messages"
  ON public.telegram_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.mind_map_nodes ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE public.mind_map_nodes ADD COLUMN section_id TEXT DEFAULT NULL;
