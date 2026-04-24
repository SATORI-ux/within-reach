import {
  acknowledgeUrgentSignal,
  addNote,
  getFeed,
  getUrgentSignal,
  issueDeviceSession,
  reactNote,
  resolveVisitor,
  savePushSubscription,
  sendCheckIn,
  sendUrgentSignal,
} from './api.js';
import {
  ARRIVAL_REVEAL_DELAY_MS,
  MAX_NOTE_LENGTH,
  REACTIONS,
  VAPID_PUBLIC_KEY,
} from './config.js';
import { initializeThemeToggle, setDocumentTheme } from './theme.js';
import {
  applyAccent,
  bindHiddenDoor,
  clearMessages,
  renderArrival,
  renderCheckIns,
  renderMissingKeyState,
  renderNotes,
  renderThoughtCounts,
  revealMainContent,
  setActionMessage,
  setHiddenDoorUnlocked,
  setNoteMessage,
  setReady,
  showToast,
  toggleReactionPicker,
  updateFeedHistoryControls,
  updateRenderedNoteReactions,
} from './ui.js';

const SESSION_KEY = 'within-reach.session-token';
const SESSION_COOKIE_NAME = 'within_reach_session_token';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
const VISITOR_RESOLVE_TIMEOUT_MS = 8000;

function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function setSessionPersistence(sessionToken) {
  const normalizedToken = (sessionToken || '').trim();
  if (!normalizedToken) return;

  localStorage.setItem(SESSION_KEY, normalizedToken);

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(normalizedToken)}; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

function clearSessionPersistence() {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function getStoredSessionToken() {
  const cookieToken = getCookie(SESSION_COOKIE_NAME).trim();
  if (cookieToken) return cookieToken;

  return (localStorage.getItem(SESSION_KEY) || '').trim();
}

function replaceUrlParams(mutator) {
  const params = new URLSearchParams(window.location.search);
  mutator(params);
  const cleanSearch = params.toString();
  const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', cleanUrl || '/');
}

async function resolveSessionToken() {
  const params = new URLSearchParams(window.location.search);
  const incomingSession = (params.get('session') || '').trim();

  if (incomingSession) {
    setSessionPersistence(incomingSession);
    replaceUrlParams((nextParams) => {
      nextParams.delete('session');
    });
    return incomingSession;
  }

  const incomingKey = (params.get('key') || '').trim();

  if (incomingKey) {
    const issued = await issueDeviceSession(incomingKey, 'web');
    const sessionToken = (issued?.session_token || '').trim();

    if (!sessionToken) {
      throw new Error('Could not start this session.');
    }

    setSessionPersistence(sessionToken);
    replaceUrlParams((nextParams) => {
      nextParams.delete('key');
    });
    return sessionToken;
  }

  return getStoredSessionToken();
}

function getUrgentRoute() {
  const params = new URLSearchParams(window.location.search);
  const isUrgent = params.get('urgent') === '1';
  const signalId = (params.get('signal') || '').trim();

  if (!isUrgent || !signalId) return null;

  return { signalId };
}

function clearUrgentRoute() {
  const params = new URLSearchParams(window.location.search);
  params.delete('urgent');
  params.delete('signal');

  const cleanSearch = params.toString();
  const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', cleanUrl || '/');
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
const themeToggle = document.querySelector('#themeToggle');
const urgentDialog = document.querySelector('#urgentDialog');
const cancelUrgentButton = document.querySelector('#cancelUrgentButton');
const confirmUrgentButton = document.querySelector('#confirmUrgentButton');
const urgentPreferredResponse = document.querySelector('#urgentPreferredResponse');
const urgentState = document.querySelector('#urgentState');
const urgentStateTitle = document.querySelector('#urgentStateTitle');
const urgentStateGuidance = document.querySelector('#urgentStateGuidance');
const urgentStateTime = document.querySelector('#urgentStateTime');
const urgentContactStatus = document.querySelector('#urgentContactStatus');
const urgentCallLink = document.querySelector('#urgentCallLink');
const urgentTextLink = document.querySelector('#urgentTextLink');
const ackUrgentButton = document.querySelector('#ackUrgentButton');
const urgentStateMessage = document.querySelector('#urgentStateMessage');
const notesFeed = document.querySelector('#notesFeed');
const enablePushButton = document.querySelector('#enablePushButton');
const dismissPushPromptButton = document.querySelector('#dismissPushPromptButton');
const pushCopyEl = document.querySelector('#pushCopy');
const pushInterludeEl = document.querySelector('.push-interlude');
const pushInterludeActionsEl = document.querySelector('#pushInterludeActions');
const pushStatusEl = document.querySelector('#pushStatus');
const pushDebugPanelEl = document.querySelector('#pushDebugPanel');
const pushDebugSummaryEl = document.querySelector('#pushDebugSummary');
const pushDebugDevicesEl = document.querySelector('#pushDebugDevices');
const loadOlderCheckInsButton = document.querySelector('#loadOlderCheckInsButton');
const collapseCheckInsButton = document.querySelector('#collapseCheckInsButton');
const loadOlderNotesButton = document.querySelector('#loadOlderNotesButton');
const collapseNotesButton = document.querySelector('#collapseNotesButton');

const state = {
  sessionToken: '',
  visitor: null,
  urgentSignal: null,
  pushDebug: null,
  pushDeviceState: null,
  checkIns: [],
  notes: [],
  thoughtCounts: [],
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
    urgentAck: false,
    push: false,
    reactions: new Set(),
  },
};

const PUSH_PROMPT_DISMISS_PREFIX = 'within-reach.push-prompt-dismissed.';

function getPushDebugMode() {
  return new URLSearchParams(window.location.search).get('debugPush') === '1';
}

function getPushPromptDismissKey(userSlug) {
  return `${PUSH_PROMPT_DISMISS_PREFIX}${userSlug}`;
}

function isPushPromptDismissed(userSlug) {
  if (!userSlug) return false;
  return window.localStorage.getItem(getPushPromptDismissKey(userSlug)) === '1';
}

function dismissPushPromptForCurrentVisitor() {
  if (!state.visitor?.user_slug) return;
  window.localStorage.setItem(getPushPromptDismissKey(state.visitor.user_slug), '1');
}

function clearPushPromptDismissal(userSlug) {
  if (!userSlug) return;
  window.localStorage.removeItem(getPushPromptDismissKey(userSlug));
}

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
  pushStatusEl.style.color = isError ? 'var(--danger)' : 'var(--text-faint)';
  pushStatusEl.hidden = !message;
}

