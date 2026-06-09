# Within Reach - Living Sections and Whispers Spec

## Purpose

This spec defines the expandable living sections for the Quietly Kept secret page.

The page should become a place to return to, not only a one-time reveal.

## Section Types

The living content model should support at least these section types:

- `little_proof`
- `living_memory`
- `thing_i_love`
- `whisper`

The existing implementation may already have some names. Use migrations carefully and map old values if needed.

## Emotional Definitions

### Little Proofs

Meaning:

- Curated evidence of why the poem is true.
- Past or present moments.
- Images, texts, screenshots, short observations, and longer captions.

Tone:

- Tender.
- Specific.
- Memory-focused.

Edit policy:

- Joey-authored by default.
- Jeszi may view after unlock.
- Mutual contribution optional later.

### Living Memories

Meaning:

- Future-facing additions.
- New moments added after the page exists.
- Proof that the page is still open.

Tone:

- Ongoing.
- Gentle.
- Shared.

Edit policy:

- Shared after unlock.
- Creator-owned entries.

### Things I Love

Meaning:

- Observations about the other person.
- Not generic compliments.
- Specific patterns, traits, habits, and private recognitions.

Tone:

- Warm.
- Specific.
- Sometimes lightly funny.

Required structure:

- `created_by`
- `subject_user_slug`

Rendering:

- Things Joey loves about Jeszi.
- Things Jeszi loves about Joey.

### Whispers

Meaning:

- Long-form intimate keepsakes.
- Longer poems.
- Vulnerable notes.
- Secrets exchanged in person but not ready for ordinary conversation.
- Words that needed somewhere quiet to stay.

Tone:

- More private than notes.
- More intimate than ordinary memories.
- Still restrained.

Recommended section copy should live in Supabase content, not source.

Placeholder intent:

- Title: `Whispers`
- Subtitle intent: longer things, kept softer
- Description intent: poems, secrets, and words that needed somewhere quiet to stay

## Naming Collision Note

The existing tally may use the label `whispers left` for homepage notes.

Adding a `Whispers` section creates a possible naming collision.

Recommended internal distinction:

- Homepage notes tally label may remain emotionally named `whispers left`.
- New long-form section should use internal type `whisper` or `long_whisper`.
- Backend tally must continue to count only the intended homepage `notes` table unless intentionally changed.

Do not accidentally count long-form Whispers in the homepage note tally.

## Data Model

Recommended `secret_entries` fields:

```sql
id uuid primary key default gen_random_uuid(),
section_type text not null,
created_by text not null references public.tile_keys(user_slug) on update cascade,
subject_user_slug text references public.tile_keys(user_slug) on update cascade,
title text,
subtitle text,
preview text,
body text not null default '',
image_path text,
image_alt text,
memory_date date,
display_order integer not null default 0,
is_pinned boolean not null default false,
is_archived boolean not null default false,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Use existing project conventions if IDs are bigint instead of uuid.

### Section Type Constraints

Allowed values:

- `little_proof`
- `living_memory`
- `thing_i_love`
- `whisper`

### Body Length Constraints

Minimum supported body lengths:

- `little_proof`: 20,000 characters
- `living_memory`: 20,000 characters
- `thing_i_love`: 10,000 characters
- `whisper`: 15,000 characters

Recommendation:

- Use `text` in Postgres.
- Enforce app-level max in Edge Functions.
- Do not use the homepage note 300-character constraint.

### Preview

Use either:

- manually entered preview, or
- generated preview from body if blank.

Rules:

- Preview length: 180 to 300 characters.
- Do not strip meaning aggressively.
- Preserve body line breaks in full detail, not preview.

## Media Support

First pass:

- one primary image per entry
- image path stored on `secret_entries`
- image alt text required or strongly encouraged

Storage:

- private Supabase bucket: `secret-page-media`
- object path: `{entryId}/{safeGeneratedFilename}`
- signed URL returned by Edge Function

Allowed file types:

- jpg
- jpeg
- png
- webp

Recommended max:

- 10 MB

Future out of scope:

- multi-image galleries
- image rearrangement
- reactions on entries
- public sharing

## Rendering Rules

### Main Page

Show previews only.

Per card:

- image thumbnail if present
- title
- subtitle/date if present
- author if section is shared
- preview
- `Read more` or section-appropriate button

### Detail View

Show:

- full image
- title
- date
- author
- full body
- back control

Avoid:

- nested scroll boxes
- tiny text
- full long entries inline on the main page

## Things I Love Grouping

Required fields:

- `created_by`
- `subject_user_slug`

Render as:

### Things Joey loves about Jeszi

Entries:

- `section_type = thing_i_love`
- `created_by = joey`
- `subject_user_slug = jeszi`

### Things Jeszi loves about Joey

Entries:

- `section_type = thing_i_love`
- `created_by = jeszi`
- `subject_user_slug = joey`

Do not mix both into one undifferentiated list.

## Editor Behavior

### Entry Form Fields

- Section type
- Subject user, only for `thing_i_love`
- Title
- Subtitle
- Preview
- Body
- Memory date
- Display order
- Pinned
- Image upload
- Image alt

### Whispers Form

For Whispers:

- show a clear long-body character count
- limit 15,000 characters
- no pressure to add image
- preserve line breaks
- title optional but recommended

### Permission Filtering

The editor must only show section types allowed for the current viewer.

After unlock:

- Jeszi can create:
  - `living_memory`
  - `thing_i_love` with subject Joey
  - `whisper`
- Jeszi cannot create fixed content.
- Jeszi cannot edit Joey’s entries.

## Acceptance Criteria

The living section work is complete when:

- Long entries do not break mobile layout.
- Main page shows previews only.
- Detail views show full bodies.
- Whispers support 15,000 characters.
- Whispers are separate from homepage notes.
- Tally does not accidentally count Whispers.
- Things I Love is grouped by author and subject.
- Images upload and render through signed URLs.
- Each user can only edit allowed sections and owned entries.
