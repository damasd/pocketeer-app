-- 1. Expense order: Transportation, Transportation 2, Food, Food 2, Subscription, then the rest.
--    Categories you added keep their place after these.
update public.categories c
set sort_order = o.sort_order
from (values
  ('Transportation', 1), ('Transportation 2', 2), ('Food', 3), ('Food 2', 4), ('Subscription', 5),
  ('Shopping', 6), ('Entertainment', 7), ('Education', 8), ('Travel', 9), ('Gifts', 10),
  ('Health & Selfcare', 11), ('Insurance', 12), ('Charity', 13), ('Other Expenses', 14)
) as o (name, sort_order)
where c.kind = 'expense' and c.built_in and c.name = o.name;

-- Added expense categories go after the setup list.
update public.categories set sort_order = sort_order + 100
where kind = 'expense' and not built_in and sort_order <= 14;

-- New users get the same order.
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
    (target, 'Transportation 2',  'expense', 'car',            'Transport other than work', 2, true),
    (target, 'Food',              'expense', 'utensils',       'Daily working food',        3, true),
    (target, 'Food 2',            'expense', 'hamburger',      'Food other than work',      4, true),
    (target, 'Subscription',      'expense', 'refresh-cw',     null,                        5, true),
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

-- 2. Saving categories (goals) may be deleted too, built in or not. The app only offers it when
--    the saving balance is Rp 0; any transactions still block the delete (archive instead).
drop policy "Owner can delete own added categories" on public.categories;

create policy "Owner can delete added or saving categories" on public.categories
  for delete to authenticated
  using ((select auth.uid()) = user_id and (built_in = false or kind = 'saving'));
