-- EVERSTAR secure core
-- The browser never receives decrypted memory payloads from Postgres.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  encrypted_payload jsonb not null,
  unlock_at timestamptz not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  constraint memories_encrypted_payload_object check (jsonb_typeof(encrypted_payload) = 'object')
);
create index if not exists memories_owner_created_idx on public.memories(owner_id, created_at desc);
create index if not exists memories_due_idx on public.memories(unlock_at) where notified_at is null;
alter table public.memories enable row level security;
revoke all on public.memories from anon, authenticated;
grant all on public.memories to service_role;

create table if not exists public.memory_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  object_path text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index if not exists memory_attachments_owner_memory_idx on public.memory_attachments(owner_id, memory_id);
alter table public.memory_attachments enable row level security;
revoke all on public.memory_attachments from anon, authenticated;
grant all on public.memory_attachments to service_role;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant all on public.push_subscriptions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'everstar-private',
  'everstar-private',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','audio/mpeg','audio/mp4','video/mp4']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No direct object SELECT policy: only the authenticated Edge Function may issue
-- a short-lived download URL after checking the capsule's unlock time.
-- Upload and download URLs are issued by the media-api Edge Function.

create or replace function private.process_due_memories()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  processed_count integer := 0;
begin
  with due as (
    update public.memories m
       set notified_at = pg_catalog.now()
     where m.notified_at is null
       and m.unlock_at <= pg_catalog.now()
     returning m.id, m.owner_id
  ), inserted as (
    insert into public.notifications(user_id, memory_id, title, body)
    select d.owner_id, d.id, 'A time capsule has opened',
           'One of your saved memories is ready to revisit.'
      from due d
    returning id
  )
  select pg_catalog.count(*)::integer into processed_count from inserted;
  return processed_count;
end;
$$;
revoke all on function private.process_due_memories() from public, anon, authenticated;
grant execute on function private.process_due_memories() to postgres, service_role;

comment on table public.memories is 'Encrypted memory payloads. Access only through authenticated Edge Functions.';
comment on column public.memories.encrypted_payload is 'AES-256-GCM ciphertext, IV and authentication tag. Encryption key exists only in Edge Function secrets.';
comment on table public.memory_attachments is 'Private attachment metadata. Downloads are signed only after server-side unlock checks.';
