-- Run after schema.sql. Covers are public so students can see them without signing in.
create table if not exists public.month_covers (
  month smallint primary key check (month between 1 and 12),
  image_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.month_covers enable row level security;
revoke all on table public.month_covers from anon, authenticated;
grant select on table public.month_covers to anon;
grant select, insert, update, delete on table public.month_covers to authenticated;

create policy "Month covers are readable" on public.month_covers
  for select to anon, authenticated using (true);
create policy "Admins can add month covers" on public.month_covers
  for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can edit month covers" on public.month_covers
  for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete month covers" on public.month_covers
  for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-covers', 'story-covers', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Admins can read cover objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'story-covers' and
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can upload cover objects" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'story-covers' and
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete cover objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'story-covers' and
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
