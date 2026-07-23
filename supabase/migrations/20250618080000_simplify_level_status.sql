-- Remove unused AVAILABLE status from user_level_progress.
update public.user_level_progress
set status = 'CURRENT', updated_at = now()
where status = 'AVAILABLE';

alter table public.user_level_progress
  drop constraint if exists user_level_progress_status_check;

alter table public.user_level_progress
  add constraint user_level_progress_status_check
  check (status in ('LOCKED', 'CURRENT', 'COMPLETED'));
