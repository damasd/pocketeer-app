-- Budget tiles chosen for Home (Budget page): true shows that expense category's tile on Home.
-- With none chosen, Home shows the six budgets used most. Covered by the categories' row level
-- security (owner only).
alter table public.categories add column if not exists home_tile boolean not null default false;
