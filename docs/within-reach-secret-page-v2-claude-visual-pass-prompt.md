# Claude Prompt — Quietly Kept Visual Pass

## Before you paste this prompt

### If Claude Code
- Run `/context` first.
- Run `/diff` first if there are uncommitted changes from prior Codex work.
- Recommended model/effort: use a current Sonnet-class model with **medium effort**. This is mostly CSS/HTML/JS visual work, but it touches several files and should preserve existing protected-page behavior.
- Use `/plan` before editing because this pass touches multiple files and visual structure.
- Do **not** use high effort unless source state is unclear or the page has build/runtime failures.

### If Codex is used later instead
- Run `/status` first.
- Run `/diff` first.
- Use a normal/medium reasoning setting. This is not a backend/security pass.
- Do not spend tokens trying to bypass protected routes. Runtime browser verification of protected pages requires a valid Joey/Jeszi tile key or session.

## Prompt to paste

You are working in the `Within Reach` project.

This is a **visual-only refinement pass** for the private `Quietly Kept` page.

The goal is to make the current page feel closer to the provided reference direction: a dark, intimate, designed keepsake page with intentional section rhythm, literary typography, small line-art SVG motifs, and clearer visual hierarchy.

Do not treat this as a functionality pass.

## Required reading

Read these files first:

```text
docs/within-reach-secret-page-v2-visual-pass-index.md
docs/within-reach-secret-page-v2-visual-flow-spec.md
docs/within-reach-secret-page-v2-section-treatment-spec.md
docs/within-reach-secret-page-v2-svg-icon-system-spec.md
docs/within-reach-secret-page-v2-mobile-visual-spec.md
quietly-kept.html
js/quietly-kept.js
styles/quietly-kept.css
```

Also inspect these files only as needed to avoid breaking current page behavior:

```text
quietly-kept-entry.html
js/quietly-kept-entry.js
quietly-kept-editor.html
js/quietly-kept-editor.js
js/api.js
js/quiet-session.js
```

## Scope

Primary files expected to change:

```text
quietly-kept.html
js/quietly-kept.js
styles/quietly-kept.css
```

Optional only if required:

```text
index.html
```

Avoid backend changes in this pass.

## Non-goals / do not change

Do not change:

- Supabase Edge Functions
- database schema
- authentication/session logic
- private page access logic
- final ask state logic
- JWT handling
- editor submission behavior
- contribution routes
- entry body limits
- image upload behavior
- Whispers functionality
- Things/Details entry constraints
- Little Proofs hiding behavior
- protected-content storage strategy

Specifically, do not address these later-pass items even if they are visible in notes:

- different editors for each submission type
- Whispers no-photo behavior
- short one-sentence Things/Details entries
- final ask reset/JWT bug
- hiding Little Proofs from editor

This pass is strictly visual flow.

## Visual goals

Implement the visual refinements described in the docs:

1. Make the page feel less like a stack of generic cards.
2. Make `Constantia` the dominant centerpiece.
3. Rework the nav/section rail into an intentional table-of-contents with small SVG icons.
4. Add a restrained inline SVG icon system.
5. Improve section-specific visual treatment.
6. Make `Things I Love` visible language and layout move toward `The Details That Stayed`.
7. Make tally visually lighter and less dashboard-like.
8. Improve mobile section heading/action alignment.
9. Keep all existing data/auth behavior intact.

## Specific visual requirements

### Navigation / section rail

Rework the rail to include small line-art SVG motifs.

Suggested labels:

```text
The letter
Constantia
The two names
Little proofs
The details that stayed
Still being written
Whispers
A small tally
The part I meant
```

Suggested icons:

```text
The letter: open book
Constantia: feather/quill
The two names: star/spark
Little proofs: framed image
The details that stayed: heart
Still being written: pencil
Whispers: envelope or underline
A small tally: tally marks
The part I meant: sealed envelope
```

Keep icons decorative and accessible: visible text labels must remain.

### Constantia preview

Redesign the poem preview to match the reference direction more closely:

