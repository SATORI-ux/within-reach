# Within Reach - Quietly Kept Secret Page V2 Roadmap

## Purpose

This document defines the next implementation sequence for the private **Quietly Kept** secret page.

The current implementation has the correct broad pieces, but the mobile experience is too long, too text-heavy, and too close to a document dump. Mobile is the primary surface. The page should feel **deep, not long**.

This roadmap coordinates the follow-up work across layout, permissions, living sections, Whispers, mutual contributions, the Final Ask flow, and later anniversary reminders.

## Current Product Problem

The secret page currently renders too much long-form content inline, especially the poem. Because the poem uses short lines, it becomes an extremely tall vertical block on mobile.

This creates several problems:

- The poem becomes physically exhausting to scroll through.
- Later sections feel buried.
- The final ask is too far down the page.
- The page feels like a document instead of a quiet reveal.
- The emotional rhythm is flattened.

## Desired Fix

The page needs a mobile-first disclosure model:

1. Show a compact emotional overview.
2. Make the poem central but not fully expanded by default.
3. Collapse or preview long sections.
4. Use focused detail views for full reading.
5. Keep editor access narrow and section-specific.
6. Treat the Final Ask as a separate stateful feature, not editable page copy.

## Non-Negotiable Product Guardrails

- Preserve the private, quiet, object-like tone.
- Mobile-first. Desktop can be richer, but mobile is the primary validation target.
- The poem remains the emotional centerpiece.
- The full poem should be easy to access, but not dumped inline on the main page.
- The page should hold a lot, but show only a little at first.
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
- Segment the poem into readable parts.
- Collapse or preview long sections.
- Use compact section cards.
- Add mobile section chips if useful.
- Ensure the ask area is reachable without exhausting scroll.
- Preserve line breaks only in full reading/detail contexts.

Do not add Whispers or Final Ask state in this pass.

### Pass 2 - Permission and Editor Model Refactor

Goal: prevent broad unlocked edit access.

Rules:

- Joey can edit fixed reveal content.
- Jeszi cannot edit fixed reveal content.
- Fixed reveal content includes opener, poem, Two Names definitions, section intros, tally labels, and Final Ask copy.
- After unlock, living sections become shared.
- Living entries are creator-owned.
- Jeszi can create and edit her own allowed entries after unlock.
- Jeszi cannot edit Joey’s entries.
- Backend enforces every rule.

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
- Do not count Whispers in the existing tally unless the product intentionally changes that later.
- Optional image support may reuse the existing entry media model.

### Pass 4 - Living Memories and Things I Love Grouping

Goal: make mutual contributions clear.

Living Memories:

- Shared future-facing memory collection.
- Show author quietly.
- Preview first, detail on demand.

Things I Love:

- Must support `created_by` and `subject_user_slug`.
- Render as separate groups:
  - Things Joey loves about Jeszi.
  - Things Jeszi loves about Joey.
- Do not merge both people’s entries into one confusing list.

### Pass 5 - Final Ask Core Flow

Goal: make the girlfriend ask a stateful interaction.

Rules:

- Manual reveal by Joey.
- Jeszi cannot reveal it herself.
- Jeszi can respond only after reveal.
- Response buttons:
  - Yes
  - Talk to me first
- Joey cannot respond on Jeszi’s behalf.
- Reset/hide is owner-only.
- After response, casual overwrites are blocked.

This pass implements state and basic interaction only. Celebration polish can come after.

### Pass 6 - Yes Celebration and Permanent Memory

Goal: make the Yes moment memorable but still in-tone.

On Yes:

- Store acceptance server-side.
- Set `accepted_at`.
- Send different push notifications to Joey and Jeszi.
- Show a one-time, restrained in-app celebration.
- Respect reduced motion.
- Convert the section into a permanent quieter memory.

### Pass 7 - Anniversary Reminder

Goal: add future anniversary notification.

Rules:

- Depends on `accepted_at`.
- Scheduled backend job checks anniversary windows.
- Sends one notification per year.
- Delivery is best-effort, not guaranteed to the second.
- Record the sent year to avoid duplicates.

### Pass 8 - Final Polish and Content Migration

Goal: make the page feel intentional again.

Checks:

- Mobile first.
- Desktop second.
- No long dump sections.
- No source-committed secret copy.
- No direct anon access to protected data.
- Editor is functional but visually secondary.
- Final Ask states feel safe and private.

## Key Definitions

### Fixed Reveal Content

Authored content that belongs to the original secret and should remain Joey-only editable.

Examples:

- Opening note.
- Poem content.
- Two Names definitions.
- Section intros.
- Tally labels.
- Final Ask copy.

### Living Entries

Shared or expandable page content that can grow over time.

Examples:

- Little Proofs.
- Living Memories.
- Things I Love.
- Whispers.

### Final Ask

A separate stateful feature for the eventual girlfriend ask. It is not just editable page copy.

## Source Safety Rule

Any final emotional content, including the poem, opener, definitions, ask note, notification copy, or deeply personal section text, must live outside the committed repository.

Acceptable:

- Supabase rows inserted after deployment.
- Private local SQL file that is never committed.
- Editor-entered content.

Not acceptable:

- Final copy in client JS.
- Final copy in HTML.
- Final copy in Edge Function source.
- Final copy in markdown committed to repo.
- Final copy in migrations or seed files.

## Definition of Done for the Full V2 Work

The V2 secret page is complete when:

- Mobile main page reads as a curated overview, not a document dump.
- Full poem opens in a focused reading view.
- Long entries use previews and detail views.
- Jeszi only edits allowed shared/living sections after unlock.
- Fixed reveal content remains Joey-only.
- Whispers exist as a long-form intimate section.
- Things I Love supports mutual subject grouping.
- Final Ask is manually revealed by Joey.
- Yes response stores acceptance, sends push, triggers a one-time celebration, and becomes a permanent memory.
- Future anniversary reminder is either implemented or explicitly deferred.
- Protected content cannot be read directly through anon Supabase access.
