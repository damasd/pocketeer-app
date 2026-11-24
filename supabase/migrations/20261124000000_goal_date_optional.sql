-- A goal's target date is optional: a goal can have just an amount to reach.
-- Without a date the app shows progress toward the amount but no amount per pay period.
alter table public.goals alter column target_date drop not null;
