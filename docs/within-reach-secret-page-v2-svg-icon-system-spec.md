# Within Reach — Quietly Kept SVG Icon System Spec

## Purpose

This spec defines the small inline SVG system for the `Quietly Kept` visual pass.

The icons should make the page feel intentional and keepsake-like without turning it into a decorative icon set.

## Design principles

Use icons that are:

- inline SVG
- stroke-only
- thin-line
- warm and quiet
- slightly hand-drawn-adjacent
- simple enough to remain readable at 18–24px
- using `currentColor`

Avoid:

- external icon libraries
- filled emoji-style icons
- bright icon colors
- cartoon styling
- excessive ornamentation
- unrelated decorative icons

## Technical recommendation

Use one small helper in `js/quietly-kept.js`, for example:

```js
const SECTION_ICONS = {
  letter: '...',
  poem: '...',
  names: '...',
};

function iconSvg(name) {
  const wrapper = document.createElement('span');
  wrapper.className = `quiet-icon quiet-icon--${name}`;
  wrapper.innerHTML = SECTION_ICONS[name] || '';
  wrapper.setAttribute('aria-hidden', 'true');
  return wrapper;
}
```

Or place inline SVGs directly in `quietly-kept.html` for static nav items.

If using `innerHTML`, keep SVG strings static and internal only. Do not render user-provided SVG markup.

## CSS baseline

```css
.quiet-icon {
  display: inline-flex;
  width: 1.1rem;
  height: 1.1rem;
  color: var(--secret-accent-soft);
  flex: 0 0 auto;
}

.quiet-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}
```

Use larger decorative icons separately:

```css
.section-ornament {
  position: absolute;
  opacity: 0.16;
  color: var(--secret-accent-soft);
  pointer-events: none;
}
```

## Section icon map

| Section | Icon concept | Notes |
|---|---|---|
| The letter | Open book | threshold / opening note |
| Constantia | Feather or quill | poem centerpiece |
| The two names | Star or spark | naming / meaning |
| Little proofs | Framed image | proof/memory artifact |
| The Details That Stayed | Heart or pressed flower | quiet affection / details |
| Still Being Written | Pencil | ongoing record |
| Whispers | Envelope or underline | private written trace |
| A small tally | Tally marks | count without dashboard feel |
| The part I meant | Sealed envelope | final ask / held note |

## Nav usage

Each nav item should render:

```text
[icon] Label
```

The hover/active state should tint both the icon and label subtly.

Do not animate icons beyond a soft color/background transition.

## Section heading usage

For section headers, use the icon sparingly:

```text
[icon] SECTION LABEL
Heading
Intro
```

Or place icon near the heading line.

Avoid placing large icons before every paragraph.

## Decorative ornament usage

Only use larger low-opacity ornaments in:

1. Constantia card
2. The Part I Meant card

Optional:
- faint floral/leaf line art in Constantia bottom-right
- sealed-envelope/heart line art in final ask card

Do not add decorative ornaments to every section.

## Suggested SVG shapes

Claude can implement simple SVGs directly. Recommended shapes:

### Open book
- two mirrored page outlines
- center spine line

### Quill / feather
- long diagonal spine
- a few feather barbs

### Star / spark
- four-point sparkle
- optional small dot

### Heart
- simple line heart

### Tally marks
- four vertical marks plus one diagonal slash

### Pencil
- diagonal pencil line with tip

### Envelope
- rectangle with flap lines

### Framed image
- rectangle frame with tiny mountain/sun line

## Accessibility

Icons are decorative unless they are the only visible label.

- Add `aria-hidden="true"` to decorative icon wrappers.
- Keep visible text labels in nav and buttons.
- Do not rely on icon alone for meaning.
