import {
  ACCENT_BY_USER,
  AMBIENT_LINES_PERSONALIZED,
  AMBIENT_LINES_SHARED,
  ARRIVAL_AMBIENT_LINE_WEIGHTING,
  CHECK_IN_TEMPLATES,
  ENABLE_SECRET_SECTION,
  ENABLE_FUNNY_FACTS,
  ENV_PRIVATE_ARRIVAL_LINES,
  FOOTER_LINES,
  FUNNY_FACTS_SHARED,
  GREETING_BY_USER,
  HIDDEN_LETTER_PATH,
  IS_PRIVATE_BUILD,
  LANDING_SECONDARY_LINE_WEIGHTING,
  REACTIONS,
  SECRET_CLUE_FRAGMENT_CHANCE,
  SECRET_CLUE_FRAGMENTS,
} from './config.js';

const emptyPrivateCopy = {
  ARRIVAL_LINES_PERSONALIZED: {},
  FUNNY_FACTS_PERSONAL: [],
  FUNNY_FACTS_SECRET: [],
};

const privateCopyPromise = IS_PRIVATE_BUILD ? import('./private-copy.js') : Promise.resolve(emptyPrivateCopy);

const arrivalGreetingEl = document.querySelector('#arrivalGreeting');
const arrivalLineEl = document.querySelector('#arrivalLine');
const heroStatusEl = document.querySelector('#heroStatus');
const footerLineEl = document.querySelector('#footerLine');
const factInterludeEl = document.querySelector('#factInterlude');
const factInterludeLineEl = document.querySelector('#factInterludeLine');
const checkInsFeedEl = document.querySelector('#checkInsFeed');
const notesFeedEl = document.querySelector('#notesFeed');
const toastStackEl = document.querySelector('#toastStack');
const secretNoticeEl = document.querySelector('#secretNotice');
const ackSecretNoticeButton = document.querySelector('#ackSecretNoticeButton');
const checkInTemplate = document.querySelector('#checkInItemTemplate');
const noteCardTemplate = document.querySelector('#noteCardTemplate');
const actionMessageEl = document.querySelector('#actionMessage');
const noteMessageEl = document.querySelector('#noteMessage');
const appShellEl = document.querySelector('.app-shell');
const mainContentEl = document.querySelector('#mainContent');
const arrivalSectionEl = document.querySelector('#arrivalSection');

const loadOlderCheckInsButton = document.querySelector('#loadOlderCheckInsButton');
const collapseCheckInsButton = document.querySelector('#collapseCheckInsButton');
const loadOlderNotesButton = document.querySelector('#loadOlderNotesButton');
const collapseNotesButton = document.querySelector('#collapseNotesButton');

const CLUE_FRAGMENT_INDEX_KEY = 'within-reach.secret-clue-fragment-index';
const SECRET_NOTICE_ACK_PREFIX = 'within-reach.secret-notice-ack.';
const FOOTER_HOLD_DURATION_MS = 1200;
let hiddenDoorUnlocked = false;
let footerHoldTimer = null;
let pendingSecretNoticeKey = '';

function getArrivalDebugMode() {
  return new URLSearchParams(window.location.search).get('debugArrival') === '1';
}

function getForcedArrivalBucket() {
  const bucket = new URLSearchParams(window.location.search).get('debugArrivalBucket');
  return ['shared', 'personal', 'private'].includes(bucket) ? bucket : null;
}

function pseudoRandomIndex(seedValue, length) {
  const seed = Number(seedValue) || 0;
  return Math.abs(seed) % length;
}

function pickRandom(items) {
  if (!items.length) return '';
  return items[Math.floor(Math.random() * items.length)];
}

