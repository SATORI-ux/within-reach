# Within Reach - Secret Page V2 Codex Pass Prompts

## Purpose

Use this file to run the remaining Quietly Kept V2 work in small, controlled Codex passes.

Do **not** paste the whole file into Codex. Use one pass at a time.

These prompts are optimized to:

- reduce wasted Codex tokens
- prevent stale-context drift
- keep slash/session commands outside the actual task prompt
- avoid impossible protected-route verification loops
- keep implementation aligned with the private, mobile-first, object-like design direction

## Critical Verification Boundary

The Quietly Kept routes are protected by tile/session identity and private-build state. Codex should **not** waste time trying to manually access protected pages with generic URLs.

### Do not let Codex do this

- Do not repeatedly open `/quietly-kept.html` or `/quietly-kept-editor.html` without a valid tile key or stored session and treat the locked state as a failure.
- Do not brute-force routes, query parameters, localStorage keys, or bypasses.
- Do not add temporary auth bypasses, mock secrets, public fallback content, or hardcoded tile keys to source.
- Do not commit real emotional content, final poem text, ask copy, or private content to source.
- Do not spend time trying to perform authenticated browser verification unless a valid local token/session is already available in the workspace.

### What Codex should do instead

- Verify static behavior with build checks.
- Verify rendering logic through source inspection and payload-shape handling.
- Verify Edge Functions with Deno checks when available.
- Verify schema/migrations through SQL review and type-compatible function code.
- Document protected-route runtime checks as **manual verification required** when valid tile/session tokens are unavailable.
- If runtime verification is blocked by missing secrets, state that clearly and stop. Do not chase alternate access routes.

### Acceptable verification wording

Use wording like:

```text
Protected-route runtime verification was not performed because this session does not have a valid Joey/Jeszi tile key or stored device session. Static build checks, function checks, and source-level payload handling were verified. Manual authenticated verification is required on a real private session.
```

## General Codex Workflow

For each pass:

1. Use a clean or compacted Codex session.
2. Paste only the selected pass prompt.
3. Require Codex to inspect current source and produce a short plan before editing.
4. Keep the pass narrow.
5. Require changed files, verification output, risks, and manual verification notes.
6. Run `/diff` before follow-up fixes.

## Common Pre-Flight Guidance

Use this before each implementation pass. These commands are for you to run in Codex before pasting the prompt. They are intentionally **not** inside the prompts.

### Before you paste any implementation prompt

- Run `/status`.
- Run `/diff` if the prior pass changed files.
- Use `/new` or `/clear` when starting a distinct new pass and stale context is likely.
- Use `/compact` if the current Codex thread contains useful recent decisions but is getting long.
- Use `/plan` for passes that touch auth, permissions, migrations, protected content, push, or multi-file architecture.
- Use a lower-cost/standard reasoning model for small CSS or documentation-only edits.
- Use stronger reasoning for permissions, Edge Functions, schema changes, push, Final Ask state, anniversary scheduling, or unclear failures.

## Standard Verification Commands

Codex should inspect `package.json` first and adjust commands to the repo’s real scripts.

Typical build checks:

```bash
git status --short
npm run build
```

Private build check, if current project conventions still match prior passes:

```powershell
$env:VITE_WITHIN_REACH_BUILD='private'; $env:VITE_ENABLE_PRIVATE_BUILD='true'; npm.cmd run build
```

Edge Function checks, if Deno is available:

```bash
deno check --node-modules-dir=none supabase/functions/<function-name>/index.ts
```

Do not require protected-page browser E2E unless a valid tile key/session is available. If it is not available, report manual verification steps instead.

---

# Pass 1 - Mobile-First Reveal Restructure

## Before you paste this prompt

- Run `/status`.
- Run `/diff` if Codex has already modified this branch.
- Use `/new` or `/clear` if this is a clean new implementation pass.
- Use `/compact` only if the current session contains useful context from the previous Quietly Kept pass.
- Recommended reasoning: standard or medium is enough unless current code is messy or route/state handling is unclear.
- Use `/plan` before implementation because this touches several frontend files.

