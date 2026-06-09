# Within Reach - Secret Page V2 Codex Pass Prompts

## How to Use This File

Use one pass at a time. Do not paste the whole implementation sequence as one giant coding request.

Recommended workflow:

1. Start a fresh Codex session for each major pass if context is getting heavy.
2. Ask Codex to inspect current files first.
3. Require a short plan before edits.
4. Keep each pass narrow.
5. Ask for verification output and changed-file report.

## Critical Verification Boundary

Quietly Kept routes are protected by tile/session identity. If Codex does not have a valid Joey/Jeszi tile key or stored browser session, it cannot fully verify protected runtime behavior through a browser.

Codex should not waste tokens trying to:

- bypass auth
- invent credentials
- repeatedly access protected routes generically
- treat expected locked states as implementation failures
- chase route access that requires real private tokens

Codex should verify:

- source-level logic
- build success
- Deno/type checks for Edge Functions when available
- permission branches by reading code
- manual test cases to run with valid Joey/Jeszi sessions

Protected-route browser verification should be reported as **manual verification required** when no valid token/session is available.

---

## Pass 1 - Mobile-First Reveal Restructure

### Before you paste this prompt

#### If Codex

- Run `/status`.
- Run `/diff` if prior work changed files.
- Use `/new` or `/clear` if the current session contains stale or unrelated context.
- Use `/compact` if the current session contains useful Quietly Kept decisions but is long.
- Recommended model/reasoning: use a normal implementation-capable Codex model with medium reasoning. This is source-review-heavy UI work, but not a new auth boundary.
- Use `/plan` first because this pass touches multiple frontend files and protected route rendering.

#### If Claude Code

- Run `/context`.
- Run `/diff` if prior work changed files.
- Use `/compact` if current context is useful but long, or `/clear` if stale context is likely.
- Recommended model/effort: current Sonnet-class model with medium effort.
- Use `/plan` before implementation.

### Prompt to paste

```text
Implement the next Quietly Kept secret-page pass: mobile-first reveal restructure.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-mobile-reading-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Make /quietly-kept.html feel good on mobile. The page should feel deep, not long. Do not add Whispers, Final Ask state, or new contribution-page behavior in this pass unless a tiny supporting change is unavoidable.

Required behavior:
1. Do not render the full Constantia poem inline on the main page by default.
2. Show a compact Constantia preview card with title, subtitle, selected excerpt/preview, and a Read Constantia action.
3. Add a focused poem reading/detail mode, using query parameter or equivalent lightweight routing.
4. Preserve poem line breaks in the full poem view.
5. Segment the poem using server-provided content metadata if available, or gracefully render unsegmented content if metadata is missing.
6. Convert long sections into previews/cards on the main page.
7. Avoid nested scroll boxes and long open accordions on mobile.
8. Make the Final Ask area reachable without exhausting scroll, but do not implement the stateful Final Ask flow yet.
9. Keep mobile as the primary validation target.
10. Do not commit final emotional content to source. Use existing protected content payloads/placeholders only.
11. Do not waste time trying to access protected routes without valid tile/session identity. If no valid identity is available, mark protected-route browser checks as manual verification required.

Before coding:
- Inspect current quiet page, CSS, JS, get-secret-page payload, and content rendering.
- Report a short plan.

After coding:
- Run the available build checks.
- Run Deno/function checks only if relevant files changed and Deno is available.
- Report changed files, behavior changes, verification output, protected-route manual checks, and any deferred items.
```

---

## Pass 2 - Already Completed Permission Refactor Baseline

This pass may already be implemented in the repo.

Reported implemented behavior:

- Fixed reveal content is Joey-only editable.
- Jeszi can view after unlock but cannot edit fixed content.
- Jeszi after unlock can create/edit/archive only her own allowed living entries: `thing_i_love`, `still_being_written`.
- Jeszi cannot create/edit/archive `little_proof`.
- Entry image upload checks the same ownership rules.
- `get-secret-page` returns `can_edit_fixed_content`, `allowed_entry_sections`, and per-entry `can_edit`.

Do not revert this work wholesale. Treat it as useful server-side groundwork.

The revised direction is handled in Pass 2B.

---

## Pass 2B - Contribution Flow Walkback / Editor Separation

### Before you paste this prompt

#### If Codex

- Run `/status`.
- Run `/diff` first because this pass directly follows recent permission/editor changes.
- Continue the same session only if Codex just made the permission refactor and context is clean; otherwise use `/new` or `/clear` with these docs attached.
- Recommended model/reasoning: medium reasoning. This is mostly frontend workflow plus permission-aware integration. Use stronger reasoning only if Codex identifies auth/schema uncertainty.
- Use `/plan` first.

