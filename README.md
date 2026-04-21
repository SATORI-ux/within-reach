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

## Local Development

```bash
npm install
npm run dev
```

PowerShell may block `npm.ps1` on some Windows systems. If that happens, use:

```bash
npm.cmd run dev
```

## Build

```bash
npm run build
```

or on Windows if PowerShell blocks npm scripts:

```bash
npm.cmd run build
```

The GitHub Pages workflow installs dependencies, runs the Vite build, and deploys the generated `dist` folder.

## Supabase Setup

The app uses Supabase tables and Edge Functions for identity validation, feed reads, check-ins, notes, reactions, push subscriptions, and urgent signals.

Apply the SQL files in `sql/` to the project database as needed, then deploy the Edge Functions in `supabase/functions/`.

For the current private-state support, apply:

```text
sql/secret_unlocks.sql
```

Deploy changed functions with the Supabase CLI, for example:

```bash
npx supabase functions deploy get-feed
npx supabase functions deploy send-check-in
```

## Private Build Notes

The repository contains public-safe scaffolding for a private build.

Public-safe code and layout can live in GitHub, while protected private page content should live in Supabase. The private route at `kept.html` is now designed to fetch structured content from `public.private_pages` through the `get-private-page` Edge Function after the hidden door has been unlocked.

This separation lets you:

- keep one repo synced to GitHub
- keep the public Vercel project building from the same codebase
- keep a second protected Vercel project for private previews
- edit public UI without storing personal copy directly in the repo

Apply the private-page schema before using the protected route:

```text
sql/private_pages.sql
```

Deploy the matching Edge Function:

```bash
npx supabase functions deploy get-private-page
```

Example `content` shape for `public.private_pages`:

```json
{
  "hero": {
    "eyebrow": "Quietly kept",
    "title": "A note that stayed.",
    "opening": "You found the small tucked-away place."
  },
  "letter": {
    "label": "For you",
    "title": "There has been a note here.",
    "paragraphs": [
      "Paragraph one.",
      "Paragraph two."
    ]
  },
  "meaning": {
    "label": "The two words",
    "title": "Constantia and Solacium",
    "cards": [
      { "title": "Constantia", "body": "Steadiness and endurance." },
      { "title": "Solacium", "body": "Comfort and refuge." }
    ],
    "paragraphs": [
      "Together, they belong to each other."
    ]
  },
  "video": {
    "label": "A moving piece",
    "title": "A small video can live here.",
    "placeholder": "Video placeholder"
  },
  "images": {
    "label": "Kept images",
    "title": "A few still things.",
    "items": [
      { "placeholder": "Image placeholder" },
      { "placeholder": "Image placeholder" }
    ]
  },
  "closing_line": "Still here."
}
```

The public build still uses a harmless empty private-copy module for the shared landing page's optional private-weighted lines.

## Deployment Notes

The public GitHub Pages deployment is built from source by the workflow. Avoid relying on manually edited files in `dist`; regenerate them with the build command instead.

Before pushing, check:

```bash
git status --short
```

Make sure no local private content files are staged.