## Prompt to paste

```text
Implement the next Quietly Kept secret-page pass: mobile-first reveal restructure.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-mobile-reading-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Make /quietly-kept.html feel good on mobile. The page should feel deep, not long. Do not add Whispers, Final Ask state, or permission model changes in this pass unless a tiny supporting change is unavoidable.

Important verification boundary:
The Quietly Kept page is protected by tile/session identity. Do not waste time trying to access /quietly-kept.html in a browser without a valid Joey/Jeszi tile key or stored session. Do not add bypasses, fake credentials, source-committed secrets, or mock final emotional content. If authenticated route verification is not possible in this Codex session, document it as manual verification required and proceed with build/static/source-level checks.

Required behavior:
1. Do not render the full Constantia poem inline on the main page by default.
2. Show a compact Constantia preview card with title, subtitle, selected excerpt/preview, and a Read Constantia action.
3. Add a focused poem reading/detail mode, using query parameter or equivalent lightweight routing.
4. Preserve poem line breaks in the full poem view.
5. Segment the poem using server-provided content metadata if available, or gracefully render unsegmented content if metadata is missing.
6. Convert long sections into previews/cards on the main page.
7. Avoid nested scroll boxes and long open accordions on mobile.
8. Make the final ask area reachable without exhausting scroll, but do not implement the stateful Final Ask flow yet.
9. Keep mobile as the primary validation target.
10. Do not commit final emotional content to source. Use existing protected content payloads/placeholders only.

Non-goals:
- Do not add Whispers.
- Do not change editor permissions.
- Do not add Final Ask state.
- Do not alter hidden unlock rules unless existing routing requires a tiny compatibility fix.
- Do not add a public fallback page for unauthenticated viewers.

Before coding:
- Inspect current quiet page, CSS, JS, get-secret-page payload, and content rendering.
- Report a short plan.

Verification:
- Run the available build checks from package.json.
- Run the private build command if available.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- If protected-route verification is unavailable, explicitly report that manual authenticated verification is required.

Output report:
- Files read.
- Files changed.
- Behavior changes.
- Verification commands and output.
- Protected-route verification status.
- Deferred items.
```

---

# Pass 2 - Permissions and Editor Refactor

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to review Pass 1 changes.
- Use `/new` or `/clear` if the prior session is cluttered.
- Use `/compact` if the prior session has useful implementation context and is not confused.
- Recommended reasoning: stronger reasoning. This pass touches permission boundaries and server-side enforcement.
- Use `/plan` before implementation.

## Prompt to paste

```text
Implement the next Quietly Kept pass: permissions and editor model refactor.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
After unlock, Jeszi should not get global edit access. Fixed reveal content remains Joey-only. Living entries become shared after unlock and creator-owned.

Important verification boundary:
Do not attempt to verify protected pages through generic URLs without a valid Joey/Jeszi tile key or stored session. Do not add temporary auth bypasses. Do not hardcode tile keys or source-commit private content. Verify permissions by inspecting backend checks, request handling, and UI gating. If runtime authenticated verification is unavailable, document manual verification steps instead of chasing access routes.

Required behavior:
1. Fixed reveal content is Joey-only editable.
2. Jeszi cannot edit opener, poem, Two Names definitions, section intros, tally labels, or Final Ask copy.
3. After secret_unlocked_at exists, Jeszi may create/edit only her own allowed living entries.
4. Living entry edits are creator-owned unless an explicit Joey owner override already exists and is intentionally preserved.
5. Backend Edge Functions must enforce all write permissions.
6. Editor UI must only show section types/actions the current viewer can use.
7. Unauthorized write attempts must fail server-side.
8. Keep reveal-page edit controls visually secondary.

Non-goals:
- Do not implement Whispers yet unless required as a placeholder enum for future compatibility.
- Do not implement Final Ask response flow.
- Do not broaden access for convenience.
- Do not rely on frontend-only enforcement.

Before coding:
- Inspect current permission helpers, secret functions, editor implementation, schema, and RLS assumptions.
- Report a short plan and call out any migration needed.

Verification:
- Run build checks.
- Run Deno checks for modified Edge Functions if available.
- Verify permission logic at source/function level.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- If protected-route verification is unavailable, report manual authenticated verification cases.

Output report:
- Files read.
- Files changed.
- Schema/function changes.
- Permission rules implemented.
- Verification commands and output.
- Protected-route verification status.
- Manual test cases.
- Risks/deferred items.
```

