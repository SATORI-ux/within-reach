# Within Reach Internal Project Summary

Generated for a full design and engineering review on April 26, 2026.

This is an internal review handoff. It intentionally includes private-build context and should not be treated as public README copy.

## One-Sentence Shape

Within Reach is a minimal two-person check-in space reached through personal NFC tiles, designed to feel like a quiet shared object rather than a chat app, feed, dashboard, or productivity surface.

## Product Intent

The app supports one small ritual:

1. Arrive through a personal tile or validated session.
2. Leave a lightweight trace with `Thinking of you`.
3. Leave a deeper note when needed.
4. Send a calm private `Can you talk?` signal when needed.
5. Return to a shared place that feels held, warm, and restrained.

The product should preserve:

- quietness over novelty
- clarity over abundance
- emotional coherence over capability
- smallness over accumulation
- server truth over client convenience
- two-person intimacy over generalization

The source-of-truth docs are:

- `docs/product-brief.md`
- `docs/ux-guidelines.md`
- `docs/system-behavior.md`
- `docs/failure-pass.md`
- `AGENTS.md`

## Current User Experience

### Arrival

The main page starts with a full-screen arrival layer. The app resolves the visitor before revealing personalized copy, avoiding generic greeting flashes while booting. The visitor can skip the arrival with click, tap, pointer, wheel, or touch. After a short delay, the shared space is revealed.

Arrival copy is lightly randomized from controlled pools:

- shared ambient lines
- personalized public lines
- private-build lines when enabled
- optional secondary facts/interludes

The effect should be recognition, not splash-screen spectacle.

### Main Surface

The main page order is:

1. Arrival
2. Shared status line
3. Optional urgent state
4. Three quick actions
5. Optional gentle push prompt
6. Check-ins
7. Optional fact interlude
8. Notes
9. Quiet footer

This order matches the UX guidance and should not be rearranged casually.

### Core Actions

`Thinking of you`

- one-tap ambient check-in
- creates a `check_ins` row through an Edge Function
- can send a gentle push notification to the counterpart
- appears in the check-ins surface as a small templated trace
- should not become a visible scoreboard in the public build

`Leave a note`

- opens a small composer
- max length is 300 characters in both client and backend
- notes appear in a separate notes surface
- note reactions are allowed but intentionally small and secondary
- should not become chat-like

`Can you talk?`

- opens a calm confirmation dialog
- asks preferred response: call, text, or either
- creates an urgent signal privately
- sends a push notification with a short-lived recipient session link
- never appears in the public feed
- recipient can open the urgent route, see response options, and acknowledge with `I'm here`

### Feed Growth

Feed growth is constrained by default:

- check-ins initially load 8 items
- notes initially load 5 items
- server-side max page size is 20
- older items are reached through quiet `Show older...` buttons
- collapse buttons return the surface to recent items

This is important because unlimited growth would make the app feel archival instead of ritual-like.

### Push Notifications

Push is optional and device-specific:

- frontend checks current service worker push subscription endpoint
- `resolve-visitor` returns whether push is enabled for this current endpoint
- UI does not treat browser notification permission alone as per-user truth
- push prompt can be dismissed per visitor in local storage
- debug mode exists through `?debugPush=1`

The service worker only shows notifications and routes clicks back into the app. It does not own product state.

### Theme Behavior

There is a light/dark theme toggle with local persistence. Private builds can enable a secret theme through a long press. The public build forcibly exits `secret` theme if it is not enabled for that build.

## Private Build / Hidden State

The private build is guarded by environment and build flags:

- `VITE_WITHIN_REACH_BUILD=private` or private mode request
- `VITE_ENABLE_PRIVATE_BUILD=true`
- optional `VITE_ENABLE_SECRET_SECTION`
- strict public builds fail closed if a private build is requested without explicit enablement

Vite aliases private copy modules:

- public builds use `js/private-copy.public.js` and `js/private-whisper.public.js`
- private builds can use local private files when present

Hidden/private behavior currently includes:

- secret theme whispers
- footer hold hidden-door behavior
- server-derived secret unlock state
- optional thought-count reveal only inside the kept/private page
- protected `kept.html` private page
- private page content loaded from Supabase `private_pages`

Secret unlock logic is server-side in `supabase/functions/_shared/secret.ts`:

- default target user: `jeszi`
- default always-unlocked user: `joey`
- default threshold: 150 thoughts
- default minimum time: 90 days
- persisted unlocks stored in `secret_unlocks`
- debug unlocks require `SECRET_DEBUG_UNLOCKS=true`

This private system must remain non-public, non-default, quiet, and impossible to stumble into casually. It should not become a puzzle system or public product feature.

## Engineering Architecture

### Stack

- HTML
- CSS
- Vanilla JavaScript modules
- Vite
- Supabase database
- Supabase Edge Functions
- Web Push through `web-push`
- Vercel/GitHub Pages-capable static deployment shape

