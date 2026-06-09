# Within Reach - Secret Page V2 Contribution Flows Spec

## Purpose

This spec replaces the idea of giving Jeszi broad editor access with focused, section-specific contribution flows.

The goal is to keep the **Quietly Kept** reveal page emotionally clean while still allowing the shared page to grow after unlock.

## Product Principle

The main page is not an editor.

The main page should feel like:

- reading
- remembering
- returning
- discovering
- choosing a small door into a specific action

It should not feel like:

- a CMS
- an admin dashboard
- a form hub
- a settings screen
- a shared Notion page

Working principle:

> Do not give Jeszi a page editor. Give her intentional places to add to the story.

## Route Model

### Owner Fixed-Content Editor

Keep an owner-only route for fixed content and state controls:

```text
/quietly-kept-editor.html
```

This route is for Joey-owner maintenance, not normal shared use.

It may manage:

- opener content
- poem content and segments
- Two Names definitions
- section intro copy
- tally labels
- Final Ask copy
- Final Ask reveal/reset controls
- owner cleanup/admin tasks

Jeszi should not need this route for ordinary participation.

### Focused Contribution Route

Add a focused contribution route:

```text
/quietly-kept-entry.html
```

Recommended create URLs:

```text
/quietly-kept-entry.html?section=still_being_written
/quietly-kept-entry.html?section=thing_i_love
/quietly-kept-entry.html?section=whisper
```

Recommended edit URL:

```text
/quietly-kept-entry.html?entry=<entry_id>
```

Recommended detail/read URL remains on the reveal page or a read mode:

```text
/quietly-kept.html?entry=<entry_id>
```

## Main Page Button Behavior

The main reveal page may show quiet, permission-gated action buttons inside living sections.

Examples:

- Living Memories: `Add a memory`
- Things I Love: `Add something I love`
- Whispers: `Add a whisper`

These buttons should:

- be small and visually secondary
- appear only when the current viewer can use them
- link to the focused contribution route
- not reveal the general editor
- not create admin-page energy

## Section-Specific Behavior

### Living Memories

Purpose:

- future memories
- shared moments
- images with captions/stories
- new experiences after the reveal

Button label:

```text
Add a memory
```

Route:

```text
/quietly-kept-entry.html?section=still_being_written
```

Fields:

- title
- optional subtitle
- optional memory date
- optional image
- image alt text
- preview
- body/story
- pinned/display order if owner policy allows

Permissions:

- Joey can create before or after unlock.
- Jeszi can create only after unlock.
- Each person can edit/archive their own entries.
- Joey owner override may exist server-side, but should not appear as ordinary UI unless needed.

### Things I Love

Purpose:

- short or medium observations about the counterpart
- affectionate specifics
- things noticed over time

Button labels should be viewer-specific:

For Joey:

```text
Add something I love about Jeszi
```

For Jeszi:

```text
Add something I love about Joey
```

Route:

```text
/quietly-kept-entry.html?section=thing_i_love
```

Fields:

- title
- optional subtitle
- preview
- body
- optional image
- image alt text

Subject behavior:

- The form should infer `subject_user_slug` automatically.
- If current viewer is `joey`, subject is `jeszi`.
- If current viewer is `jeszi`, subject is `joey`.
- Do not make the user manually choose the subject for the normal two-person flow.

Rendering:

- Group Joey-authored entries about Jeszi under `Things Joey loves about Jeszi`.
- Group Jeszi-authored entries about Joey under `Things Jeszi loves about Joey`.
- Keep each group compact on mobile.

### Whispers

Purpose:

- long poems
- vulnerable notes
- private truths
- secrets exchanged in person
- things not ready for ordinary conversation, but worth keeping

Button label:

```text
Add a whisper
```

Route:

```text
/quietly-kept-entry.html?section=whisper
```

Fields:

- title
- optional subtitle
- preview
- body
- optional image
- image alt text

Body limit:

- 15,000 characters.

Main page rendering:

- show previews only
- never dump full Whispers inline by default
- full content opens in focused detail view

Tone line:

```text
Longer things, kept softer.
```

## Contribution Page UX

The contribution page should feel like a small writing room, not an admin surface.

Recommended structure:

1. Soft header identifying the section.
2. One-line section description.
3. Focused form.
4. Save button.
5. Cancel/back link.
6. If editing, archive option is quiet and secondary.

Avoid:

- large admin headings
- table layouts
- global section dropdowns when section is already known
- exposing permissions or schema terms
- listing unrelated content types

## Permission Rules

All permissions must be enforced server-side.

UI hiding is not sufficient.

General rules:

- Joey can view and edit owner/fixed content.
- Jeszi cannot edit owner/fixed content.
- Joey can create living entries before unlock.
- Jeszi can create living entries only after unlock.
- Living entries are creator-owned.
- Entry image upload uses the same ownership rules as entry update/archive.
- The contribution route should close gracefully if the user is not permitted.

## Relationship to Existing Prompt 2 Work

If the prior permissions/editor refactor has already been implemented:

- Keep the server-side permission helpers.
- Keep `allowed_entry_sections` if it accurately reflects section permissions.
- Keep per-entry `can_edit` if it is already returned.
- Keep `created_by` ownership enforcement.
- Do not revert backend hardening.
- Change the user-facing route model so Jeszi uses focused contribution pages instead of the broad editor.

## Acceptance Criteria

The contribution-flow implementation is correct when:

- Jeszi no longer sees or uses a general page editor for normal participation.
- Main page action buttons are section-specific and visually quiet.
- `/quietly-kept-entry.html?section=...` supports focused create flows.
- `/quietly-kept-entry.html?entry=...` supports focused edit flows for owned entries.
- Unauthorized section, fixed-content, or cross-owner edits are rejected server-side.
- The reveal page remains a reading/returning surface, not a CMS.
- Mobile feels less cluttered because contribution UI is off-page.
