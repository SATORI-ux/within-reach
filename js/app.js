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
  updateFeedHistoryControls,
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
  const normalizedKey = (tileKey || '').trim();
  if (!normalizedKey) return;

  localStorage.setItem(SESSION_KEY, normalizedKey);

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(normalizedKey)}; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

function clearTileKeyPersistence() {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function getStoredTileKey() {
  const cookieKey = getCookie(SESSION_COOKIE_NAME).trim();
  if (cookieKey) return cookieKey;

  return (localStorage.getItem(SESSION_KEY) || '').trim();
}

function getTileKey() {
  const params = new URLSearchParams(window.location.search);
  const incomingKey = (params.get('key') || '').trim();

  if (incomingKey) {
    setTileKeyPersistence(incomingKey);
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl || '/');
    return incomingKey;
  }

  return getStoredTileKey();
}

function finishBoot() {
  document.body.classList.remove('is-booting');
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
const loadOlderCheckInsButton = document.querySelector('#loadOlderCheckInsButton');
const collapseCheckInsButton = document.querySelector('#collapseCheckInsButton');
const loadOlderNotesButton = document.querySelector('#loadOlderNotesButton');
const collapseNotesButton = document.querySelector('#collapseNotesButton');

const state = {
  tileKey: '',
  visitor: null,
  checkIns: [],
  notes: [],
  revealTimer: null,
  revealed: false,
  feed: {
    checkIns: {
      limit: 8,
      hasMore: false,
      nextBeforeId: null,
      loadingOlder: false,
      expanded: false,
    },
    notes: {
      limit: 5,
      hasMore: false,
      nextBeforeId: null,
      loadingOlder: false,
      expanded: false,
    },
  },
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
  pushStatusEl.style.color = isError ? '#8a4f4f' : 'rgba(77, 66, 58, 0.58)';
}

function setPushEnabledState(enabled) {
  if (!enablePushButton) return;

  enablePushButton.disabled = enabled;
  enablePushButton.textContent = enabled
    ? 'Gentle notifications on'
    : 'Enable gentle notifications';
}

function getVisibleCheckIns() {
  if (state.feed.checkIns.expanded) return state.checkIns;
  return state.checkIns.slice(0, state.feed.checkIns.limit);
}

function getVisibleNotes() {
  if (state.feed.notes.expanded) return state.notes;
  return state.notes.slice(0, state.feed.notes.limit);
}

function hasCollapsedCheckInsHistory() {
  return state.checkIns.length > state.feed.checkIns.limit;
}

function hasCollapsedNotesHistory() {
  return state.notes.length > state.feed.notes.limit;
}

function syncFeedHistoryControls() {
  updateFeedHistoryControls({
    checkIns: {
      hasMore: state.feed.checkIns.hasMore || (!state.feed.checkIns.expanded && hasCollapsedCheckInsHistory()),
      loadingOlder: state.feed.checkIns.loadingOlder,
      expanded: state.feed.checkIns.expanded,
    },
    notes: {
      hasMore: state.feed.notes.hasMore || (!state.feed.notes.expanded && hasCollapsedNotesHistory()),
      loadingOlder: state.feed.notes.loadingOlder,
      expanded: state.feed.notes.expanded,
    },
  });
}

function renderCurrentCheckIns() {
  renderCheckIns(getVisibleCheckIns());
  syncFeedHistoryControls();
}

function renderCurrentNotes() {
  renderNotes(getVisibleNotes(), state.visitor?.user_slug);
  syncFeedHistoryControls();
}

function renderCurrentFeeds() {
  renderCheckIns(getVisibleCheckIns());
  renderNotes(getVisibleNotes(), state.visitor?.user_slug);
  syncFeedHistoryControls();
}

function applyInitialFeedPayload(feed) {
  state.checkIns = feed.check_ins || [];
  state.notes = feed.notes || [];

  state.feed.checkIns.hasMore = Boolean(feed.check_ins_page?.has_more);
  state.feed.checkIns.nextBeforeId = feed.check_ins_page?.next_before_id ?? null;
  state.feed.checkIns.expanded = false;

  state.feed.notes.hasMore = Boolean(feed.notes_page?.has_more);
  state.feed.notes.nextBeforeId = feed.notes_page?.next_before_id ?? null;
  state.feed.notes.expanded = false;

  renderCurrentFeeds();
}

function updateLocalCheckInsPageState() {
  state.feed.checkIns.nextBeforeId = state.checkIns.length
    ? state.checkIns[state.checkIns.length - 1].id
    : null;
}

function updateLocalNotesPageState() {
  state.feed.notes.nextBeforeId = state.notes.length
    ? state.notes[state.notes.length - 1].id
    : null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function supportsPushNotifications() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getCurrentPushSubscription() {
  if (!supportsPushNotifications()) return null;

  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? await registration.pushManager.getSubscription() : null;
}

async function syncPushButtonWithCurrentDevice() {
  try {
    const subscription = await getCurrentPushSubscription();
    setPushEnabledState(Boolean(subscription));
  } catch (error) {
    console.warn('Could not read current push subscription.', error);
    setPushEnabledState(false);
  }
}

async function enablePushNotifications() {
  if (!state.tileKey) {
    throw new Error('No tile key is active for this session.');
  }

  if (!supportsPushNotifications()) {
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

  const feed = await getFeed(state.tileKey, {
    check_ins_limit: state.feed.checkIns.limit,
    notes_limit: state.feed.notes.limit,
  });

  applyInitialFeedPayload(feed);
}

async function handleLoadOlderCheckIns() {
  if (!state.tileKey) return;
  if (state.feed.checkIns.loadingOlder) return;

  const hasHiddenLoaded = hasCollapsedCheckInsHistory();

  if (!state.feed.checkIns.expanded && hasHiddenLoaded) {
    state.feed.checkIns.expanded = true;
    renderCurrentCheckIns();
    return;
  }

  if (!state.feed.checkIns.hasMore || !state.feed.checkIns.nextBeforeId) return;

  state.feed.checkIns.loadingOlder = true;
  syncFeedHistoryControls();

  try {
    const feed = await getFeed(state.tileKey, {
      check_ins_limit: state.feed.checkIns.limit,
      check_ins_before_id: state.feed.checkIns.nextBeforeId,
      notes_limit: 1,
    });

    const olderCheckIns = feed.check_ins || [];

    state.feed.checkIns.expanded = true;
    state.checkIns = [...state.checkIns, ...olderCheckIns];
    state.feed.checkIns.hasMore = Boolean(feed.check_ins_page?.has_more);
    state.feed.checkIns.nextBeforeId = feed.check_ins_page?.next_before_id ?? null;

    renderCurrentCheckIns();
  } catch (error) {
    console.error(error);
    setActionMessage(error.message || 'Could not load older check-ins.', true);
  } finally {
    state.feed.checkIns.loadingOlder = false;
    syncFeedHistoryControls();
  }
}

async function handleLoadOlderNotes() {
  if (!state.tileKey) return;
  if (state.feed.notes.loadingOlder) return;

  const hasHiddenLoaded = hasCollapsedNotesHistory();

  if (!state.feed.notes.expanded && hasHiddenLoaded) {
    state.feed.notes.expanded = true;
    renderCurrentNotes();
    return;
  }

  if (!state.feed.notes.hasMore || !state.feed.notes.nextBeforeId) return;

  state.feed.notes.loadingOlder = true;
  syncFeedHistoryControls();

  try {
    const feed = await getFeed(state.tileKey, {
      check_ins_limit: 1,
      notes_limit: state.feed.notes.limit,
      notes_before_id: state.feed.notes.nextBeforeId,
    });

    const olderNotes = feed.notes || [];

    state.feed.notes.expanded = true;
    state.notes = [...state.notes, ...olderNotes];
    state.feed.notes.hasMore = Boolean(feed.notes_page?.has_more);
    state.feed.notes.nextBeforeId = feed.notes_page?.next_before_id ?? null;

    renderCurrentNotes();
  } catch (error) {
    console.error(error);
    setActionMessage(error.message || 'Could not load older notes.', true);
  } finally {
    state.feed.notes.loadingOlder = false;
    syncFeedHistoryControls();
  }
}

function handleCollapseCheckIns() {
  if (!state.feed.checkIns.expanded) return;
  state.feed.checkIns.expanded = false;
  renderCurrentCheckIns();
}

function handleCollapseNotes() {
  if (!state.feed.notes.expanded) return;
  state.feed.notes.expanded = false;
  renderCurrentNotes();
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
    state.visitor = null;
    setPushEnabledState(false);
    finishBoot();
    syncFeedHistoryControls();
    scheduleReveal();
    return;
  }

  try {
    state.visitor = await withTimeout(
      resolveVisitor(state.tileKey),
      VISITOR_RESOLVE_TIMEOUT_MS,
      'Still finding your place...'
    );

    applyAccent(state.visitor.user_slug);
    renderArrival(state.visitor);
    finishBoot();
    setPushStatus('');
    await syncPushButtonWithCurrentDevice();
    scheduleReveal();

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

    state.visitor = null;
    finishBoot();
    setActionMessage(message, true);
    setPushStatus('');
    setPushEnabledState(false);
    syncFeedHistoryControls();
    scheduleReveal();
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

      const exceededLimit = state.checkIns.length > state.feed.checkIns.limit;
      state.feed.checkIns.hasMore = state.feed.checkIns.hasMore || exceededLimit;

      updateLocalCheckInsPageState();
      renderCurrentCheckIns();
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

      const exceededLimit = state.notes.length > state.feed.notes.limit;
      state.feed.notes.hasMore = state.feed.notes.hasMore || exceededLimit;

      updateLocalNotesPageState();
      renderCurrentNotes();
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
    if (state.visitor) {
      state.visitor.push_enabled = true;
    }
    setPushEnabledState(true);
    setPushStatus('Quietly enabled.');
    window.setTimeout(() => {
      setPushStatus('');
    }, 2400);
  } catch (error) {
    console.error(error);
    if (state.visitor) {
      state.visitor.push_enabled = false;
    }
    setPushEnabledState(false);
    setPushStatus(error.message || 'Could not enable notifications.', true);
  } finally {
    state.busy.push = false;
    if (enablePushButton && enablePushButton.textContent !== 'Gentle notifications on') {
      enablePushButton.disabled = false;
    }
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

if (loadOlderCheckInsButton) {
  loadOlderCheckInsButton.addEventListener('click', handleLoadOlderCheckIns);
}

if (collapseCheckInsButton) {
  collapseCheckInsButton.addEventListener('click', handleCollapseCheckIns);
}

if (loadOlderNotesButton) {
  loadOlderNotesButton.addEventListener('click', handleLoadOlderNotes);
}

if (collapseNotesButton) {
  collapseNotesButton.addEventListener('click', handleCollapseNotes);
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
