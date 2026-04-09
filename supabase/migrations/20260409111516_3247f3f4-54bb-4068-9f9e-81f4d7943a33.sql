
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