function setPushEnabledState(enabled) {
  if (!enablePushButton) return;

  enablePushButton.disabled = enabled;
  enablePushButton.textContent = enabled
    ? 'Gentle notifications on'
    : 'Enable gentle notifications';

}

function renderPushDebugPanel() {
  if (!pushDebugPanelEl || !pushDebugSummaryEl || !pushDebugDevicesEl) return;

  const debugMode = getPushDebugMode();
  const debug = state.pushDebug;
  const deviceState = state.pushDeviceState;

  pushDebugPanelEl.hidden = !debugMode;
  if (!debugMode) return;

  const backendEnabled = state.visitor?.push_enabled ? 'on' : 'off';
  const deviceSubscribed = deviceState?.hasDeviceSubscription ? 'yes' : 'no';
  const permission = deviceState?.permission || 'unknown';
  const currentLabel = debug?.current_device?.label || 'unknown';

  pushDebugSummaryEl.textContent =
    `Backend push: ${backendEnabled}. Browser permission: ${permission}. This device subscribed: ${deviceSubscribed}. This-device id: ${currentLabel}.`;

  pushDebugDevicesEl.innerHTML = '';

  const enabledDevices = debug?.enabled_devices || [];
  if (!enabledDevices.length) {
    const empty = document.createElement('p');
    empty.className = 'push-debug__device-meta';
    empty.textContent = 'No enabled devices are recorded for this user yet.';
    pushDebugDevicesEl.appendChild(empty);
    return;
  }

  enabledDevices.forEach((device, index) => {
    const card = document.createElement('article');
    card.className = 'push-debug__device';

    const title = document.createElement('p');
    title.className = 'push-debug__device-title';
    title.textContent = device.this_device
      ? `${device.label || `Device ${index + 1}`} (this-device)`
      : device.label || `Device ${index + 1}`;

    const meta = document.createElement('p');
    meta.className = 'push-debug__device-meta';
    meta.textContent = `Updated ${device.updated_at || 'unknown'} • host ${device.endpoint_host || 'unknown'}`;

    card.append(title, meta);
    pushDebugDevicesEl.appendChild(card);
  });
}

