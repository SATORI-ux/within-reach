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
const heroGreetingEl = document.querySelector('#heroGreeting');
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
const THEMED_USER_ACCENTS = new Set(['joey', 'jeszi']);
const REACTION_DISPLAY = {
  '❤️': {
    label: 'heart',
    kind: 'heart',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 18.35 6.92 13.6c-1.72-1.62-1.82-3.82-.48-5.1 1.24-1.2 3.2-1.02 4.22.4L12 10.72l1.34-1.82c1.02-1.42 2.98-1.6 4.22-.4 1.34 1.28 1.24 3.48-.48 5.1L12 18.35Z"></path></svg>',
  },
  '✨': {
    label: 'sparkle',
    kind: 'sparkle',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4.6 13.45 9l4.25 1.45-4.25 1.45L12 16.3l-1.45-4.4-4.25-1.45L10.55 9 12 4.6Z"></path><path d="m18.05 15.75.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45Z"></path></svg>',
  },
  '🥹': {
    label: 'soft smile',
    kind: 'smile',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6.8"></circle><path d="M9.2 10.75h.01M14.8 10.75h.01"></path><path d="M9.45 14.05c1.18 1.18 3.92 1.18 5.1 0"></path><path d="M8.25 12.35c-.46.58-.46 1.1 0 1.55.46-.45.46-.97 0-1.55Z"></path></svg>',
  },
  '🌙': {
    label: 'moon',
    kind: 'moon',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.4 4.8a7.4 7.4 0 1 0 3.8 10.05 6.15 6.15 0 1 1-3.8-10.05Z"></path></svg>',
  },
  '🐞': {
    label: 'ladybug',
    kind: 'ladybug',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.4 12.1c0-2.85 2.02-5 4.6-5s4.6 2.15 4.6 5v1.95c0 2.52-1.88 4.35-4.6 4.35s-4.6-1.83-4.6-4.35V12.1Z"></path><path d="M12 7.28v10.86M7.85 11h8.3M8.45 5.35l1.42 1.62M15.55 5.35l-1.42 1.62"></path><path d="M9.95 13.32h.01M14.05 13.32h.01M9.95 15.78h.01M14.05 15.78h.01"></path></svg>',
  },
  '🌸': {
    label: 'flower',
    kind: 'flower',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 10.45c-.85-2.15.2-3.82 1.72-3.82 1.44 0 2.12 1.7.72 3.52 2.22-.54 3.7.72 3.28 2.1-.45 1.46-2.4 1.56-3.72-.28.85 2.15-.2 3.82-1.72 3.82-1.44 0-2.12-1.7-.72-3.52-2.22.54-3.7-.72-3.28-2.1.45-1.46 2.4-1.56 3.72.28Z"></path><circle cx="12" cy="11.2" r=".86"></circle></svg>',
  },
};
const REACTION_DISPLAY_BY_INDEX = [
  {
    label: 'heart',
    kind: 'heart',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="reaction-fill reaction-raised" d="M12 19.15 6.72 14.2c-1.74-1.64-2.02-3.95-.62-5.36 1.28-1.28 3.35-1.1 4.55.36L12 10.84l1.35-1.64c1.2-1.46 3.27-1.64 4.55-.36 1.4 1.41 1.12 3.72-.62 5.36L12 19.15Z"></path></svg>',
  },
  {
    label: 'sparkle',
    kind: 'sparkle',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="reaction-fill reaction-raised" d="M11.15 3.8 13.3 9l5.15 1.9-5.15 1.9-2.15 5.2L9 12.8l-5.15-1.9L9 9l2.15-5.2Z"></path><path class="reaction-fill reaction-soft" d="m18.4 15.35.64 1.55 1.56.6-1.56.6-.64 1.55-.64-1.55-1.56-.6 1.56-.6.64-1.55Z"></path></svg>',
  },
  {
    label: 'soft smile',
    kind: 'smile',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle class="reaction-stroke reaction-raised" cx="12" cy="12" r="6.55"></circle><circle class="reaction-dot" cx="9.42" cy="10.65" r=".7"></circle><circle class="reaction-dot" cx="14.58" cy="10.65" r=".7"></circle><path class="reaction-stroke" d="M8.95 14.05c1.18 1.55 4.92 1.55 6.1 0"></path></svg>',
  },
  {
    label: 'moon',
    kind: 'moon',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="reaction-fill reaction-raised" d="M16.05 4.25a7.72 7.72 0 1 0 3.65 10.42 6.45 6.45 0 1 1-3.65-10.42Z"></path></svg>',
  },
  {
    label: 'ladybug',
    kind: 'ladybug',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="reaction-leg" d="M7.55 11.75 5.6 10.5M16.45 11.75l1.95-1.25M7.7 15.2l-2.08 1.06M16.3 15.2l2.08 1.06M9.15 7.65 7.65 5.9M14.85 7.65l1.5-1.75"></path><path class="reaction-fill reaction-raised" d="M7.45 12.2c0-3.05 1.98-5.22 4.55-5.22s4.55 2.17 4.55 5.22v1.88c0 2.74-1.82 4.72-4.55 4.72s-4.55-1.98-4.55-4.72V12.2Z"></path><path class="reaction-stroke reaction-bug-line" d="M12 7.1v11.5M7.85 11h8.3"></path><circle class="reaction-mark" cx="9.95" cy="13.25" r=".58"></circle><circle class="reaction-mark" cx="14.05" cy="13.25" r=".58"></circle><circle class="reaction-mark" cx="9.95" cy="15.88" r=".52"></circle><circle class="reaction-mark" cx="14.05" cy="15.88" r=".52"></circle></svg>',
  },
  {
    label: 'flower',
    kind: 'flower',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="reaction-petal" d="M12 10.4c-1.55-2.05-.95-4.05.62-4.42 1.62-.38 2.82 1.18 1.95 3.65 2.48-.74 4.05.5 3.68 2.08-.36 1.56-2.33 2.05-4.05.1 1.02 2.38-.04 4.05-1.66 4.05-1.62 0-2.48-1.78-1.28-4.04-1.92 1.74-3.82 1.08-4.05-.5-.22-1.6 1.5-2.68 3.88-1.68Z"></path><circle class="reaction-center" cx="12.25" cy="11.1" r="1.08"></circle></svg>',
  },
];
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

