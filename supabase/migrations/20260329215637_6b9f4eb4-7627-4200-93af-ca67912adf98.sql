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