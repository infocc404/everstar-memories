
create index if not exists notifications_memory_id_idx on public.notifications(memory_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists memories_user_created_idx on public.memories(user_id,created_at desc);