---

# Pass 3 - Whispers Section

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to confirm prior permission changes are clean.
- Continue the same session only if it is short and focused; otherwise use `/new` or `/clear`.
- Recommended reasoning: medium or stronger if a migration is required.
- Use `/plan` before implementation because this touches schema, editor, rendering, and permissions.

## Prompt to paste

```text
Implement the next Quietly Kept pass: Whispers section.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Add Whispers as a long-form intimate keepsake section. Whispers are separate from homepage notes.

Important verification boundary:
Do not attempt generic browser access to protected Quietly Kept routes without a valid tile/session. Do not add auth bypasses or source-committed secrets. Verify with build checks, function checks, schema/source review, and documented manual authenticated test cases when runtime tokens are unavailable.

Required behavior:
1. Add a living entry type for Whispers, using the existing secret_entries model or a safe migration.
2. Whispers support 15,000 characters.
3. Main page shows whisper previews only.
4. Full whisper content opens in focused detail view.
5. Preserve paragraph and line breaks in full view.
6. Whispers do not appear on the homepage notes feed.
7. Whispers do not count toward the existing tally unless the product intentionally changes later.
8. Editor supports creating/editing/archiving owned Whispers.
9. Jeszi can create/edit her own Whispers only after unlock.
10. No final emotional content is committed to source.

Non-goals:
- Do not add private drafts unless the existing spec explicitly supports them.
- Do not add multi-image galleries.
- Do not rename the homepage tally unless required by existing UI conflicts.
- Do not make Whispers visible on the home page.

Before coding:
- Inspect current section types, entry schema, editor form, entry rendering, detail mode, and permission helper behavior.
- Report a short plan and any migration needed.

Verification:
- Run build checks.
- Run Deno checks for modified Edge Functions if available.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- If authenticated route verification is unavailable, report manual test cases.

Output report:
- Files read.
- Files changed.
- Schema/function changes.
- Whispers behavior implemented.
- Verification commands and output.
- Protected-route verification status.
- Manual test cases.
- Risks/deferred items.
```

---

# Pass 4 - Living Memories and Things I Love Grouping

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to inspect Pass 3 changes.
- Use `/new` or `/clear` if prior context is stale.
- Recommended reasoning: medium. Use stronger reasoning if schema/permission behavior is unclear.
- Use `/plan` if Codex expects a migration.

## Prompt to paste

```text
Implement the next Quietly Kept pass: Living Memories and Things I Love grouping.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md

Goal:
Make shared living contributions render clearly. Things I Love must be grouped by author and subject.

Important verification boundary:
Do not attempt protected-route runtime testing without a valid tile/session. Do not add token bypasses or fake source credentials. If authenticated UI verification is unavailable, verify source/build behavior and document manual checks.

Required behavior:
1. Living Memories show author quietly and use previews/detail views.
2. Things I Love entries support created_by and subject_user_slug.
3. Render groups:
   - Things Joey loves about Jeszi
   - Things Jeszi loves about Joey
4. Editor should set or infer subject_user_slug for Things I Love.
5. Jeszi can create Things I Love entries about Joey after unlock.
6. Joey can create Things I Love entries about Jeszi.
7. Entries remain creator-owned.
8. Mobile should show compact grouped previews.

Non-goals:
- Do not allow either user to edit the other user’s entries.
- Do not move fixed reveal content into living sections.
- Do not make the grouped sections feel like an admin dashboard.

Before coding:
- Inspect current entry schema, rendering, editor defaults, and permission enforcement.
- Report a short plan and any migration/mapping needed.

Verification:
- Run build checks.
- Run Deno checks for modified Edge Functions if available.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- If authenticated route verification is unavailable, report manual test cases.

Output report:
- Files read.
- Files changed.
- Schema/function changes.
- Grouping behavior implemented.
- Verification commands and output.
- Protected-route verification status.
- Manual test cases.
- Risks/deferred items.
```

