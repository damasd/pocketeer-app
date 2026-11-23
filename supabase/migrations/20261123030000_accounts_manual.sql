-- Accounts are now added by hand: no starting accounts, and accounts can be deleted.
-- (Categories keep their setup data.)

-- 1. New users get categories only.
create or replace function public.seed_defaults(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
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

revoke execute on function public.seed_defaults(uuid) from public, anon, authenticated;

-- 2. Owners may delete their accounts. Once transactions exist (slice 4+), their foreign key
--    will block deleting an account that has transactions; archive those instead.
create policy "Owner can delete own accounts" on public.accounts
  for delete to authenticated using ((select auth.uid()) = user_id);

grant delete on table public.accounts to authenticated;

-- 3. Remove the starting accounts that were never changed (no number, balance 0, original
--    name/colour/type). Anything you edited stays; delete it in the app if you don't want it.
delete from public.accounts a
using (values
  ('BCA', 'spending', 'black'), ('Jago', 'spending', 'lime'), ('HSBC', 'spending', 'white'),
  ('GoPay', 'spending', 'grey'), ('Cash', 'spending', 'black'), ('Pegadaian', 'saving', 'lime'),
  ('iPOT', 'saving', 'white'), ('Bibit', 'saving', 'grey')
) as seed (name, account_group, colour)
where a.name = seed.name
  and a.account_group = seed.account_group
  and a.colour = seed.colour
  and a.account_number is null
  and a.starting_balance = 0
  and a.archived = false;
