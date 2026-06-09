# Within Reach - Secret Page V2 Mobile Reading and Layout Spec

## Purpose

This spec defines the mobile-first reading model for the **Quietly Kept** secret page.

The page should feel deep, private, and intentional. It should not feel like an endless document scroll.

## Core Mobile Problem

Long blocks of text on mobile weaken the experience.

Specific risks:

- The poem becomes extremely tall because of short line breaks.
- Long captions bury later sections.
- The Final Ask becomes too hard to reach.
- Contribution/editing controls can make the page feel like software instead of an object.

## Core Mobile Solution

Use a layered disclosure model.

Main page:

- compact previews
- section cards
- selected excerpts
- quiet action buttons
- focused doors into full reading or contribution views

Detail pages/modes:

- full poem
- full letter
- full entries
- full whispers

Contribution pages:

- focused create/edit actions only
- no broad editor behavior

## Desired Mobile Page Order

Recommended order:

1. Protected / hero state
2. Opening Letter preview
3. Constantia preview card
4. The Two Names compact reference
5. Little Proofs preview
6. Living Memories preview
7. Things I Love grouped preview
8. Whispers preview
9. A Small Tally
10. Final Ask state card
11. Quiet footer

This order can be adjusted for content rhythm, but the poem must remain central and the Final Ask must remain reachable.

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
- Show 3 to 5 selected excerpt lines.
- Button: `Read Constantia`.

Do not show the full poem inline by default.

Full content:

- Opens in focused reading mode.
- Preserve exact line breaks.
- Segment into named parts when metadata is available.
- Use generous spacing.
- Consider simple `Next` / `Back to Quietly Kept` controls.
- Avoid sticky controls that feel app-like.

### The Two Names

Default mobile behavior:

- Compact two-card layout or stacked cards:
  - Constantia
  - Solacium
- Show short definitions inline.
- Expand only if longer definitions are present.

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

- Show 1 to 3 recent or pinned entries.
- Show author quietly.
- Show `View all` if needed.
- Show `Add a memory` only when permitted.

The add action should open `/quietly-kept-entry.html?section=still_being_written` or the project-equivalent route.

### Things I Love

Default mobile behavior:

- Render compact grouped previews.
- Groups:
  - Things Joey loves about Jeszi.
  - Things Jeszi loves about Joey.
- Show only a few entries per group by default.
- Show viewer-specific add action only when permitted.

Add action examples:

- `Add something I love about Jeszi`
- `Add something I love about Joey`

### Whispers

Default mobile behavior:

- Show title and short intro.
- Show 1 to 2 whisper previews.
- Show `View all` if needed.
- Show `Add a whisper` only when permitted.

Full whispers must open in focused detail view.

Do not show full Whispers inline by default.

### A Small Tally

Default mobile behavior:

- compact
- no charts
- no badge styling
- no analytics feel

Keep labels emotional:

- thoughts of you
- whispers left

Implementation note:

- `thoughts of you` = check-ins
- `whispers left` = homepage notes
- long-form Whispers are separate

### Final Ask Card

Before implementation of the stateful flow:

- keep compact
- do not make it a giant editable content block

After stateful implementation:

- hidden until Joey reveals
- revealed state shows `Read this part`
- answered state becomes quiet permanent memory

## Navigation Pattern

Optional mobile section chips may be used:

```text
Letter · Poem · Names · Proofs · Memories · Love · Whispers · Ask
```

Rules:

- chips must be visually quiet
- no heavy sticky nav unless it genuinely improves use
- no dashboard-style tabs
- no bright active states

## Contribution Buttons

Contribution buttons should be quiet and section-specific.

Good:

- `Add a memory`
- `Add a whisper`
- `Add something I love about Joey`

Avoid:

- `Edit page`
- `Manage entries`
- `Admin`
- `Configure section`

## Layout Constraints

Mobile should use:

- single-column layout
- readable line length
- generous but not excessive vertical rhythm
- cards with compact previews
- no nested scroll panes
- no giant always-expanded accordions

Desktop may show richer layout, but should not diverge in content behavior.

## Protected Route Verification Boundary

A coding agent without a valid tile key or stored session cannot fully verify protected route runtime behavior.

The agent should verify:

- build success
- source-level logic
- function type checks
- permission branches by reading code
- presence of closed/unauthorized states

The agent should not waste tokens trying to bypass protected routes, invent credentials, or repeatedly chase unauthenticated browser access.

Manual runtime testing with real Joey/Jeszi sessions remains required.

## Acceptance Criteria

The mobile restructure is correct when:

- The full poem is not dumped inline on the main page.
- The poem has a prominent preview and focused reading view.
- Long sections render as previews by default.
- Contribution actions open focused routes, not the broad editor.
- The Final Ask is reachable without exhausting scroll.
- The main page feels curated, not endless.
- Mobile is validated first.