function syncPushUiWithVisitorTruth() {
  const enabled = Boolean(state.visitor?.push_enabled);
  const hasStatus = Boolean(pushStatusEl?.textContent);
  const showPrompt =
    supportsPushNotifications() &&
    Boolean(state.visitor?.user_slug) &&
    !enabled &&
    !isPushPromptDismissed(state.visitor.user_slug);
  const showDebug = getPushDebugMode();

  setPushEnabledState(enabled);

  if (enabled && state.visitor?.user_slug) {
    clearPushPromptDismissal(state.visitor.user_slug);
  }

  if (pushCopyEl) {
    pushCopyEl.hidden = !showPrompt;
  }

  if (pushInterludeActionsEl) {
    pushInterludeActionsEl.hidden = !showPrompt;
  }

  if (pushInterludeEl) {
    pushInterludeEl.hidden = !showPrompt && !showDebug && !hasStatus;
    pushInterludeEl.classList.toggle('push-interlude--compact', !showPrompt);
  }

  renderPushDebugPanel();
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
  renderThoughtCounts(state.thoughtCounts);
  syncFeedHistoryControls();
}

function applyInitialFeedPayload(feed) {
  state.checkIns = feed.check_ins || [];
  state.notes = feed.notes || [];
  state.thoughtCounts = feed.thought_counts || [];
  setHiddenDoorUnlocked(feed.secret_state?.unlocked);

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

function formatUrgentTimestamp(input) {
  const date = new Date(input);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function preferredResponseGuidance(signal) {
  const name = signal.from_display_name || 'Someone';

  if (signal.preferred_response === 'call') {
    return `${name} would prefer a call right now.`;
  }

  if (signal.preferred_response === 'text') {
    return `A text would help ${name} right now.`;
  }

  return `Call or text, whichever is easiest.`;
}

function setUrgentStateMessage(message, isError = false) {
  urgentStateMessage.textContent = message;
  urgentStateMessage.style.color = isError ? 'var(--danger)' : 'var(--text-soft)';
}

function setResponseLink(link, href, visible) {
  link.hidden = !visible;
  link.setAttribute('aria-hidden', visible ? 'false' : 'true');
  link.href = visible ? href : '#';
}

function normalizePhoneForUri(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';

  const compact = raw.replace(/[^\d+]/g, '');
  if (compact.startsWith('+')) return compact;

  const digits = compact.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;

  return compact;
}

function setUrgentContactStatus(message) {
  if (!urgentContactStatus) return;
  urgentContactStatus.textContent = message;
  urgentContactStatus.hidden = !message;
}

function renderUrgentSignal(signal) {
  state.urgentSignal = signal;

  if (!signal || signal.status === 'acknowledged') {
    urgentState.hidden = true;
    setUrgentStateMessage('');
    setUrgentContactStatus('');
    return;
  }

  const phone = normalizePhoneForUri(signal.contact_phone);
  const allowsCall = signal.preferred_response === 'call' || signal.preferred_response === 'either';
  const allowsText = signal.preferred_response === 'text' || signal.preferred_response === 'either';

  urgentState.hidden = false;
  urgentState.classList.remove('is-acknowledged');
  urgentStateTitle.textContent = `${signal.from_display_name || 'Someone'} needs you.`;
  urgentStateGuidance.textContent = preferredResponseGuidance(signal);
  urgentStateTime.textContent = `Sent ${formatUrgentTimestamp(signal.created_at)}`;

  setResponseLink(urgentCallLink, `tel:${phone}`, Boolean(phone && allowsCall));
  setResponseLink(urgentTextLink, `sms:${phone}`, Boolean(phone && allowsText));
  setUrgentContactStatus(
    phone
      ? ''
      : 'Call and text details are not set up here yet. Let them know you saw this when you can.'
  );

  ackUrgentButton.disabled = false;
  setUrgentStateMessage('');
  urgentState.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadUrgentRoute(route) {
  if (!route || !state.sessionToken) return;

  try {
    const result = await getUrgentSignal(state.sessionToken, route.signalId);
    renderUrgentSignal(result.signal);
  } catch (error) {
    console.error(error);
    clearUrgentRoute();
    setActionMessage(error.message || 'Could not open that signal.', true);
  }
}

function supportsPushNotifications() {
  return 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

function getNotificationPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

async function getCurrentPushSubscription() {
  if (!supportsPushNotifications()) return null;

  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? await registration.pushManager.getSubscription() : null;
}

async function inspectCurrentDevicePushSubscription() {
  try {
    const subscription = await getCurrentPushSubscription();
    return {
      hasDeviceSubscription: Boolean(subscription),
      permission: getNotificationPermission(),
    };
  } catch (error) {
    console.warn('Could not read current push subscription.', error);
    return {
      hasDeviceSubscription: false,
      permission: getNotificationPermission(),
      error,
    };
  }
}

async function logPushTruthMismatch() {
  if (!state.visitor) return;

  const deviceState = await inspectCurrentDevicePushSubscription();
  state.pushDeviceState = deviceState;
  const visitorPushEnabled = Boolean(state.visitor.push_enabled);

  if (deviceState.hasDeviceSubscription !== visitorPushEnabled) {
    console.warn('Push truth mismatch detected.', {
      userSlug: state.visitor.user_slug,
      visitorPushEnabled,
      hasDeviceSubscription: deviceState.hasDeviceSubscription,
      permission: deviceState.permission,
    });
  }
}

async function refreshPushDebugState() {
  state.pushDeviceState = await inspectCurrentDevicePushSubscription();
}

async function refreshVisitorPushTruth() {
  if (!state.sessionToken || !state.visitor) return null;

  try {
    const refreshedVisitor = await withTimeout(
      resolveVisitor(state.sessionToken, { debug_push: getPushDebugMode() }),
      VISITOR_RESOLVE_TIMEOUT_MS,
      'Still finding your place...'
    );
    state.pushDebug = refreshedVisitor.push_debug || null;
    state.visitor = {
      ...state.visitor,
      ...refreshedVisitor,
    };
    syncPushUiWithVisitorTruth();
    return state.visitor;
  } catch (error) {
    console.warn('Could not refresh visitor push truth.', error);
    return null;
  }
}

async function enablePushNotifications() {
  if (!state.sessionToken) {
    throw new Error('No session is active for this visit.');
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

  await savePushSubscription(state.sessionToken, subscription);
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
  const defaultChoice = urgentPreferredResponse?.querySelector('input[value="either"]');
  if (defaultChoice) defaultChoice.checked = true;
}

async function refreshFeed() {
  if (!state.sessionToken) return;

  const feed = await getFeed(state.sessionToken, {
    check_ins_limit: state.feed.checkIns.limit,
    notes_limit: state.feed.notes.limit,
  });

  applyInitialFeedPayload(feed);
}

async function handleLoadOlderCheckIns() {
  if (!state.sessionToken) return;
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
    const feed = await getFeed(state.sessionToken, {
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
  if (!state.sessionToken) return;
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
    const feed = await getFeed(state.sessionToken, {
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
  setDocumentTheme(document.documentElement.dataset.theme);
  initializeThemeToggle(themeToggle);
  setReady();
  setActionsDisabled(true);
  bindHiddenDoor();
  bindRevealSkip();
  updateNoteCount();

  state.sessionToken = await resolveSessionToken();
  const urgentRoute = getUrgentRoute();

  if (!state.sessionToken) {
    renderMissingKeyState();
    renderCheckIns([]);
    renderNotes([], '');
    renderThoughtCounts([]);
    state.visitor = null;
    syncPushUiWithVisitorTruth();
    finishBoot();
    syncFeedHistoryControls();
    scheduleReveal();
    return;
  }

  try {
    state.visitor = await withTimeout(
      resolveVisitor(state.sessionToken, { debug_push: getPushDebugMode() }),
      VISITOR_RESOLVE_TIMEOUT_MS,
      'Still finding your place...'
    );
    state.pushDebug = state.visitor.push_debug || null;
    await refreshPushDebugState();

    applyAccent(state.visitor.user_slug);
    await renderArrival(state.visitor);
    finishBoot();
    setPushStatus('');
    syncPushUiWithVisitorTruth();
    void logPushTruthMismatch();

    if (urgentRoute) {
      reveal();
      await loadUrgentRoute(urgentRoute);
    } else {
      scheduleReveal();
    }

    await withTimeout(
      refreshFeed(),
      VISITOR_RESOLVE_TIMEOUT_MS,
      'Could not load this space right now.'
    );

    setActionsDisabled(false);
  } catch (error) {
    console.error(error);

    const message = error?.message || 'Could not open this space right now.';
    const shouldClearStoredKey = /invalid tile key|invalid session token|not active/i.test(message);

    if (shouldClearStoredKey) {
      clearSessionPersistence();
      renderMissingKeyState();
      renderCheckIns([]);
      renderNotes([], '');
      renderThoughtCounts([]);
    }

    state.visitor = null;
    state.pushDebug = null;
    state.pushDeviceState = null;
    finishBoot();
    setActionMessage(message, true);
    setPushStatus('');
    syncPushUiWithVisitorTruth();
    syncFeedHistoryControls();
    scheduleReveal();
  }
}

async function handleCheckIn() {
  if (!state.sessionToken || state.busy.checkIn) return;

  state.busy.checkIn = true;
  clearMessages();
  thinkingButton.disabled = true;

  try {
    const result = await sendCheckIn(state.sessionToken);
    setHiddenDoorUnlocked(result.secret_state?.unlocked);
    state.thoughtCounts = result.thought_counts || state.thoughtCounts;

    if (result.check_in) {
      state.checkIns = [result.check_in, ...state.checkIns];

      const exceededLimit = state.checkIns.length > state.feed.checkIns.limit;
      state.feed.checkIns.hasMore = state.feed.checkIns.hasMore || exceededLimit;

      updateLocalCheckInsPageState();
      renderCurrentCheckIns();
    }

    showToast('A little thought sent.', state.visitor.accent_color);
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
  if (!state.sessionToken || state.busy.note) return;

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
    const result = await addNote(state.sessionToken, content);
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
  if (!(event.target instanceof Element)) return;

  const toggleButton = event.target.closest('[data-action="toggle-reaction-picker"]');
  if (toggleButton) {
    const noteId = Number(toggleButton.dataset.noteId);
    if (noteId) {
      toggleReactionPicker(noteId);
    }
    return;
  }

  const button = event.target.closest('.reaction-chip');
  if (!button || !state.sessionToken || !state.visitor) return;

  const noteId = Number(button.dataset.noteId);
  const reactionIndex = Number(button.dataset.reactionIndex);
  const reaction = REACTIONS[reactionIndex];

  if (!noteId || !reaction) return;
  if (state.busy.reactions.has(noteId)) return;

  state.busy.reactions.add(noteId);
  setNoteReactionButtonsDisabled(noteId, true);
  setActionMessage('');

  try {
    const result = await reactNote(state.sessionToken, noteId, reaction);
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
      const message = rawMessage || 'Could not update that reaction.';
      setActionMessage(message, true);
    }
  } finally {
    state.busy.reactions.delete(noteId);
    setNoteReactionButtonsDisabled(noteId, false);
  }
}

async function handleUrgentConfirm() {
  if (!state.sessionToken || state.busy.urgent) return;

  state.busy.urgent = true;
  confirmUrgentButton.disabled = true;
  cancelUrgentButton.disabled = true;

  try {
    const preferredResponse =
      urgentPreferredResponse?.querySelector('input[name="preferredResponse"]:checked')?.value || 'either';

    await sendUrgentSignal(state.sessionToken, preferredResponse);
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

async function handleUrgentAck() {
  if (!state.sessionToken || !state.urgentSignal || state.busy.urgentAck) return;

  state.busy.urgentAck = true;
  ackUrgentButton.disabled = true;
  setUrgentStateMessage('');

  try {
    const result = await acknowledgeUrgentSignal(state.sessionToken, state.urgentSignal.signal_id);
    state.urgentSignal = {
      ...state.urgentSignal,
      ...result.signal,
    };
    urgentState.classList.add('is-acknowledged');
    urgentState.hidden = true;
    clearUrgentRoute();
    setActionMessage('Signal received.');
    showToast('Signal received.', state.visitor?.accent_color);
  } catch (error) {
    console.error(error);
    setUrgentStateMessage(error.message || 'Could not acknowledge the signal.', true);
    ackUrgentButton.disabled = false;
  } finally {
    state.busy.urgentAck = false;
  }
}

async function handleEnablePush() {
  if (state.busy.push) return;

  state.busy.push = true;
  if (enablePushButton) enablePushButton.disabled = true;
  setPushStatus('');

  try {
    await enablePushNotifications();
    await refreshPushDebugState();
    const refreshedVisitor = await refreshVisitorPushTruth();
    syncPushUiWithVisitorTruth();
    if (refreshedVisitor?.push_enabled) {
      setPushStatus('Quietly enabled.');
    } else {
      setPushStatus('Subscription saved. Waiting to confirm here.');
    }
    window.setTimeout(() => {
      setPushStatus('');
    }, 2400);
  } catch (error) {
    console.error(error);
    syncPushUiWithVisitorTruth();
    setPushStatus(error.message || 'Could not enable notifications.', true);
  } finally {
    state.busy.push = false;
    if (enablePushButton && enablePushButton.textContent !== 'Gentle notifications on') {
      enablePushButton.disabled = false;
    }
  }
}

function handleDismissPushPrompt() {
  dismissPushPromptForCurrentVisitor();
  setPushStatus('');
  syncPushUiWithVisitorTruth();
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
ackUrgentButton.addEventListener('click', handleUrgentAck);
notesFeed.addEventListener('click', handleReactionClick);

if (enablePushButton) {
  enablePushButton.addEventListener('click', handleEnablePush);
}

if (dismissPushPromptButton) {
  dismissPushPromptButton.addEventListener('click', handleDismissPushPrompt);
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
