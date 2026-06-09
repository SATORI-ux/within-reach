# Within Reach - Secret Page V2 Content Security and Data Contract

## Purpose

This document defines how protected secret-page content, entries, tally data, images, contribution flows, and Final Ask state should be stored and returned.

The goal is to protect the emotional content from source discovery and keep the frontend as a renderer, not a container for the secret.

## Core Security Rule

Final emotional content must not be committed to source.

This includes:

- opener
- poem
- Two Names definitions
- section intros
- girlfriend ask copy
- Yes/Talk response copy
- push notification copy
- anniversary copy
- private captions or memories

Source files may include:

- route names
- section identifiers
- neutral placeholders
- type names
- rendering code

## Protected Content Storage

Use Supabase as the protected content source.

Recommended table:

```sql
create table if not exists public.secret_page_content (
  slug text primary key,
  content_type text not null default 'text',
  body text,
  data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_by text references public.tile_keys(user_slug) on update cascade,
  updated_at timestamptz not null default now()
);
```

Use project conventions if an equivalent table already exists.

## Suggested Content Slugs

### Hero and Letter

- `hero_kicker`
- `hero_title`
- `hero_subtitle`
- `opening_note_title`
- `opening_note_body`
- `opening_note_preview`

### Poem

- `poem_title`
- `poem_subtitle`
- `poem_preview`
- `poem_body`
- `poem_segments`

`poem_segments` can be JSON:

```json
[
  {
    "id": "first_memory",
    "title": "The First Memory",
    "startLine": 0,
    "endLine": 24
  }
]
```

Alternative:

- Store poem as multiple rows by segment.

### Two Names

- `two_names_title`
- `two_names_subtitle`
- `constantia_definition`
- `solacium_definition`
- `two_names_closing_line`

### Section Intros

- `little_proofs_title`
- `little_proofs_intro`
- `living_memories_title`
- `living_memories_intro`
- `things_i_love_title`
- `things_i_love_intro`
- `whispers_title`
- `whispers_intro`
- `tally_title`
- `tally_intro`

### Tally Labels

- `tally_checkin_label`
- `tally_note_label`

Implementation meaning:

- `tally_checkin_label` may render as `thoughts of you`.
- `tally_note_label` may render as `whispers left`.

Do not confuse homepage notes with long-form Whispers.

### Final Ask Copy

- `final_ask_hidden_title`
- `final_ask_revealed_title`
- `final_ask_intro`
- `final_ask_body`
- `final_ask_question`
- `final_ask_yes_label`
- `final_ask_talk_first_label`
- `final_ask_yes_screen_copy`
- `final_ask_talk_first_screen_copy`
- `final_ask_accepted_memory_copy`
- `final_ask_joey_yes_push_title`
- `final_ask_joey_yes_push_body`
- `final_ask_jeszi_yes_push_title`
- `final_ask_jeszi_yes_push_body`
- `final_ask_anniversary_push_title`
- `final_ask_anniversary_push_body`

## Living Entry Model

Use current schema if already implemented. Recommended shape:

