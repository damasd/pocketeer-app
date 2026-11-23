-- Categories you add yourself can be deleted; the setup categories (built in) can't.
-- A category that has transactions still can't be deleted (archive it instead): the
-- transactions foreign key blocks it. Its budgets and goal are deleted with it.

alter table public.categories add column built_in boolean not null default false;

-- Mark the setup list (from seed_defaults) as built in.
update public.categories c
set built_in = true
from (values
  ('expense', 'Transportation'), ('expense', 'Food'), ('expense', 'Subscription'),
  ('expense', 'Transportation 2'), ('expense', 'Food 2'), ('expense', 'Shopping'),
  ('expense', 'Entertainment'), ('expense', 'Education'), ('expense', 'Travel'),
  ('expense', 'Gifts'), ('expense', 'Health & Selfcare'), ('expense', 'Insurance'),
  ('expense', 'Charity'), ('expense', 'Other Expenses'),
  ('income', 'Salary'), ('income', 'Bonus'), ('income', 'Other Income'),
  ('saving', 'Emergency Fund'), ('saving', 'Reksadana'), ('saving', 'Gold'),
  ('saving', 'Indo Stock'), ('saving', 'US Stock'), ('saving', 'Crypto'),
  ('saving', 'Travel Saving'), ('saving', 'Education Saving'), ('saving', 'Family Saving'),
  ('saving', 'Property'), ('saving', 'Other Saving')
) as seed (kind, name)
where c.kind = seed.kind and c.name = seed.name;

-- New users: setup categories are built in.
create or replace function public.seed_defaults(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, kind, icon, note, sort_order, built_in)
  values
    (target, 'Transportation',    'expense', 'train-front',    'Daily working commute',     1, true),
    (target, 'Food',              'expense', 'utensils',       'Daily working food',        2, true),
    (target, 'Subscription',      'expense', 'refresh-cw',     null,                        3, true),
    (target, 'Transportation 2',  'expense', 'car',            'Transport other than work', 4, true),
    (target, 'Food 2',            'expense', 'hamburger',      'Food other than work',      5, true),
    (target, 'Shopping',          'expense', 'shopping-bag',   null,                        6, true),
    (target, 'Entertainment',     'expense', 'clapperboard',   null,                        7, true),
    (target, 'Education',         'expense', 'graduation-cap', null,                        8, true),
    (target, 'Travel',            'expense', 'plane',          null,                        9, true),
    (target, 'Gifts',             'expense', 'gift',           null,                       10, true),
    (target, 'Health & Selfcare', 'expense', 'heart-pulse',    null,                       11, true),
    (target, 'Insurance',         'expense', 'umbrella',       null,                       12, true),
    (target, 'Charity',           'expense', 'hand-heart',     null,                       13, true),
    (target, 'Other Expenses',    'expense', 'ellipsis',       null,                       14, true),

    (target, 'Salary',            'income',  'briefcase',      null,                        1, true),
    (target, 'Bonus',             'income',  'sparkles',       null,                        2, true),
    (target, 'Other Income',      'income',  'ellipsis',       null,                        3, true),

    (target, 'Emergency Fund',    'saving',  'shield',         null,                        1, true),
    (target, 'Reksadana',         'saving',  'chart-line',     null,                        2, true),
    (target, 'Gold',              'saving',  'coins',          null,                        3, true),
    (target, 'Indo Stock',        'saving',  'trending-up',    null,                        4, true),
    (target, 'US Stock',          'saving',  'globe',          null,                        5, true),
    (target, 'Crypto',            'saving',  'bitcoin',        null,                        6, true),
    (target, 'Travel Saving',     'saving',  'luggage',        null,                        7, true),
    (target, 'Education Saving',  'saving',  'book-open',      null,                        8, true),
    (target, 'Family Saving',     'saving',  'users',          null,                        9, true),
    (target, 'Property',          'saving',  'house',          null,                       10, true),
    (target, 'Other Saving',      'saving',  'piggy-bank',     null,                       11, true)
  on conflict do nothing;
end;
$$;

revoke execute on function public.seed_defaults(uuid) from public, anon, authenticated;

-- Owners may delete their own categories, but not built-in ones.
create policy "Owner can delete own added categories" on public.categories
  for delete to authenticated using ((select auth.uid()) = user_id and built_in = false);

grant delete on table public.categories to authenticated;
