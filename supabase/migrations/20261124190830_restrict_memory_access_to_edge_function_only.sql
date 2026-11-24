revoke all on public.memories from anon, authenticated;
drop policy if exists "Users can read their own encrypted memories" on public.memories;
drop policy if exists "No direct browser access to memory records" on public.memories;
create policy "No direct browser access to memory records"
  on public.memories for all to anon, authenticated
  using (false) with check (false);
