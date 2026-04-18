import { addNote, getFeed, reactNote, resolveVisitor, savePushSubscription, sendCheckIn, sendUrgentSignal } from './api.js';
import { ARRIVAL_REVEAL_DELAY_MS, DEBUG_UI_MESSAGES, MAX_NOTE_LENGTH, VAPID_PUBLIC_KEY } from './config.js';
import {
  applyAccent,
  clearMessages,
  renderArrival,
  renderCheckIns,
  renderMissingKeyState,
  renderNotes,
  revealMainContent,
  setActionMessage,
  setNoteMessage,
  setReady,
  showToast,
  updateRenderedNoteReactions,
} from './ui.js';

const SESSION_KEY = 'check-in-space.tile-key';
const SESSION_COOKIE_NAME = 'check_in_space_tile_key';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
const VISITOR_RESOLVE_TIMEOUT_MS = 8000;

function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function setTileKeyPersistence(tileKey) {
  if (!tileKey) return;

  localStorage.setItem(SESSION_KEY, tileKey);

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(tileKey)}; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

function clearTileKeyPersistence() {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function getStoredTileKey() {
  const cookieKey = getCookie(SESSION_COOKIE_NAME);
  if (cookieKey) return cookieKey;

  return localStorage.getItem(SESSION_KEY) || '';
}

function getTileKey() {
  const params = new URLSearchParams(window.location.search);
  const incomingKey = params.get('key');

  if (incomingKey) {
    setTileKeyPersistence(incomingKey);
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl || '/');
    return incomingKey;
  }

  return getStoredTileKey();
}

async function withTimeout(promise, ms, message) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const thinkingButton = document.querySelector('#thinkingButton');
const toggleNoteButton = document.querySelector('#toggleNoteButton');
const urgentButton = document.querySelector('#urgentButton');
const noteComposer = document.querySelector('#noteComposer');
const noteInput = document.querySelector('#noteInput');
const noteCount = document.querySelector('#noteCount');
const submitNoteButton = document.querySelector('#submitNoteButton');
const cancelNoteButton = document.querySelector('#cancelNoteButton');
const skipArrivalButton = document.querySelector('#skipArrivalButton');
const urgentDialog = document.querySelector('#urgentDialog');
const cancelUrgentButton = document.querySelector('#cancelUrgentButton');
const confirmUrgentButton = document.querySelector('#confirmUrgentButton');
const notesFeed = document.querySelector('#notesFeed');
const enablePushButton = document.querySelector('#enablePushButton');
const pushStatusEl = document.querySelector('#pushStatus');

const state = {
  tileKey: '',
  visitor: null,
  checkIns: [],
  notes: [],
  revealTimer: null,
  revealed: false,
  busy: {
    checkIn: false,
    note: false,
    urgent: false,
    push: false,
    reactions: new Set(),
  },
};

function setActionsDisabled(disabled) {
  thinkingButton.disabled = disabled;
  toggleNoteButton.disabled = disabled;
  urgentButton.disabled = disabled;
  submitNoteButton.disabled = disabled;
  noteInput.disabled = disabled;
}

function setNoteReactionButtonsDisabled(noteId, disabled) {
  notesFeed
    .querySelectorAll(`.reaction-chip[data-note-id="${noteId}"]`)
    .forEach((button) => {
      button.disabled = disabled;
    });
}

function setPushStatus(message, isError = false) {
  if (!pushStatusEl) return;
  pushStatusEl.textContent = message;
  pushStatusEl.style.color = isError ? '#8a4f4f' : 'var(--text-soft)';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function enablePushNotifications() {
  if (!state.tileKey) {
    throw new Error('No tile key is active for this session.');
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Push notifications are not supported on this browser/device.');
  }

  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('PASTE_YOUR_')) {
    throw new Error('Add your VAPID public key in js/config.js first.');
  }

  const registration = await navigator.serviceWorker.register('./service-worker.js');

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await savePushSubscription(state.tileKey, subscription);
}

