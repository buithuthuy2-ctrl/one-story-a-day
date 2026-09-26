-- Applied to the live project as migration add_student_profiles_and_story_reads.
create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.story_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, story_id)
);
create index if not exists story_reads_story_id_idx on public.story_reads(story_id);

alter table public.student_profiles enable row level security;
alter table public.story_reads enable row level security;
revoke all on public.student_profiles, public.story_reads from anon, authenticated;
grant select on public.student_profiles to authenticated;
grant select, insert on public.story_reads to authenticated;

create policy "Students or admins read profiles" on public.student_profiles
  for select to authenticated using (
    id = (select auth.uid()) or (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  );
create policy "Students or admins read progress" on public.story_reads
  for select to authenticated using (
    user_id = (select auth.uid()) or (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  );
create policy "Students mark own published stories" on public.story_reads
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.student_profiles p where p.id = user_id)
    and exists (select 1 from public.stories s where s.id = story_id and s.status = 'published')
  );
