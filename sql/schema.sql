create extension if not exists pgcrypto;

create table if not exists public.tile_keys (
  id bigint generated always as identity primary key,
  tile_key text not null unique,
  user_slug text not null unique,
  display_name text not null,
  accent_color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.check_ins (
  id bigint generated always as identity primary key,
  from_user_slug text not null references public.tile_keys(user_slug) on update cascade,
  created_at timestamptz not null default now(),
  notification_sent boolean not null default false,
  notification_result text
);

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  from_user_slug text not null references public.tile_keys(user_slug) on update cascade,
  content text not null check (char_length(content) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.note_reactions (
  id bigint generated always as identity primary key,
  note_id bigint not null references public.notes(id) on delete cascade,
  from_user_slug text not null references public.tile_keys(user_slug) on update cascade,
  reaction text not null check (char_length(reaction) <= 10),
  created_at timestamptz not null default now(),
  constraint note_reactions_unique unique (note_id, from_user_slug, reaction)
);

create table if not exists public.urgent_signals (
  id bigint generated always as identity primary key,
  signal_id uuid not null default gen_random_uuid() unique,
  from_user_slug text not null references public.tile_keys(user_slug) on update cascade,
  preferred_response text not null default 'either' check (preferred_response in ('call', 'text', 'either')),
  created_at timestamptz not null default now(),
  notification_sent boolean not null default false,
  notification_result text,
  confirmed_by_user boolean not null default false,
  acknowledged_at timestamptz,
  acknowledged_by text references public.tile_keys(user_slug) on update cascade,
  status text not null default 'pending' check (status in ('pending', 'acknowledged'))
);

create table if not exists public.urgent_contacts (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.secret_unlocks (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade,
  first_thought_at timestamptz not null,
  thought_count_at_unlock integer not null,
  unlocked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_pages (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.check_in_feed as
select
  c.id,
  c.from_user_slug,
  tk.display_name,
  tk.accent_color,
  c.created_at
from public.check_ins c
join public.tile_keys tk
  on tk.user_slug = c.from_user_slug
order by c.created_at desc;

create or replace view public.notes_feed as
select
  n.id,
  n.from_user_slug,
  tk.display_name,
  tk.accent_color,
  n.content,
  n.created_at
from public.notes n
join public.tile_keys tk
  on tk.user_slug = n.from_user_slug
order by n.created_at desc;

create index if not exists idx_check_ins_created_at on public.check_ins (created_at desc);
create index if not exists idx_check_ins_from_user_slug on public.check_ins (from_user_slug);
create index if not exists idx_notes_created_at on public.notes (created_at desc);
create index if not exists idx_notes_from_user_slug on public.notes (from_user_slug);
create index if not exists idx_note_reactions_note_id on public.note_reactions (note_id);
create index if not exists idx_urgent_signals_created_at on public.urgent_signals (created_at desc);
create index if not exists idx_urgent_signals_signal_id on public.urgent_signals (signal_id);
create index if not exists idx_urgent_signals_status on public.urgent_signals (status);
create index if not exists idx_secret_unlocks_unlocked_at on public.secret_unlocks (unlocked_at desc);
create index if not exists idx_private_pages_updated_at on public.private_pages (updated_at desc);

alter table public.tile_keys enable row level security;
alter table public.check_ins enable row level security;
alter table public.notes enable row level security;
alter table public.note_reactions enable row level security;
alter table public.urgent_signals enable row level security;
alter table public.urgent_contacts enable row level security;
alter table public.secret_unlocks enable row level security;
alter table public.private_pages enable row level security;