function scheduleReveal() {
  if (state.revealed) return;

  window.clearTimeout(state.revealTimer);
  state.revealTimer = window.setTimeout(() => {
    reveal();
  }, ARRIVAL_REVEAL_DELAY_MS);
}

function reveal() {
  if (state.revealed) return;

  state.revealed = true;
  window.clearTimeout(state.revealTimer);
  revealMainContent();
}

function bindRevealSkip() {
  const skip = () => reveal();

  skipArrivalButton.addEventListener('click', skip);
  window.addEventListener('wheel', skip, { passive: true, once: true });
  window.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener(
    'touchstart',
    () => {
      reveal();
    },
    { passive: true, once: true }
  );
}

function updateNoteCount() {
  noteCount.textContent = `${noteInput.value.length} / ${MAX_NOTE_LENGTH}`;
}

function openComposer() {
  noteComposer.hidden = false;
  toggleNoteButton.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => noteInput.focus(), 40);
}

function closeComposer() {
  noteComposer.hidden = true;
  toggleNoteButton.setAttribute('aria-expanded', 'false');
  noteInput.value = '';
  updateNoteCount();
  setNoteMessage('');
}

function openUrgentDialog() {
  urgentDialog.hidden = false;
}

function closeUrgentDialog() {
  urgentDialog.hidden = true;
}

async function refreshFeed() {
  if (!state.tileKey) return;

  const feed = await getFeed(state.tileKey);
  state.checkIns = feed.check_ins || [];
  state.notes = feed.notes || [];
  renderCheckIns(state.checkIns);
  renderNotes(state.notes, state.visitor?.user_slug);
}

async function bootstrap() {
  setReady();
  setActionsDisabled(true);
  bindRevealSkip();
  updateNoteCount();

  state.tileKey = getTileKey();

  if (!state.tileKey) {
    renderMissingKeyState();
    renderCheckIns([]);
    renderNotes([], '');
    scheduleReveal();
    return;
  }

  scheduleReveal();

  try {
    state.visitor = await withTimeout(
      resolveVisitor(state.tileKey),
      VISITOR_RESOLVE_TIMEOUT_MS,
      'Still finding your place...'
    );

    applyAccent(state.visitor.user_slug);
    renderArrival(state.visitor);
    setPushStatus('');

    await withTimeout(
      refreshFeed(),
      VISITOR_RESOLVE_TIMEOUT_MS,
      'Could not load this space right now.'
    );

    setActionsDisabled(false);
  } catch (error) {
    console.error(error);

    const message = error?.message || 'Could not open this space right now.';
    const shouldClearStoredKey = /invalid tile key/i.test(message);

    if (shouldClearStoredKey) {
      clearTileKeyPersistence();
      renderMissingKeyState();
      renderCheckIns([]);
      renderNotes([], '');
    }

    setActionMessage(message, true);
    setPushStatus('');
    reveal();
  }
}

async function handleCheckIn() {
  if (!state.tileKey || state.busy.checkIn) return;

  state.busy.checkIn = true;
  clearMessages();
  thinkingButton.disabled = true;

  try {
    const result = await sendCheckIn(state.tileKey);
    if (result.check_in) {
      state.checkIns = [result.check_in, ...state.checkIns];
      renderCheckIns(state.checkIns);
    }

    showToast(
      `${state.visitor.display_name} · ${result.total_count} thoughts of you`,
      state.visitor.accent_color
    );
    setActionMessage('');
  } catch (error) {
    console.error(error);
    setActionMessage(error.message || 'Could not send that check-in.', true);
  } finally {
    state.busy.checkIn = false;
    thinkingButton.disabled = false;
  }
}

