# Within Reach - Final Ask Flow Spec

## Purpose

This spec defines the future **Final Ask** feature for the Quietly Kept secret page.

The Final Ask should not be a static editable section. It is a stateful, emotionally important interaction. It should be planned now and implemented after the mobile restructure, permission refactor, Whispers section, and mutual living sections are stable.

## Product Intent

The ask should feel:

- private
- intentional
- soft
- memorable
- safe
- not transactional
- not like a poll
- not like a form

It should support the real-life possibility that the question is asked in person first, or that the page facilitates the moment.

## Decisions Already Made

1. Joey manually reveals the Final Ask.
2. Jeszi cannot reveal it herself.
3. Response options are:
   - `Yes`
   - `Talk to me first`
4. A `Yes` should create a cute one-time memorable moment.
5. A `Talk to me first` response should be safe and non-punishing.
6. Owner-only reset/hide should exist for mistakes or testing.
7. A `Yes` response becomes a permanent quieter memory.
8. Anniversary reminder is desirable later.

## Implementation Timing

Do not implement this before:

1. Mobile-first reveal restructure.
2. Permission/editor refactor.
3. Whispers.
4. Living Memories and Things I Love grouping.

Recommended pass order:

- Pass 5: Final Ask core flow.
- Pass 6: Yes celebration and permanent memory.
- Pass 7: Anniversary reminder.

## Data Model

Use a dedicated table. Do not store this only as generic content.

Recommended table:

