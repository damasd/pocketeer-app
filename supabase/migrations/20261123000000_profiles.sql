-- Slice 2: profiles (name + photo) and the private avatars bucket.
-- Every row belongs to one user; row level security limits access to the owner.

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  photo_path   text,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Owner can read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owner can create own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owner can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Create a profile row for every new user, named after the part of the email before @.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(split_part(coalesce(new.email, ''), '@', 1), 40))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration ran also get a profile.
insert into public.profiles (user_id, display_name)
select id, left(split_part(coalesce(email, ''), '@', 1), 40)
from auth.users
on conflict (user_id) do nothing;

-- Profile photos: private bucket, files stored under "<user_id>/...".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Owner can read own avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owner can upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owner can update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owner can delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