async function handleSubmitNote() {
  if (!state.tileKey || state.busy.note) return;

  const content = noteInput.value.trim();
  if (!content) {
    setNoteMessage('Write something first.', true);
    return;
  }

  if (content.length > MAX_NOTE_LENGTH) {
    setNoteMessage(`Keep it under ${MAX_NOTE_LENGTH} characters.`, true);
    return;
  }

  state.busy.note = true;
  submitNoteButton.disabled = true;
  setNoteMessage('');

  try {
    const result = await addNote(state.tileKey, content);
    if (result.note) {
      state.notes = [result.note, ...state.notes];
      renderNotes(state.notes, state.visitor?.user_slug);
    }

    closeComposer();
    setNoteMessage('');
    showToast('Note kept here.', state.visitor.accent_color);
  } catch (error) {
    console.error(error);
    setNoteMessage(error.message || 'Could not save that note.', true);
  } finally {
    state.busy.note = false;
    submitNoteButton.disabled = false;
  }
}

async function handleReactionClick(event) {
  const button = event.target.closest('.reaction-chip');
  if (!button || !state.tileKey || !state.visitor) return;

  const noteId = Number(button.dataset.noteId);
  const reaction = button.dataset.reaction;

  if (!noteId || !reaction) return;
  if (state.busy.reactions.has(noteId)) return;

  state.busy.reactions.add(noteId);
  setNoteReactionButtonsDisabled(noteId, true);
  setActionMessage('');

  try {
    const result = await reactNote(state.tileKey, noteId, reaction);
    const noteIndex = state.notes.findIndex((note) => note.id === noteId);
    if (noteIndex >= 0) {
      state.notes[noteIndex] = {
        ...state.notes[noteIndex],
        reactions: result.reactions || [],
      };
    }
    updateRenderedNoteReactions(noteId, result.reactions || [], state.visitor.user_slug);
  } catch (error) {
    console.error(error);
    const rawMessage = error?.message || '';

    if (rawMessage.includes('note_reactions_unique')) {
      setActionMessage('');
    } else {
      const message = DEBUG_UI_MESSAGES
        ? rawMessage || 'Could not update that reaction.'
        : 'Could not update that reaction.';
      setActionMessage(message, true);
    }
  } finally {
    state.busy.reactions.delete(noteId);
    setNoteReactionButtonsDisabled(noteId, false);
  }
}

async function handleUrgentConfirm() {
  if (!state.tileKey || state.busy.urgent) return;

  state.busy.urgent = true;
  confirmUrgentButton.disabled = true;
  cancelUrgentButton.disabled = true;

  try {
    await sendUrgentSignal(state.tileKey);
    closeUrgentDialog();
    setActionMessage('Signal sent.');
    showToast('Signal sent.', state.visitor?.accent_color);
  } catch (error) {
    console.error(error);
    setActionMessage(error.message || 'Could not send the signal.', true);
  } finally {
    state.busy.urgent = false;
    confirmUrgentButton.disabled = false;
    cancelUrgentButton.disabled = false;
  }
}


async function handleEnablePush() {
  if (state.busy.push) return;

  state.busy.push = true;
  if (enablePushButton) enablePushButton.disabled = true;
  setPushStatus('');

  try {
    await enablePushNotifications();
    setPushStatus('Gentle notifications enabled.');
  } catch (error) {
    console.error(error);
    setPushStatus(error.message || 'Could not enable notifications.', true);
  } finally {
    state.busy.push = false;
    if (enablePushButton) enablePushButton.disabled = false;
  }
}

thinkingButton.addEventListener('click', handleCheckIn);

toggleNoteButton.addEventListener('click', () => {
  if (noteComposer.hidden) {
    openComposer();
  } else {
    closeComposer();
  }
});

cancelNoteButton.addEventListener('click', closeComposer);
submitNoteButton.addEventListener('click', handleSubmitNote);
noteInput.addEventListener('input', updateNoteCount);
urgentButton.addEventListener('click', openUrgentDialog);
cancelUrgentButton.addEventListener('click', closeUrgentDialog);
confirmUrgentButton.addEventListener('click', handleUrgentConfirm);
notesFeed.addEventListener('click', handleReactionClick);
if (enablePushButton) {
  enablePushButton.addEventListener('click', handleEnablePush);
}

urgentDialog.addEventListener('click', (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closeUrgent === 'true') {
    closeUrgentDialog();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeUrgentDialog();
  }
});

bootstrap();
