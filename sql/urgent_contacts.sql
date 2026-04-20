create table if not exists public.urgent_contacts (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);

alter table public.urgent_contacts enable row level security;
