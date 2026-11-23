-- Slice 3: accounts (called wallets in the brief) and categories, seeded with the setup data.
-- Balances are never stored: they are calculated from starting_balance + transactions.

create table public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 24),
  short_name       text check (char_length(short_name) <= 12),
  account_number   text check (account_number ~ '^[0-9]{1,20}$'),
  account_group    text not null default 'spending' check (account_group in ('spending', 'saving')),
  colour           text not null default 'black' check (colour in ('black', 'lime', 'white', 'grey')),
  sort_order       integer not null default 0,
  starting_balance bigint not null default 0 check (starting_balance >= 0), -- whole rupiah
  archived         boolean not null default false,
  created_at       timestamptz not null default now()
);

create unique index accounts_user_name_key on public.accounts (user_id, lower(btrim(name)));
create index accounts_user_order_idx on public.accounts (user_id, sort_order);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 24),
  kind       text not null check (kind in ('expense', 'income', 'saving')),
  icon       text not null default 'ellipsis' check (icon ~ '^[a-z0-9-]{1,32}$'),
  note       text check (char_length(note) <= 60),
  sort_order integer not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index categories_user_kind_name_key on public.categories (user_id, kind, lower(btrim(name)));
create index categories_user_kind_order_idx on public.categories (user_id, kind, sort_order);

-- Row level security: each row is visible and editable only by its owner.
alter table public.accounts enable row level security;
alter table public.categories enable row level security;

create policy "Owner can read own accounts" on public.accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own accounts" on public.accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update own accounts" on public.accounts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Owner can read own categories" on public.categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own categories" on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can update own categories" on public.categories
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Newer Supabase projects don't grant API access automatically. No delete: archive instead.
grant select, insert, update on table public.accounts to authenticated;
grant select, insert, update on table public.categories to authenticated;

-- Setup data from the brief. Safe to run twice: existing names are skipped.
create function public.seed_defaults(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (user_id, name, short_name, account_group, colour, sort_order)
  values
    (target, 'BCA',       'BCA',       'spending', 'black', 1),
    (target, 'Jago',      'Jago',      'spending', 'lime',  2),
    (target, 'HSBC',      'HSBC',      'spending', 'white', 3),
    (target, 'GoPay',     'GoPay',     'spending', 'grey',  4),
    (target, 'Cash',      'Cash',      'spending', 'black', 5),
    (target, 'Pegadaian', 'Pegadaian', 'saving',   'lime',  6),
    (target, 'iPOT',      'iPOT',      'saving',   'white', 7),
    (target, 'Bibit',     'Bibit',     'saving',   'grey',  8)
  on conflict do nothing;

  insert into public.categories (user_id, name, kind, icon, note, sort_order)
  values
    (target, 'Transportation',    'expense', 'train-front',    'Daily working commute',     1),
    (target, 'Food',              'expense', 'utensils',       'Daily working food',        2),
    (target, 'Subscription',      'expense', 'refresh-cw',     null,                        3),
    (target, 'Transportation 2',  'expense', 'car',            'Transport other than work', 4),
    (target, 'Food 2',            'expense', 'hamburger',      'Food other than work',      5),
    (target, 'Shopping',          'expense', 'shopping-bag',   null,                        6),
    (target, 'Entertainment',     'expense', 'clapperboard',   null,                        7),
    (target, 'Education',         'expense', 'graduation-cap', null,                        8),
    (target, 'Travel',            'expense', 'plane',          null,                        9),
    (target, 'Gifts',             'expense', 'gift',           null,                       10),
    (target, 'Health & Selfcare', 'expense', 'heart-pulse',    null,                       11),
    (target, 'Insurance',         'expense', 'umbrella',       null,                       12),
    (target, 'Charity',           'expense', 'hand-heart',     null,                       13),
    (target, 'Other Expenses',    'expense', 'ellipsis',       null,                       14),

    (target, 'Salary',            'income',  'briefcase',      null,                        1),
    (target, 'Bonus',             'income',  'sparkles',       null,                        2),
    (target, 'Other Income',      'income',  'ellipsis',       null,                        3),

    (target, 'Emergency Fund',    'saving',  'shield',         null,                        1),
    (target, 'Reksadana',         'saving',  'chart-line',     null,                        2),
    (target, 'Gold',              'saving',  'coins',          null,                        3),
    (target, 'Indo Stock',        'saving',  'trending-up',    null,                        4),
    (target, 'US Stock',          'saving',  'globe',          null,                        5),
    (target, 'Crypto',            'saving',  'bitcoin',        null,                        6),
    (target, 'Travel Saving',     'saving',  'luggage',        null,                        7),
    (target, 'Education Saving',  'saving',  'book-open',      null,                        8),
    (target, 'Family Saving',     'saving',  'users',          null,                        9),
    (target, 'Property',          'saving',  'house',          null,                       10),
    (target, 'Other Saving',      'saving',  'piggy-bank',     null,                       11)
  on conflict do nothing;
end;
$$;

-- Only the database itself may seed; the app can't call this for any user.
revoke execute on function public.seed_defaults(uuid) from public, anon, authenticated;

-- New users get a profile and the setup data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(split_part(coalesce(new.email, ''), '@', 1), 40))
  on conflict (user_id) do nothing;
  perform public.seed_defaults(new.id);
  return new;
end;
$$;

-- Existing users (you) get the setup data now.
select public.seed_defaults(id) from auth.users;
