create table if not exists public.native_push_tokens (
  id bigint generated always as identity primary key,
  user_slug text not null references public.tile_keys(user_slug) on update cascade,
  token text not null unique,
  platform text not null default 'android' check (platform in ('android')),
  device_session_id bigint references public.device_sessions(id) on update cascade on delete set null,
  device_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_native_push_tokens_user_slug
  on public.native_push_tokens (user_slug);

create index if not exists idx_native_push_tokens_device_session_id
  on public.native_push_tokens (device_session_id);

alter table public.native_push_tokens enable row level security;
