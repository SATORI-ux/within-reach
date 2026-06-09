# Within Reach Secret Page Implementation Spec

## Working feature name

**Quietly Kept Secret Page**

Preferred route:

```text
/quietly-kept.html
```

This page is the hidden destination behind the private-build footer interaction. It is not a separate product, not a puzzle page, not a proposal splash screen, and not a public gallery. It is a quiet extension of Within Reach.

## Purpose

The secret page should preserve the original emotional purpose of the hidden letter while adapting to the current reality:

- Jeszi may already know that a secret exists.
- She does not know what the secret contains.
- The video is no longer part of the page.
- The poem **Constantia** is now the centerpiece.
- The page should become a place to return to and grow over time.
- The relationship question should remain present, direct, and intentional.

The page should feel like:

- a private object opened carefully
- a kept place, not a feature hub
- warm, dark, literary, quiet, and restrained
- emotionally significant without becoming theatrical
- expandable without becoming chaotic

It should not feel like:

- a dashboard
- a social feed
- a proposal website template
- an archive dump
- a productivity/admin tool
- a puzzle interface
- a stats page

## Visual reference

The current visual direction is a dark, warm-purple page with soft translucent cards, literary serif typography, muted rose/gold accents, generous spacing, and a narrow centered content column. A left-side section rail is acceptable on desktop, but mobile should collapse to a simple single-column layout.

The page can use these major visual zones:

1. top app chrome with `within reach`, return link, theme control, and optional edit control
2. hero area with eyebrow `QUIETLY KEPT`, title, and subtitle
3. opening note / held-here card
4. poem centerpiece card
5. supporting sections in cards or subdued grids
6. final ask card
7. quiet footer line

Do not make the page visually louder than the main app. The poem should be the visual and emotional high point.

## High-level page order

Use this order unless the existing codebase strongly suggests a better implementation shape:

1. **Hero / page title**
2. **Opening Note**
3. **Constantia**, poem centerpiece
4. **The Two Names**, Constantia and Solacium definitions
5. **Little Proofs**, expandable memory/media entries
6. **Things I Love About You**, expandable observations
7. **Still Being Written**, expandable living/archive entries
8. **A Small Tally**, quiet check-in/note counts
9. **The Part I Meant to Ask**, girlfriend question
10. **Quiet footer**

The page can show a left-side section navigation on desktop:

- The letter
- Constantia
- The two names
- Little proofs
- Things I love
- Still being written
- A small tally
- The part I meant

On mobile, do not force a sticky side nav. Use simple scroll anchors or no nav.

## Hero

Recommended displayed copy:

```text
QUIETLY KEPT
A page kept open.
The note itself has been placed here now.
```

If the page is accessed before content exists or while still in placeholder mode, it may show:

```text
QUIETLY KEPT
A page kept open.
The note itself has not been placed here yet.
```

But after this implementation, prefer real content. Avoid leaving placeholder copy in production.

## Opening Note

Purpose:

- acknowledge that the secret changed shape
- preserve mystery because she knows only that the secret exists, not what it contains
- avoid self-sabotage, heavy apology, or focusing on weakness
- frame the page as intentional and still meaningful

Opening note should use the content in `within-reach-secret-page-content.md`.

## Poem centerpiece

The poem **Constantia** is the emotional center of the page.

Design requirements:

- give it the most visual breathing room
- do not hide it behind an accordion by default
- support a `Read full poem` button if the preview is displayed elsewhere, but the main page should allow a full reading path
- preserve line breaks exactly
- use a readable max-width
- avoid cramped line height
- avoid tiny text
- avoid decorative treatment that competes with the words

Suggested implementation:

- The poem card shows the title, a small subtitle such as `A poem for you.`, and either:
  - the full poem inline, or
  - selected excerpts with a button opening a full poem detail view/modal.

For the first implementation, full inline display is acceptable if the page remains readable. If it becomes too long, use a dedicated detail view:

```text
/quietly-kept.html?section=constantia
```

or hash route:

```text
/quietly-kept.html#constantia
```

Do not use a route name like `/poem.html` unless the existing app conventions require it.

## The Two Names

Purpose:

- define the private words **Constantia** and **Solacium**
- make them referenceable
- preserve the tattoo/reminder significance without over-explaining
- connect the poem title to the app’s larger concept

Recommended visual treatment:

- two small definition cards side by side on desktop
- stacked cards on mobile
- each card has the word, definition, and a short assignment line
- final tying line below both cards

Use content from `within-reach-secret-page-content.md`.

## Little Proofs

Purpose:

Small, specific evidence of why the poem is true.

This is for:

- older memories
- past images
- old texts or screenshots
- early relationship moments
- things remembered from the long shared history
- reflections that support the emotional thesis of the page

