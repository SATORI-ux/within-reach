import {
  ACCENT_BY_USER,
  AMBIENT_LINES_PERSONALIZED,
  AMBIENT_LINES_SHARED,
  CHECK_IN_TEMPLATES,
  ENABLE_SECRET_SECTION,
  ENABLE_FUNNY_FACTS,
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
const FOOTER_HOLD_DURATION_MS = 1200;
let hiddenDoorUnlocked = false;
let footerHoldTimer = null;

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
  const privateLines = privateCopy.ARRIVAL_LINES_PERSONALIZED?.[visitor.user_slug] || [];
  return pickRandom([...AMBIENT_LINES_SHARED, ...publicLines, ...privateLines]);
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

function buildReactionButton({ noteId, emoji, summary, viewerSlug }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reaction-chip';
  button.dataset.noteId = String(noteId);
  button.dataset.reaction = emoji;
  button.innerHTML = `<span>${emoji}</span><span>${summary?.count || 0}</span>`;

  if (summary?.reacted_by_viewer || summary?.users?.includes(viewerSlug)) {
    button.classList.add('is-active');
  }

  return button;
}

function renderReactionSet(reactionsEl, noteId, reactions, viewerSlug) {
  reactionsEl.innerHTML = '';

  REACTIONS.forEach((emoji) => {
    const summary = reactions?.find((reaction) => reaction.reaction === emoji);
    reactionsEl.appendChild(
      buildReactionButton({
        noteId,
        emoji,
        summary,
        viewerSlug,
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
  const debugUnlock = new URLSearchParams(window.location.search).get('debugUnlockDoor') === 'true';
  hiddenDoorUnlocked = IS_PRIVATE_BUILD && (Boolean(unlocked) || debugUnlock);
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

export async function renderArrival(visitor) {
  const ambientLine = await getArrivalAmbientLine(visitor);
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
  heroStatusEl.textContent = `${visitor.display_name} arrived through a quiet little doorway.`;
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

    marker.style.background = `${item.accent_color || ACCENT_BY_USER[item.from_user_slug] || '#6e8d62'}33`;
    textEl.textContent = text;
    metaEl.textContent = formatTimestamp(item.created_at);

    checkInsFeedEl.appendChild(fragment);
  });
}

export function renderNotes(notes = [], viewerSlug) {
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

    card.dataset.noteId = String(note.id);
    nameEl.textContent = note.display_name;
    metaEl.textContent = formatTimestamp(note.created_at);
    contentEl.textContent = note.content;

    const accent = note.accent_color || ACCENT_BY_USER[note.from_user_slug] || '#6e8d62';
    card.style.setProperty('--note-accent', accent);

    renderReactionSet(reactionsEl, note.id, note.reactions || [], viewerSlug);

    notesFeedEl.appendChild(fragment);
  });
}

export function updateRenderedNoteReactions(noteId, reactions, viewerSlug) {
  const card = notesFeedEl.querySelector(`[data-note-id="${noteId}"]`);
  if (!card) return;

  const reactionsEl = card.querySelector('.note-card__reactions');
  if (!reactionsEl) return;

  renderReactionSet(reactionsEl, noteId, reactions || [], viewerSlug);
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
  actionMessageEl.style.color = isError ? '#8a4f4f' : 'var(--text-soft)';
}

export function setNoteMessage(message, isError = false) {
  noteMessageEl.textContent = message;
  noteMessageEl.style.color = isError ? '#8a4f4f' : 'var(--text-soft)';
}

export function clearMessages() {
  setActionMessage('');
  setNoteMessage('');
}
