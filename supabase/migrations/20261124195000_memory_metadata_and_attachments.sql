alter table public.memories
  add column if not exists memory_date date not null default current_date,
  add column if not exists mood text not null default 'Hopeful',
  add column if not exists color text not null default '#e6bd79';

alter table public.memories
  drop constraint if exists memories_mood_length_check,
  add constraint memories_mood_length_check check (char_length(btrim(mood)) between 1 and 32),
  drop constraint if exists memories_color_hex_check,
  add constraint memories_color_hex_check check (color ~ '^#[0-9A-Fa-f]{6}$');

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
  on public.memory_attachments(user_id, memory_id, created_at desc);
alter table public.memory_attachments enable row level security;
revoke all on public.memory_attachments from anon, authenticated;
