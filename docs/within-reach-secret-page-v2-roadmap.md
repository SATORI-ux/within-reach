# Within Reach - Quietly Kept Secret Page V2 Roadmap

## Purpose

This document defines the revised implementation sequence for the private **Quietly Kept** secret page.

The current implementation has the correct broad pieces, but the mobile experience can feel too long, text-heavy, and editor-like. Mobile is the primary surface. The page should feel **deep, not long**.

This roadmap coordinates follow-up work across mobile layout, contribution flows, permissions, living sections, Whispers, the Final Ask flow, celebration behavior, and later anniversary reminders.

## Current State After Existing Work

A prior permissions/editor refactor has already been implemented.

Current reported state:

- Fixed reveal content is Joey-only editable.
- Jeszi can view after unlock, but cannot edit fixed content.
- Jeszi after unlock can create/edit/archive only her own allowed living entries: `thing_i_love`, `still_being_written`.
- Jeszi cannot create/edit/archive `little_proof`.
- Entry image upload checks the same entry ownership rules.
- `get-secret-page` returns `can_edit_fixed_content`, `allowed_entry_sections`, and per-entry `can_edit`.
- `secret_entries.created_by` exists and is used for ownership enforcement.
- `subject_user_slug` is still deferred.

This is not a failed pass. It is useful backend groundwork. The revised direction is to stop exposing Jeszi to a broad editor workflow and instead route her through focused section-specific contribution pages.

## Revised Product Direction

Do not give Jeszi a general page editor.

Instead:

- The main **Quietly Kept** page remains a reading and returning surface.
- Joey keeps a private owner/fixed-content editor for original authored content and owner controls.
- Shared future participation happens through focused contribution flows.
- Each living section has its own small action such as `Add a memory`, `Add something I love`, or `Add a whisper`.
- These actions open a focused contribution page rather than a broad CMS/editor.

Working principle:

> Do not give Jeszi a page editor. Give her intentional places to add to the story.

## Current Product Problem

The secret page currently risks rendering too much long-form content inline, especially on mobile. Because the poem uses short lines, it can become an extremely tall vertical block.

This creates several problems:

- The poem becomes physically exhausting to scroll through.
- Later sections feel buried.
- The Final Ask is too far down the page.
- The page feels like a document instead of a quiet reveal.
- Broad editor access can make the experience feel administrative.
- Mobile interactions feel less intentional than they should.

## Desired Fix

The page needs a mobile-first disclosure model:

1. Show a compact emotional overview.
2. Make the poem central but not fully expanded by default.
3. Collapse or preview long sections.
4. Use focused detail views for full reading.
5. Use focused contribution pages for adding entries.
6. Keep the general editor owner-only.
7. Treat the Final Ask as a separate stateful feature, not editable page copy.

## Non-Negotiable Product Guardrails

- Preserve the private, quiet, object-like tone.
- Mobile-first. Desktop can be richer, but mobile is the primary validation target.
- The poem remains the emotional centerpiece.
- The full poem should be easy to access, but not dumped inline on the main page.
- The page should hold a lot, but show only a little at first.
- Main-page action buttons should feel like small doors, not admin controls.
- No dashboards, badges, analytics panels, heavy admin chrome, or feature creep.
- Do not expose final emotional copy in source code, markdown, migrations, seed files, or build artifacts.
- All protected content should be returned through server-side validation.
- UI hiding is never sufficient for permissions. Edge Functions must enforce access.
- Jeszi should not gain global edit access after unlock.
- Final Ask behavior must be stateful and deliberate.

## Recommended Implementation Order

### Pass 0 - Documentation Only

Capture this revised direction in durable docs before further coding.

Deliverables:

- Roadmap.
- Mobile reading/detail spec.
- Contribution flows spec.
- Permissions/editor spec.
- Living sections and Whispers spec.
- Final Ask flow spec.
- Content security and data contract.
- Codex pass prompts.

No application code in this pass.

### Pass 1 - Mobile-First Reveal Restructure

Goal: make the page feel curated on mobile.

Scope:

- Do not render the full poem inline by default.
- Show a **Constantia** preview card with selected excerpt lines.
- Add a focused **Read Constantia** detail view.
- Segment the poem into readable parts when content metadata supports it.
- Collapse or preview long sections.
- Use compact section cards.
- Add mobile section chips if useful.
- Ensure the Final Ask area is reachable without exhausting scroll.
- Preserve line breaks only in full reading/detail contexts.

