# Within Reach — Quietly Kept Visual Flow Spec

## Purpose

This spec describes the intended visual rhythm for the `Quietly Kept` page.

The current page has correct sections, but too many sections share the same generic visual container. This pass should make the page feel intentionally composed while preserving existing behavior.

## Visual hierarchy

The page should read in this order:

1. **Threshold / hero**
2. **Opening note preview**
3. **Constantia poem centerpiece**
4. **The Two Names**
5. **Little Proofs**
6. **The Details That Stayed**
7. **Still Being Written**
8. **Whispers**
9. **A Small Tally**
10. **The Part I Meant**

The poem should visually dominate the middle of the page. The final ask should close the page, but should not visually overpower the poem until the final ask flow is fully implemented later.

## Overall layout direction

Desktop should move closer to the reference layout:

```text
left rail / table of contents
main content column
large centerpiece poem card
paired/two-column content where appropriate
wide lower sections
quiet footer
```

Mobile should remain stacked, but each section should retain its identity through:

- icon motif
- heading treatment
- button placement
- card style
- spacing
- section-specific layout

## Visual rhythm target

Avoid a uniform stack of identical rectangles. Use differentiated section shapes:

### Hero / threshold
- centered title
- narrow body line
- small decorative accent under title
- more negative space than later sections

### Opening preview
- smaller, held card
- label can be `HELD HERE` or remain content-driven
- should feel like a threshold note, not a database card

### Constantia
- large wide centerpiece card
- centered title
- four excerpt columns on desktop
- intentional closing line
- subtle decorative line-art motif in a corner

### The Two Names
- paired definition cards
- small section intro
- centered closing line

### Little Proofs
- image card row if entries exist
- if empty, visually quiet and not overemphasized

### The Details That Stayed
- compact list style, not large entry cards
- grouped by author/subject
- one-line rows with small icon and subtle chevron

### Still Being Written
- horizontal image-forward memory row on desktop
- compact cards with images, title, date, and short preview

### Whispers
- letter-like cards, not image-forward
- underline/envelope motif
- long-form preview treatment

### A Small Tally
- transparent board
- thin outline
- two person columns
- large numbers
- small heart beneath each person

### Final Ask
- sealed-card feel
- left copy, right action area on desktop
- minimal overview content until final ask state flow is implemented

## Typography direction

### Section eyebrows

Use consistent letter-spaced uppercase labels:

```css
letter-spacing: 0.14em to 0.18em;
text-transform: uppercase;
font-size: 0.65rem to 0.75rem;
```

Color should be muted rose/gold, not high-contrast white.

### Headings

Use the serif face already established by the page. Increase contrast between major and minor headings:

- hero title: largest
- poem title: large and warm-accented
- section headings: medium-large
- card titles: smaller, clear

### Body text

Improve readability:

- avoid overly tiny prose
- line-height around `1.55` to `1.7`
- keep prose line lengths controlled
- preserve line breaks for poem/opening/detail content

## Color and surfaces

Keep the dark purple-black base, but make surfaces feel less heavy.

Use:
- translucent panels
- soft borders
- low-opacity internal dividers
- warm cream text
- rose/gold accents

Avoid:
- bright gold UI chrome
- heavy opaque cards everywhere
- high-contrast borders around every section
- dashboard-like metric panels

## Button direction

Buttons should feel like small affordances inside a keepsake:

- pill shape
- thin border
- transparent or lightly tinted fill
- warm hover state
- optional tiny icon for primary section actions
- no bright call-to-action styling except final ask, and even there it should remain restrained

## Decorative SVG usage

SVGs should support the section identity, not decorate randomly.

Use small icons in:

1. left section rail
2. section headings or action areas

Use faint larger decorative SVGs only in:

1. Constantia card
2. Final Ask card

Do not overuse large ornamentation.
