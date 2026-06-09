# Within Reach — Quietly Kept Mobile Visual Spec

## Purpose

This spec defines mobile-specific visual improvements for the `Quietly Kept` visual pass.

Mobile is the primary reading surface. The page must not feel like a long stack of identical panels.

## Mobile goals

The mobile page should feel:

- readable
- intentionally paced
- deep, not endless
- sectioned without becoming busy
- easy to add to without visual clutter

## Main mobile problems to solve

1. Section headings and add buttons currently wrap awkwardly.
2. The poem preview can become too tall or too compressed.
3. The section rail is not useful as a fixed left rail on small screens.
4. Card surfaces can become repetitive.
5. Tally and list sections need smaller, more intentional layouts.

## Section heading/action alignment

For sections with actions, keep the button inline with the title when possible.

Examples:

```text
Whispers                         Add a whisper
Still Being Written              Add a memory
The Details That Stayed          Add what stayed
```

On very narrow screens, allow the button to wrap, but keep it visually attached to the heading rather than isolated as a full-width row unless necessary.

Suggested CSS approach:

```css
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
}

.section-heading .section-actions {
  flex: 0 0 auto;
  margin-top: 0.15rem;
}

@media (max-width: 380px) {
  .section-heading {
    align-items: stretch;
  }

  .section-heading .section-actions {
    align-self: flex-start;
  }
}
```

Do not make add buttons dominate the section.

## Mobile navigation

The desktop left rail should not behave like a large sidebar on mobile.

Recommended mobile behavior:

- convert rail into a horizontal scrollable chip/table-of-contents row near the top, or
- keep it hidden/collapsed behind a quiet `Sections` affordance, or
- let it naturally sit above content as a compact grid

Preferred:

```text
[book] Letter  [quill] Constantia  [star] Names  [heart] Details ...
```

Use hidden scrollbar or very subtle scroll behavior.

## Constantia mobile layout

The poem preview should remain special without becoming a wall of text.

Recommended:

- title centered
- `Read full poem` button near title or below subtitle
- excerpt blocks stack as small panels or become horizontal swipe cards
- final closing line centered below excerpts

Avoid:

- rendering the entire poem preview as one narrow column
- using randomly selected lines that feel incoherent
- making the poem card too short to feel important

## The Details That Stayed mobile layout

Use two stacked groups:

```text
From Joey, for Jeszi
♡ row text                      ›
♡ row text                      ›

From Jeszi, for Joey
♡ row text                      ›
```

Requirements:

- one-line or two-line max rows
- no images
- no large cards
- no visible scrollbar if internal scroll is used
- grouped headings should remain readable but quiet

## Still Being Written mobile layout

Cards can stack or horizontally scroll.

Preferred for a visual pass:

- horizontal swipe row if CSS is simple and stable
- card width around 78–86vw
- image thumbnail prominent
- title/body preview/date compact

Avoid huge full-width image cards unless there is only one entry.

## Whispers mobile layout

Whispers should feel like private notes.

- show section intro
- entries as narrow letter-like cards
- no image slots
- preview text can be a little longer than Details rows
- `Read whisper` link/button subtle

## Tally mobile layout

Two columns should remain possible on most mobile widths.

If too narrow:

- stack cards vertically
- keep transparent/outlined treatment
- keep heart SVG beneath each person

Do not turn tally into a dashboard block.

## Final ask mobile layout

Keep it compact until final ask flow is complete.

- title
- short line
- `Open this part` button
- avoid showing full ask body inline on the overview page

## Touch targets

Buttons and links should remain tappable:

- minimum practical target around 36–44px height where possible
- small links can be visually delicate but must not be frustrating
- nav chips should have enough padding

## Reduced motion

If adding any hover/reveal polish, respect reduced-motion preferences.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not add flashy animation in this pass.
