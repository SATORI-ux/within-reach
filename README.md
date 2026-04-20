# Within Reach

A private two-person ambient check-in app built for long-distance closeness.

Within Reach is a lightweight web experience designed around small gestures:
- quick check-ins
- short notes
- soft ambient messages
- a private urgent signal
- NFC-triggered entry points for each person

## Why this exists

The goal is to make connection feel immediate, quiet, and intentional without turning it into a full messaging platform.

## Features

- NFC-based entry flow
- personalized visitor resolution
- one-tap check-ins
- private notes feed
- note reactions
- ambient rotating lines
- gentle and urgent notification paths
- static frontend deployable on GitHub Pages
- backend logic handled through Supabase and Edge Functions

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Vite
- Supabase
- Supabase Edge Functions
- GitHub Pages

## Local development

```bash
npm install
npm run dev
```

## Build flags

The public build keeps the ordinary arrival line behavior. The private build can use the weighted landing secondary-line system from the copy pass:

```bash
VITE_WITHIN_REACH_BUILD=private
```

For compatibility, `VITE_PRIVATE_BUILD=true` also enables the private build path. Secret hint lines are only eligible in a private build, and can be disabled with:

```bash
VITE_ENABLE_SECRET_SECTION=false
```

For local debugging in Vite private mode, force the secondary line type with `debugSecondary`:

```bash
npm.cmd run dev -- --mode private
```

Then open a tile URL with `debugSecondary=secret`, `debugSecondary=fact`, `debugSecondary=personal`, `debugSecondary=clue`, or `debugSecondary=none`.

To test the hidden footer door locally in private mode before the server-side unlock conditions are met, add `debugUnlockDoor=true` and long-press the quiet footer line.

The private hidden letter route is `kept.html`. Keep the real file local and private; it is ignored by Git and is included in private builds only when present.

The server-side unlock state requires the `secret_unlocks` table. Apply `sql/secret_unlocks.sql` to an existing Supabase database before deploying the updated Edge Functions.

To test the real server unlock path without waiting, set `SECRET_DEBUG_UNLOCKS=true` for the Edge Function environment. Then open the private build with `debugSecretThoughts` and `debugSecretDays`, and press `Thinking of you`.

For example, `debugSecretThoughts=149&debugSecretDays=91` simulates 149 prior thoughts and a first thought 91 days ago; the button press becomes the 150th qualifying thought and should unlock. `debugSecretThoughts=149&debugSecretDays=89` should not unlock.

When debug params are present, the browser advances the simulated prior count after each successful press. To reset that local debug counter, run `localStorage.removeItem('within-reach.debug-secret-progress')` in the browser console.