async function getArrivalAmbientLine(visitor) {
  const privateCopy = await privateCopyPromise;
  const publicLines = AMBIENT_LINES_PERSONALIZED[visitor.user_slug] || [];
  const filePrivateLines = privateCopy.ARRIVAL_LINES_PERSONALIZED?.[visitor.user_slug] || [];
  const envPrivateLines = ENV_PRIVATE_ARRIVAL_LINES[visitor.user_slug] || [];
  const privateLines = [...filePrivateLines, ...envPrivateLines];
  const buckets = [
    {
      name: 'shared',
      weight: ARRIVAL_AMBIENT_LINE_WEIGHTING.shared,
      lines: AMBIENT_LINES_SHARED,
    },
    {
      name: 'personal',
      weight: ARRIVAL_AMBIENT_LINE_WEIGHTING.personal,
      lines: publicLines,
    },
    {
      name: 'private',
      weight: ARRIVAL_AMBIENT_LINE_WEIGHTING.private,
      lines: privateLines,
    },
  ].filter((bucket) => bucket.weight > 0 && bucket.lines.length);

  if (!buckets.length) {
    return {
      line: '',
      bucket: 'none',
      counts: {
        shared: AMBIENT_LINES_SHARED.length,
        personal: publicLines.length,
        private: privateLines.length,
      },
      forcedBucket: getForcedArrivalBucket(),
    };
  }

  const forcedBucket = getForcedArrivalBucket();
  if (forcedBucket) {
    const forced = buckets.find((bucket) => bucket.name === forcedBucket);
    if (forced) {
      return {
        line: pickRandom(forced.lines),
        bucket: forced.name,
        counts: {
          shared: AMBIENT_LINES_SHARED.length,
          personal: publicLines.length,
          private: privateLines.length,
        },
        forcedBucket,
      };
    }
  }

  const totalWeight = buckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const bucket of buckets) {
    if (roll < bucket.weight) {
      return {
        line: pickRandom(bucket.lines),
        bucket: bucket.name,
        counts: {
          shared: AMBIENT_LINES_SHARED.length,
          personal: publicLines.length,
          private: privateLines.length,
        },
        forcedBucket,
      };
    }
    roll -= bucket.weight;
  }

  const fallbackBucket = buckets[buckets.length - 1];
  return {
    line: pickRandom(fallbackBucket.lines),
    bucket: fallbackBucket.name,
    counts: {
      shared: AMBIENT_LINES_SHARED.length,
      personal: publicLines.length,
      private: privateLines.length,
    },
    forcedBucket,
  };
}

function getSharedFacts() {
  return Object.values(FUNNY_FACTS_SHARED).flat();
}

function getDebugSecondaryLine(privateCopy) {
  if (!IS_PRIVATE_BUILD) return null;

  const debugType = new URLSearchParams(window.location.search).get('debugSecondary');

  if (debugType === 'none') return '';
  if (debugType === 'fact' || debugType === 'shared') return pickRandom(getSharedFacts());
  if (debugType === 'personal') return pickRandom(privateCopy.FUNNY_FACTS_PERSONAL);
  if (debugType === 'secret' && ENABLE_SECRET_SECTION) return pickRandom(privateCopy.FUNNY_FACTS_SECRET);

  return null;
}

function getNextClueFragment() {
  const currentIndex = Number(window.localStorage.getItem(CLUE_FRAGMENT_INDEX_KEY) || 0);
  const fragmentIndex = Math.abs(currentIndex) % SECRET_CLUE_FRAGMENTS.length;
  const fragment = SECRET_CLUE_FRAGMENTS[fragmentIndex];
  window.localStorage.setItem(CLUE_FRAGMENT_INDEX_KEY, String(currentIndex + 1));

  return fragment;
}

function getFactWithClueFragment(force = false) {
  if (!IS_PRIVATE_BUILD || (!force && Math.random() >= SECRET_CLUE_FRAGMENT_CHANCE)) return null;

  const fragment = getNextClueFragment();
  if (!fragment) return null;

  const fact = pickRandom(getSharedFacts());
  if (!fact) return null;

  return {
    fact,
    fragment,
  };
}

async function getWeightedLandingSecondaryLine() {
  const privateCopy = await privateCopyPromise;
  const debugLine = getDebugSecondaryLine(privateCopy);

  if (debugLine !== null) return debugLine;

  const roll = Math.random();
  const { none, shared, personal } = LANDING_SECONDARY_LINE_WEIGHTING;

  if (roll < none) return '';
  if (roll < none + shared) return pickRandom(getSharedFacts());
  if (roll < none + shared + personal) return pickRandom(privateCopy.FUNNY_FACTS_PERSONAL);
  if (ENABLE_SECRET_SECTION) return pickRandom(privateCopy.FUNNY_FACTS_SECRET);

  return '';
}

