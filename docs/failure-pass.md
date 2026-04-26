# Failure Pass

## Purpose
This repository should be reviewed with a failure-oriented posture, not only a feature-completion posture.

A pass is incomplete if it asks only whether the feature works.
The correct question is whether the change preserves the product while working.

---

## Core review stance
Every meaningful change should be read through five lenses:

1. **Product drift**
2. **Boundary failure**
3. **State drift**
4. **Accumulation**
5. **Polish regression**

A feature can be functionally correct and still be wrong for this repo.

---

## 1. Product drift
Look for changes that make the app feel less like a small shared object and more like a general app.

### Drift indicators
- extra actions or branches that dilute the core three actions
- notes behaving like messaging
- check-ins becoming stats or engagement events
- visible growth metrics
- feature surfaces that explain themselves too much
- system-led behavior replacing quiet ritual

### Questions
- Does this preserve the distinction between check-ins, notes, and urgent?
- Does this make the product louder?
- Does this add control surface without strong emotional value?
- Does this move the product toward chat, social, or dashboard behavior?

If yes, push back.

---

## 2. Boundary failure
Look for weak trust boundaries.

### Frontend boundary failures
- identity decided client-side
- protected behavior unlocked by local state alone
- browser notification permission treated as per-user push truth
- private urgent or hidden state visible from client assumptions

### Backend boundary failures
- validation done only in client
- side-effecting writes bypassing handlers
- private logs leaking into shared queries
- duplicate or invalid writes accepted too easily

### Service worker boundary failures
- push click flow creating state the backend cannot justify
- urgent logic existing only in notification layer
- push delivery assumed successful without durable backend record

### Questions
- What is the source of truth here?
- Can this be manipulated by client state?
- Is any private state visible through shared UI paths?
- Would this still be correct if push partially failed?

---

## 3. State drift
This repo is vulnerable to intent/code drift because it has evolved through iterative decisions.

### State drift indicators
- docs say one thing, UI does another
- backend supports a truth the frontend does not use
- old experiments remain half-active
- multiple layers hold competing versions of the same truth

### Current known risk areas
- current-device push-enabled truth versus user-level subscriptions or origin-level notification permission
- older SMS/Twilio urgent experiments versus newer push-only urgent direction
- private-build planning versus public-build behavior
- boot/reveal and landing logic slipping back toward generic fallback flashes

### Questions
- Is this consistent across docs, frontend, backend, and current intended direction?
- Is old experimental logic still shaping behavior?
- Is there duplicated truth across layers?

---

## 4. Accumulation
The product is especially sensitive to accumulation.

### Accumulation failures
- endless feed growth
- permanent system confirmations
- leftover test data
- UI surfaces that stack up instead of resolving
- feature additions that increase page weight without increasing meaning

### Questions
- Does this make the page feel larger?
- Does this add permanent visible residue?
- Does this create archive-feel instead of ritual-feel?
- Should this be ephemeral instead of persistent?

Prefer smallness.

---

## 5. Polish regression
Minor polish failures matter here because the product relies on tone.

### Common regressions
- generic fallback copy flashing before identity resolution
- abrupt transitions
- note cards looking like chat bubbles
- reaction rows crowding mobile
- urgency styled too harshly
- footer acting like a visible button
- noisy or repeated success states
- generic product copy replacing restrained language

### Questions
- Does this still feel calm?
- Does it still feel held?
- Does this visually over-explain?
- Does any surface now call too much attention to itself?

---

## Required review checklist
For non-trivial changes, check all of the following:

### Product check
- Core three-action model preserved
- Notes and check-ins remain separate
- Urgent remains private
- No visible scoreboards or growth loops introduced
- Exception: an optional, explicitly revealed two-person thought tally may be allowed for the hidden-letter ritual if it stays non-default, quiet, and non-gamified

### Boundary check
- Identity still server-validated
- Sensitive writes still server-side
- Frontend not trusted for protected truth
- Service worker not elevated into authority

### State check
- Frontend/backend behavior aligned
- Experimental paths not accidentally reactivated
- Docs and code not materially contradicting each other

### Accumulation check
- Feed size behavior considered
- Test residue removed or contained
- New UI states do not linger unnecessarily

### Tone check
- Copy remains warm and restrained
- Motion remains subtle
- Urgency remains serious but calm
- Footer remains understated

---

## Review comments should sound like this
Good review comments for this repo tend to be:

- “This works mechanically, but it pushes the page toward a feed product.”
- “The client is deciding a truth the backend should own.”
- “This exposes a private concept through a shared surface.”
- “The confirmation is correct, but it stays visible too long and becomes chrome.”
- “This increases history weight without protecting the small-object feel.”
- “This solves the feature but weakens the emotional split between actions.”

Bad review comments are too generic, such as:
- “Looks good.”
- “Could maybe refactor.”
- “Nice UX.”
- “Consider adding more options.”

This repository benefits from precise criticism, not broad positivity.

---

## Default bias
When uncertain, bias toward:
- less visible behavior
- stronger server truth
- quieter copy
- fewer branches
- smaller surfaces
- more deliberate history
- consolidation over expansion

A restrained no is often more aligned than an ambitious yes.
