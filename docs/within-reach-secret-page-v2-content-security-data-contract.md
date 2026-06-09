# Within Reach - Secret Page V2 Content Security and Data Contract

## Purpose

This document defines how protected secret-page content, entries, tally data, images, and Final Ask state should be stored and returned.

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

Possible `content_type` values:

- `text`
- `markdown`
- `poem`
- `json`
- `label`

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
- `tally_joey_label`
- `tally_jeszi_label`

### Final Ask

- `final_ask_card_title`
- `final_ask_card_teaser`
- `final_ask_reveal_button`
- `final_ask_body`
- `final_ask_question`
- `final_ask_yes_label`
- `final_ask_talk_first_label`
- `final_ask_yes_screen_title`
- `final_ask_yes_screen_body`
- `final_ask_talk_first_screen_body`
- `final_ask_memory_title`
- `final_ask_memory_body`
- `final_ask_joey_push_title`
- `final_ask_joey_push_body`
- `final_ask_jeszi_push_title`
- `final_ask_jeszi_push_body`
- `final_ask_talk_first_push_title`
- `final_ask_talk_first_push_body`
- `final_ask_anniversary_push_title`
- `final_ask_anniversary_push_body`

## RLS and Direct Client Access

The frontend likely contains a Supabase anon key. Therefore:

- `secret_page_content` should not be directly readable by anon access.
- `secret_entries` should not be directly readable by anon access.
- `secret-page-media` should not be public unless deliberately decided.
- Protected reads should go through Edge Functions.
- Edge Functions may use service-role access after validating the viewer.

RLS should deny direct anon reads/writes unless the project has a very specific and tested policy.

## Storage Contract

Bucket:

- `secret-page-media`

Object path:

- `{entryId}/{safeGeneratedFilename}`

Do not duplicate the bucket name inside the object path.

Allowed types:

- image/jpeg
- image/png
- image/webp

Recommended max size:

- 10 MB

Image URLs:

- returned as signed URLs from Edge Functions
- not permanently public unless explicitly approved

## `get-secret-page` Payload Contract

The protected page read function should return a structured payload.

Suggested shape:

```json
{
  "ok": true,
  "viewer": {
    "user_slug": "joey",
    "display_name": "Joey",
    "accent_color": "green"
  },
  "secret": {
    "unlocked_at": "2026-06-09T00:00:00Z",
    "can_view": true,
    "can_edit_fixed_content": true,
    "allowed_entry_sections": ["little_proof", "living_memory", "thing_i_love", "whisper"]
  },
  "content": {
    "hero": {},
    "opening_note": {},
    "poem": {},
    "two_names": {},
    "section_intros": {},
    "tally_labels": {},
    "final_ask_copy": {}
  },
  "entries": {
    "little_proof": [],
    "living_memory": [],
    "thing_i_love": [],
    "whisper": []
  },
  "tally": {
    "joey": {
      "thoughts_of_you": 0,
      "whispers_left": 0
    },
    "jeszi": {
      "thoughts_of_you": 0,
      "whispers_left": 0
    }
  },
  "final_ask": {
    "status": "hidden",
    "response": null,
    "accepted_at": null,
    "can_reveal": true,
    "can_respond": false,
    "can_reset": true,
    "should_show_celebration": false
  }
}
```

Use actual project naming conventions, but preserve these concepts.

## Tally Contract

The tally must count the existing main app tables:

- `thoughts_of_you` = count of `check_ins` grouped by `from_user_slug`
- `whispers_left` = count of `notes` grouped by `from_user_slug`

Do not count:

- `secret_entries`
- Whispers section entries
- image uploads
- page views
- reactions

If the label becomes confusing later, rename the display label, not the source of truth.

## Entry Contract

Entry payload:

```json
{
  "id": "entry-id",
  "section_type": "whisper",
  "created_by": "joey",
  "created_by_display_name": "Joey",
  "subject_user_slug": null,
  "title": "Optional title",
  "subtitle": "Optional subtitle",
  "preview": "Short preview",
  "body": "Full body",
  "image_url": "signed-url-or-null",
  "image_alt": "Alt text",
  "memory_date": "2026-06-09",
  "display_order": 0,
  "is_pinned": false,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "can_edit": true
}
```

The server should attach `can_edit` based on ownership and permissions.

## Noindex

Add to private pages:

```html
<meta name="robots" content="noindex, nofollow">
```

This is not security. It is privacy hygiene.

## Content Bootstrap

Provide one safe path for inserting final protected content.

Preferred:

- Use the editor page after deployment.

Acceptable:

- A local SQL template with placeholders only.
- User fills it locally and does not commit it.

Avoid:

- committed seed files with final content
- migrations containing final content
- markdown docs containing final content

## Verification Checklist

Before considering a pass complete:

- Search source for final secret phrases before commit.
- Confirm no final poem/opener/ask copy exists in repo files.
- Confirm anon Supabase access cannot read protected tables directly.
- Confirm Edge Function rejects unauthorized viewers.
- Confirm signed image URLs expire.
- Confirm locked Jeszi session receives no protected content.
- Confirm Joey can view before unlock.
- Confirm Jeszi can view only after unlock.
- Confirm editor controls match server permissions.
