-- Slice 7: pay periods (editable for holidays), budgets per expense category per period, saving goals.

-- Pay periods. Created by the app from the 25th rule; the start day can be changed by hand.
-- end_date is always the day before the next period starts (the app keeps it in step).
create table public.periods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  name       text not null check (char_length(name) <= 20),
  created_at timestamptz not null default now(),
  constraint periods_dates check (end_date >= start_date)
);

create unique index periods_user_start_key on public.periods (user_id, start_date);

-- One amount per category per period (whole rupiah). Expense categories use it as the budget.
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  period_id   uuid not null references public.periods (id) on delete cascade,
  amount      bigint not null check (amount >= 0 and amount < 10000000000000),
  updated_at  timestamptz not null default now()
);

create unique index budgets_period_category_key on public.budgets (period_id, category_id);
create index budgets_user_idx on public.budgets (user_id);

-- Saving goals: one per saving category, with a target amount and date.
create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  target_amount bigint not null check (target_amount > 0 and target_amount < 10000000000000),
  target_date   date not null,
  created_at    timestamptz not null default now()
);

create unique index goals_category_key on public.goals (category_id);
create index goals_user_idx on public.goals (user_id);

alter table public.periods enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

-- Periods: owner only.
create policy "Owner can read own periods" on public.periods
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own periods" on public.periods
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update own periods" on public.periods
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Budgets: owner only, and the category and period must be the owner's too.
create policy "Owner can read own budgets" on public.budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own budgets" on public.budgets
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
    and exists (select 1 from public.periods p where p.id = period_id and p.user_id = (select auth.uid()))
  );
create policy "Owner can update own budgets" on public.budgets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
    and exists (select 1 from public.periods p where p.id = period_id and p.user_id = (select auth.uid()))
  );
create policy "Owner can delete own budgets" on public.budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Goals: owner only, and only on the owner's saving categories.
create policy "Owner can read own goals" on public.goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own goals" on public.goals
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.categories c
                where c.id = category_id and c.user_id = (select auth.uid()) and c.kind = 'saving')
  );
create policy "Owner can update own goals" on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.categories c
                where c.id = category_id and c.user_id = (select auth.uid()) and c.kind = 'saving')
  );
create policy "Owner can delete own goals" on public.goals
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Newer Supabase projects don't grant API access automatically.
grant select, insert, update on table public.periods to authenticated;
grant select, insert, update, delete on table public.budgets to authenticated;
grant select, insert, update, delete on table public.goals to authenticated;