This should be expandable and additive over time.

### Entry behavior

Each entry should support:

- title
- optional subtitle
- optional date or loose display date
- optional primary image upload
- optional image alt text
- body/caption/story text
- preview text
- section type
- display order
- pinned state
- archive/hide state
- created/updated metadata

The preview should show a small excerpt only, around 180 to 300 characters.

The full caption/story should be expandable or viewable on a detail view.

### Caption length

Do not use the main app’s 300-character note constraint here.

Minimum requirement:

- support at least **3,000 characters** per caption/story

Preferred requirement:

- support **10,000 characters** per caption/story

Database field should be `text`. The frontend may enforce a soft limit, but should not make the section feel cramped. If a hard limit is needed, set it to 10,000 or 20,000 characters.

### Detail view

For long entries, prefer a detail state rather than expanding huge text directly in the main page.

Acceptable patterns:

```text
/quietly-kept.html?entry=ENTRY_ID
```

or:

```text
/quietly-kept.html#entry/ENTRY_ID
```

A detail view should show:

- full image
- title
- display date
- full story/caption
- optional previous/next navigation
- return to Quietly Kept

Keep the detail view visually consistent with the secret page.

## Things I Love About You

Purpose:

Short expandable observations about Jeszi.

This is separate from memories. It should be about who she is, how she moves through the world, and what Joey notices.

Example item headings:

- The way you understand without needing everything explained
- The way you stay soft without being weak
- The way your mind works
- The way you make ordinary things feel marked
- The way you care, even when you pretend you are not being sentimental

Each entry can use the same underlying entry system as Little Proofs, but should be sectioned separately.

Recommended behavior:

- mostly text entries
- optional image support is fine but not required
- preview list is acceptable
- expand to show 2 to 5 sentences or longer if needed

## Still Being Written

Purpose:

A living section for new shared memories after the secret page exists.

It should communicate:

- the page is not a sealed museum
- the relationship is still becoming
- new proof can be added
- ordinary things can keep being preserved

This section should support the same media/caption behavior as Little Proofs:

- image uploads
- long captions/stories
- small preview on main page
- full expandable/detail view

This section can be chronological, newest first, unless an explicit display order is set.

Suggested subtitle:

```text
This part grows as we do.
```

## A Small Tally

Purpose:

Show a quiet private count of interaction traces without turning it into a public scoreboard.

It should summarize:

- how many `Thinking of you` check-ins each person has sent
- how many notes each person has left

Labels:

- `thoughts of you` = `check_ins` count
- `whispers left` = `notes` count

Avoid:

- “total check-ins”
- “total notes”
- dashboards
- charts
- milestones
- badges
- celebratory count animations

Recommended copy:

```text
A Small Tally
Not a score. Just proof of return.
```

Recommended display:

```text
Jeszi
34 thoughts of you
28 whispers left

Joey
28 thoughts of you
21 whispers left
```

The exact numbers should be pulled from existing app data.

## The Part I Meant to Ask

Purpose:

Preserve the “Will you be my girlfriend?” ask without needing the video.

This section should work in multiple scenarios:

- Joey tells her about the secret instead of asking in person.
- Joey asks in person first, then shows the page as proof that he had planned to ask all along.
- She finds the page after unlock and reads it as the intended reveal.

This section should be direct, warm, and low-pressure, but not evasive.

Use content from `within-reach-secret-page-content.md`.

The button can be visual only at first, or interactive if desired.

If interactive, recommended behavior:

- Button text: `Yes. ♡`
- Optional secondary text: `Or tell me out loud. That would be better anyway.`
- Do not force an in-app response.
- Do not send push notifications on answer unless explicitly planned later.
- Do not create a public feed event.

## Shared editor behavior

The page should support private editing in phases.

### Before secret unlock

- Joey/owner can create/edit secret page content.
- Jeszi should not see editor controls.
- The public/revealed page should not expose editing UI.

### After secret unlock

Once secret state is set to unlocked, the editor may become shared for both Joey and Jeszi, even if Jeszi has not viewed the page yet.

This is intentional. The unlock state is enough to allow the shared editor.

### Editor access rules

- Do not rely on query params alone for access.
- Use existing tile/session identity resolution.
- Server must validate current user.
- Before unlock, restrict editing to Joey/owner.
- After unlock, allow both Joey and Jeszi.
- Add a quiet `Edit this page` control only when current user has edit permission.

### Editor UX

Keep editor UI separate enough that it does not pollute the secret page reveal.

Acceptable patterns:

```text
/quietly-kept-editor.html
```

or:

```text
/quietly-kept.html?edit=1
```

Preferred for maintainability:

```text
/quietly-kept-editor.html
```

Editor should support:

