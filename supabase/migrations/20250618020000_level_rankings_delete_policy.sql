create policy "Users can delete own rankings"
  on public.level_rankings for delete
  using (auth.uid() = user_id);
