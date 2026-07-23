alter table public.profiles
  add column if not exists lore_state jsonb not null default '{
    "discoveredFragments": [],
    "completedLoreBeats": {},
    "chronicleEntries": [],
    "finalTruthProgress": 0,
    "endingSeen": false
  }'::jsonb;
