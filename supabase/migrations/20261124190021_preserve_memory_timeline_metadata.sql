
alter table public.memories
  add column if not exists memory_date date not null default current_date,
  add column if not exists mood text not null default 'Hopeful',
  add column if not exists color text not null default '#e6bd79';
alter table public.memories
  drop constraint if exists memories_mood_length_check,
  add constraint memories_mood_length_check check (char_length(btrim(mood)) between 1 and 32),
  drop constraint if exists memories_color_hex_check,
  add constraint memories_color_hex_check check (color ~ '^#[0-9A-Fa-f]{6}$');
