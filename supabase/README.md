# Supabase — Convince Me To

Projekt: **`sclkullmsikzjnpavtfk`** (region: eu-north-1)

**Nie używaj projektu Searchlize** (`anktidijxddtpdljjcxo`).

## Setup (jednorazowo)

1. Utwórz projekt na [supabase.com](https://supabase.com).
2. Uruchom migrację z `migrations/20250617000000_player_progress_foundation.sql` (SQL Editor lub `supabase db push`).
3. Skopiuj `.env.local.example` → `.env.local` i uzupełnij URL + anon key.
4. W Supabase → **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` (produkcja: dodaj też domenę prod)
   - Po kliknięciu linku z maila użytkownik trafia na `/auth/callback`, potem na `/auth/confirmed`.
5. W Supabase → **Authentication → Email Templates → Confirm signup** wklej szablon z [`email-templates/confirm-signup.html`](./email-templates/confirm-signup.html) (instrukcja: [`email-templates/README.md`](./email-templates/README.md)).
6. W `.env.local` ustaw `ADMIN_EMAIL` (twój e-mail) oraz `SUPABASE_SERVICE_ROLE_KEY` — panel analityki: `/admin`.

## Tabele po migracji

- `profiles` — profil użytkownika (auto przy rejestracji)
- `level_completions` — postęp w poziomach
- `game_sessions` — sesje czatu AI