Do not add Whispers or Final Ask state in this pass.

### Pass 2 - Contribution Flow Walkback / Editor Separation

Goal: walk back the broad editor experience without throwing away useful permission work already implemented.

Scope:

- Keep the existing server-side ownership enforcement.
- Keep `allowed_entry_sections` and per-entry `can_edit` behavior if already implemented.
- Keep `/quietly-kept-editor.html` as Joey-only or owner/fixed-content only.
- Add a focused contribution route, recommended: `/quietly-kept-entry.html`.
- Use query parameters for section-specific creation and entry-specific editing:
  - `/quietly-kept-entry.html?section=still_being_written`
  - `/quietly-kept-entry.html?section=thing_i_love`
  - `/quietly-kept-entry.html?section=whisper`
  - `/quietly-kept-entry.html?entry=<entry_id>`
- Remove or hide any broad `Edit this page` link for Jeszi.
- On the main reveal page, show only quiet section-specific actions where permitted.

This pass is the direct response to the revised product direction.

### Pass 3 - Whispers Section

Goal: add long-form intimate keepsakes.

Whispers are separate from homepage notes.

Use cases:

- Long poems.
- Vulnerable notes.
- Secrets exchanged in person.
- Things not ready for ordinary conversation, but worth keeping.

Rules:

- Support 15,000 character body text.
- Show preview on main page.
- Use a focused detail view for full content.
- Use focused contribution page for creating/editing.
- Do not count Whispers in the existing tally unless the product intentionally changes that later.
- Optional image support may reuse the existing entry media model.

### Pass 4 - Living Memories and Things I Love Grouping

Goal: make shared living contributions render clearly.

Scope:

- Living Memories show author quietly.
- Things I Love supports `subject_user_slug`.
- Render subject-aware groups:
  - Things Joey loves about Jeszi.
  - Things Jeszi loves about Joey.
- Contribution form infers `subject_user_slug` from current viewer and counterpart.
- Entries remain creator-owned.

### Pass 5 - Final Ask Core Flow

Goal: implement the stateful Final Ask flow.

Scope:

- Dedicated Final Ask state storage.
- Joey manually reveals the ask.
- Jeszi cannot reveal it herself.
- Jeszi can respond only after it is revealed.
- Response options: `Yes` and `Talk to me first`.
- Yes stores `accepted_at`.
- Talk to me first stores a safe non-punishing response.
- Owner-only hide/reset for mistakes/testing.
- Copy comes from protected content, not source.

### Pass 6 - Yes Celebration and Permanent Memory

Goal: make the `Yes` response a one-time memorable moment.

Scope:

- Send push to Joey and Jeszi with protected copy.
- Store notification status without blocking accepted state.
- Show one-time restrained celebration for Jeszi after Yes.
- Show one-time restrained celebration for Joey on next relevant page load.
- Track seen timestamps per user.
- Respect `prefers-reduced-motion`.
- Render permanent quieter accepted memory with `accepted_at`.

### Pass 7 - Anniversary Reminder

Goal: send a best-effort annual reminder based on `accepted_at`.

Scope:

- Use scheduled Edge Function / Supabase cron if project conventions support it.
- Send at most once per year.
- Store `last_anniversary_sent_for_year`.
- Treat exact timing as best-effort.

### Pass 8 - Final Polish

Goal: make the page feel intentional and finished.

Scope:

- Mobile spacing and rhythm.
- Detail views.
- Contribution buttons.
- Empty states.
- Image/caption rendering.
- Locked/unlocked states.
- No source exposure of final emotional content.

## Current Strong Foundations to Preserve

- Warm, object-like tone.
- Server-side identity validation.
- Protected content returned through Edge Functions.
- Creator-owned entry permissions.
- Mobile-first intent.
- The poem as emotional centerpiece.
- No dashboard drift.
- No admin chrome on the reveal page.

## Bottom Line

The existing permissions refactor does not need to be reverted wholesale. Treat it as server-side groundwork.

The next move is to change the user-facing workflow:

> The reveal page should be for reading and returning. Contribution pages should be for adding to the story.
