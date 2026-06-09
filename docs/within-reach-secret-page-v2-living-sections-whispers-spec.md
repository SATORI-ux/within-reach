# Within Reach - Secret Page V2 Living Sections and Whispers Spec

## Purpose

This spec defines the living sections of the Quietly Kept secret page and how they should grow over time without making the main page feel cluttered or administrative.

Living sections are not fixed reveal content. They are places where the relationship can keep accumulating proof, memory, affection, and private writing.

## Living Section Model

Use `secret_entries` or the current equivalent table for living content.

Recommended entry types:

- `little_proof`
- `still_being_written`
- `thing_i_love`
- `whisper`

Product labels:

- `little_proof` = Little Proofs
- `still_being_written` = Living Memories, or Still Being Written if that label remains preferred
- `thing_i_love` = Things I Love
- `whisper` = Whispers

## Main Page Display Rule

The main page should show previews, not full long content.

For each living section:

- show section title
- show section intro
- show 1 to 3 recent or pinned cards
- show `View all` if there are more entries
- show one quiet section-specific `Add...` action when permitted

The main page should not become an endless scroll of long captions, long poems, or large forms.

## Detail View Rule

Long content opens in a focused detail view.

Recommended URL:

```text
/quietly-kept.html?entry=<entry_id>
```

Detail view should:

- preserve line breaks and paragraph spacing
- render image, title, subtitle/date, author, and full body
- provide a quiet back link
- avoid heavy modal styling on mobile

## Contribution Flow Rule

Adding or editing living entries happens on a focused contribution page.

Recommended create routes:

```text
/quietly-kept-entry.html?section=still_being_written
/quietly-kept-entry.html?section=thing_i_love
/quietly-kept-entry.html?section=whisper
```

Recommended edit route:

```text
/quietly-kept-entry.html?entry=<entry_id>
```

The contribution page is section-specific and should not expose unrelated editor controls.

## Little Proofs

### Purpose

Little Proofs are curated proof-of-origin entries.

They may include:

- early memories
- old images
- old texts
- moments that explain the poem or original secret
- things Joey noticed before the relationship became clear

### First-pass policy

Preferred:

- Little Proofs remain Joey-authored.
- Jeszi can view Little Proofs after unlock.
- Jeszi does not add/edit Little Proofs in the first shared contribution model.

Reason:

Little Proofs support the original secret. They are not the same as future shared memories.

### Main page behavior

- show 2 to 3 proof cards
- image optional
- preview optional
- full story opens in detail view

## Living Memories / Still Being Written

### Purpose

Living Memories are future-facing additions.

They may include:

- new photos
- new visits
- shared experiences
- meaningful small moments
- ordinary things that became marked because the other person was there

### Recommended label

Use **Living Memories** if the intent is clarity.

Use **Still Being Written** if the intent is more poetic.

Either is acceptable, but do not use both as separate sections unless the distinction is meaningful.

### Main page button

```text
Add a memory
```

### Fields

- title
- optional subtitle
- optional memory date
- optional image
- image alt text
- preview
- body/story
- display order / pinned if supported

### Body length

Use the same long-entry capability as other living entries.

Recommended:

- hard limit: 15,000 characters
- preview: 180 to 300 characters

### Permissions

- Joey can create his own entries.
- Jeszi can create her own entries after unlock.
- Each person edits/archives their own entries.

## Things I Love

### Purpose

Things I Love is for affectionate observations about the counterpart.

It should not become a mixed undifferentiated pile once both people can contribute.

### Required structure

Each entry should support:

- `created_by`
- `subject_user_slug`

Expected normal mapping:

- Joey creates entries with `subject_user_slug = jeszi`.
- Jeszi creates entries with `subject_user_slug = joey`.

The focused contribution form should infer the subject automatically.

### Main page rendering

Render separate groups:

```text
Things Joey loves about Jeszi
Things Jeszi loves about Joey
```

On mobile, show compact previews for each group.

### Main page button

For Joey:

```text
Add something I love about Jeszi
```

For Jeszi:

```text
Add something I love about Joey
```

### Permissions

- Joey can create/edit/archive his own entries.
- Jeszi can create/edit/archive her own entries after unlock.
- Cross-editing is not allowed in normal UI.

## Whispers

### Purpose

Whispers are long-form intimate keepsakes.

They are separate from homepage notes.

Whispers are for:

- long poems
- vulnerable notes
- private truths
- secrets exchanged in person
- things not ready for ordinary conversation, but worth keeping somewhere safe

### Tone

Whispers should feel more intimate than notes, but not heavy by default.

Suggested section line:

```text
Longer things, kept softer.
```

### Main page button

```text
Add a whisper
```

### Fields

- title
- optional subtitle
- preview
- body
- optional image
- image alt text

### Body limit

- 15,000 characters.

### Main page behavior

- show only previews
- do not show full Whispers inline by default
- full content opens in focused detail view

### Tally behavior

Whispers do not count toward the existing tally unless the product intentionally changes later.

The current tally meaning remains:

- `thoughts of you` = `check_ins`
- `whispers left` = homepage `notes`

This is slightly semantically overloaded. Keep implementation names explicit to avoid confusion:

- `note_count` for homepage notes
- `whisper_count` for long-form Whispers if displayed later

## Image Support

Living entries may support one primary image in the first pass.

For each image:

- store image path in protected/private storage
- serve via signed URL when authorized
- require image alt text or a sensible fallback
- keep upload permissions aligned with entry ownership

Do not support multi-image galleries in the first pass unless the existing implementation already does so cleanly.

## Empty States

Empty states should be warm and quiet.

Examples:

Living Memories:

```text
Nothing here yet. This part is still becoming.
```

Things I Love:

```text
Nothing written here yet.
```

Whispers:

```text
No whispers yet.
```

Avoid empty states that feel like app boilerplate.

## Acceptance Criteria

Implementation is correct when:

- Main page renders living sections as compact previews.
- Long content opens in focused detail views.
- Section-specific add buttons route to focused contribution pages.
- Whispers support 15,000 characters.
- Things I Love supports or prepares for `subject_user_slug` grouping.
- Living Memories and Whispers remain creator-owned.
- Jeszi can contribute only after unlock.
- The reveal page remains emotionally clean and mobile-friendly.
