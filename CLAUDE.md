# MONEY_MANAGEMENT: personal finance web app

A personal finance app for one user (Damas), used mostly on iPhone as a home-screen web app and sometimes on a laptop. It records expenses, income, transfers and savings across accounts, shows budget vs actual per pay period, and tracks saving goals.

## Source of truth

1. `docs/brief.md`: the full spec (features, data model, screens, design system, build plan). **Read it before every new slice.**
2. `docs/design/mockup/`: the approved screens as HTML specs. Match their colours, sizes, spacing and copy. See `docs/design/README.md`.
3. `PRODUCT.md` is an earlier draft. **Where it disagrees with the brief, follow the brief**: data is stored in Supabase (not browser local storage), receipt and voice input use AI in slices 12–13, savings and investments are tracked, and the words are expense, income, transfer and saving.

If something is unclear or the brief and mockup disagree, ask before building.

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel from GitHub
- Supabase: Postgres, email login, row level security, Storage for the profile photo
- shadcn/ui restyled to the palette below, Lucide icons, Inter font
- Recharts (or similar) for the bar chart and donut; SheetJS for .xlsx export
- PWA manifest so it installs from Safari's Add to Home Screen

## Rules

- **Build one slice at a time** (Build plan in the brief). Stop after each slice and tell me how to test it on iPhone and laptop. Do not start the next slice until I say so.
- **Money is whole rupiah integers.** No floats, no decimals. Display as `Rp 12.480.500` (dot thousands).
- **Balances and totals are calculated from transactions, never stored.**
- **Database changes only through migration files** in `supabase/migrations/`. Every table has `user_id` and a row level security policy limiting rows to their owner.
- **Secrets stay in `.env.local`**, which must be in `.gitignore`. AI API keys are only used in server code, never sent to the browser.
- Keep money logic (balances, pay periods, budget maths) in `src/lib/` with tests, separate from UI.
- Pay period: starts on the 25th, or the next weekday if the 25th is a weekend; named after the month it ends in.
- UI word for wallets is **Account** (tab "Account"). Database table can stay `wallets` or be `accounts`; pick one and use it consistently.

## Design tokens

Palette 05 (Off-White · Yellow · Violet, see `docs/design/palette-study-2026-11-28/`). Light and dark themes; the toggle sits top right on Home. Tokens live in `src/app/globals.css` (`@theme` for light, `[data-theme="dark"]` for dark). Use the token classes, never raw hex.

| Token | Light | Dark | Rule |
| --- | --- | --- | --- |
| `ink` | #060316 | #F4F4F6 | Text, icons |
| `muted` | #5C5A66 | #A1A1A2 | Secondary text (4.5:1 on its surfaces) |
| `screen` | #F3F3F2 | #111111 | Page background |
| `card` | #FFFFFF | #2A2A2A | Cards, sheets, Home's panel |
| `page` | #F3F3F2 | #383838 | Fills inside a card: tiles, inputs, keys |
| `line` | #E3E3E1 | #444444 | Dividers, tracks |
| `night` | #060316 | #111111 | Home header, lock screen (stays dark in both themes; white text on it) |
| `night-raised` | #060316 | #383838 | Nav bar, dark summary cards, toasts (white text on it) |
| `accent` | #FFBC01 | #FFBC01 | Main action, positive. Always a fill with `on-accent` (#060316) on it |
| `alert` | #F75C03 | #F75C03 | Needs attention (over budget, errors). Always a fill with `on-alert` (#060316) on it |
| `select` | #500DCE | #A47CF3 | Selected states (switch thumb, nav circle, filters) and progress bars. `on-select` is white in light, #060316 in dark |

- Never `accent` or `alert` as text on white (fails contrast): use them as fills. Amber text is fine on the dark `night` surfaces.
- Account card colours keep their stored names: `lime` shows amber, `black` shows violet, plus white and grey (`src/components/account-card.tsx`).
- Nav bar: compact `night-raised` pill, icons only, selected icon on a 48 px `select` circle, centre Log button is a 48 px `accent` circle with a near-black + that sits inside the bar (same size as the selected circle, no shadow). Every icon has a 44 px tap area and an aria-label.
- WCAG AA: 4.5:1 text contrast, keyboard access, real buttons and labels, touch targets ≥ 44 px.
