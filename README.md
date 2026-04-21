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

## Supabase Setup

The app uses Supabase tables and Edge Functions for identity validation, feed reads, check-ins, notes, reactions, push subscriptions, and urgent signals.

Apply the SQL files in `sql/` to the project database as needed, then deploy the Edge Functions in `supabase/functions/`.

Deploy changed functions with the Supabase CLI, for example:

```bash
npx supabase functions deploy get-feed
npx supabase functions deploy send-check-in
```

## Deployment Notes

The GitHub Pages deployment is built from source by the workflow. Avoid relying on manually edited files in `dist`; regenerate them with the build command instead.

Before pushing, check:

```bash
git status --short
```