---

# Pass 5 - Final Ask Core Flow

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to inspect prior living-section changes.
- Start a fresh session with `/new` or `/clear` unless the current session is short and focused.
- Recommended reasoning: stronger reasoning. This pass touches protected state, permissions, and a sensitive relationship flow.
- Use `/plan` before implementation.

## Prompt to paste

```text
Implement the next Quietly Kept pass: Final Ask core flow.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Implement the stateful Final Ask flow without celebration polish yet.

Important verification boundary:
Do not attempt to manually access protected routes without a valid Joey/Jeszi tile key or stored session. Do not add bypasses, hardcoded tile keys, source-committed final copy, or fake response shortcuts. Verify state and permissions through schema/function/source checks. If runtime authenticated verification is unavailable, document manual test cases and stop.

Required behavior:
1. Add dedicated final ask state storage.
2. Joey can manually reveal the Final Ask.
3. Jeszi cannot reveal it herself.
4. Jeszi can respond only after it is revealed.
5. Joey cannot respond as Jeszi.
6. Response options are Yes and Talk to me first.
7. Talk to me first stores a safe response state.
8. Yes stores response and accepted_at.
9. After response, casual overwrites are blocked.
10. Owner-only reset/hide exists for mistakes/testing.
11. Final Ask copy comes from protected content rows, not source.
12. Do not hardcode final romantic copy or notification copy.

Non-goals:
- Do not implement push notifications for Yes yet.
- Do not implement confetti/celebration yet.
- Do not implement anniversary reminders yet.
- Do not expose Final Ask controls to Jeszi.

Before coding:
- Inspect secret_page_content, get-secret-page, editor, push helpers, existing state tables, and permission helpers.
- Report a short plan and migration details.

Verification:
- Run build checks.
- Run Deno checks for modified Edge Functions if available.
- Verify state transitions at source/function level.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- If authenticated route verification is unavailable, report manual test cases.

Output report:
- Files read.
- Files changed.
- Schema/function changes.
- Final Ask state behavior.
- Verification commands and output.
- Protected-route verification status.
- Manual test cases.
- Deferred celebration work.
- Risks/deferred items.
```

---

# Pass 6 - Yes Celebration and Permanent Memory

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to inspect Final Ask core changes.
- Continue the same session only if it is clean and focused; otherwise use `/new` or `/clear`.
- Recommended reasoning: stronger reasoning because this touches push, state, and one-time UI behavior.
- Use `/plan` before implementation.

## Prompt to paste

```text
Implement the next Quietly Kept pass: Yes celebration and permanent memory.

Read these docs first:
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Make the Yes response a one-time memorable experience while staying within the quiet tone of Within Reach.

Important verification boundary:
Do not attempt protected-route browser testing without a valid tile/session. Do not add auth bypasses or source-committed secrets. Push delivery may not be fully testable in Codex; verify source-level behavior, build checks, and function checks, then document manual device/push verification requirements.

Required behavior:
1. On Yes, send push notification to Joey using protected content copy.
2. On Yes, send push notification to Jeszi using protected content copy.
3. Do not block accepted state if push fails.
4. Show a one-time restrained in-app celebration for Jeszi after successful Yes.
5. Show a one-time celebration for Joey on next relevant page load after acceptance.
6. Track celebration seen timestamps per user.
7. Respect prefers-reduced-motion.
8. Use soft hearts/petals/stars or similarly restrained particles, not loud party confetti.
9. Convert the ask section into a quieter permanent memory with accepted_at.
10. Do not commit final copy to source.

Non-goals:
- Do not implement anniversary reminders yet.
- Do not require push success for accepted state.
- Do not make the celebration repeat on every page load.
- Do not make the page feel like a party app.

Before coding:
- Inspect final ask state from Pass 5, push helper functions, service worker behavior, and page rendering.
- Report a short plan.

Verification:
- Run build checks.
- Run Deno checks for modified Edge Functions if available.
- Verify source-level push invocation and failure handling.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- If push/device verification is unavailable, report manual test cases.

Output report:
- Files read.
- Files changed.
- State/function changes.
- Celebration behavior.
- Verification commands and output.
- Protected-route verification status.
- Push caveats.
- Manual test cases.
- Risks/deferred items.
```

