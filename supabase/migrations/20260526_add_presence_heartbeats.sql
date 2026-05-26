create table if not exists public.presence_heartbeats (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_presence_heartbeats_last_seen_at
  on public.presence_heartbeats (last_seen_at desc);

alter table public.presence_heartbeats enable row level security;
