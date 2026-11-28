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

| Token | Hex | Rule |
| --- | --- | --- |
| Ink | #111111 | Text, icons, dark header, nav bar |
| Page | #F2F2F2 | Screen background |
| Card | #FFFFFF | Cards, sheets |
| Muted | #6B6B6B | Secondary text (passes 4.5:1 on white) |
| Line | #E4E4E4 | Dividers, tracks |
| Lime | #D1FC00 | Main action, selected, positive. Always a fill with **black** on it |
| Ember | #D63F22 | Needs attention (over budget, errors). Always a fill with **white** on it |

- Never lime or ember as text on white (fails contrast).
- Nav bar: compact black pill, icons only, selected icon white on a #2E2E2E circle, centre Log button is a 48 px lime circle with a black + that sits inside the bar (same size as the selected circle, no shadow). Every icon has a 44 px tap area and an aria-label.
- WCAG AA: 4.5:1 text contrast, keyboard access, real buttons and labels, touch targets ≥ 44 px.
