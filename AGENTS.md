# AGENTS.md

## Project intent
This repository builds **Within Reach**, a minimal two-person check-in space centered on quiet presence rather than conversation.

Its job is to support a small ritual:
- arrive through a personal tile
- leave a lightweight trace
- leave a deeper note when needed
- send a more serious signal when needed
- return to a shared place that feels like an object, not a platform

This project is not:
- a chat app
- a social feed
- a dashboard
- a productivity tool
- a growth surface
- a feature playground

When in doubt, preserve restraint.

---

## Source of truth
Before changing product behavior, copy, UI patterns, boundaries, or review posture, consult:

- `docs/product-brief.md`
- `docs/ux-guidelines.md`
- `docs/system-behavior.md`
- `docs/failure-pass.md`

If repository code, draft ideas, and these docs diverge, treat these docs as the intended product shape unless a newer repo-backed decision clearly supersedes them.

---

## Non-negotiable product rules
Always protect these:

- The app must feel warm, quiet, personal, and restrained.
- The experience should read like a small shared object translated into software.
- `Thinking of you` is ambient and low-friction.
- `Leave a note` is the deeper shared record.
- `Can you talk?` is serious but calm.
- Check-ins and notes are separate surfaces.
- Urgent events do not appear in the public shared history.
- No persistent scoreboard, stat block, or gamified count display.
- Exception: an explicitly revealed, optional two-person thought tally may exist for the hidden-letter ritual if it stays quiet, small, and non-default.
- Randomness must be curated, sparse, and tonally consistent.
- The product must not drift toward messaging, feeds, or engagement loops.

Do not add novelty where quiet clarity is the point.

---

## UX guardrails
When making frontend or copy changes:

### Favor
- clear single-purpose interactions
- soft pacing
- generous spacing
- understated motion
- readable chronology
- quiet confirmations
- minimal chrome
- stable labels
- controlled content pools

### Avoid
- feature expansion by default
- extra action types
- visible system complexity
- busy cards
- app-like control panels
- “smart” UI that explains too much
- chat bubble styling
- analytics-style counters
- aggressive alert styling
- cleverness that makes the product feel designed instead of cared for

### Specific behavior guardrails
- Landing should feel like recognition, not a splash screen.
- Notes should not read like a texting thread.
- Check-ins should remain lighter than notes.
- Footer should stay understated.
- Urgent should feel distinct, not alarm-like.
- Feed growth must be constrained. Prefer recent items plus quiet access to older history over endless expansion.

---

## System boundaries
Respect the product’s trust boundaries.

### Frontend
The frontend may:
- render arrival state
- collect user actions
- manage local presentation state
- smooth session continuity
- show ephemeral confirmations
- route into valid states returned by backend

The frontend must not:
- decide identity truth
- decide unlock or permission truth for protected flows
- expose private urgent history
- become the source of truth for long-term hidden or sensitive state
- treat browser notification permission alone as user-specific push truth

### Backend / Edge Functions
Server-side handlers are the authority for:
- tile/session validation
- identity resolution
- protected writes
- note validation
- reaction validation
- urgent signal creation
- push send attempts and result logging
- any future hidden-state progression or unlock logic

Any write with side effects should go through a server-side handler.

### Service worker / push layer
The service worker is a delivery surface, not product authority.

It may:
- receive push payloads
- show notifications
- deep-link back into the app

It must not:
- own durable product state
- become the only place where urgent truth exists
- replace backend validation
- invent visible behavior outside product tone

If a push or service-worker behavior fails, the app should degrade quietly and truthfully.

---

## Review posture
Review changes with a failure-first lens.

Do not ask only:
- “does this work?”

Also ask:
- “does this make the product louder?”
- “does this create drift toward chat, social, or dashboard behavior?”
- “does this break the emotional split between check-ins, notes, and urgent?”
- “does this trust the client too much?”
- “does this make a private surface visible?”
- “does this turn a quiet action into a system feature?”
- “does this increase cognitive load?”
- “does this create permanent accumulation where the product wants smallness?”

A change is not good merely because it functions.

---

## Failure-oriented review rules
When reviewing code or product changes, explicitly check:

1. **Boundary failures**
   - frontend-only enforcement
   - client-trusted identity
   - client-trusted push truth
   - private data exposed through visible feed paths
   - urgent logic visible where it should stay private

2. **Tone failures**
   - chat-app drift
   - dashboard drift
   - over-signaled urgency
   - ornamental motion
   - generic app copy
   - too many visible controls

3. **Accumulation failures**
   - endless feed growth
   - archival feel replacing ritual feel
   - stale test residue
   - persistent system messages that should be ephemeral

4. **State failures**
   - repo/docs drift
   - duplicated logic across frontend and backend
   - service worker doing product work
   - origin-level browser state mistaken for per-user state

5. **Polish failures**
   - generic fallback text flashing before identity resolves
   - note reactions crowding mobile
   - abrupt transitions
   - footer acting like obvious affordance
   - confirmation states that overstay

---

## Change discipline
Prefer:
- small targeted edits
- preserving existing structure when possible
- tightening seams over broad rewrites
- making visible surfaces simpler, not richer
- consolidating behavior already implied by the product

Avoid:
- speculative features
- adding infrastructure for futures the product has not earned
- broad rewrites justified only by cleanliness
- turning private-build ideas into default public-build behavior without a clear boundary

---

## Copy rules
Product writing should be:
- warm
- restrained
- lightly literary
- human
- direct
- calm

It should not be:
- theatrical
- overly sentimental
- startup-polished
- pushy
- self-explanatory in a way that ruins the mood

Prefer quiet confidence over explanation.

---

## Hidden/private build caution
The hidden-letter/private-build direction is valid only if it remains:
- inside existing emotional surfaces
- server-truth-based where needed
- free of visible progress UI
- impossible to stumble into casually
- tonally continuous with the main product

Do not let hidden systems become puzzle systems.

---

## Default implementation stance
For this repo, the best default behavior is:

- preserve minimalism
- protect boundaries
- cap growth
- remove residue
- make the current experience truer before making it broader
