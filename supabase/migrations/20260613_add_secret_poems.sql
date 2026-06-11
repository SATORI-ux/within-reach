alter table if exists public.secret_entries
  drop constraint if exists secret_entries_section_type_check;

alter table if exists public.secret_entries
  add constraint secret_entries_section_type_check check (
    section_type in (
      'little_proof',
      'thing_i_love',
      'still_being_written',
      'whisper',
      'poem'
    )
  );

comment on constraint secret_entries_section_type_check on public.secret_entries is
  'Allowed protected living entry sections for Quietly Kept, including long-form Whispers and poems.';
