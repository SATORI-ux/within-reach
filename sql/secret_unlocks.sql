create table if not exists public.secret_unlocks (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade,
  first_thought_at timestamptz not null,
  thought_count_at_unlock integer not null,
  unlocked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_secret_unlocks_unlocked_at
  on public.secret_unlocks (unlocked_at desc);

alter table public.secret_unlocks enable row level security;
