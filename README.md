# Pocketeer

Personal finance web app (expenses, income, transfers, savings per pay period). See `docs/brief.md` for the spec and `CLAUDE.md` for the rules.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the two Supabase values
npm run dev
```

Open http://localhost:3000. Deployed on Vercel from the `main` branch.

## Supabase setup (once)

1. **Database:** in the Supabase dashboard open **SQL Editor**, paste each file from `supabase/migrations/` in name order and run it.
2. **Email code:** **Authentication > Emails > Templates > Magic link**: put `{{ .Token }}` in the message so the email contains the 6-digit code.
3. **Your account:** **Authentication > Users > Add user > Create new user**, with your email and *Auto confirm user* ticked.
4. **No sign-ups:** **Authentication > Sign In / Providers**: turn off *Allow new users to sign up*. The app never creates accounts either.
5. **Keys:** copy the Project URL and publishable key from **Project Settings > API Keys** into `.env.local` and into Vercel (**Settings > Environment Variables**, all environments), then redeploy.

Sign-in is by a 6-digit email code (not a link), so it works inside the iPhone home-screen app.
