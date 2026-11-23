# Personal finance app — project brief

Nov 22, 2026 · @Damas

## Overview

A personal finance web app for one user (me) that records money in, out and between wallets, and shows budget vs actual, net cash flow and savings per pay period. It runs in the browser on laptop and iPhone (installable to the home screen), syncs through a cloud database, and exports to a spreadsheet.

- **User:** one person, logged in. No shared or multi-user features in the MVP.
- **Currency:** IDR only.
- **Pay period:** payday to payday, starting on the 25th (the next weekday if the 25th is a weekend), named after the month it ends in.
- **Budgets:** reset every period, no rollover. Saving categories get a monthly target too.
- **Savings are tracked as contributions:** for Reksadana, gold, stocks and crypto the app records money put in and taken out, not today's market value.
- **Out of scope for now:** split bill, multi-currency, bank sync, live investment prices. Receipt and voice input come right after the core app works.

## Core concepts

Every money movement is one of four transaction types, and each one touches a wallet. Balances and dashboard numbers are always calculated from transactions, never typed in.

| Transaction type | Effect | Counts toward |
| --- | --- | --- |
| Expense | Money leaves a wallet | Budget actual, net cash flow |
| Income | Money enters a wallet | Net cash flow |
| Transfer | Money moves between two wallets | Nothing (not an expense) |
| Saving (deposit or withdraw) | Money is set aside to, or taken back from, a saving category; it may move to another wallet or stay where it is | Saved, and that category's saving balance |

**Wallets and savings.** No wallet has a fixed type: any wallet (BCA, Jago, Bibit and so on) can hold spending money and savings. What marks money as saved is the saving category on the transaction (Emergency Fund, Gold and so on), not where the money sits. Saving into Gold and moving it from BCA to Pegadaian is one saving transaction. Setting money aside in Jago without moving it is a saving transaction from Jago to Jago: the wallet balance stays, the saving balance rises.

**Dashboard numbers (per pay period):**

- **Net cash flow** = income − expenses
- **Saved** = saving deposits − saving withdrawals
- **Unallocated** = net cash flow − saved (earned, but neither spent nor saved)
- **Budget vs actual:** expense categories compare expenses to the budget; saving categories compare deposits to a monthly target
- **Wallet balance** = starting balance + income − expenses ± transfers ± saving moves between wallets
- **Saving balance per category** = all deposits − all withdrawals, across all periods

**Pay period.** A period starts on the 25th, or on the next weekday when the 25th falls on a weekend, and ends the day before the next one starts. It is named after the month it ends in (25 Nov – 24 Dec = "December"). Public holidays are not detected; adjust that period's dates by hand.

## Feature list

The MVP covers recording, budgeting, Home, Analytics and export; everything else waits until the MVP is in daily use.

**MVP**

1. Login (email), so only I can see my data
2. Profile: name and photo, shown in the Home greeting
3. Wallets: create, rename, archive; starting balance 0; a colour from the palette
4. Categories: expense, income and saving lists; create, rename, archive
5. Log transaction sheet with a number keypad: expense, income, transfer, saving (deposit or withdraw); Undo after saving
6. Pay periods: generated from the 25th rule, editable dates
7. Plan tab (Budget & goals): one amount per expense category per month, copy last month in one tap; saving goals with a target amount and date, showing the amount needed per month
8. Home: greeting, remaining budget, wallet cards, budget per category, last 3 days of transactions
9. Wallet page: total balance and one card per wallet
10. History: all transactions, filtered by period, wallet, category and type
11. Analytics: expenses, income or saving over time, and the split by category
12. Export: download transactions for a period (or all) as .xlsx and .csv
13. Installable on iPhone home screen (PWA)

**Next, once the core works**

- Read a receipt photo (camera or gallery) into a draft transaction
- Speak a transaction, e.g. "makan siang nasi padang 35 ribu pakai GoPay", into a draft transaction
- Both only fill the form; nothing is saved until I check it and tap Save