- wide centerpiece card
- centered `Constantia` heading
- subtitle under title
- `Read full poem` button near top-right on desktop
- four intentional excerpt columns on desktop
- centered closing line beneath excerpts
- subtle decorative SVG ornament in the lower/right area

If the current protected content has a structured poem preview, use it. If not, implement a safe visual fallback that does not require committing private full poem content into source.

Use the docs’ suggested excerpt structure as the target for layout behavior, but do not hard-code private final poem text if that violates the current content-storage boundary.

### The Two Names

Refine the two-card layout:

- lighter transparent cards
- small motif/glyph per card if simple
- centered closing line
- maintain existing content rendering

### The Details That Stayed

Change visible language away from `Things I Love` where currently hardcoded on the reveal page.

Target visible copy:

```text
Section title: The Details That Stayed
Intro: For the little things we noticed once and somehow never put down.
Grouped headings:
- From Joey, for Jeszi
- From Jeszi, for Joey
Button: Add what stayed
```

This is a visual/copy pass only. Do not change backend section type names. Keep `thing_i_love` internally if that is how data is stored.

Render these entries as compact list rows, not large cards:

- small heart icon left
- text row
- subtle chevron/right marker
- no images
- no large preview cards

### Still Being Written

Make this section more image-forward:

- horizontal card row on desktop where practical
- compact cards
- images prominent but not huge
- title/date/preview readable
- inline `Add a memory` button alignment improved on mobile

### Whispers

Make Whispers visually distinct from Still Being Written:

- letter-like/folded-note style cards
- no image-forward treatment
- envelope/underline motif
- quiet `Read whisper` affordance
- inline `Add a whisper` alignment improved on mobile

Suggested intro if content fallback is needed:

```text
Traces translated from skin to ink.

Small thoughts left in the moment, then returned to later with the words they were waiting for.
```

Do not change the actual editor behavior here.

### A Small Tally

Make tally feel like an inscription, not metrics:

- transparent board
- thin outline
- two person columns
- large numbers
- small labels
- tiny heart SVG beneath each person
- minimal fill

Suggested intro if content fallback is needed:

```text
Not a score. Just a small record of returning.
```

### The Part I Meant

Keep visually calm and sealed:

- wide closing card
- left copy, right action area on desktop
- sealed envelope or subtle floral/line-art motif
- avoid overexposing full body content on overview if existing rendering can be visually condensed without changing state logic

Do not fix final ask state/JWT logic in this pass.

## Mobile requirements

Mobile is primary.

- Section heading and Add buttons should stay visually connected.
- Avoid Add buttons floating as isolated full-width rows unless the screen is very narrow.
- Nav should not behave like a bulky sidebar on mobile; convert to a compact horizontal chip row, wrapped grid, or otherwise mobile-friendly table of contents.
- Constantia should remain special but not become a huge wall of text.
- The Details That Stayed should render as compact grouped lists.
- Tally should remain light and not dashboard-like.

## Protected route verification boundary

Do not waste time trying to access protected routes without a valid tile key/session.

If no valid Joey/Jeszi session is available:

- run build/static checks
- inspect source behavior
- mark protected browser verification as manual-required
- do not add bypasses
- do not fake credentials
- do not weaken auth

## Verification

Run available verification that does not require protected runtime credentials:

```text
npm.cmd run build
```

If this project has a private build script, run it too:

```text
$env:VITE_ENABLE_PRIVATE_BUILD='true'; npm.cmd run build:private
```

If the actual script name differs, inspect `package.json` and run the appropriate private build command.

Also run a diff check if available:

```text
git diff --check
```

Do not claim protected browser verification was completed unless a valid Joey/Jeszi tile/session was actually used.

## Output report

Return a concise implementation report with:

1. Files read.
2. Files changed.
3. Visual changes made by section.
4. Confirmation that backend/auth/data behavior was not changed, or list any exception.
5. Build/check results.
6. Protected-route verification status.
7. Known visual limitations or deferred items.
