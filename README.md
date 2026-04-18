# Check-In Space

A small private two-person NFC-based web app for Joey and Jeszi.

This repo is built as a plain HTML/CSS/vanilla JS frontend for GitHub Pages, backed by Supabase and Supabase Edge Functions for identity resolution, sensitive writes, and notification stubs.

## Project structure

```text
/
  index.html
  styles/
    main.css
  js/
    app.js
    api.js
    ui.js
    config.js
  sql/
    schema.sql
    seed.sql
  supabase/
    config.toml.example
    functions/
      _shared/
        utils.ts
      resolve-visitor/
        index.ts
      send-check-in/
        index.ts
      add-note/
        index.ts
      react-note/
        index.ts
      send-urgent-signal/
        index.ts
      get-feed/
        index.ts
```

## Frontend setup

1. Open `js/config.js`
2. Replace:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
3. Leave the rest of the content pools as-is or tune them.

## Database setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `sql/schema.sql`.
4. Run `sql/seed.sql`.
5. Replace the placeholder tile keys in `sql/seed.sql` with long random secrets before using production NFC tags.

### Generating long tile keys

Use something truly unguessable. For example:

```bash
openssl rand -hex 32
```

Run that twice and use one for Joey, one for Jeszi.

## Edge Functions setup

### 1. Initialize Supabase locally

Inside the project folder:

```bash
supabase init
```

### 2. Add the shared function files

Copy the contents of this repo's `supabase/functions` folder into your Supabase project's `supabase/functions` folder.

### 3. Create secrets for production

Your functions use built-in environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

For later notification providers, add secrets like:
- `GENTLE_NOTIFY_PROVIDER`
- `URGENT_NOTIFY_PROVIDER`
- provider-specific keys

### 4. Deploy the functions

Because this project has no user login and validates the tile key server-side, these functions should be deployed as public functions.

Deploy each function with no JWT verification:

```bash
supabase functions deploy resolve-visitor --no-verify-jwt
supabase functions deploy send-check-in --no-verify-jwt
supabase functions deploy add-note --no-verify-jwt
supabase functions deploy react-note --no-verify-jwt
supabase functions deploy send-urgent-signal --no-verify-jwt
supabase functions deploy get-feed --no-verify-jwt
```

You can also deploy all functions after updating `config.toml` with `verify_jwt = false` entries for each one.

### 5. Local development

Serve functions locally:

```bash
supabase start
supabase functions serve resolve-visitor --no-verify-jwt
supabase functions serve send-check-in --no-verify-jwt
supabase functions serve add-note --no-verify-jwt
supabase functions serve react-note --no-verify-jwt
supabase functions serve send-urgent-signal --no-verify-jwt
supabase functions serve get-feed --no-verify-jwt
```

## GitHub Pages setup

This frontend is static and uses only relative paths, so it works well on GitHub Pages.

### Option A: user site

Create a repository named:

```text
<your-username>.github.io
```

Push these frontend files to that repository root.

### Option B: project site

You can also use a normal repository and enable Pages from the `main` branch root.

### In GitHub

1. Push the repo.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your branch and root folder.
5. Wait for Pages to publish.

A `.nojekyll` file is included so GitHub Pages will not strip underscore-prefixed folders if you keep everything in one repo.

## NFC tag programming

Program Joey's tile with:

```text
https://your-site.example/?key=JOEY_SECRET
```

Program Jeszi's tile with:

```text
https://your-site.example/?key=JESZI_SECRET
```

The app reads `?key=...` on load, resolves the visitor through `resolve-visitor`, stores the key in `sessionStorage`, then removes the query parameter from the visible URL.

## Notification wiring later

Right now notifications are stubbed so writes still log a result string to the database.

To wire a real provider later:
1. Update `createNotificationStub()` in `supabase/functions/_shared/utils.ts`
2. Branch on `gentle` vs `urgent`
3. Read provider secrets from `Deno.env.get(...)`
4. Return a real `{ success, result }`

## MVP behavior included

- tile-key based visitor resolution
- soft landing greeting
- randomized ambient line
- optional funny fact
- separate check-ins feed and notes feed
- one-tap check-in flow
- inline note composer with 300-char limit
- note reactions
- private urgent signal logging
- notification stubs

## Important security notes

This is intentionally a light private-auth pattern, not account auth.

Still, keep these rules:
- use long random tile keys
- never put the service role key in frontend code
- do not open table RLS policies for anonymous access
- keep all sensitive writes going through Edge Functions
