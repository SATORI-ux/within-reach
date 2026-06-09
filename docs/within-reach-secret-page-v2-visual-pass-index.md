# Within Reach — Quietly Kept Visual Pass Index

## Purpose

This documentation pack defines a **visual-only refinement pass** for the `Quietly Kept` secret page.

The goal is to make the current page feel closer to the provided reference direction: a dark, intimate, designed keepsake page with intentional section rhythm, literary typography, small line-art SVG motifs, and clearer visual hierarchy.

This is **not** a functionality pass.

Do not change:
- authentication or session logic
- Edge Function behavior
- final ask state logic
- JWT handling
- database schema
- contribution editor behavior
- submission limits
- section visibility logic
- Little Proofs hiding logic
- Whispers editor behavior
- Things entry constraints

Those belong to later passes.

## Visual thesis

The page should feel like:
- a private illuminated keepsake
- a table of contents inside a secret object
- a place designed around return, not consumption
- quiet, warm, personal, and deliberate
- deeper than it is long

It should not feel like:
- a dashboard
- a generic stack of cards
- an admin preview
- a CMS-rendered page
- a feature list
- a social profile

## Current visual problem

The current implementation has the right content structure, but the sections still feel too similar:

```text
card
card
card
card
card
```

The reference direction works because the page has a stronger visual rhythm:

```text
threshold / opener
large poem centerpiece
paired definition cards
small list section
transparent tally board
image-forward memory row
letter-like whisper area
sealed final ask card
```

## Primary visual pass goals

1. Make `Constantia` the clear centerpiece.
2. Rework the left navigation into an intentional table-of-contents rail with SVG motifs.
3. Make each section visually distinct while preserving the same data behavior.
4. Convert `Things I Love` visible language and layout toward `The Details That Stayed`.
5. Make the tally feel ceremonial rather than statistical.
6. Improve mobile heading/action alignment.
7. Add small inline SVGs in a restrained, consistent system.
8. Preserve all existing page security and contribution behavior.

## File focus

Expected primary files:

```text
quietly-kept.html
js/quietly-kept.js
styles/quietly-kept.css
```

Possibly touched if needed for build wiring only:

```text
index.html
```

Avoid backend changes in this pass.

## Documentation files in this pack

- `within-reach-secret-page-v2-visual-flow-spec.md`
- `within-reach-secret-page-v2-section-treatment-spec.md`
- `within-reach-secret-page-v2-svg-icon-system-spec.md`
- `within-reach-secret-page-v2-mobile-visual-spec.md`
- `within-reach-secret-page-v2-claude-visual-pass-prompt.md`

## Output expectations for implementation

The implementation report should include:

- files read
- files changed
- visual changes made by section
- whether backend/auth/data behavior was untouched
- build verification results
- any protected-route browser verification skipped due to missing valid Joey/Jeszi session
- any deferred visual items
