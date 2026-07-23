-- Allow players to wipe their own game data (used by /api/player/reset).

create policy "Users can delete own messages"
  on public.conversation_messages for delete
  using (auth.uid() = user_id);

create policy "Users can delete own attempts"
  on public.conversation_attempts for delete
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.game_sessions for delete
  using (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.level_completions for delete
  using (auth.uid() = user_id);

create policy "Users can delete own level progress"
  on public.user_level_progress for delete
  using (auth.uid() = user_id);