#### If Claude Code

- Run `/context` and `/diff`.
- Continue same session if it just completed the permission refactor; otherwise use `/compact` or `/clear` based on context quality.
- Recommended model/effort: current Sonnet-class model with medium effort; high effort only if auth helper behavior is unclear.
- Use `/plan` first.

### Prompt to paste

```text
Implement the next Quietly Kept pass: contribution flow walkback / editor separation.

Context:
A prior permissions/editor refactor may already be implemented. Do not revert the server-side hardening. Keep useful permission helpers such as can_edit_fixed_content, allowed_entry_sections, created_by ownership checks, and per-entry can_edit if they exist.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-contribution-flows-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Stop treating Jeszi as a broad editor user. The reveal page should remain a reading/returning surface. Shared participation should happen through focused section-specific contribution pages.

Required behavior:
1. Keep /quietly-kept-editor.html as Joey-only or owner/fixed-content only.
2. Jeszi should not see or use the broad editor for normal participation after unlock.
3. Add a focused contribution route, recommended /quietly-kept-entry.html.
4. Support create mode by section query:
   - ?section=still_being_written
   - ?section=thing_i_love
   - ?section=whisper if the section type already exists; otherwise handle gracefully until Whispers pass.
5. Support edit mode by entry query:
   - ?entry=<entry_id>
6. The focused contribution page should show only fields/actions relevant to the selected section or entry.
7. Main reveal page should show quiet permission-gated action buttons inside living sections instead of a broad Edit this page link:
   - Add a memory
   - Add something I love about {counterpart}
   - Add a whisper, only if Whispers exists or is safely placeholder-disabled
8. Contribution buttons must only appear when the current viewer is permitted to use them.
9. Backend must still enforce all entry permissions. Do not rely on UI hiding.
10. Existing entry APIs may be reused. Avoid duplicating server logic.
11. Do not commit final emotional content to source.
12. Do not waste time trying protected-route browser access without valid tile/session identity. Mark those checks as manual verification required if no valid identity is available.

Before coding:
- Inspect current editor route, reveal page edit controls, API wrappers, permission payload, entry upsert/archive/media functions, and Vite inputs.
- Report a short plan and whether any schema migration is needed.

After coding:
- Run build checks.
- Run Deno checks for changed Edge Functions if applicable and available.
- Report changed files, behavior changes, permission behavior, protected-route manual checks, and any deferred items.
```

---

## Pass 3 - Whispers Section

### Before you paste this prompt

#### If Codex

- Run `/status` and `/diff`.
- Use `/new` or `/clear` if moving from layout work to schema/function work and stale context is likely.
- Recommended model/reasoning: stronger reasoning or medium-high reasoning because this may touch schema, function validation, and long text handling.
- Use `/plan` first.

#### If Claude Code

- Run `/context` and `/diff`.
- Recommended model/effort: current Sonnet-class model with medium or high effort because this may touch schema/data writes and protected content.
- Use `/plan` first.

### Prompt to paste

```text
Implement the next Quietly Kept pass: Whispers section.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-contribution-flows-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Add Whispers as a long-form intimate keepsake section. Whispers are separate from homepage notes and use the focused contribution route, not the broad editor.

Required behavior:
1. Add a living entry type for Whispers, using the existing secret_entries model or a safe migration.
2. Whispers support 15,000 characters.
3. Main page shows whisper previews only.
4. Full whisper content opens in focused detail view.
5. Preserve paragraph and line breaks in full view.
6. Whispers do not appear on the homepage notes feed.
7. Whispers do not count toward the existing tally unless the product intentionally changes later.
8. /quietly-kept-entry.html supports creating/editing/archiving owned Whispers.
9. Jeszi can create/edit her own Whispers only after unlock.
10. No final emotional content is committed to source.
11. Do not waste time trying protected-route browser access without valid tile/session identity. Mark those checks as manual verification required if no valid identity is available.

Before coding:
- Inspect current section types, entry schema, contribution route, entry rendering, and detail mode.
- Report a short plan and any migration needed.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, schema/function changes, verification output, protected-route manual checks, and manual test cases.
```

---

## Pass 4 - Living Memories and Things I Love Grouping

### Before you paste this prompt

#### If Codex

- Run `/status` and `/diff`.
- Recommended model/reasoning: medium reasoning; increase if schema migration or backfill is needed.
- Use `/plan` first.

#### If Claude Code

- Run `/context` and `/diff`.
- Recommended model/effort: current Sonnet-class model with medium effort.
- Use `/plan` first.

### Prompt to paste

