-- Applied to the live project as migration admins_read_student_attempts.
-- Students retain access only to their own attempts; admins may review all attempts.
create policy "Admins read student attempts" on public.attempts
  for select to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
