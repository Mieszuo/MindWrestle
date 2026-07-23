create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, incoming_name)
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return new;
end;
$$;