- add/edit/archive entries
- choose section type
- upload or replace image
- edit title/subtitle/date/body/preview
- pin/display order
- preview before saving

Do not overbuild rich text in the first pass. Plain text with preserved line breaks is enough.

## Data model recommendation

Add a secret entry table rather than overloading normal notes.

Suggested SQL shape:

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

create index if not exists secret_entries_section_idx
  on public.secret_entries(section_type, is_archived, display_order, created_at desc);
```

If multiple images per entry are needed later, add:

```sql
create table if not exists public.secret_entry_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.secret_entries(id) on delete cascade,
  image_path text not null,
  image_alt text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

For first pass, one primary image per entry is enough.

## Media storage

Use Supabase Storage for secret page images.

Recommended bucket:

```text
secret-page-media
```

Requirements:

- upload through a server-validated flow or signed upload URL
- validate editor permission before upload
- store storage path in `secret_entries.image_path`
- render via signed URL or controlled public bucket depending current app conventions
- support common formats: jpg, jpeg, png, webp
- consider file size cap around 10 MB initially

Do not store base64 images in the database.

## API / Edge Function recommendations

Add or extend server-side handlers. Names can follow existing project conventions.

Recommended handlers:

### `get-secret-page`

Input:

- tile/session key or current session resolution

Behavior:

- validate visitor if required by current architecture
- return page content
- return entries grouped by section
- return tally counts
- return current user permissions
- return secret unlock state only if needed for UI behavior

Response shape concept:

```json
{
  "ok": true,
  "viewer": {
    "user_slug": "joey",
    "display_name": "Joey",
    "can_edit_secret_page": true
  },
  "page": {
    "secret_unlocked": true
  },
  "content": {
    "opening_note": "...",
    "poem": "...",
    "two_names": {...},
    "ask": {...}
  },
  "entries": {
    "little_proof": [],
    "thing_i_love": [],
    "still_being_written": []
  },
  "tally": {
    "joey": { "thoughts_of_you": 28, "whispers_left": 21 },
    "jeszi": { "thoughts_of_you": 34, "whispers_left": 28 }
  }
}
```

### `upsert-secret-entry`

Input:

- entry fields
- tile/session identity

Behavior:

- validate editor permission
- validate section type
- validate required title/body
- apply length limits only if chosen
- insert/update entry
- return saved entry

### `archive-secret-entry`

Input:

- entry id
- tile/session identity

Behavior:

- validate editor permission
- set `is_archived = true`

### `create-secret-media-upload`

Input:

- filename
- mime type
- tile/session identity

Behavior:

- validate editor permission
- create signed upload URL or use project’s chosen upload pattern

## Content storage strategy

For the first implementation, static content can live in `js/config.js` or a dedicated content module:

```text
js/secret-content.js
```

Recommended static content:

- opening note
- Constantia poem
- The Two Names definitions
- The Part I Meant to Ask copy

Dynamic database content:

- Little Proofs
- Things I Love About You
- Still Being Written
- Tally counts from existing tables

This avoids overbuilding a CMS for static emotional copy while still allowing living sections to grow.

## Security and privacy

This is a private two-person app, but do not make avoidable mistakes.

Requirements:

- validate tile/session server-side for all secret page reads if the route is not fully public
- validate edit permissions server-side
- never expose editor controls based only on frontend checks
- do not expose archived entries
- do not expose upload paths for entries the viewer cannot access
- avoid logging emotional page content unnecessarily
- do not expose secret state as visible UI chrome

## Responsive behavior

Desktop:

- centered content max width
- optional left section nav
- cards can be two-column where appropriate
- poem gets a full-width center card

Mobile:

- single column
- no sticky side nav required
- image cards stack
- expandable captions should be easy to open and close
- poem line breaks must remain readable
- avoid tiny serif text

## Acceptance criteria

The implementation is acceptable only if:

- the video is not included on the page
- the poem **Constantia** is the centerpiece
- opening note appears before poem
- Constantia/Solacium definitions are visible and referenceable
- Little Proofs supports image entries and long captions/stories
- Still Being Written supports image entries and long captions/stories
- long captions show small previews by default and full content on expand/detail
- the tally shows counts for both Joey and Jeszi using personal labels, not dashboard labels
- the girlfriend ask is present and direct
- editor access is Joey-only before unlock and shared after unlock
- editor access is server-validated
- the page remains quiet, warm, restrained, and object-like
- no section feels like a scoreboard, social feed, or CMS dashboard

## Explicit non-goals

Do not implement in this pass unless specifically requested:

- video embed/upload
- public sharing
- comments
- likes/reactions on secret entries
- visible unlock progress
- SMS behavior
- analytics dashboards
- complex rich text editor
- multi-user account login
- AI-generated entry suggestions inside the app