**Later**

- Split bill
- Recurring transactions (subscriptions, insurance)
- Goal reminders
- Live sync to Google Sheets
- Multi-currency
- Dark mode

## Setup data

The app starts with eight wallets and three groups of categories, with every wallet at a balance of 0.

**Wallets:** BCA, Jago, HSBC, GoPay, Cash, Pegadaian, iPOT, Bibit. Any of them can hold spending money or savings. GoPay top-ups and cash withdrawals are transfers; a top-up fee is an expense. Because balances start at 0, a wallet balance will match the real account only after you log income into it or edit its starting balance.

**Expense categories**

- Transportation: daily working commute
- Transportation 2: transport other than work
- Food: daily working food
- Food 2: food other than work
- Shopping, Entertainment, Education, Travel, Gifts, Health & Selfcare, Insurance, Charity, Other Expenses

**Saving categories:** Emergency Fund, Reksadana, Gold, Indo Stock, US Stock, Crypto, Travel Saving, Education Saving, Family Saving, Property, Other Saving.

**Income categories:** Salary, Bonus, Other Income.

## Data model

Six tables hold everything; every row carries `user_id` so database security rules can limit each row to its owner.

| Table | Fields | Rules |
| --- | --- | --- |
| `profiles` | user\_id, display\_name, photo\_path | One row per user; the photo file lives in Supabase Storage |
| `wallets` | id, user\_id, name, short\_name, account\_number (optional), group (spending / saving), colour, sort\_order, starting\_balance, archived | Archive instead of delete once a wallet has transactions; colour from the palette; account number shown masked (last 4 digits) |
| `categories` | id, user\_id, name, kind (expense / income / saving), icon, note, sort\_order, archived | Same archive rule |
| `periods` | id, user\_id, start\_date, end\_date, name | Generated from the 25th rule, weekend start moved to Monday; editable for holidays |
| `transactions` | id, user\_id, date, type (expense / income / transfer / saving\_deposit / saving\_withdraw), amount, wallet\_id, to\_wallet\_id, category\_id, note, source (manual / receipt / voice), created\_at | amount always positive. Expense and income: category required, no to\_wallet\_id. Transfer: to\_wallet\_id required, no category. Saving types: saving category and to\_wallet\_id required; to\_wallet\_id may equal wallet\_id |
| `budgets` | id, user\_id, category\_id, period\_id, amount | One row per expense or saving category per period. Saving goals need a goals table too: id, user\_id, category\_id, target\_amount, target\_date |

- **Amounts** are stored as whole rupiah (integers), which avoids decimal rounding errors.
- **Period** of a transaction = the period whose dates contain its date; it is looked up, not stored on the transaction.
- **Money direction:** every saving transaction moves money from wallet\_id to to\_wallet\_id; deposit raises and withdraw lowers the category's saving balance.
- **Calculated, not stored:** wallet balances, saved amount per wallet, budget actuals, net cash flow, saved, unallocated, saving balances, chart totals.
- **Receipt photos and voice recordings are not kept;** only the transaction they produce is saved, with source marking where it came from.

## Screens and user flows

Five tabs sit in a floating bar at the bottom: Home, Wallet, Log (the lime + in the middle), Analytics and Plan. History opens from Home, and settings open from your photo on Home, and logging an expense takes about four taps.

**Log an expense**

1. Tap the lime +
2. Type the amount on the keypad (the 000 key adds thousands)
3. Tap a category chip; the wallet defaults to the last one used
4. Tap Save; the sheet closes and an Undo toast shows for a few seconds

