# Within Reach — Quietly Kept Section Treatment Spec

## Purpose

This file defines the desired visual treatment for each section on the `Quietly Kept` page.

This is a visual-only pass. Preserve existing data fetching, permissions, routes, editor behavior, and Edge Function behavior.

---

## 1. Navigation / section rail

### Current issue

The section rail is functional but lifeless. It reads like a plain in-page link list.

### Target

Make it feel like a quiet table of contents inside the private object.

### Visual requirements

Each nav item should include:

- small inline SVG icon
- label
- soft hover/active treatment
- warm accent for current/hover state

Suggested nav items:

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

Suggested small quote at bottom of rail:

```text
Some things remain
no matter how much
everything else changes.
♡
```

### Icon map

- The letter: open book
- Constantia: feather/quill
- The two names: star/spark
- Little proofs: framed image
- The details that stayed: heart
- Still being written: pencil
- Whispers: envelope or underline
- A small tally: tally marks
- The part I meant: sealed envelope

---

## 2. Hero / threshold

### Current issue

Placeholder text and generic structure can make the top feel like a protected page preview rather than a secret object.

### Target visual feeling

The hero should feel like a threshold.

### Layout

- centered eyebrow
- large serif title
- tiny blush/gold divider or heart beneath title
- narrow subtitle/body line
- generous top spacing

### Suggested visible content if not already set through protected content

```text
Eyebrow: QUIETLY KEPT
Title: What was behind the door
Opening: A small place for the words, memories, and pieces of us to keep safe.
```

Do not hard-code private final content if the app intentionally stores it in protected Supabase content. Use fallback copy only if needed.

---

## 3. Opening note preview

### Target

The opener card should feel like something held, not like a generic section.

### Visual treatment

- smaller centered card than the poem
- subdued surface
- open-book icon in label or heading area
- quiet `Read the letter` button
- preview text should not run too long

Avoid a large full-letter render on the overview page.

---

## 4. Constantia poem preview

### Current issue

The poem preview is currently too compressed and does not represent the poem’s emotional arc.

### Target

Constantia should be the page centerpiece.

### Desktop layout

- large wide card
- centered heading `Constantia`
- subtitle: `A poem for you.`
- `Read full poem` button top-right
- four excerpt columns across the card
- centered closing line beneath the columns
- subtle decorative SVG in bottom-right corner

### Suggested excerpt content

Use intentional excerpts rather than generic first/final-line extraction.

```text
Column 1:
How early
can someone become
unforgettable?

Before there are names
for what they are?

Column 2:
We laughed
about mutant ladybugs

as if the world
had handed us
something small
and strange...

Column 3:
You made ordinary things
feel marked.

Like some part of you
had touched them
and left them warmer.

Column 4:
After all of it,
after the years,
the distance,
the silence,
the almosts,
the returning...
```

Closing line:

```text
...there was still one thing I recognized.

You.
```

### Implementation options

Preferred:
- use `poem.preview` from protected page content if present and structured
- otherwise use a client-side visual fallback that selects this curated excerpt block only when the page lacks configured preview data

Do not move final poem content into source if that violates the current protected-content rule. Keep source fallback neutral or clearly non-final if needed.

---

## 5. The Two Names

### Target

This section already works. Refine it.

### Visual treatment

- two cards on desktop
- stacked cards on mobile
- small icon/glyph per card
- lighter transparent card surfaces
- centered closing line

Suggested card motifs:

- Constantia: thread/star/anchor motif
- Solacium: shelter/heart/hand motif

---

## 6. Little Proofs

### Target

Keep visually quiet unless populated.

### Treatment

- if entries exist: image-forward small card row
- if empty: do not give it a large visual footprint
- keep action behavior unchanged for this pass

Do not implement hiding logic in this visual pass.

---

## 7. The Details That Stayed

### Current issue

Visible language `Things I Love` and `Add something I love about...` is too direct for the page theme.

### Target visible language

```text
Section title: The Details That Stayed
Intro: For the little things we noticed once and somehow never put down.
Grouped headings:
- From Joey, for Jeszi
- From Jeszi, for Joey
Button: Add what stayed
```

### Visual treatment

This section should not use large entry cards.

Use compact list styling:

- two internal groups on desktop, stacked on mobile
- one-line or short-row entries
- tiny heart icon at left
- subtle chevron or arrow at right
- internal scroll allowed later if needed, but hide scrollbars
- no images
- no large preview cards

This pass may only change visual treatment and labels. Do not change editor constraints or backend data model here.

---

## 8. Still Being Written

### Target

This section should feel active and image-forward.

### Visual treatment

- horizontal card row on desktop
- image thumbnail prominent
- short title/body preview
- date or relative time
- top-right `View all` if enough entries exist
- `Add a memory` button inline with title on mobile

The mirror entry should look like one card in a living row, not an isolated admin item.

---

## 9. Whispers

### Target

Whispers should feel distinct from memories.

They begin as traces on skin and become long written reflections later.

### Suggested intro

```text
Traces translated from skin to ink.

Small thoughts left in the moment, then returned to later with the words they were waiting for.
```

### Visual treatment

- no image-forward layout
- letter/folded-note style cards
- envelope or underline motif
- previews as fragments
- quiet `Read whisper` affordance
- `Add a whisper` inline with section title on mobile

---

## 10. A Small Tally

### Current issue

The tally risks feeling dashboard-like.

### Target

It should feel like an inscription.

### Visual treatment

- transparent board
- thin outline
- two person columns
- large numbers
- smaller labels
- tiny heart SVG beneath each person
- minimal fill

Suggested intro:

```text
Not a score. Just a small record of returning.
```

---

## 11. The Part I Meant

### Target

Until the final ask flow is fully implemented, the overview should feel sealed and quiet.

### Visual treatment

- wide closing card
- small sealed-envelope or floral motif
- left: label/title/short intro
- right: question/button area
- avoid rendering too much body text inline on overview
- keep it visually calm

Do not fix final ask state/JWT issues in this visual pass.
