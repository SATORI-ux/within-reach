alter table if exists public.secret_entries
  add column if not exists subject_user_slug text references public.tile_keys(user_slug) on update cascade;

update public.secret_entries
set subject_user_slug = case
  when created_by = 'joey' then 'jeszi'
  when created_by = 'jeszi' then 'joey'
  else subject_user_slug
end
where section_type = 'thing_i_love'
  and subject_user_slug is null;

create index if not exists idx_secret_entries_love_subject
  on public.secret_entries (section_type, created_by, subject_user_slug, is_archived);

comment on column public.secret_entries.subject_user_slug is
  'For subject-aware living entries, especially Things I Love.';
