# Within Reach - Secret Page V2 Permissions and Editor Spec

## Purpose

This spec defines how viewing and editing permissions should work for the Quietly Kept secret page after the mobile restructure.

The current issue is that once Jeszi unlocks edit access, she may be able to edit too much of the page. That should be narrowed.

## Identity Model

The app already resolves users through tile/session validation.

Known users:

- `joey`
- `jeszi`

For this private feature:

- Joey is the original author/owner.
- Jeszi is the intended recipient.
- After unlock, Jeszi becomes a contributor to specific living sections, not a global page editor.

## Secret Unlock Model

View permissions are tied to the server-side secret unlock state.

Rules:

- Joey can view before unlock.
- Joey can edit before unlock.
- Jeszi cannot view before unlock.
- Jeszi cannot edit before unlock.
- After `secret_unlocked_at` exists, both can view.
- After `secret_unlocked_at` exists, Jeszi can edit only specific living sections.

The permission check must happen server-side.

## Content Categories

### Fixed Reveal Content

Fixed content belongs to the original secret and should remain Joey-only editable.

Examples:

- Hero copy.
- Opening note.
- Poem content and poem segment metadata.
- Two Names definitions.
- Section intros.
- Tally labels.
- Final Ask copy.
- Any static emotional framing.

Jeszi should not edit fixed reveal content, even after unlock.

### Living Entries

Living entries are meant to grow over time.

Examples:

- Little Proofs, if the product permits only Joey to maintain original proof archive.
- Living Memories.
- Things I Love.
- Whispers.

Living entries should be creator-owned.

### Final Ask State

Final Ask is not regular content. It is a stateful interaction.

See the Final Ask spec for separate permissions.

## Recommended Section Permissions

| Section | Joey before unlock | Jeszi before unlock | Joey after unlock | Jeszi after unlock |
|---|---:|---:|---:|---:|
| Fixed page content | view/edit | no access | view/edit | view only |
| Opening letter | view/edit | no access | view/edit | view only |
| Constantia poem | view/edit | no access | view/edit | view only |
| Two Names | view/edit | no access | view/edit | view only |
| Little Proofs | view/edit own/all depending owner policy | no access | view/edit own/all depending owner policy | view only or create own if enabled |
| Living Memories | view/edit own | no access | view/edit own | view/create/edit own |
| Things I Love | view/edit own | no access | view/edit own | view/create/edit own |
| Whispers | view/edit own | no access | view/edit own | view/create/edit own |
| Tally | view | no access | view | view |
| Final Ask reveal/reset | owner-only | no access | owner-only | no access |
| Final Ask response | cannot respond as Jeszi | no access | cannot respond as Jeszi | can respond if revealed |

## Recommended Policy Decisions

### Little Proofs

Preferred:

- Joey-authored original proof archive.
- Jeszi can view after unlock.
- Jeszi does not edit Joey’s original proof entries.

Optional later:

- Allow Jeszi to add her own proof entries if the section becomes mutual.

### Living Memories

Shared after unlock:

- Joey can add his own.
- Jeszi can add her own.
- Each person can edit/archive their own entries.
- Entries show author quietly.

### Things I Love

Shared after unlock, but subject-aware:

- Joey creates entries with `subject_user_slug = jeszi`.
- Jeszi creates entries with `subject_user_slug = joey`.
- Each person edits only their own entries.

### Whispers

Shared after unlock:

- Joey can create/edit his own.
- Jeszi can create/edit her own.
- Each person can archive their own.
- Future draft/private states are out of scope unless explicitly added later.

## Backend Enforcement

Do not rely on frontend hiding.

Every write Edge Function must verify:

- current viewer identity
- secret unlock state
- section type
- action type
- entry ownership
- fixed vs living content category

## Suggested Shared Helper Functions

Implement or update shared permission helpers similar to:

```ts
type SecretAction =
  | "view_page"
  | "edit_fixed_content"
  | "create_entry"
  | "edit_entry"
  | "archive_entry"
  | "reveal_final_ask"
  | "reset_final_ask"
  | "respond_final_ask";

function canViewSecretPage(viewer, secretState): boolean;
function canEditFixedContent(viewer): boolean;
function canCreateSecretEntry(viewer, sectionType, secretState): boolean;
function canEditSecretEntry(viewer, entry, secretState): boolean;
function canArchiveSecretEntry(viewer, entry, secretState): boolean;
function canRevealFinalAsk(viewer): boolean;
function canRespondFinalAsk(viewer, finalAskState): boolean;
```

The exact function names can match repo conventions, but the logic should be centralized.

## Editor UX

The editor page should be plain and functional, but permission-aware.

### Joey before unlock

Can see:

- Fixed content editor.
- Living entry editor.
- Secret entry list.
- Final Ask owner controls, once implemented.

### Joey after unlock

Same as before unlock.

### Jeszi before unlock

No editor access.

### Jeszi after unlock

Can see:

- Living Memories entry form.
- Things I Love entry form scoped to Joey.
- Whispers entry form.
- Her own existing entries.
- No fixed content editor.
- No Final Ask owner controls.
- No ability to edit Joey’s entries.

## Editor Filtering

The editor should not show section options the user cannot write.

Example:

- Jeszi should not see `opening_note`, `poem`, `two_names`, or fixed content slugs in a dropdown.
- Jeszi should not see Joey’s entries as editable.
- If a malicious request is made anyway, the server returns an error.

## API Behavior

### `get-secret-page`

Returns:

- viewer identity
- can view
- can edit fixed content
- allowed entry section types
- allowed entry ids for editing, or ownership metadata
- final ask permission flags
- content and entries only if viewer can view

### `upsert-secret-entry`

Requires:

- viewer can create or edit the specific section
- if update, viewer owns the entry unless Joey owner override is explicitly intended
- body length constraints per type
- section type constraints

### `archive-secret-entry`

Requires:

- viewer owns the entry, or Joey owner override if intentionally allowed
- soft archive only

### Fixed Content Update Function

If implemented:

- Joey-only.
- Not available to Jeszi after unlock.
- Should never be called by generic entry update functions.

## Acceptance Criteria

The permission refactor is complete when:

- Jeszi cannot edit fixed reveal content after unlock.
- Jeszi cannot edit the poem, opener, Two Names, tally labels, or Final Ask copy.
- Jeszi can create/edit her own allowed living entries after unlock.
- Jeszi cannot edit Joey’s entries.
- Joey can still maintain fixed content and his own entries.
- Backend rejects unauthorized writes even if the UI is bypassed.
- Editor dropdowns and forms only show allowed actions.
- The reveal page does not look like an admin surface.