```sql
create table if not exists public.secret_final_ask (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'hidden'
    check (status in ('hidden', 'revealed', 'answered')),
  response text
    check (response in ('yes', 'talk_first')),
  revealed_at timestamptz,
  revealed_by text references public.tile_keys(user_slug) on update cascade,
  responded_at timestamptz,
  responded_by text references public.tile_keys(user_slug) on update cascade,
  accepted_at timestamptz,
  reset_at timestamptz,
  reset_by text references public.tile_keys(user_slug) on update cascade,
  joey_celebration_seen_at timestamptz,
  jeszi_celebration_seen_at timestamptz,
  yes_notification_sent_at timestamptz,
  talk_first_notification_sent_at timestamptz,
  anniversary_enabled boolean not null default false,
  anniversary_timezone text,
  last_anniversary_sent_for_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Use existing ID conventions if the project prefers bigint identities.

## Content Storage

Final Ask copy should live in protected Supabase content rows, not source files.

Do not hardcode the final romantic note, the exact question, or final push copy into JS, HTML, markdown, Edge Functions, migrations, or seed files.

Suggested content slugs:

- `final_ask_card_title`
- `final_ask_card_teaser`
- `final_ask_reveal_button`
- `final_ask_body`
- `final_ask_question`
- `final_ask_yes_label`
- `final_ask_talk_first_label`
- `final_ask_yes_screen_title`
- `final_ask_yes_screen_body`
- `final_ask_talk_first_screen_body`
- `final_ask_memory_title`
- `final_ask_memory_body`
- `final_ask_joey_push_title`
- `final_ask_joey_push_body`
- `final_ask_jeszi_push_title`
- `final_ask_jeszi_push_body`
- `final_ask_talk_first_push_title`
- `final_ask_talk_first_push_body`
- `final_ask_anniversary_push_title`
- `final_ask_anniversary_push_body`

Source may contain neutral placeholders only.

## Permission Rules

### Reveal

- Joey can reveal.
- Jeszi cannot reveal.
- Reveal requires Joey identity verified server-side.
- Reveal changes status from `hidden` to `revealed`.
- Record `revealed_at` and `revealed_by`.

### Respond

- Jeszi can respond only if status is `revealed`.
- Joey cannot respond as Jeszi.
- Response can be `yes` or `talk_first`.
- Response changes status to `answered`.
- Record `responded_at`, `responded_by`, and `response`.
- If response is `yes`, also set `accepted_at`.

### Reset/Hide

- Joey-only.
- Intended for mistakes/testing.
- Should not be visually prominent on reveal page.
- Should exist in editor/admin context.

### After Answer

- Casual overwrite should be blocked.
- Reset requires explicit owner action.
- The answer remains part of the page memory.

## UX States

### State: Hidden

Jeszi:

- sees no Final Ask card.

Joey:

- sees owner-only editor control:
  - Final Ask status
  - Reveal final ask
  - Reset/hide if needed

### State: Revealed

Near the end of the page, render a quiet card.

Intent:

- One more piece exists.
- She can read it when ready.
- Do not force the note open immediately.

Suggested structure:

- Title from protected content.
- Teaser from protected content.
- Button from protected content.

Button opens the ask detail.

Ask detail:

- Shows body copy from protected content.
- Shows question from protected content.
- Shows buttons:
  - Yes
  - Talk to me first

### State: Answered - Yes

Immediate behavior:

- Store server response.
- Send push notifications.
- Trigger one-time celebration.
- Show cute in-app message.
- Convert ask section into memory state.

Permanent behavior:

- Ask card becomes quieter.
- Show accepted date/time.
- It remains as a kept memory.

Suggested display intent:

- Official.
- Accepted date/time.
- This part is no longer waiting.

Exact wording must come from protected content.

### State: Answered - Talk First

Immediate behavior:

- Store server response.
- Do not show confetti.
- Optionally notify Joey.
- Show calm, safe message.

Suggested display intent:

- Okay.
- I’m here.
- We can talk about it.

Exact wording must come from protected content.

## Yes Celebration

The celebration should be memorable but still Within Reach.

Rules:

- One-time only.
- Trigger for Jeszi immediately after successful Yes.
- Trigger for Joey on next page load or notification open after Yes.
- Respect reduced-motion settings.
- Last 2 to 3 seconds.
- Use soft hearts, petals, warm particles, or subtle stars.
- Avoid neon party confetti.
- Avoid loud game-like effects.

State tracking:

- `jeszi_celebration_seen_at`
- `joey_celebration_seen_at`

If reduced motion is enabled:

- show the message without animation.

## Push Notifications

On Yes, send to both users with different copy.

Intent:

- Joey’s push can be more excited.
- Jeszi’s push should be softer/cuter.

Copy must be content-driven, not source-hardcoded.

On Talk First:

- optional quiet notification to Joey.
- no dramatic copy.

Notification sending should be best-effort:

- record success/failure if existing push helper supports it
- do not block the app state update because push failed

## Permanent Memory State

After Yes, render a quieter memory card.

Include:

- acceptance date
- acceptance time
- maybe small closing line
- no response buttons

This should feel like a kept moment, not a form result.

## Anniversary Reminder

This is a later pass.

Requirements:

- `accepted_at` exists.
- `anniversary_enabled` is true.
- scheduled function checks anniversary windows.
- one send per year.
- record `last_anniversary_sent_for_year`.

Delivery caveat:

- Push delivery is best-effort.
- Exact-time delivery cannot be guaranteed to the second due to browser/device/network behavior.
- The scheduled check cadence determines how close the reminder is to the local anniversary day. Run it at least daily, and preferably hourly, if tighter delivery is desired.
- `anniversary_timezone` controls the local anniversary date when present. If it is absent, the scheduled sender may fall back to UTC.

Suggested notification intent:

- one year official
- still quietly kept
- exact copy content-driven

## Recommended Edge Functions

Possible functions:

- `get-secret-page`
  - include final ask state and permission flags
- `reveal-final-ask`
  - Joey-only
- `respond-final-ask`
  - Jeszi-only after reveal
- `reset-final-ask`
  - Joey-only
- `mark-final-ask-celebration-seen`
  - current viewer only
- `send-final-ask-anniversary`
  - scheduled function, later pass

Names can match project conventions.

## Acceptance Criteria

Final Ask core is complete when:

- Final Ask is hidden until Joey manually reveals it.
- Jeszi cannot reveal it.
- Jeszi can respond only after reveal.
- Joey cannot respond as Jeszi.
- Response options are Yes and Talk to me first.
- Talk to me first stores a safe state and does not trigger confetti.
- Yes stores `accepted_at`.
- After Yes, response becomes a permanent memory.
- Owner-only reset exists.
- Backend enforces all rules.
- No final ask copy is committed to source.

Yes celebration is complete when:

- Yes sends push notifications to both users.
- Celebration appears one time only.
- Celebration respects reduced motion.
- Joey can see his one-time celebration on next load after acceptance.
- Accepted memory remains after celebration.

Anniversary pass is complete when:

- scheduled notification checks acceptance anniversary
- sends once per year
- records sent year
- does not duplicate notifications
