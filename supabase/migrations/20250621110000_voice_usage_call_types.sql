-- Extend ai_usage_events for voice STT/TTS logging

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_call_type_check;

alter table public.ai_usage_events
  add constraint ai_usage_events_call_type_check check (
    call_type in (
      'judge',
      'character',
      'objective',
      'sage_key_guess',
      'psych_judge',
      'psych_character',
      'stt',
      'tts'
    )
  );