| Screen | How you get there | Shows | Main actions |
| --- | --- | --- | --- |
| Home | Home tab | Dark header: photo with "Welcome back," (small) and "Damas" (large, bold) below; remaining budget this period (large) with "of Rp X budget" (small, grey) and a thin progress bar; the edges of a stack of wallet cards peeking in at the right edge (tap or swipe left to open Wallet). Below that, a white sheet with rounded top corners holds the budget tiles per category (spent / budget, thin bar); transactions from the last 3 days, grouped by day | Swipe or tap wallets → Wallet; See all budgets → Budgets; View all → History |
| Wallet | Wallet tab, or swipe the wallet cards on Home | Total balance (large); one full-width card per wallet with name, balance and the amount saved in it | Tap a card → its transactions in History; + → New wallet sheet (name, colour, starting balance, live card preview) |
| Log transaction | Lime + in the nav bar; opens as a sheet over the current screen | Header: close, title, mic, camera. Type toggle Expense / Income / Transfer / Saving; amount (large); category chips that scroll sideways, most used first; wallet picker with balance ("Pay from", plus "To" for transfer and saving, deposit / withdraw for saving); date chip (today by default); note; keypad 1–9, 0, 000, comma, backspace and a lime Save key | Save; then a "Saved · Rp 35.000 · Undo" toast |
| Analytics | Analytics tab | Toggle Expenses / Income / Saving; chips Week / Month / Year / All time; bar chart with the selected bar in lime; donut of the split by category (top 5 + Other, total in the middle); category tiles with amount, share and budget used | Tap a bar to see that period's split |
| Profile | Tap your photo on Home | Settings (no tab): photo and name; Wallets, Categories, Pay periods, Export, Sign out | Edit each |
| History | View all on Home, or a wallet card | All transactions grouped by date, with filters | Open one to edit or delete |
| Budgets | Plan tab, or See all on Home | Page title Budget & goals. Budget side: each expense category's monthly amount, editable, and what is left to plan from income. Goals side: each saving goal's target, date, amount needed per month and progress this month | Edit amounts, copy from last period |
| Login | First open | Email sign-in | Sign in |

**Save money**

1. Tap +, switch to Saving
2. Enter the amount, pick the saving category (for example Gold) and deposit or withdraw
3. Pick the from wallet (BCA) and the to wallet (Pegadaian); choose the same wallet if the money stays where it is
4. Save; Saved and that category's saving balance go up, expense budgets are unchanged

**Log from a receipt** (after the core)

1. Tap +, then the camera icon; take a photo or pick one from the gallery
2. A "Reading receipt…" state shows while the app reads the store name, date and total
3. Amount, note (store name), date and a suggested category fill in, outlined in lime; check them and tap Save

**Log by voice** (after the core)

1. Tap +, then the mic; a "Listening…" pill shows and the words appear at the top as you speak
2. Say it naturally, e.g. "makan siang nasi padang 35 ribu pakai GoPay"
3. Amount, category, wallet and note fill in, outlined in lime, with a line naming what to check; tap Save

**Start a new pay period**

1. On the first day of the new period, open Budgets
2. Tap "Copy last period", adjust any amounts, save

## Design system

Light, bold and minimal: white and light-grey surfaces, black type and black hero cards, and one lime accent for the main action and highlights. The lime is sampled from the savvr video.

**Colours**

| Token | Hex | Use |
| --- | --- | --- |
| Ink | #111111 | Text, icons, black cards |
| Page | #F2F2F2 | Screen background, keypad keys |
| Card | #FFFFFF | Cards, sheets, nav bar |
| Muted | #6B6B6B | Secondary text ("Welcome back,", "of Rp X budget") |
| Line | #E4E4E4 | Dividers, chip outlines, progress track |
| Lime | #D1FC00 | Log button, Save key, selected chip, selected chart bar, auto-filled field outline |
| Ember | #D63F22 | Second accent for things that need attention (over budget, errors). Always a fill with white text on it |

- **Lime is always a fill with black on it,** never lime text on white. Black on lime has a contrast of about 16:1; lime on white about 1.2:1, far below the 4.5:1 minimum for readable text (my calculation). Ember is the opposite: white text on ember (about 4.6:1, my calculation); ember text on white fails.
- **Wallet cards** use palette colours only (black, lime, white, light grey), with the bank's short name as its identity.
- **Money format:** "Rp 12.480.500" (dot for thousands, no decimals), with tabular figures so digits line up.

