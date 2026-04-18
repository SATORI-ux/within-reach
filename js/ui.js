import {
  ACCENT_BY_USER,
  AMBIENT_LINES_PERSONALIZED,
  AMBIENT_LINES_SHARED,
  CHECK_IN_TEMPLATES,
  ENABLE_FUNNY_FACTS,
  FOOTER_LINES,
  FUNNY_FACTS,
  GREETING_BY_USER,
  REACTIONS,
} from './config.js';

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

function pseudoRandomIndex(seedValue, length) {
  const seed = Number(seedValue) || 0;
  return Math.abs(seed) % length;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function setFactInterlude(fact) {
  if (!factInterludeEl || !factInterludeLineEl) return;

  const hasFact = Boolean(fact);
  factInterludeEl.hidden = !hasFact;
  if (hasFact) {
    factInterludeEl.removeAttribute('hidden');
  } else {
    factInterludeEl.setAttribute('hidden', '');
  }
  factInterludeLineEl.textContent = hasFact ? `~ ${fact} ~` : '';
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

export function renderArrival(visitor) {
  const personalizedLines = AMBIENT_LINES_PERSONALIZED[visitor.user_slug] || [];
  const ambientLine = pickRandom([...AMBIENT_LINES_SHARED, ...personalizedLines]);
  const fact = ENABLE_FUNNY_FACTS ? pickRandom(FUNNY_FACTS) : '';
  const greeting = GREETING_BY_USER[visitor.user_slug] || `Hey ${visitor.display_name}`;

  arrivalSectionEl.hidden = false;
  arrivalSectionEl.style.display = '';
  arrivalSectionEl.classList.remove('is-exiting');

  arrivalGreetingEl.textContent = greeting;
  arrivalLineEl.textContent = ambientLine;
  setFactInterlude(fact);
  footerLineEl.textContent = pickRandom(FOOTER_LINES);
  heroStatusEl.textContent = `${visitor.display_name} arrived through a quiet little doorway.`;
}

export function renderMissingKeyState() {
  arrivalSectionEl.hidden = false;
  arrivalSectionEl.style.display = '';
  arrivalSectionEl.classList.remove('is-exiting');

  arrivalGreetingEl.textContent = 'A small place to return to';
  arrivalLineEl.textContent = 'Tap your tile again to enter this shared space.';
  setFactInterlude('');
  heroStatusEl.textContent = 'Waiting softly.';
}

export function renderCheckIns(checkIns = []) {
  checkInsFeedEl.innerHTML = '';

  if (!checkIns.length) {
    checkInsFeedEl.innerHTML = `
      <article class="feed-item feed-item--placeholder">
        <p class="feed-item__text">Nothing here yet. The first quiet signal will appear here.</p>
      </article>
    `;
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
    notesFeedEl.innerHTML = `
      <article class="note-card note-card--placeholder">
        <p class="note-card__meta">Waiting softly</p>
        <p class="note-card__content">Notes will collect here in time.</p>
      </article>
    `;
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

    REACTIONS.forEach((emoji) => {
      const summary = note.reactions?.find((reaction) => reaction.reaction === emoji);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reaction-chip';
      button.dataset.noteId = String(note.id);
      button.dataset.reaction = emoji;
      button.innerHTML = `<span>${emoji}</span><span>${summary?.count || 0}</span>`;

      if (summary?.reacted_by_viewer || summary?.users?.includes(viewerSlug)) {
        button.classList.add('is-active');
      }

      reactionsEl.appendChild(button);
    });

    notesFeedEl.appendChild(fragment);
  });
}

export function prependCheckIn(item) {
  const existing = Array.from(checkInsFeedEl.children);
  const wrapper = document.createElement('div');
  renderCheckIns([item]);
  const firstItem = checkInsFeedEl.firstElementChild;

  if (!firstItem) return;

  wrapper.appendChild(firstItem.cloneNode(true));
  checkInsFeedEl.innerHTML = '';
  checkInsFeedEl.appendChild(wrapper.firstElementChild);
  existing.forEach((node) => checkInsFeedEl.appendChild(node));
}

export function prependNote(note, viewerSlug) {
  const currentNotes = readRenderedNotes();
  renderNotes([note, ...currentNotes], viewerSlug);
}

function readRenderedNotes() {
  return [];
}

export function updateRenderedNoteReactions(noteId, reactions, viewerSlug) {
  const card = notesFeedEl.querySelector(`[data-note-id="${noteId}"]`);
  if (!card) return;

  const reactionsEl = card.querySelector('.note-card__reactions');
  reactionsEl.innerHTML = '';

  REACTIONS.forEach((emoji) => {
    const summary = reactions.find((reaction) => reaction.reaction === emoji);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reaction-chip';
    button.dataset.noteId = String(noteId);
    button.dataset.reaction = emoji;
    button.innerHTML = `<span>${emoji}</span><span>${summary?.count || 0}</span>`;

    if (summary?.reacted_by_viewer || summary?.users?.includes(viewerSlug)) {
      button.classList.add('is-active');
    }

    reactionsEl.appendChild(button);
  });
}

export function formatTimestamp(input) {
  const date = new Date(input);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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

export function getArrivalSkipTargets() {
  return [document, window, document.body];
}
