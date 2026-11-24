drop policy if exists "No direct browser access to memory attachments" on public.memory_attachments;
create policy "No direct browser access to memory attachments"
  on public.memory_attachments for all to anon, authenticated
  using (false) with check (false);