```text
Implement the next Quietly Kept pass: Living Memories and Things I Love grouping.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-contribution-flows-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md

Goal:
Make shared living contributions render clearly. Things I Love must be grouped by author and subject. Focused contribution pages should infer the subject automatically.

Required behavior:
1. Living Memories show author quietly and use previews/detail views.
2. Things I Love entries support created_by and subject_user_slug.
3. Render groups:
   - Things Joey loves about Jeszi
   - Things Jeszi loves about Joey
4. The Things I Love contribution flow should infer subject_user_slug from the current viewer:
   - Joey => subject Jeszi
   - Jeszi => subject Joey
5. Do not make users manually choose the subject in the normal two-person flow.
6. Jeszi can create Things I Love entries about Joey after unlock.
7. Joey can create Things I Love entries about Jeszi.
8. Entries remain creator-owned.
9. Mobile should show compact grouped previews.
10. Do not commit final emotional content to source.
11. Do not waste time trying protected-route browser access without valid tile/session identity. Mark those checks as manual verification required if no valid identity is available.

Before coding:
- Inspect current entry schema, contribution route, API functions, and rendering.
- Report a short plan and any migration/mapping needed.

After coding:
- Run build checks.
- Run Deno checks for changed functions if applicable.
- Report changed files, schema/function changes, verification output, protected-route manual checks, and manual test cases.
```

---

## Pass 5 - Final Ask Core Flow

### Before you paste this prompt

#### If Codex

- Run `/status` and `/diff`.
- Use `/new` or `/clear` if this starts after several UI/content passes.
- Recommended model/reasoning: stronger reasoning or medium-high reasoning. This pass adds stateful interaction, permissions, and response writes.
- Use `/plan` first.

#### If Claude Code

- Run `/context` and `/diff`.
- Recommended model/effort: current Sonnet-class model with high effort, or stronger model if available, because this pass touches state, permissions, and emotionally sensitive behavior.
- Use `/plan` first.

### Prompt to paste

```text
Implement the next Quietly Kept pass: Final Ask core flow.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Implement the stateful Final Ask flow without celebration polish yet.

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
13. Do not waste time trying protected-route browser access without valid tile/session identity. Mark those checks as manual verification required if no valid identity is available.

Before coding:
- Inspect secret_page_content, get-secret-page, editor/owner controls, push helpers, and existing state tables.
- Report a short plan and migration details.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, schema/function changes, verification output, protected-route manual checks, manual test cases, and deferred celebration work.
```

---

## Pass 6 - Yes Celebration and Permanent Memory

### Before you paste this prompt

#### If Codex

- Run `/status` and `/diff`.
- Recommended model/reasoning: medium-high reasoning because this touches push, one-time state, and UI celebration behavior.
- Use `/plan` first.

#### If Claude Code

- Run `/context` and `/diff`.
- Recommended model/effort: current Sonnet-class model with medium/high effort.
- Use `/plan` first.

### Prompt to paste

```text
Implement the next Quietly Kept pass: Yes celebration and permanent memory.

Read these docs first:
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Make the Yes response a one-time memorable experience while staying within the quiet tone of Within Reach.

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
11. Do not waste time trying protected-route browser access without valid tile/session identity. Mark those checks as manual verification required if no valid identity is available.

Before coding:
- Inspect final ask state from Pass 5, push helper functions, service worker behavior, and page rendering.
- Report a short plan.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, verification output, push caveats, protected-route manual checks, and manual test cases.
```

---

## Pass 7 - Anniversary Reminder

### Before you paste this prompt

#### If Codex

- Run `/status` and `/diff`.
- Recommended model/reasoning: stronger reasoning or medium-high reasoning because this may touch scheduled functions and push delivery.
- Use `/plan` first.

#### If Claude Code

- Run `/context` and `/diff`.
- Recommended model/effort: current Sonnet-class model with high effort, or stronger model if available, because this touches scheduled backend behavior.
- Use `/plan` first.

### Prompt to paste

```text
Implement the next Quietly Kept pass: Final Ask anniversary reminder.

Read these docs first:
- docs/within-reach-secret-page-v2-final-ask-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Send a best-effort annual anniversary push based on accepted_at.

Required behavior:
1. Use accepted_at from secret_final_ask.
2. Only send when anniversary_enabled is true.
3. Use anniversary_timezone if present.
4. Send at most once per year.
5. Record last_anniversary_sent_for_year.
6. Use protected content rows for copy.
7. Use existing push helpers if possible.
8. Treat delivery as best-effort and document limitations.
9. Do not commit final notification copy to source.

Before coding:
- Inspect current scheduled function/cron patterns, push helper, and Supabase deployment expectations.
- Report a short plan and any manual Supabase cron setup required.

After coding:
- Run function checks if available.
- Report changed files, deployment commands, cron setup, verification strategy, and risks.
```
