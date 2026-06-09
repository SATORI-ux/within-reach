# Within Reach - Secret Page V2 Codex Pass Prompts

## How to Use This File

Use one pass at a time. Do not paste the whole implementation sequence as one giant coding request.

Recommended workflow:

1. Start a fresh Codex session for each major pass if context is getting heavy.
2. Ask Codex to inspect current files first.
3. Require a short plan before edits.
4. Keep each pass narrow.
5. Ask for verification output and changed-file report.

## Before Each Pass

Run or ask Codex to inspect:

```bash
git status --short
npm run build
```

For private build verification, use the project’s actual private build command. If current conventions match prior plans:

```powershell
$env:VITE_WITHIN_REACH_BUILD='private'; $env:VITE_ENABLE_PRIVATE_BUILD='true'; npm.cmd run build
```

Adjust commands to the repo’s actual package scripts.

## Pass 1 Prompt - Mobile-First Reveal Restructure

```text
Implement the next Quietly Kept secret-page pass: mobile-first reveal restructure.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-mobile-reading-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Make /quietly-kept.html feel good on mobile. The page should feel deep, not long. Do not add Whispers, Final Ask state, or permission model changes in this pass unless a tiny supporting change is unavoidable.

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

Before coding:
- Inspect current quiet page, CSS, JS, get-secret-page payload, and content rendering.
- Report a short plan.

After coding:
- Run the available build checks.
- Report changed files, behavior changes, verification output, and any deferred items.
```

## Pass 2 Prompt - Permissions and Editor Refactor

```text
Implement the next Quietly Kept pass: permissions and editor model refactor.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
After unlock, Jeszi should not get global edit access. Fixed reveal content remains Joey-only. Living entries become shared and creator-owned.

Required behavior:
1. Fixed reveal content is Joey-only editable.
2. Jeszi cannot edit opener, poem, Two Names definitions, section intros, tally labels, or Final Ask copy.
3. After secret_unlocked_at exists, Jeszi may create/edit only her own allowed living entries.
4. Living entry edits are creator-owned unless an explicit Joey owner override already exists and is intentionally preserved.
5. Backend Edge Functions must enforce all write permissions.
6. Editor UI must only show section types/actions the current viewer can use.
7. Unauthorized write attempts must fail server-side.
8. Keep reveal-page edit controls visually secondary.

Before coding:
- Inspect current permission helpers, secret functions, editor implementation, and schema.
- Report a short plan and call out any migration needed.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, schema/function changes, verification output, and manual test cases.
```

## Pass 3 Prompt - Whispers Section

```text
Implement the next Quietly Kept pass: Whispers section.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md
- docs/within-reach-secret-page-v2-content-security-data-contract.md

Goal:
Add Whispers as a long-form intimate keepsake section. Whispers are separate from homepage notes.

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

Before coding:
- Inspect current section types, entry schema, editor form, entry rendering, and detail mode.
- Report a short plan and any migration needed.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, schema/function changes, verification output, and manual test cases.
```

## Pass 4 Prompt - Living Memories and Things I Love Grouping

```text
Implement the next Quietly Kept pass: Living Memories and Things I Love grouping.

Read these docs first:
- docs/within-reach-secret-page-v2-roadmap.md
- docs/within-reach-secret-page-v2-living-sections-whispers-spec.md
- docs/within-reach-secret-page-v2-permissions-editor-spec.md

Goal:
Make shared living contributions render clearly. Things I Love must be grouped by author and subject.

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

Before coding:
- Inspect current entry schema and rendering.
- Report a short plan and any migration/mapping needed.

After coding:
- Run build checks.
- Report changed files, schema/function changes, verification output, and manual test cases.
```

## Pass 5 Prompt - Final Ask Core Flow

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

Before coding:
- Inspect secret_page_content, get-secret-page, editor, push helpers, and existing state tables.
- Report a short plan and migration details.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, schema/function changes, verification output, manual test cases, and deferred celebration work.
```

## Pass 6 Prompt - Yes Celebration and Permanent Memory

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

Before coding:
- Inspect final ask state from Pass 5, push helper functions, service worker behavior, and page rendering.
- Report a short plan.

After coding:
- Run build checks and Deno checks if available.
- Report changed files, verification output, push caveats, and manual test cases.
```

## Pass 7 Prompt - Anniversary Reminder

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

Before coding:
- Inspect current scheduled function/cron patterns, push helper, and Supabase deployment expectations.
- Report a short plan and any manual Supabase cron setup required.

After coding:
- Run function checks if available.
- Report changed files, deployment commands, cron setup, verification strategy, and risks.
```