### Frontend Entry Points

`index.html`

- main shared experience
- arrival, quick actions, push prompt, check-ins, notes, urgent dialog, templates
- imports `js/app.js`

`kept.html`

- private/hidden page
- inline CSS and imports `js/private-page.js`
- only meaningful in private builds

### Main Frontend Modules

`js/app.js`

- bootstraps identity/session
- manages local UI state
- resolves visitor with backend
- loads feed
- handles check-ins, notes, reactions, urgent signals, push enablement
- handles feed pagination/collapse
- handles urgent route loading and acknowledgement

`js/ui.js`

- renders arrival copy
- renders check-ins and notes
- renders reaction sets
- renders secret state hints
- binds hidden footer door
- manages toasts and inline messages
- updates feed history controls

`js/api.js`

- thin wrapper around Supabase Edge Function calls
- asserts required Vite Supabase environment config
- posts JSON payloads with publishable key headers

`js/config.js`

- environment-derived flags
- copy pools
- product constants
- reaction allow-list mirrored from backend
- VAPID public key

`js/theme.js`

- light/dark theme persistence
- optional secret theme via hold gesture
- icon and `theme-color` sync

`js/private-page.js`

- resolves session for `kept.html`
- refuses public-build access
- fetches protected private page content
- renders letter, meaning cards, media, images, and optional thought reveal

### Edge Functions

Shared utilities live in `supabase/functions/_shared/utils.ts`:

- CORS handling
- admin Supabase client
- tile/session visitor resolution
- cooldown enforcement
- note sanitization
- reaction summary helpers
- push subscription truth helpers
- push send helper
- counterpart lookup
- app base URL validation

Core functions:

- `issue-device-session`: validates raw tile key and creates device session token.
- `resolve-visitor`: validates tile/session, returns visitor identity and current-device push truth.
- `get-feed`: returns paginated check-ins and notes; includes private state only when enabled.
- `send-check-in`: validates identity, enforces cooldown, sends gentle push, writes check-in, updates secret state if enabled.
- `add-note`: validates identity, sanitizes content, enforces 300 char limit and cooldown, writes note.
- `react-note`: validates identity, note existence, and allowed reaction; toggles reaction.
- `send-urgent-signal`: validates identity, enforces cooldown, creates short-lived recipient session, writes urgent signal, sends urgent push.
- `get-urgent-signal`: validates intended recipient before returning urgent details and contact link data.
- `acknowledge-urgent-signal`: validates intended recipient before marking acknowledged.
- `save-push-subscription`: validates tile/session, upserts endpoint with current device/session data.
- `get-private-page`: requires private pages enabled, validates visitor, checks secret unlock, returns private page content.
- `resolve-device-session`: older/direct session resolver path, still present.

### Database Shape

Main tables from `sql/schema.sql`:

- `tile_keys`: tile key, user slug, display name, accent color, active status
- `device_sessions`: session tokens derived from valid tile flows
- `check_ins`: lightweight thought traces and notification result
- `notes`: 300-character deeper records
- `note_reactions`: curated note reactions, unique per note/user/reaction
- `urgent_signals`: private urgent events with status and acknowledgement fields
- `urgent_contacts`: phone numbers for urgent response links
- `push_subscriptions`: endpoint, subscription JSON, device session linkage, active status
- `secret_unlocks`: persisted private unlock state
- `private_pages`: protected private page content JSON

Views:

- `check_in_feed`
- `notes_feed`

RLS is enabled on tables. Edge Functions use service role access and perform explicit validation.

## Trust Boundaries

The backend must remain the authority for:

- tile validation
- session validation
- identity resolution
- note validation
- reaction allow-list validation
- urgent signal creation and recipient validation
- push send attempts and result logging
- private unlock state
- private page access

The frontend may smooth continuity, hold presentation state, and initiate actions. It must not become the authority for identity, unlocks, urgent visibility, or push truth.

The service worker may receive push payloads, show notifications, focus/open the app, and deep-link to a validated route. It must not own durable product state.

## Design System / Visual Direction

The visual language is:

- warm neutrals
- muted personal accents
- Georgia serif typography for the main voice
- Arial/Helvetica for labels, metadata, and small controls
- 8px-radius cards and sections
- soft surfaces and subtle borders
- understated shadows
- restrained motion
- low-chrome controls
- no dashboard affordances

The page uses soft section cards, but the intended feeling is still a small held object, not a dense app interface. Any future design pass should check whether sections have become too card-heavy or system-like.

## Current Strengths

- Product docs are unusually clear and should be treated as the intended shape.
- The three action meanings are preserved in UI and backend.
- Check-ins and notes are separate surfaces.
- Urgent signals stay out of public feed paths.
- Most side-effecting writes go through Edge Functions.
- Identity is resolved through validated tile/session flow.
- Feed growth is capped by default.
- Push truth is handled per device endpoint, not just browser permission.
- Private build is mostly gated by explicit flags and server-side state.
- Public README avoids spelling out private hidden mechanics.

