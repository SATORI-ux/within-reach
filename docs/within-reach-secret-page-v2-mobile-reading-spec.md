# Within Reach - Secret Page V2 Mobile Reading and Layout Spec

## Purpose

This spec defines how to restructure the Quietly Kept secret page so it feels better on mobile.

The page should feel like a private, emotionally layered object. It should not feel like one giant page of text.

## Primary Design Principle

> The page should feel deep, not long.

Mobile users should see a composed sequence of meaningful sections. They should not be forced through the full poem, every caption, every memory, and every note inline.

## Current Issue

The current page renders the poem and long copy directly into the main page. Because the poem uses short lines, it becomes an extremely tall vertical block on mobile.

This creates several problems:

- The poem becomes physically exhausting to scroll through.
- Later sections feel buried.
- The final ask is too far down the page.
- The page feels like a document instead of a quiet reveal.
- The emotional rhythm is flattened.

## Desired Mobile Page Shape

The mobile landing/reveal page should show compact, preview-based cards in this order:

1. **Protected / hero state**
2. **Opening Letter preview**
3. **Constantia preview card**
4. **The Two Names**
5. **Little Proofs preview**
6. **Living Memories preview**
7. **Whispers preview**
8. **Things I Love grouped preview**
9. **A Small Tally**
10. **Final Ask state card**
11. **Quiet footer**

The full content should be accessible through focused detail views.

## Main Page Section Behavior

### Opening Letter

Default mobile behavior:

- Show title.
- Show a short excerpt or first 2 to 4 lines.
- Button: `Read the letter`.

Full content:

- Opens in detail mode.
- Preserve paragraphs.
- Avoid over-wide text.
- Keep line length readable.

### Constantia Poem

Default mobile behavior:

- Show title: `Constantia`.
- Subtitle: `A poem for you.`
- Show 3 to 5 carefully selected excerpt lines from different emotional points.
- Button: `Read Constantia`.

Do not show the full poem inline by default.

Full content:

- Opens in focused reading mode.
- Preserve exact line breaks.
- Segment into named parts.
- Use generous spacing.
- Consider a bottom `Next` / `Back to Quietly Kept` control.
- Avoid sticky controls that feel app-like.

### The Two Names

Default mobile behavior:

- Compact two-card layout or stacked cards:
  - Constantia
  - Solacium
- Show the short definitions only.
- Expand if longer definitions are present.

This section may remain inline because it is short and reference-like.

### Little Proofs

Default mobile behavior:

- Show 2 to 3 cards.
- Each card shows:
  - image if present
  - title
  - date if present
  - preview text
  - `Read the rest`

Full content:

- Opens in detail view.
- Body can be long.
- Images should render first, then story/caption.
- Preserve paragraph breaks.

### Living Memories

Default mobile behavior:

- Same preview pattern as Little Proofs.
- Newest or pinned entries first.
- Show author quietly.

Full content:

- Detail view.

### Whispers

Default mobile behavior:

- Show latest 1 to 2 whispers.
- Use a softer, more private visual tone than memories.
- Show title, preview, author, date.
- Button: `Read whisper`.

Full content:

- Focused detail view.
- Preserve paragraphs and line breaks.
- Support long text up to the configured limit.

### Things I Love

Default mobile behavior:

- Group by subject:
  - Things Joey loves about Jeszi
  - Things Jeszi loves about Joey
- Show up to 3 items per group.
- Use compact rows/cards.
- Expand group or open detail.

### A Small Tally

Default mobile behavior:

- Small, non-dominant section.
- No charts.
- No badges.
- No milestones.
- No giant scoreboard.

The tally should feel like a quiet record, not analytics.

### Final Ask

Default behavior depends on ask state. See the Final Ask spec.

On the main page, this card must never feel like a generic editable section.

## Poem Segmentation

The full poem should be segmented for reading. Segment titles may be stored as content metadata.

Recommended segments:

1. **The First Memory**
2. **What Stayed**
3. **The Years Between**
4. **The Hidden Place**
5. **The Constant**
6. **What I Know Now**

The exact poem text should not be committed to source. The server should return content and segment metadata only after authorization.

## Detail View Options

Use one of these approaches.

### Preferred: Query Parameter Detail Mode

Examples:

- `quietly-kept.html?read=constantia`
- `quietly-kept.html?entry=<entryId>`
- `quietly-kept.html?section=letter`

Benefits:

- Simple for vanilla JS.
- Back button works.
- Easy to deep-link internally.
- Main page remains compact.

### Acceptable: In-Page Reading Mode

A full-screen or near-full-screen reading panel replaces the overview.

Requirements:

- Back control.
- No modal feel if possible.
- Preserve scroll position when returning.

### Avoid

- Rendering every long section inline.
- Nested scroll boxes inside cards.
- Accordion stacks where every section can accidentally be open at once.
- Modal overlays for the full poem if they feel cramped on mobile.

## Mobile Navigation

The desktop sidebar should not be the primary mobile pattern.

Use optional horizontal section chips near the top:

`Letter · Poem · Names · Proofs · Memories · Whispers · Ask`

Rules:

- Chips should be small and quiet.
- Sticky behavior is optional.
- Do not make them look like dashboard tabs.
- Do not consume too much vertical space.

## Typography and Spacing

Mobile typography should prioritize reading comfort:

- Avoid extremely narrow poem columns.
- Use a readable max width.
- Increase stanza spacing in full reading mode.
- Keep card padding modest.
- Reduce excessive top/bottom gaps.
- Avoid tiny text in long sections.
- Preserve line breaks where they matter.

Suggested CSS behavior:

- Full poem: `white-space: pre-line` or structured line rendering.
- Long prose: normal paragraphs with `line-height` around 1.55 to 1.75.
- Previews: clamp text to a few lines or truncate via server-provided preview.

## Reduced Motion

Any reveal animation, page transition, or future celebration must respect reduced-motion preferences.

Use scoped reduced-motion handling in final code rather than blanket disabling if the project already has a pattern.

## Acceptance Criteria

The mobile restructure is complete when:

- The full poem is not rendered inline on the main page by default.
- `Read Constantia` opens a focused full poem view.
- The full poem preserves line breaks.
- The main page can be skimmed without feeling like an endless scroll.
- Long content uses previews and detail views.
- The final ask card is reachable without excessive scrolling.
- Existing authorization behavior is preserved.
- No final emotional copy is committed to source during the layout work.
- Desktop remains usable, but mobile is the primary validated layout.