**Type:** Inter throughout. Suggested sizes in px / weight: hero amount 40 / 700; greeting name and screen titles 24 / 700; section titles 17 / 600; body 15 / 500; small and muted text 13 / 500; nav labels 11 / 500, selected 11 / 700. Copy stays short and plain: "Log", "Save", "View all".

**Components**

- **Floating nav bar:** a compact black pill (320 × 56 px) centred above the iPhone home bar, icons only. Unselected icons are grey (#9A9A9A); the selected one is white on a dark grey (#2E2E2E) circle. The centre Log button is a 68 px lime circle with a black +, taller than the bar so it sticks out above and below. Every icon keeps a 44 px tap area and a screen-reader label.
- **Cards:** 20–24 px corners, no heavy shadows; one black hero card per screen at most.
- **Chips and buttons:** pill shaped; a selected chip is filled lime.
- **Keypad:** large rounded grey keys; Save is lime and two rows tall.
- **Progress bars:** thin black fill on a grey track; ember once spending passes 100% of the budget. An over-budget tile keeps its grey background and marks the problem with an ember icon circle, ember bar and a small ember "over" pill.
- **Charts:** greys and black, with lime only on the selected or largest item. The donut shows the top 5 categories plus Other, because 14 shades of grey cannot be told apart.
- **Icons:** one outline set (Lucide, which comes with shadcn/ui).

**References**

| Area | Reference | What to take from it |
| --- | --- | --- |
| Palette | [Tasarım pin](https://ca.pinterest.com/pin/828803137699888867/), [Crypto Wallet app](https://ca.pinterest.com/pin/543317142561702819/) | Black cards on white and grey, lime for highlights |
| Type and copy | [Banking and Finance app](https://ca.pinterest.com/pin/527624912599093994/), [模块 pin](https://ca.pinterest.com/pin/731131320783332277/) | Big bold numbers, few words, generous space |
| Nav bar | [Business Account AI](https://ca.pinterest.com/pin/944137509404175866/), [savvr video](https://www.threads.com/@muhammadsyauqi7/post/Dfwy-llAkTd/media) | Floating pill bar; lime centre + |
| Greeting | [C 移动端界面设计](https://ca.pinterest.com/pin/934004410244657443/), [Home conta corrente](https://ca.pinterest.com/pin/1089308228657344631/) | Photo at left, small greeting over a bold name |
| Balance and budget tiles | [rico (@\_heyrico)](https://ca.pinterest.com/pin/231091024625514734/) | Big balance; category tiles as plain rounded rectangles, not wallet shapes |
| Wallet peek and Wallet page | [inspiration!! (video)](https://ca.pinterest.com/pin/1100145015255582944/), [inspiration!! (same video)](https://ca.pinterest.com/pin/672303050673878859/) | Cards peeking at the right edge of Home; full-width cards stacked on the Wallet page |
| History | [Home conta corrente](https://ca.pinterest.com/pin/1089308228657344631/) | Short transaction list with View all |
| Log transaction | [savvr video](https://www.threads.com/@muhammadsyauqi7/post/Dfwy-llAkTd/media) | Sheet, type toggle, big amount, chips, wallet picker, keypad with 000, lime Save, mic and camera, lime outline on auto-filled fields, Undo toast |
| Analytics | [Finance Mobile App](https://ca.pinterest.com/pin/1103100502529338082/), [Budget Tracker App](https://ca.pinterest.com/pin/1090715603528541237/) | Type toggle, time chips, bars with the selected one in lime; donut with legend; budget list with bars |

Save copies of these images in `docs/design/` in the repo. Claude Code reads image files there reliably, but may not be able to open Pinterest or Threads links.

## Tech stack and architecture

One Next.js web app, hosted on Vercel, serves both iPhone and laptop and keeps all data in Supabase. After the core works, an AI service reads receipts and voice.

&#91;embedded content: architecture · app, database, build tools\]

Code written with Claude Code goes to GitHub, and Vercel redeploys the app on every push. Other pieces:

- **Look:** Inter through Next.js's font loader; shadcn/ui components restyled with the palette; Lucide icons; a chart library such as Recharts for the bars and donut.
- **Profile photo:** uploaded to Supabase Storage.
- **Export:** a JavaScript spreadsheet library (such as SheetJS) builds the .xlsx in the browser; .csv needs no library.
- **PWA:** a manifest and icon make the app installable from Safari's Add to Home Screen.
- **Receipt reading (after the core):** the phone's standard photo picker (camera or gallery), the image shrunk in the browser, then a server route sends it to a vision-capable AI model (Claude is one option) together with your category and wallet lists. It returns store, date, total and a suggested category, which fill the form.
- **Voice (after the core):** two options to test on your iPhone. The browser's built-in speech recognition is free, but I'm not sure it works reliably for Indonesian inside a home-screen app on iOS. The alternative records audio and sends it to a speech-to-text service that supports Indonesian. Either way the text then goes through the same AI step as receipts.
- **Keys and cost of AI:** AI calls run on the server, so API keys never reach the phone. Each receipt or voice entry is a paid API call; set a monthly spending limit with the provider. I haven't checked current prices.
- **Cost of the rest:** Supabase, Vercel and GitHub all had free tiers that fit one user, as far as I know. Check current limits.

## Build plan

Build in 13 slices, each working on the live site before the next starts; give Claude Code this brief and ask for one slice at a time.

- [x] 0a. Accounts: GitHub, Supabase, Vercel
- [x] 0b. Claude Code installed
- [ ] 0c. Reference images saved in `docs/design/`, this brief exported to `docs/brief.md`, `CLAUDE.md` written
- [ ] 1\. Skeleton: Next.js app deployed to Vercel from GitHub, with the colours, Inter and the floating nav bar over five empty tabs
- [ ] 2\. Login with Supabase, security rules so each row is visible only to its owner, profile name and photo
- [ ] 3\. Wallets and categories, seeded with the setup data; Wallet page
- [ ] 4\. Log transaction sheet: keypad, expense and income, Undo toast
- [ ] 5\. History with filters
- [ ] 6\. Transfers, saving transactions and wallet balances
- [ ] 7\. Pay periods and budgets, with copy from last period
- [ ] 8\. Home screen
- [ ] 9\. Analytics
- [ ] 10\. Export to .xlsx and .csv
- [ ] 11\. PWA install on iPhone, then two weeks of real use
- [ ] 12\. Receipt reading
- [ ] 13\. Voice logging

Test each slice with real numbers on both iPhone and laptop. Commit to GitHub after every working slice, so a broken change can be rolled back.

## Confirmed decisions

Confirmed on 22–23 Nov 2026. No questions are open.

- Saving without moving money (same wallet) leaves the wallet balance unchanged and raises only the saving balance.
- Saving categories have a monthly target, like expense budgets.
- Investments are tracked as money in and out, not market value.
- Wallets start at balance 0; balances match real accounts only after income is logged or the starting balance is edited.
- Only weekends shift the period start; holidays are adjusted by hand.
- Transportation 2 and Food 2 keep their current names.
- The big number on Home is the remaining budget this period; total balance lives on the Wallet page.
- Light mode first; dark mode later. Home's top section is a dark header, with everything from Budget down on a white sheet.
- Analytics shows a donut and category tiles, without a segmented bar.
- Analytics time chips set the bar size: Week = one bar per week (last 8), Month = one bar per pay period (last 12), Year = one bar per year, All time = one bar per pay period since the start.
- Home shows the 6 budget tiles with the highest share used, plus See all.
- Paying per use for an AI API, and sending receipt photos and voice to that provider, is accepted for slices 12 and 13.

* In the app, wallets are called accounts (the Account tab). Each account belongs to a group, Spending or Saving, used to split the Account page; any account can still hold saved money.
