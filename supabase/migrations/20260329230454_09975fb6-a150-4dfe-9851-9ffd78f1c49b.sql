
-- Add missing UPDATE policy for push_subscriptions (needed for upsert)
CREATE POLICY "Users can update own subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