```sql
create table if not exists public.secret_entries (
  id uuid primary key default gen_random_uuid(),
  section_type text not null check (section_type in (
    'little_proof',
    'still_being_written',
    'thing_i_love',
    'whisper'
  )),
  title text not null,
  subtitle text,
  preview text,
  body text,
  image_path text,
  image_alt text,
  memory_date date,
  display_order integer not null default 0,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_by text not null references public.tile_keys(user_slug) on update cascade,
  subject_user_slug text references public.tile_keys(user_slug) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

If `subject_user_slug` is not yet present, add it in the Things I Love grouping pass.

## Length Constraints

Recommended:

- Little Proof body: 15,000 characters.
- Living Memory body: 15,000 characters.
- Things I Love body: 15,000 characters.
- Whisper body: 15,000 characters.
- Preview: 180 to 300 characters, or a practical upper bound around 500.

Do not reuse the homepage 300-character note limit for secret entries.

## Media Storage

Use a private Supabase Storage bucket:

```text
secret-page-media
```

Object path pattern:

```text
{entryId}/{generatedSafeFilename}
```

Do not duplicate the bucket name inside the object path.

Images should be returned through signed URLs after authorization.

Allowed types:

- jpg
- jpeg
- png
- webp

Recommended max size:

- 10 MB

## API / Edge Function Contract

### `get-secret-page`

Returns protected page data after validating viewer.

Recommended response fields:

```json
{
  "viewer": {
    "user_slug": "joey",
    "display_name": "Joey"
  },
  "secret": {
    "unlocked": true,
    "unlocked_at": "..."
  },
  "permissions": {
    "can_edit_fixed_content": true,
    "allowed_entry_sections": ["still_being_written", "thing_i_love", "whisper"]
  },
  "content": {},
  "entries": {
    "little_proof": [],
    "still_being_written": [],
    "thing_i_love": [],
    "whisper": []
  },
  "tally": {
    "joey": {
      "check_ins": 0,
      "notes": 0
    },
    "jeszi": {
      "check_ins": 0,
      "notes": 0
    }
  },
  "final_ask": {}
}
```

Per entry, include `can_edit` only as a UI convenience. Backend functions must still enforce permissions.

### `upsert-secret-page-content`

Joey-only fixed content update.

Do not permit Jeszi to update fixed content after unlock.

### `upsert-secret-entry`

Creates or updates living entries.

Must validate:

- viewer identity
- section type
- secret unlock state for Jeszi
- creator ownership for edits
- body length
- subject inference for Things I Love

### `archive-secret-entry`

Soft archives living entries.

Must validate creator ownership or explicit owner override.

### `create-secret-media-upload`

Creates signed upload target for entry media.

Must validate the same permissions as entry editing.

### `get-secret-entry` or detail support

If detail views require a dedicated function, it must validate viewer access and return one entry plus signed image URL.

It may also be handled by `get-secret-page` if the payload size remains reasonable.

## Contribution Route Contract

The focused contribution page should call existing entry APIs.

Recommended route:

```text
/quietly-kept-entry.html
```

Create mode:

```text
?section=still_being_written
?section=thing_i_love
?section=whisper
```

Edit mode:

```text
?entry=<entry_id>
```

The route should not expose fixed-content editing.

## Tally Source

Tally counts must come from main app activity:

- `thoughts of you` = `check_ins` grouped by `from_user_slug`
- `whispers left` = homepage `notes` grouped by `from_user_slug`

Do not count:

- Little Proofs
- Living Memories
- Things I Love
- long-form Whispers
- Final Ask responses

## RLS / Direct Client Access

Protected tables and storage should not be directly readable by anon/client access.

Content should be returned through validated Edge Functions using service-role access.

The frontend should not perform direct Supabase table reads for protected secret content.

## Noindex

Add this to private pages:

```html
<meta name="robots" content="noindex, nofollow">
```

This is not security, but it is good privacy hygiene.

## Protected Route Verification Boundary

A coding agent without a valid Joey/Jeszi tile key or stored session cannot fully verify protected routes in a browser.

The agent should not:

- try to bypass auth
- invent credentials
- repeatedly chase generic route access
- spend tokens debugging expected locked states as if they are implementation failures

The agent should verify:

- builds
- Deno checks
- source-level permission branches
- closed/unauthorized states
- manual test cases to run with valid sessions

## Acceptance Criteria

Implementation is correct when:

- Final emotional content is absent from source.
- Protected content is returned only after server-side validation.
- Direct anon/client table reads are not permitted for secret content.
- Entry media uses signed URLs or protected access.
- Contribution pages use entry APIs without exposing broad editor controls.
- Tally values come only from `check_ins` and homepage `notes`.
- Final Ask state is stored separately from ordinary content.
