create table if not exists public.secret_page_content (
  page_slug text primary key default 'quietly-kept',
  content jsonb not null default '{}'::jsonb,
  created_by text references public.tile_keys(user_slug) on update cascade,
  updated_by text references public.tile_keys(user_slug) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint secret_page_content_slug_check check (page_slug = 'quietly-kept')
);

create table if not exists public.secret_entries (
  id uuid primary key default gen_random_uuid(),
  section_type text not null check (
    section_type in (
      'little_proof',
      'thing_i_love',
      'still_being_written'
    )
  ),
  title text not null,
  subtitle text,
  body text not null check (char_length(body) <= 20000),
  preview text,
  image_path text,
  image_alt text,
  memory_date date,
  display_date text,
  display_order integer not null default 0,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_by text references public.tile_keys(user_slug) on update cascade,
  updated_by text references public.tile_keys(user_slug) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_secret_page_content_updated_at
  on public.secret_page_content (updated_at desc);

create index if not exists idx_secret_entries_section
  on public.secret_entries (section_type, is_archived, is_pinned desc, display_order, created_at desc);

create index if not exists idx_secret_entries_created_at
  on public.secret_entries (created_at desc);

create index if not exists idx_secret_entries_updated_at
  on public.secret_entries (updated_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'secret-page-media',
  'secret-page-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.secret_page_content enable row level security;
alter table public.secret_entries enable row level security;

comment on table public.secret_page_content is
  'Protected fixed copy for the private Quietly Kept page. Read and write through Edge Functions only.';

comment on table public.secret_entries is
  'Protected living entries for the private Quietly Kept page. Read and write through Edge Functions only.';

comment on column public.secret_entries.body is
  'Long-form protected caption/story text. Supports up to 20000 characters.';