function setFactInterlude(fact, fragment = '') {
  if (!factInterludeEl || !factInterludeLineEl) return;

  const hasFact = Boolean(fact);
  factInterludeEl.hidden = !hasFact;

  if (hasFact) {
    factInterludeEl.removeAttribute('hidden');
  } else {
    factInterludeEl.setAttribute('hidden', '');
  }

  factInterludeLineEl.textContent = hasFact ? `~ ${fact} ~${fragment ? ` ${fragment}` : ''}` : '';
}

function openHiddenLetter() {
  if (!hiddenDoorUnlocked) return;

  window.location.href = new URL(HIDDEN_LETTER_PATH, window.location.href).href;
}

function clearFooterHoldTimer() {
  if (!footerHoldTimer) return;
  window.clearTimeout(footerHoldTimer);
  footerHoldTimer = null;
}

function startFooterHold() {
  if (!hiddenDoorUnlocked || footerHoldTimer) return;

  footerHoldTimer = window.setTimeout(() => {
    footerHoldTimer = null;
    openHiddenLetter();
  }, FOOTER_HOLD_DURATION_MS);
}

function renderEmptyCheckIns() {
  checkInsFeedEl.innerHTML = `
    <article class="feed-item feed-item--placeholder">
      <p class="feed-item__text">Nothing here yet. The first quiet signal will appear here.</p>
    </article>
  `;
}

function renderEmptyNotes() {
  notesFeedEl.innerHTML = `
    <article class="note-card note-card--placeholder">
      <p class="note-card__meta">Waiting softly</p>
      <p class="note-card__content">Notes will collect here in time.</p>
    </article>
  `;
}

function buildReactionButton({ noteId, emoji, summary, viewerSlug, variant = 'summary' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `reaction-chip reaction-chip--${variant}`;
  button.dataset.noteId = String(noteId);
  button.dataset.reactionIndex = String(REACTIONS.indexOf(emoji));

  const emojiEl = document.createElement('span');
  emojiEl.textContent = emoji;
  button.appendChild(emojiEl);

  if (variant === 'summary') {
    const countEl = document.createElement('span');
    countEl.textContent = String(summary?.count || 0);
    button.appendChild(countEl);
  }

  if (summary?.reacted_by_viewer || summary?.users?.includes(viewerSlug)) {
    button.classList.add('is-active');
  }

  return button;
}

function buildReactionToggle(noteId, hasReactions, pickerOpen) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'note-card__reaction-toggle';
  button.dataset.noteId = String(noteId);
  button.dataset.action = 'toggle-reaction-picker';
  button.setAttribute('aria-expanded', pickerOpen ? 'true' : 'false');
  button.textContent = hasReactions ? 'Add a small response' : 'Leave a small response';
  return button;
}

function renderReactionSet(
  reactionsEl,
  noteId,
  reactions,
  viewerSlug,
  { includeEmpty = true, variant = 'summary' } = {}
) {
  reactionsEl.innerHTML = '';

  REACTIONS.forEach((emoji) => {
    const summary = reactions?.find((reaction) => reaction.reaction === emoji);
    if (!includeEmpty && !(summary?.count > 0 || summary?.reacted_by_viewer || summary?.users?.includes(viewerSlug))) {
      return;
    }
    reactionsEl.appendChild(
      buildReactionButton({
        noteId,
        emoji,
        summary,
        viewerSlug,
        variant,
      })
    );
  });
}

