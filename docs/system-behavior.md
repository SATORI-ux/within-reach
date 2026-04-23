# System Behavior

## Purpose
This document defines which layers are responsible for which truths.

The product is intentionally small, but it still needs clear boundaries.
Minimal does not mean boundaryless.

---

## System overview
Within Reach has three practical layers:

1. **Frontend**
2. **Backend / Edge Functions**
3. **Service worker / push delivery**

Each has a distinct role.

---

## Frontend responsibilities
The frontend is responsible for:
- rendering the page shell
- reading incoming URL state
- preserving local session continuity where appropriate
- initiating actions
- rendering feeds
- presenting ephemeral confirmations
- handling transitions and lightweight UI state

The frontend may:
- store presentation state locally
- smooth install/home-screen flows
- remove visible query keys after capture
- render urgency or landing states returned from valid backend context

The frontend must not:
- be the authority for user identity
- trust raw client-side state for protected flows
- expose urgent private history
- decide hidden/private unlock truth on its own
- mistake browser-wide notification permission for per-user push enablement

If a client-side shortcut would change authority, do not take it.

---

## Backend / Edge Function responsibilities
The backend is responsible for authoritative truth.

It must own:
- tile key validation
- session validation
- identity resolution
- protected writes
- note length validation
- reaction allow-list validation
- urgent signal creation
- private logging
- push send attempts and result logging
- future hidden/private progression logic
- any state that should persist across devices

### General rule
Any write with side effects should go through a server-side handler.

This includes:
- check-ins
- notes
- reactions
- urgent signals
- push subscription persistence
- any future hidden/private build state updates

Do not move these into frontend-only behavior for convenience.

---

## Service worker responsibilities
The service worker is a delivery and return surface.

It may:
- receive push events
- display notifications
- focus an existing app window
- open the app into an intended route or state

It must not:
- become the main product state machine
- hold authoritative urgent truth
- replace backend validation
- create unsupported product states without backend backing

Push delivery is an enhancement layer, not the product database.

---

## Identity model
The product does not use traditional login.

Identity is inferred from:
- tile key
- or approved session continuity derived from a valid tile resolution flow

### Rules
- The client may capture a key.
- The server must validate it.
- The server returns identity shape used for UI rendering.
- Client persistence is for smoothing, not for authority.

Where identity matters, trust the server.

---

## Feed behavior
The visible shared history has two public surfaces:

1. **Check-ins**
2. **Notes**

### Check-ins
- short
- templated
- ambient
- visible in shared feed
- no reactions

### Notes
- fuller content
- visible in shared feed
- reaction-enabled
- newest-first chronology

### Urgent signals
Urgent signals are not part of the visible shared history.

They may be:
- logged privately
- used to trigger push
- used to route into an urgent state

They must not be rendered into the public feed surface.

---

## Validation rules
All important behavioral validation should happen server-side.

At minimum validate:
- tile/session authenticity
- note length
- reaction membership in allowed set
- duplicate reaction constraints
- urgent signal permissions
- any future private-build thresholds or unlock conditions

Client-side checks may improve UX, but they do not replace backend enforcement.

---

## Push truth
Push truth is per-user, not merely per-browser-origin.

Do not infer:
- “notifications allowed in browser”
as equivalent to:
- “current user has a valid active push subscription row”

The system should prefer backend-derived push-enabled truth for the current resolved identity.

This is an important boundary because the app is two-person and may be used on shared or reused devices.

---

## Failure behavior
The system should fail quietly but truthfully.

### Good failure behavior
- show a calm error or inactive-state message
- keep visible history clean
- avoid fake success
- keep invalid urgent behavior private
- let the app remain readable even when delivery layers fail

### Bad failure behavior
- assuming success without backend confirmation
- showing public urgent traces
- revealing private state because a client branch misfired
- making the service worker the only record of a critical event

---

## Boundary checks for changes
When changing code, explicitly verify:

### Frontend boundary check
- Is the client deciding something the server should decide?
- Is this depending on localStorage or cookies for authority rather than continuity?
- Is visible UI exposing a private backend concept?

### Backend boundary check
- Are writes still going through server-side handlers?
- Is validation happening server-side or only in the client?
- Could one identity affect another through weak validation?
- Are urgent and private states kept private?

### Service worker boundary check
- Is push routing tied back to real backend state?
- If a notification is clicked, does the app validate the resulting state?
- Would the product still behave truthfully if push delivery partially failed?

If any answer is weak, the change is not ready.

---

## Preferred architecture posture
Prefer:
- server truth
- thin client assumptions
- narrow handlers
- quiet degradation
- explicit separation of public and private data surfaces

Avoid:
- frontend-only enforcement
- duplicated truth across layers
- push-only logic with no backend confirmation
- convenience branches that expose private states