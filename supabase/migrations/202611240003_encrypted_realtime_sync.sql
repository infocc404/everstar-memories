-- Realtime carries only the encrypted row payload. Plaintext remains available
-- only through memory-api after the server-side unlock check.
grant select on public.memories to authenticated;
drop policy if exists "Users read only their encrypted memory rows" on public.memories;
create policy "Users read only their encrypted memory rows"
  on public.memories for select to authenticated
  using ((select auth.uid()) = owner_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'memories'
  ) then
    alter publication supabase_realtime add table public.memories;
  end if;
end
$$;
