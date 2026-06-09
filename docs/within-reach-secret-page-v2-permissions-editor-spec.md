# Within Reach - Secret Page V2 Permissions and Editor Spec

## Purpose

This spec defines how viewing, editing, and contribution permissions should work for the **Quietly Kept** secret page.

The current product decision is to avoid broad shared editor access. After unlock, Jeszi should become a contributor to specific living sections, not a global page editor.

## Identity Model

The app resolves users through tile/session validation.

Known users:

- `joey`
- `jeszi`

For this private feature:

- Joey is the original author/owner.
- Jeszi is the intended recipient.
- After unlock, Jeszi becomes a contributor to specific living sections.

## Secret Unlock Model

View permissions are tied to the server-side secret unlock state.

Rules:

- Joey can view before unlock.
- Joey can edit before unlock.
- Jeszi cannot view before unlock.
- Jeszi cannot edit before unlock.
- After `secret_unlocked_at` exists, both can view.
- After `secret_unlocked_at` exists, Jeszi can contribute only to allowed living sections.

The permission check must happen server-side.

## Content Categories

### Fixed Reveal Content

Fixed content belongs to the original secret and remains Joey-only editable.

Examples:

- Hero copy.
- Opening note.
- Poem content and poem segment metadata.
- Two Names definitions.
- Section intros.
- Tally labels.
- Final Ask copy.
- Final Ask reveal/reset controls.
- Any static emotional framing.

Jeszi should not edit fixed reveal content, even after unlock.

### Living Entries

Living entries are meant to grow over time.

Examples:

- Living Memories.
- Things I Love.
- Whispers.

Living entries are creator-owned.

### Little Proofs

Preferred policy:

- Little Proofs are Joey-authored original proof archive.
- Jeszi can view after unlock.
- Jeszi does not add/edit Little Proofs in the first shared contribution model.

Optional later:

- A separate mutual proof section may be added, but do not mix it into the initial original proof archive.

### Final Ask State

Final Ask is not regular content. It is a stateful interaction.

See the Final Ask spec for separate permissions.

## Route Permissions

### `/quietly-kept.html`

Purpose:

- reveal page
- reading/returning surface
- compact previews
- focused detail views
- quiet section-specific contribution buttons

Permissions:

- Joey can view before and after unlock.
- Jeszi can view only after unlock.
- No fixed-content editing controls should appear here.
- Section-specific contribution buttons may appear only if permitted.

### `/quietly-kept-editor.html`

Purpose:

- Joey owner/fixed-content editor
- original secret maintenance
- owner-only state controls

Permissions:

- Joey only.
- Jeszi should not use this route for ordinary participation.
- If Jeszi reaches it, show a closed/unauthorized state.

This route may remain plain and functional, but it should not be the shared contribution UX.

### `/quietly-kept-entry.html`

Purpose:

- focused living-entry creation/editing

Permissions:

- Joey can create/edit his own permitted living entries.
- Jeszi can create/edit her own permitted living entries after unlock.
- Entry-specific edits require creator ownership unless explicit owner override is intentionally preserved.
- Fixed-content editing is never handled here.

## Recommended Section Permissions

| Section | Joey before unlock | Jeszi before unlock | Joey after unlock | Jeszi after unlock |
|---|---:|---:|---:|---:|
| Fixed page content | view/edit | no access | view/edit | view only |
| Opening letter | view/edit | no access | view/edit | view only |
| Constantia poem | view/edit | no access | view/edit | view only |
| Two Names | view/edit | no access | view/edit | view only |
| Little Proofs | view/edit own/all depending owner policy | no access | view/edit own/all depending owner policy | view only |
| Living Memories | view/edit own | no access | view/edit own | view/create/edit own |
| Things I Love | view/edit own | no access | view/edit own | view/create/edit own |
| Whispers | view/edit own | no access | view/edit own | view/create/edit own |
| Tally | view | no access | view | view |
| Final Ask reveal/reset | owner-only | no access | owner-only | no access |
| Final Ask response | cannot respond as Jeszi | no access | cannot respond as Jeszi | can respond if revealed |

## Recommended Section Actions

On the reveal page:

- Living Memories: `Add a memory`
- Things I Love: `Add something I love about {counterpart}`
- Whispers: `Add a whisper`

These actions should route to `/quietly-kept-entry.html`, not to the owner editor.

## Backend Enforcement Requirements

Edge Functions must enforce:

- view permission
- fixed-content edit permission
- allowed entry sections
- creator-owned entry edits
- creator-owned archives
- creator-owned media uploads
- subject inference for Things I Love
- Final Ask owner/recipient rules

Frontend conditionals are only presentation helpers.

## Current Implementation Compatibility

If the repo already has:

- `can_edit_fixed_content`
- `allowed_entry_sections`
- per-entry `can_edit`
- `created_by` ownership checks
- section-specific server validation

then keep those server-side rules.

The revised work is mostly to change the user-facing workflow:

- owner fixed-content editor remains Joey-only
- Jeszi does not use broad editor
- focused entry route handles allowed contributions

## Acceptance Criteria

The permission/editor implementation is correct when:

- Jeszi cannot edit fixed reveal content.
- Jeszi does not see or use the general editor for normal participation.
- Jeszi can add only permitted living entries after unlock.
- Jeszi cannot edit Joey’s entries.
- Joey’s owner controls remain available without cluttering the reveal page.
- Backend rejects unauthorized writes even if a user manually calls the endpoint.
- Main reveal page feels like a private object, not an admin tool.
