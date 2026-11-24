
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  encrypted_content jsonb not null check (jsonb_typeof(encrypted_content) = 'object'),
  unlock_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete cascade,
  type text not null default 'memory_unlocked' check (type in ('memory_unlocked','system')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.memories enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users can read their own encrypted memories" on public.memories;
create policy "Users can read their own encrypted memories"
  on public.memories for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can mark their own notifications as read" on public.notifications;
create policy "Users can mark their own notifications as read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('memory-attachments','memory-attachments',false,26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users can read their own memory attachments" on storage.objects;
create policy "Users can read their own memory attachments" on storage.objects for select to authenticated
  using (bucket_id='memory-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users can upload their own memory attachments" on storage.objects;
create policy "Users can upload their own memory attachments" on storage.objects for insert to authenticated
  with check (bucket_id='memory-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users can update their own memory attachments" on storage.objects;
create policy "Users can update their own memory attachments" on storage.objects for update to authenticated
  using (bucket_id='memory-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check (bucket_id='memory-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users can delete their own memory attachments" on storage.objects;
create policy "Users can delete their own memory attachments" on storage.objects for delete to authenticated
  using (bucket_id='memory-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
