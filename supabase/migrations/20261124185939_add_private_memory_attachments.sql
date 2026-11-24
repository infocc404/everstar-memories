
create table if not exists public.memory_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  object_path text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now()
);
create index if not exists memory_attachments_owner_memory_idx
  on public.memory_attachments(user_id,memory_id,created_at desc);
alter table public.memory_attachments enable row level security;
revoke all on public.memory_attachments from anon,authenticated;