---

# Pass 7 - Anniversary Reminder

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to inspect Final Ask and celebration changes.
- Start a fresh session with `/new` or `/clear` unless the current session is specifically focused on scheduled push work.
- Recommended reasoning: stronger reasoning. This pass touches scheduled jobs, push, database state, and deployment setup.
- Use `/plan` before implementation.

## Prompt to paste

```text
Implement the next Quietly Kept pass: Final Ask anniversary reminder.

Read these docs first:
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Send a best-effort annual anniversary push based on accepted_at.

Important verification boundary:
Do not attempt protected-route browser verification without a valid tile/session. Scheduled push behavior may not be fully testable in Codex. Verify function logic, scheduling assumptions, idempotency, and deployment instructions. Document manual Supabase cron and real-device push verification requirements.

Required behavior:
1. Use accepted_at from secret_final_ask.
2. Only send when anniversary_enabled is true.
3. Use anniversary_timezone if present.
4. Send at most once per year.
5. Record last_anniversary_sent_for_year.
6. Use protected content rows for copy.
7. Use existing push helpers if possible.
8. Treat delivery as best-effort and document limitations.

Non-goals:
- Do not create a visible calendar UI.
- Do not send duplicate annual pushes.
- Do not hardcode final anniversary copy into source.
- Do not depend on exact-to-the-second push delivery.

Before coding:
- Inspect current scheduled function/cron patterns, push helper, Supabase deployment expectations, and final ask accepted_at state.
- Report a short plan and any manual Supabase cron setup required.

Verification:
- Run function checks if available.
- Verify idempotency and annual-send logic at source level.
- Do not perform protected-route browser verification unless a valid tile/session is available.
- Document manual Supabase cron setup and push testing steps.

Output report:
- Files read.
- Files changed.
- Function/schema changes.
- Deployment commands.
- Cron setup.
- Verification commands and output.
- Manual verification strategy.
- Risks/deferred items.
```

---

# Verification / Closeout Prompt

## Before you paste this prompt

- Run `/status`.
- Run `/diff` to confirm the working tree state.
- Use a lower-cost model if this is only documentation/output-report cleanup.
- Use stronger reasoning if reviewing auth, migrations, protected content, or push behavior.
- Use review mode if available and source changes are substantial.

## Prompt to paste

```text
Perform a Quietly Kept V2 verification/closeout review for the current branch.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-mobile-reading-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Review the implemented changes against the V2 specs without wasting time on protected-route browser access that is unavailable in this session.

Important verification boundary:
The Quietly Kept routes require valid tile/session identity and server-side unlock state. If this Codex session lacks valid Joey/Jeszi tile keys or stored sessions, do not attempt route-chasing, bypasses, or fake credentials. Mark authenticated runtime checks as manual verification required.

Tasks:
1. Inspect changed files.
2. Confirm final emotional content is not committed to source.
3. Confirm protected content is loaded through authorized server/API paths.
4. Confirm mobile-first rendering does not default to endless full-text scroll.
5. Confirm permission rules are enforced server-side, not only in UI.
6. Confirm Whispers, Things I Love, Living Memories, and Final Ask behavior match implemented pass scope.
7. Confirm build/function checks available in this workspace.
8. Identify risks, manual steps, and deployment commands.

Verification:
- Run available build checks.
- Run private build check if available.
- Run Deno/function checks if available and relevant.
- Do not perform protected-route browser verification unless valid tile/session is available.

Output report:
- Files inspected.
- Verification commands and output.
- Spec compliance summary.
- Protected-route verification status.
- Manual authenticated test checklist.
- Remaining risks.
- Deployment commands.
- Recommended next pass.
```
