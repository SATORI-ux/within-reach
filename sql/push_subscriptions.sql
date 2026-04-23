create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_slug text not null references public.tile_keys(user_slug) on update cascade,
  endpoint text not null unique,
  subscription_json jsonb not null,
  device_session_id bigint references public.device_sessions(id) on update cascade on delete set null,
  device_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.push_subscriptions
  add column if not exists device_session_id bigint references public.device_sessions(id) on update cascade on delete set null;

alter table if exists public.push_subscriptions
  add column if not exists device_label text;

create index if not exists idx_push_subscriptions_user_slug
  on public.push_subscriptions (user_slug);

create index if not exists idx_push_subscriptions_device_session_id
  on public.push_subscriptions (device_session_id);

alter table public.push_subscriptions enable row level security;
