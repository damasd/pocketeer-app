-- Slice 4: transactions. Every money movement is one row; balances and totals are calculated from these.

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null default current_date,
  type          text not null check (type in ('expense', 'income', 'transfer', 'saving_deposit', 'saving_withdraw')),
  amount        bigint not null check (amount > 0 and amount < 10000000000000), -- whole rupiah, always positive
  -- An account or category that has transactions can't be deleted (archive it instead).
  account_id    uuid not null references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  category_id   uuid references public.categories (id) on delete restrict,
  note          text check (char_length(note) <= 120),
  source        text not null default 'manual' check (source in ('manual', 'receipt', 'voice')),
  created_at    timestamptz not null default now(),

  -- Shape rules from the brief's data model.
  constraint transactions_shape check (
    (type in ('expense', 'income') and category_id is not null and to_account_id is null)
    or (type = 'transfer' and category_id is null and to_account_id is not null and to_account_id <> account_id)
    or (type in ('saving_deposit', 'saving_withdraw') and category_id is not null and to_account_id is not null)
  )
);

create index transactions_user_date_idx on public.transactions (user_id, date desc, created_at desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id);
create index transactions_category_idx on public.transactions (category_id);

alter table public.transactions enable row level security;

-- The row, its accounts and its category must all belong to the signed-in user,
-- and the category kind must match the type (expense -> expense category, and so on).
create function public.transaction_refs_ok(
  p_type text, p_account uuid, p_to_account uuid, p_category uuid
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    exists (select 1 from public.accounts a where a.id = p_account and a.user_id = (select auth.uid()))
    and (p_to_account is null
         or exists (select 1 from public.accounts a where a.id = p_to_account and a.user_id = (select auth.uid())))
    and (p_category is null
         or exists (
           select 1 from public.categories c
           where c.id = p_category
             and c.user_id = (select auth.uid())
             and c.kind = case p_type
                            when 'expense' then 'expense'
                            when 'income' then 'income'
                            else 'saving'
                          end));
$$;

create policy "Owner can read own transactions" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Owner can add own transactions" on public.transactions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.transaction_refs_ok(type, account_id, to_account_id, category_id));

create policy "Owner can update own transactions" on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.transaction_refs_ok(type, account_id, to_account_id, category_id));

create policy "Owner can delete own transactions" on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.transactions to authenticated;
grant execute on function public.transaction_refs_ok(text, uuid, uuid, uuid) to authenticated;
revoke execute on function public.transaction_refs_ok(text, uuid, uuid, uuid) from anon, public;