function formatTimestamp(input) {
  const date = new Date(input);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function updateSingleFeedControls({
  loadButton,
  collapseButton,
  hasMore = false,
  loadingOlder = false,
  expanded = false,
  defaultLabel = 'Show older',
  loadingLabel = 'Loading...',
  collapseAriaLabel = 'Return to recent items',
}) {
  if (loadButton) {
    loadButton.hidden = !hasMore;
    loadButton.disabled = loadingOlder;
    loadButton.textContent = loadingOlder ? loadingLabel : defaultLabel;
  }

  if (collapseButton) {
    collapseButton.hidden = !expanded;
    collapseButton.disabled = loadingOlder;
    collapseButton.setAttribute('aria-label', collapseAriaLabel);
    collapseButton.textContent = 'x';
  }
}

export function setReady() {
  appShellEl.dataset.ready = 'true';
}

export function revealMainContent() {
  document.body.classList.add('content-revealed');
  mainContentEl.setAttribute('aria-hidden', 'false');

  arrivalSectionEl.classList.add('is-exiting');
  window.setTimeout(() => {
    arrivalSectionEl.hidden = true;
    arrivalSectionEl.style.display = 'none';
  }, 680);
}

export function applyAccent(userSlug) {
  const accent = ACCENT_BY_USER[userSlug] || '#6e8d62';
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-soft', `${accent}22`);
}

export function setHiddenDoorUnlocked(unlocked) {
  hiddenDoorUnlocked = IS_PRIVATE_BUILD && Boolean(unlocked);
}

function getSecretNoticeAckKey(visitorSlug, noticeId) {
  if (!visitorSlug || !noticeId) return '';
  return `${SECRET_NOTICE_ACK_PREFIX}${visitorSlug}.${noticeId}`;
}

function isSecretNoticeAcknowledged(visitorSlug, noticeId) {
  const key = getSecretNoticeAckKey(visitorSlug, noticeId);
  return Boolean(key && window.localStorage.getItem(key) === '1');
}

function showSecretNotice(visitorSlug, noticeId) {
  if (!secretNoticeEl || !ackSecretNoticeButton) return;

  pendingSecretNoticeKey = getSecretNoticeAckKey(visitorSlug, noticeId);
  if (!pendingSecretNoticeKey || isSecretNoticeAcknowledged(visitorSlug, noticeId)) return;

  secretNoticeEl.hidden = false;
  window.setTimeout(() => ackSecretNoticeButton.focus(), 40);
}

function acknowledgeSecretNotice() {
  if (pendingSecretNoticeKey) {
    window.localStorage.setItem(pendingSecretNoticeKey, '1');
  }

  pendingSecretNoticeKey = '';
  if (secretNoticeEl) secretNoticeEl.hidden = true;
}

export function renderSecretState(secretState, visitorSlug = '') {
  setHiddenDoorUnlocked(secretState?.unlocked);

  const unlockNoticeId = secretState?.unlock_notice?.active ? secretState.unlock_notice.id : '';
  if (IS_PRIVATE_BUILD && secretState?.unlocked && unlockNoticeId) {
    showSecretNotice(visitorSlug, unlockNoticeId);
  }
}

export function bindHiddenDoor() {
  if (!footerLineEl) return;

  footerLineEl.addEventListener('pointerdown', startFooterHold);
  footerLineEl.addEventListener('pointerup', clearFooterHoldTimer);
  footerLineEl.addEventListener('pointercancel', clearFooterHoldTimer);
  footerLineEl.addEventListener('pointerleave', clearFooterHoldTimer);
  footerLineEl.addEventListener('contextmenu', (event) => {
    if (hiddenDoorUnlocked) event.preventDefault();
  });
}

if (ackSecretNoticeButton) {
  ackSecretNoticeButton.addEventListener('click', acknowledgeSecretNotice);
}

export async function renderArrival(visitor) {
  const arrivalAmbient = await getArrivalAmbientLine(visitor);
  const ambientLine = arrivalAmbient.line;
  const debugType = new URLSearchParams(window.location.search).get('debugSecondary');
  const clueLine = ENABLE_FUNNY_FACTS ? getFactWithClueFragment(debugType === 'clue') : null;
  const secondaryLine = clueLine ? clueLine.fact : ENABLE_FUNNY_FACTS ? await getWeightedLandingSecondaryLine() : '';
  const greeting = GREETING_BY_USER[visitor.user_slug] || `Hey ${visitor.display_name}`;

  arrivalSectionEl.hidden = false;
  arrivalSectionEl.style.display = '';
  arrivalSectionEl.classList.remove('is-exiting');

  arrivalGreetingEl.textContent = greeting;
  arrivalLineEl.textContent = ambientLine;
  arrivalLineEl.hidden = !ambientLine;
  setFactInterlude(secondaryLine, clueLine?.fragment || '');
  footerLineEl.textContent = pickRandom(FOOTER_LINES);
  const baseHeroStatus = `${visitor.display_name} arrived through a quiet little doorway.`;
  if (getArrivalDebugMode()) {
    const debugStatus =
      ` build=${IS_PRIVATE_BUILD ? 'private' : 'public'}` +
      ` bucket=${arrivalAmbient.bucket}` +
      ` forced=${arrivalAmbient.forcedBucket || 'none'}` +
      ` counts=${arrivalAmbient.counts.shared}/${arrivalAmbient.counts.personal}/${arrivalAmbient.counts.private}`;
    heroStatusEl.textContent = `${baseHeroStatus}${debugStatus}`;
    console.info('Arrival debug', {
      isPrivateBuild: IS_PRIVATE_BUILD,
      bucket: arrivalAmbient.bucket,
      forcedBucket: arrivalAmbient.forcedBucket || null,
      counts: arrivalAmbient.counts,
      line: ambientLine,
      userSlug: visitor.user_slug,
    });
  } else {
    heroStatusEl.textContent = baseHeroStatus;
  }
}

export function renderMissingKeyState() {
  arrivalSectionEl.hidden = false;
  arrivalSectionEl.style.display = '';
  arrivalSectionEl.classList.remove('is-exiting');

  arrivalGreetingEl.textContent = 'A small place to return to';
  arrivalLineEl.textContent = 'Tap your tile again to enter this shared space.';
  arrivalLineEl.hidden = false;
  setFactInterlude('');
  footerLineEl.textContent = 'Still here.';
  heroStatusEl.textContent = 'Waiting softly.';
}

export function renderCheckIns(checkIns = []) {
  checkInsFeedEl.innerHTML = '';

  if (!checkIns.length) {
    renderEmptyCheckIns();
    return;
  }

  checkIns.forEach((item) => {
    const fragment = checkInTemplate.content.cloneNode(true);
    const marker = fragment.querySelector('.feed-item__marker');
    const textEl = fragment.querySelector('.feed-item__text');
    const metaEl = fragment.querySelector('.feed-item__meta');

    const templateIndex = pseudoRandomIndex(item.id, CHECK_IN_TEMPLATES.length);
    const text = CHECK_IN_TEMPLATES[templateIndex].replace('{name}', item.display_name);

    marker.style.setProperty('--marker-accent', item.accent_color || ACCENT_BY_USER[item.from_user_slug] || '#748a68');
    textEl.textContent = text;
    metaEl.textContent = formatTimestamp(item.created_at);

    checkInsFeedEl.appendChild(fragment);
  });
}

export function renderThoughtCounts(thoughtCounts = []) {
  return thoughtCounts;
}

export function renderNotes(notes = [], viewerSlug) {
  const openPickers = new Set(
    Array.from(notesFeedEl.querySelectorAll('[data-note-id][data-reaction-picker-open="true"]')).map((card) =>
      card.dataset.noteId
    )
  );

  notesFeedEl.innerHTML = '';

  if (!notes.length) {
    renderEmptyNotes();
    return;
  }

  notes.forEach((note) => {
    const fragment = noteCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.note-card');
    const nameEl = fragment.querySelector('.note-card__name');
    const metaEl = fragment.querySelector('.note-card__meta');
    const contentEl = fragment.querySelector('.note-card__content');
    const reactionsEl = fragment.querySelector('.note-card__reactions');
    const reactionToggleSlot = fragment.querySelector('.note-card__reaction-toggle');
    const reactionPickerEl = fragment.querySelector('.note-card__reaction-picker');

    card.dataset.noteId = String(note.id);
    nameEl.textContent = note.display_name;
    metaEl.textContent = formatTimestamp(note.created_at);
    contentEl.textContent = note.content;

    const accent = note.accent_color || ACCENT_BY_USER[note.from_user_slug] || '#6e8d62';
    card.style.setProperty('--note-accent', accent);

    const pickerOpen = openPickers.has(String(note.id));
    card.dataset.reactionPickerOpen = pickerOpen ? 'true' : 'false';
    const reactions = note.reactions || [];
    const hasVisibleReactions = reactions.some((reaction) => reaction.count > 0);

    renderReactionSet(reactionsEl, note.id, reactions, viewerSlug, {
      includeEmpty: false,
      variant: 'summary',
    });

    const toggleButton = buildReactionToggle(note.id, hasVisibleReactions, pickerOpen);
    reactionToggleSlot.replaceWith(toggleButton);

    reactionPickerEl.hidden = !pickerOpen;
    renderReactionSet(reactionPickerEl, note.id, reactions, viewerSlug, {
      includeEmpty: true,
      variant: 'picker',
    });

    notesFeedEl.appendChild(fragment);
  });
}

export function updateRenderedNoteReactions(noteId, reactions, viewerSlug) {
  const card = notesFeedEl.querySelector(`[data-note-id="${noteId}"]`);
  if (!card) return;

  const reactionsEl = card.querySelector('.note-card__reactions');
  const reactionPickerEl = card.querySelector('.note-card__reaction-picker');
  const toggleButton = card.querySelector('.note-card__reaction-toggle');
  if (!reactionsEl || !reactionPickerEl || !toggleButton) return;

  const pickerOpen = card.dataset.reactionPickerOpen === 'true';
  const nextReactions = reactions || [];
  const hasVisibleReactions = nextReactions.some((reaction) => reaction.count > 0);

  renderReactionSet(reactionsEl, noteId, nextReactions, viewerSlug, {
    includeEmpty: false,
    variant: 'summary',
  });
  renderReactionSet(reactionPickerEl, noteId, nextReactions, viewerSlug, {
    includeEmpty: true,
    variant: 'picker',
  });
  toggleButton.textContent = hasVisibleReactions ? 'Add a small response' : 'Leave a small response';
  toggleButton.setAttribute('aria-expanded', pickerOpen ? 'true' : 'false');
}

export function toggleReactionPicker(noteId) {
  const card = notesFeedEl.querySelector(`[data-note-id="${noteId}"]`);
  if (!card) return;

  const picker = card.querySelector('.note-card__reaction-picker');
  const toggleButton = card.querySelector('.note-card__reaction-toggle');
  if (!picker || !toggleButton) return;

  const nextOpen = card.dataset.reactionPickerOpen !== 'true';
  card.dataset.reactionPickerOpen = nextOpen ? 'true' : 'false';
  picker.hidden = !nextOpen;
  toggleButton.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
}

export function updateFeedHistoryControls({
  checkIns = {},
  notes = {},
} = {}) {
  updateSingleFeedControls({
    loadButton: loadOlderCheckInsButton,
    collapseButton: collapseCheckInsButton,
    hasMore: Boolean(checkIns.hasMore),
    loadingOlder: Boolean(checkIns.loadingOlder),
    expanded: Boolean(checkIns.expanded),
    defaultLabel: 'Show older check-ins',
    loadingLabel: 'Loading older check-ins...',
    collapseAriaLabel: 'Return to recent check-ins',
  });

  updateSingleFeedControls({
    loadButton: loadOlderNotesButton,
    collapseButton: collapseNotesButton,
    hasMore: Boolean(notes.hasMore),
    loadingOlder: Boolean(notes.loadingOlder),
    expanded: Boolean(notes.expanded),
    defaultLabel: 'Show older notes',
    loadingLabel: 'Loading older notes...',
    collapseAriaLabel: 'Return to recent notes',
  });
}

export function showToast(message, accentColor) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.setProperty('--accent', accentColor || '#6e8d62');
  toastStackEl.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 280);
  }, 2600);
}

export function setActionMessage(message, isError = false) {
  actionMessageEl.textContent = message;
  actionMessageEl.style.color = isError ? 'var(--danger)' : 'var(--text-soft)';
  actionMessageEl.hidden = !message;
}

export function setNoteMessage(message, isError = false) {
  noteMessageEl.textContent = message;
  noteMessageEl.style.color = isError ? 'var(--danger)' : 'var(--text-soft)';
  noteMessageEl.hidden = !message;
}

export function clearMessages() {
  setActionMessage('');
  setNoteMessage('');
}