## Review Risks To Inspect Closely

### Product / UX

- Does the main page now feel too section-card-heavy for the "object, not platform" thesis?
- Does the fact interlude add warmth, or does it introduce tonal randomness that feels clever?
- Do note reactions remain quiet on mobile, especially with six reactions available?
- Does the push prompt feel like a gentle interlude or a system feature?
- Does the urgent route feel serious without becoming alarm-like?
- Does the hidden/private layer stay quiet and non-default, or does it feel puzzle-like?

### Engineering / Boundaries

- Some Edge Functions still duplicate CORS/client/session helper code instead of using `_shared/utils.ts`.
- `save-push-subscription`, `issue-device-session`, and `resolve-device-session` use direct local helper copies and `@supabase/supabase-js` imports rather than the shared utility pattern used elsewhere.
- `resolve-device-session` appears present but not used by the current frontend path.
- There is no obvious automated test suite beyond build/type checks.
- `REACTIONS` and `ALLOWED_REACTIONS` are duplicated between frontend and backend; this is acceptable for UX but needs drift checks.
- Public/private boundary depends on Vite flags, env flags, and aliases; review build outputs carefully.
- Secret/private state is correctly server-derived, but private-debug query parameters exist in the frontend and should remain private-build-only.

### Data / Operations

- SQL files are migration-like but not a formal ordered migration system.
- RLS is enabled, but policies are not shown in `schema.sql`; service role functions are doing the main access control.
- Push subscription rows can become inactive only when code updates them; review stale endpoint handling after push send failures.
- Urgent signal delivery depends on push delivery plus the durable `urgent_signals` row. The app should never imply delivery if push fails.

### Copy / Tone

- Keep copy warm, calm, and restrained.
- Avoid generic app language.
- Avoid explaining mechanics in visible UI.
- Avoid public docs that mention private-build mechanics.
- Watch for encoding artifacts in text pools or docs if they render incorrectly.

## Suggested Full Review Prompt For Another AI

Use this prompt in another AI/ChatGPT chat:

```text
Please review this project as a design and engineering critic.

Project: Within Reach, a private two-person NFC/tile-based check-in space.

Core intent: It should feel like a quiet shared object, not a chat app, feed, dashboard, productivity tool, social surface, or feature playground.

Review lenses:
- Product drift: Does anything make it louder, more app-like, more social, more dashboard-like, or more gamified?
- UX tone: Do arrival, check-ins, notes, urgent, push prompts, and footer all feel warm, quiet, restrained, and emotionally distinct?
- Boundary failures: Is identity, permission, urgent visibility, push truth, or private unlock state ever decided by the client when it should be server truth?
- Accumulation: Does feed/history behavior stay small by default, or does it become archival?
- Private/public boundary: Are private-build mechanics hidden from public docs and gated by build/env/server state?
- Engineering quality: Are Edge Functions cohesive, validation server-side, duplicated constants manageable, and stale/unused paths understood?
- Failure behavior: Does the app fail quietly and truthfully without fake success or private leakage?

Important product rules:
- `Thinking of you` is ambient and low-friction.
- `Leave a note` is deeper and not chat-like.
- `Can you talk?` is serious but calm and private.
- Check-ins and notes are separate surfaces.
- Urgent events never appear in shared public history.
- No persistent scoreboard or gamified count display.
- Feed growth should be constrained.
- Service worker is delivery only, never product authority.

Please return:
1. High-priority risks with file/function references where possible.
2. Design/tone risks.
3. Trust-boundary risks.
4. Private/public boundary risks.
5. Suggested small, targeted fixes.
6. Things that are already working well and should be protected.
```

## Practical Review File Map

Start with:

- `AGENTS.md`
- `docs/product-brief.md`
- `docs/ux-guidelines.md`
- `docs/system-behavior.md`
- `docs/failure-pass.md`
- `index.html`
- `js/app.js`
- `js/ui.js`
- `styles/main.css`
- `supabase/functions/_shared/utils.ts`
- `supabase/functions/_shared/secret.ts`
- `sql/schema.sql`

Then inspect:

- `js/config.js`
- `js/api.js`
- `js/private-page.js`
- `kept.html`
- `service-worker.js`
- `vite.config.js`
- all functions under `supabase/functions/*/index.ts`

## Review Bottom Line

The project is coherent and has strong written intent. The main review challenge is not adding more capability; it is protecting the emotional and trust boundaries while the product has accumulated push, urgent, session, pagination, and private-build layers.

The best future changes will probably be small: reduce visible system weight, consolidate server helpers, keep private mechanics gated, verify mobile polish, and preserve the three-action ritual.
