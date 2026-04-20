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

The repository contains public-safe scaffolding for a private build, but private copy and private destination content should remain local-only.

Do not commit local private content files. The project `.gitignore` excludes those files so the public repository can keep the app structure without exposing personal material.

The public build uses a harmless empty private-copy module. Private builds can substitute local-only content during build time.

## Deployment Notes

The public GitHub Pages deployment is built from source by the workflow. Avoid relying on manually edited files in `dist`; regenerate them with the build command instead.

Before pushing, check:

```bash
git status --short
```

Make sure no local private content files are staged.
