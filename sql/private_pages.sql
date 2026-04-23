create table if not exists public.private_pages (
  user_slug text primary key references public.tile_keys(user_slug) on update cascade,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_private_pages_updated_at
  on public.private_pages (updated_at desc);

alter table public.private_pages enable row level security;

comment on table public.private_pages is
  'Protected per-user private page content for the private Within Reach build.';

comment on column public.private_pages.content is
  'Structured json payload rendered by kept.html in the protected private preview project.';

-- Apply sql/private_pages_starter.sql only in the private build database when
-- you want a concrete starter row for the protected kept page.
