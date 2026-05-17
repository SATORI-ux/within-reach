alter table public.notes
  add column if not exists note_type text not null default 'text';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_note_type_check'
  ) then
    alter table public.notes
      add constraint notes_note_type_check
      check (note_type in ('text', 'drawing'));
  end if;
end $$;

create table if not exists public.note_drawings (
  note_id bigint primary key references public.notes(id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'image/png',
  width integer not null,
  height integer not null,
  size_bytes integer,
  ink_color text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-drawings', 'note-drawings', false, 524288, array['image/png'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace view public.notes_feed as
select
  n.id,
  n.from_user_slug,
  tk.display_name,
  tk.accent_color,
  n.content,
  n.created_at,
  n.note_type
from public.notes n
join public.tile_keys tk
  on tk.user_slug = n.from_user_slug
order by n.created_at desc;