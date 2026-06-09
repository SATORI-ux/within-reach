# Codex Handoff Prompt — Implement Quietly Kept Secret Page

You are working in the existing Within Reach repository.

Your task is to implement the **Quietly Kept Secret Page** as a careful extension of the current app, not as a rewrite and not as a separate product.

Read these docs first, in this order:

1. existing project README / repo docs
2. existing app source files for frontend and Supabase functions
3. `within-reach-secret-page-implementation-spec.md`
4. `within-reach-secret-page-content.md`
5. existing private-build / hidden-letter docs if present in the repo
6. existing next-steps / snapshot docs if present in the repo

## Core product requirement

Build a hidden page at the preferred route:

```text
/quietly-kept.html
```

This page should feel like a private, warm, restrained, object-like extension of the existing Within Reach app.

The page must include:

1. hero/title area
2. opening note
3. poem centerpiece: **Constantia**
4. Constantia and Solacium definitions
5. expandable **Little Proofs** section with image support and long captions
6. expandable **Things I Love About You** section
7. expandable **Still Being Written** section with image support and long captions
8. quiet tally of each person’s check-ins and notes
9. direct girlfriend ask section
10. editor access that is Joey-only before unlock and shared after unlock

The video should **not** be included.

## Current vision guardrails

The page should feel:

- warm
- quiet
- personal
- restrained
- literary
- softly alive
- curated rather than chaotic

It must not feel:

- like a dashboard
- like a social media feed
- like a CMS admin page
- like a proposal template
- like a puzzle UI
- like analytics
- like a public gallery

The poem **Constantia** is the centerpiece. Do not bury it beneath too much UI.

## Implementation approach

Work in small, reviewable passes.

Do not rewrite the main app architecture. Reuse existing patterns for:

- tile/session identity resolution
- Supabase Edge Functions
- frontend API wrapper
- UI rendering modules
- service/deployment conventions
- warm visual theme variables

Before coding, inspect the current repo and produce a concise plan covering:

- files to read
- files to change
- schema changes
- new functions or endpoint changes
- frontend rendering strategy
- how to verify locally/build

Then implement.

## Content

Use the exact content from `within-reach-secret-page-content.md` for:

- opening note
- poem
- Two Names section
- section intros
- tally labels
- ask section

Preserve line breaks in the poem.

## Data model

Add a secret entries table or equivalent persistence layer for living sections.

Recommended table:

```sql
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
  body text not null,
  preview text,
  image_path text,
  image_alt text,
  memory_date date,
  display_date text,
  display_order integer not null default 0,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_by text references public.tile_keys(user_slug) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add indexes and updated_at handling consistent with repo conventions.

For first pass, one primary image per entry is enough. Do not implement multi-image galleries unless the repo structure makes it trivial.

## Caption/story requirements

For Little Proofs and Still Being Written:

- support image uploads
- support long captions/stories
- minimum 3,000 characters
- preferred 10,000 characters or more
- store body in a `text` column
- show only a preview on the main page
- allow expanding or opening full detail view

Do not apply the main app’s 300-character note limit to these secret entries.

## Media upload

Use Supabase Storage or the repo’s existing upload/storage pattern.

Requirements:

- validate editor permission before upload
- do not store base64 images in database
- support jpg/jpeg/png/webp
- use controlled pathing, for example `secret-page-media/{entryId}/...`
- render images responsively
- add alt text support

## Tally requirements

Show counts for Joey and Jeszi:

- check-ins sent by user = `thoughts of you`
- notes left by user = `whispers left`

Example:

```text
Jeszi
34 thoughts of you
28 whispers left

Joey
28 thoughts of you
21 whispers left
```

Pull counts from existing `check_ins` and `notes` data.

Do not present this as analytics. No charts, badges, milestones, or large gamified counters.

## Editor requirements

Add editor capability for living sections.

Before secret unlock:

- Joey/owner can edit.
- Jeszi cannot edit.

After secret unlock:

- Joey and Jeszi can edit.
- This is true once secret state is set to unlocked, even if Jeszi has not viewed the page yet.

Server must validate this. Do not rely only on frontend visibility.

Editor may be implemented as:

```text
/quietly-kept-editor.html
```

or:

```text
/quietly-kept.html?edit=1
```

Preferred: separate editor page if this keeps the reveal page cleaner.

Editor should support:

- create entry
- edit entry
- archive/hide entry
- section type selection
- title/subtitle/date/body/preview
- image upload/replacement
- display order/pinning if reasonable

Keep the editor plain and functional. Do not let editor UI leak into the normal reveal page unless current viewer has edit permission and clicks `Edit this page`.

## API / functions

Add or extend Edge Functions according to repo conventions.

Likely functions:

- `get-secret-page`
- `upsert-secret-entry`
- `archive-secret-entry`
- `create-secret-media-upload`

`get-secret-page` should return:

- viewer identity and edit permission
- static content or keys needed by frontend
- grouped secret entries
- tally counts
- unlock/edit state

All write functions must validate current viewer and edit permission server-side.

## Styling requirements

Use the existing Within Reach visual language:

- dark warm-purple background
- soft translucent cards
- muted rose/gold accents
- literary serif typography
- generous whitespace
- subtle borders/shadows
- no harsh app chrome

Desktop:

- optional left section rail
- centered content
- poem card can span wider
- supporting sections can use a restrained grid

Mobile:

- single-column layout
- no required sticky side nav
- images stack cleanly
- poem remains readable
- expand/detail controls are easy to tap

## Acceptance criteria

Implementation is complete when:

- `/quietly-kept.html` exists and renders in-theme
- opening note is present
- **Constantia** poem is present and visually central
- The Two Names section is present
- Little Proofs renders entries with previews and expandable/detail full text
- Little Proofs supports image-backed entries
- Things I Love About You renders separately
- Still Being Written renders entries with previews and expandable/detail full text
- Still Being Written supports image-backed entries
- tally counts show both users with `thoughts of you` and `whispers left`
- ask section says `Will you be my girlfriend?`
- no video is included
- edit controls are permission-gated
- editor access is Joey-only before unlock and shared after unlock
- build passes
- existing main app behavior is not broken

## Verification

At minimum, run the project’s existing verification commands. If present:

```bash
npm run build
npm run lint
npm test
```

If no lint/test scripts exist, run the available build and document what was not available.

Also verify manually:

- main app still loads
- secret page loads
- mobile layout is usable
- no editor control is shown to unauthorized viewers
- editor can create an entry
- entry preview renders
- full caption/detail can be read
- image upload works or is cleanly stubbed if not completed in this pass
- tally counts are correct against current DB data

## Output report

When finished, provide a concise report with:

1. files read
2. files changed/created
3. schema changes
4. new/changed functions
5. verification commands run and results
6. risks or follow-up work
7. any intentionally deferred items

