# Szablony e-mail Supabase Auth

Gotowe szablony w stylu gry (pergamin, mosiądz, ciemne tło — jak ekran logowania).

## Wklejenie w Supabase

1. Otwórz [Supabase Dashboard](https://supabase.com/dashboard) → projekt **Convince Me To** (`sclkullmsikzjnpavtfk`).
2. **Authentication** → **Email Templates** → **Confirm signup**.
3. **Subject:** skopiuj treść z `confirm-signup.subject.txt`.
4. **Body:** skopiuj całą zawartość `confirm-signup.html` (Ctrl+A w pliku).
5. Zapisz.

## Zmienne Supabase (już w szablonie)

| Zmienna | Użycie |
|---------|--------|
| `{{ .ConfirmationURL }}` | Link potwierdzający (przycisk + fallback) |
| `{{ .Email }}` | Adres użytkownika |
| `{{ .SiteURL }}` | URL strony (stopka) |

Pełna lista: [Supabase — Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Kolorystyka (design system gry)

| Token | Hex | Rola w mailu |
|-------|-----|--------------|
| `--cm-dark-base` | `#140C07` | Tło zewnętrzne |
| `--cm-parchment-light` | `#E7D7BA` | Karta / pergamin |
| `--cm-brass` | `#C6A15D` | Akcenty, obwódka |
| `--cm-wood-mid` | `#6D4427` | Przycisk CTA |
| `--cm-magic-teal-light` | `#6DB0A4` | Linki w stopce |
| `--cm-ink-soft` | `#76502E` | Tekst body |

## Podgląd lokalny

Otwórz `confirm-signup.html` w przeglądarce i ręcznie podmień zmienne, np.:

- `{{ .ConfirmationURL }}` → `https://example.com/auth/callback?token=...`
- `{{ .Email }}` → `wedrowiec@example.com`
- `{{ .SiteURL }}` → `https://twoja-domena.pl`

## Uwagi

- Szablon używa **tabel + inline CSS** (kompatybilność z Gmail, Outlook, Apple Mail).
- Przycisk ma fallback **VML** dla Outlooka na Windows.
- Font: Georgia / serif — zbliżony do Cinzel/EB Garamond używanych w grze; bezpieczny dla klientów pocztowych.
