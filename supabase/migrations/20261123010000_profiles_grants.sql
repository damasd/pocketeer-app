-- Newer Supabase projects don't grant table access to the API roles automatically.
-- Signed-in users get access to profiles; row level security still limits them to their own row.
-- Signed-out visitors (anon) get nothing.

grant select, insert, update on table public.profiles to authenticated;
