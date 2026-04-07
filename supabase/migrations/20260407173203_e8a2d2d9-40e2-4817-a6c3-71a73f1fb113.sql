
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
