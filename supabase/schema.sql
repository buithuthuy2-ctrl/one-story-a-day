-- Run this once in the Supabase SQL Editor for a new project.
-- The app uses only the publishable key in the browser. Never expose a secret/service key.

create table if not exists public.stories (
  id uuid primary key,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  title text not null check (length(trim(title)) > 0),
  summary text not null default '',
  content text not null check (length(trim(content)) > 0),
  youtube_url text not null default '',
  image_url text not null default '',
  level text not null default 'Cơ bản',
  duration_minutes smallint not null default 5 check (duration_minutes between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'published')),
  activities jsonb not null default '{"cloze_text":"","true_false":[],"short_answer":[],"discussion":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, day),
  check (day <= case month when 2 then 28 when 4 then 30 when 6 then 30 when 9 then 30 when 11 then 30 else 31 end)
);

-- Safe when this script is run after an earlier version of the app schema.
alter table public.stories add column if not exists activities jsonb not null
  default '{"cloze_text":"","true_false":[],"short_answer":[],"discussion":[]}'::jsonb;

create table if not exists public.questions (
  id uuid primary key,
  story_id uuid not null references public.stories(id) on delete cascade,
  prompt text not null check (length(trim(prompt)) > 0),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  answer_index smallint not null check (answer_index between 0 and 3),
  explanation text not null default '',
  sort_order smallint not null default 1
);

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  score smallint not null check (score >= 0),
  total smallint not null check (total >= 0),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  created_at timestamptz not null default now(),
  check (score <= total)
);

create index if not exists questions_story_order_idx on public.questions(story_id, sort_order);
create index if not exists attempts_user_created_idx on public.attempts(user_id, created_at desc);
create index if not exists attempts_story_idx on public.attempts(story_id);

alter table public.stories enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

revoke all on table public.stories, public.questions, public.attempts from anon, authenticated;
grant select on table public.stories, public.questions to anon;
grant select, insert, update, delete on table public.stories, public.questions to authenticated;
grant select, insert on table public.attempts to authenticated;
grant usage, select on sequence public.attempts_id_seq to authenticated;

create policy "Published stories are readable" on public.stories
  for select to anon, authenticated using (status = 'published');
create policy "Admins can read all stories" on public.stories
  for select to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can add stories" on public.stories
  for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can edit stories" on public.stories
  for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete stories" on public.stories
  for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Published questions are readable" on public.questions
  for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.status = 'published'));
create policy "Admins can read all questions" on public.questions
  for select to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can add questions" on public.questions
  for insert to authenticated with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can edit questions" on public.questions
  for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins can delete questions" on public.questions
  for delete to authenticated using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "Students read their attempts" on public.attempts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Students submit their attempts" on public.attempts
  for insert to authenticated with check ((select auth.uid()) = user_id);