function getUserAccentToken(userSlug, fallback = '#748a68') {
  return THEMED_USER_ACCENTS.has(userSlug)
    ? `var(--accent-${userSlug})`
    : ACCENT_BY_USER[userSlug] || fallback;
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
      <p class="note-card__meta-line">Waiting softly</p>
      <p class="note-card__content">Notes will collect here in time.</p>
    </article>
  `;
}

function buildReactionButton({ noteId, emoji, summary, viewerSlug, variant = 'summary' }) {
  const reactionIndex = REACTIONS.indexOf(emoji);
  const display = REACTION_DISPLAY_BY_INDEX[reactionIndex] || REACTION_DISPLAY[emoji] || {
    label: emoji,
    kind: 'fallback',
    svg: '',
  };
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `reaction-chip reaction-chip--${variant}`;
  button.dataset.noteId = String(noteId);
  button.dataset.reactionIndex = String(reactionIndex);
  button.dataset.reactionKind = display.kind;
  button.setAttribute('aria-label', `React with ${display.label}`);

  const emojiEl = document.createElement('span');
  emojiEl.className = 'reaction-glyph';
  emojiEl.dataset.reaction = display.kind;
  if (display.svg) {
    emojiEl.innerHTML = display.svg;
  } else {
    emojiEl.textContent = emoji;
  }
  button.appendChild(emojiEl);

  if (variant === 'summary') {
    const countEl = document.createElement('span');
    countEl.className = 'reaction-count';
    countEl.textContent = String(summary?.count || 0);
    button.appendChild(countEl);
  }

  if (summary?.reacted_by_viewer || summary?.users?.includes(viewerSlug)) {
    button.classList.add('is-active');
  }

  return button;
}

function buildReactionToggle(noteId, pickerOpen) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'note-card__reaction-toggle';
  button.dataset.noteId = String(noteId);
  button.dataset.action = 'toggle-reaction-picker';
  button.setAttribute('aria-label', 'React to this note');
  button.setAttribute('aria-expanded', pickerOpen ? 'true' : 'false');
  button.setAttribute('aria-controls', `note-reaction-picker-${noteId}`);
  button.innerHTML = '<span aria-hidden="true">...</span>';
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
  if (THEMED_USER_ACCENTS.has(userSlug)) {
    document.documentElement.dataset.visitorAccent = userSlug;
  } else {
    delete document.documentElement.dataset.visitorAccent;
  }

  const accent = ACCENT_BY_USER[userSlug] || '#6e8d62';
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent-soft');
  document.documentElement.style.removeProperty('--personal-accent');
  document.documentElement.style.removeProperty('--personal-accent-soft');

  if (!THEMED_USER_ACCENTS.has(userSlug)) {
    document.documentElement.style.setProperty('--personal-accent', accent);
    document.documentElement.style.setProperty('--personal-accent-soft', `${accent}22`);
  }
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
  const heroGreeting = `Hey ${visitor.display_name}`;

  arrivalSectionEl.hidden = false;
  arrivalSectionEl.style.display = '';
  arrivalSectionEl.classList.remove('is-exiting');

  arrivalGreetingEl.textContent = greeting;
  arrivalLineEl.textContent = ambientLine;
  arrivalLineEl.hidden = !ambientLine;
  heroGreetingEl.textContent = heroGreeting;
  setFactInterlude(secondaryLine, clueLine?.fragment || '');
  footerLineEl.textContent = pickRandom(FOOTER_LINES);
  const baseHeroStatus = ambientLine || 'You found your way back here.';
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
  heroGreetingEl.textContent = 'Hey there';
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

    marker.style.setProperty('--marker-accent', getUserAccentToken(item.from_user_slug, item.accent_color || '#748a68'));
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
    const accentDotEl = fragment.querySelector('.note-card__accent-dot');
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

    const accent = getUserAccentToken(note.from_user_slug, note.accent_color || '#6e8d62');
    card.dataset.userAccent = THEMED_USER_ACCENTS.has(note.from_user_slug) ? note.from_user_slug : 'custom';
    card.style.setProperty('--note-accent', accent);
    accentDotEl.style.setProperty('--note-accent', accent);

    const pickerOpen = openPickers.has(String(note.id));
    card.dataset.reactionPickerOpen = pickerOpen ? 'true' : 'false';
    const reactions = note.reactions || [];

    renderReactionSet(reactionsEl, note.id, reactions, viewerSlug, {
      includeEmpty: false,
      variant: 'summary',
    });

    const toggleButton = buildReactionToggle(note.id, pickerOpen);
    reactionToggleSlot.replaceWith(toggleButton);

    reactionPickerEl.hidden = !pickerOpen;
    reactionPickerEl.id = `note-reaction-picker-${note.id}`;
    reactionPickerEl.setAttribute('role', 'group');
    reactionPickerEl.setAttribute('aria-label', 'Choose a reaction');
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

  renderReactionSet(reactionsEl, noteId, nextReactions, viewerSlug, {
    includeEmpty: false,
    variant: 'summary',
  });
  renderReactionSet(reactionPickerEl, noteId, nextReactions, viewerSlug, {
    includeEmpty: true,
    variant: 'picker',
  });
  toggleButton.innerHTML = '<span aria-hidden="true">...</span>';
  toggleButton.setAttribute('aria-label', 'React to this note');
  toggleButton.setAttribute('aria-expanded', pickerOpen ? 'true' : 'false');
}

export function closeReactionPicker(noteId) {
  const card = notesFeedEl.querySelector(`[data-note-id="${noteId}"]`);
  if (!card) return;

  const picker = card.querySelector('.note-card__reaction-picker');
  const toggleButton = card.querySelector('.note-card__reaction-toggle');
  if (!picker || !toggleButton) return;

  card.dataset.reactionPickerOpen = 'false';
  picker.hidden = true;
  toggleButton.setAttribute('aria-expanded', 'false');
}

export function closeAllReactionPickers() {
  notesFeedEl.querySelectorAll('[data-note-id][data-reaction-picker-open="true"]').forEach((card) => {
    closeReactionPicker(card.dataset.noteId);
  });
}

export function toggleReactionPicker(noteId) {
  const card = notesFeedEl.querySelector(`[data-note-id="${noteId}"]`);
  if (!card) return;

  const picker = card.querySelector('.note-card__reaction-picker');
  const toggleButton = card.querySelector('.note-card__reaction-toggle');
  if (!picker || !toggleButton) return;

  const nextOpen = card.dataset.reactionPickerOpen !== 'true';
  closeAllReactionPickers();
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
    defaultLabel: 'Show older',
    loadingLabel: 'Loading...',
    collapseAriaLabel: 'Return to recent check-ins',
  });

  updateSingleFeedControls({
    loadButton: loadOlderNotesButton,
    collapseButton: collapseNotesButton,
    hasMore: Boolean(notes.hasMore),
    loadingOlder: Boolean(notes.loadingOlder),
    expanded: Boolean(notes.expanded),
    defaultLabel: 'Show older',
    loadingLabel: 'Loading...',
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
