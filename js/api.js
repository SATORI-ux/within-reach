import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.js';

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('http')) {
    throw new Error('Set a valid SUPABASE_URL in js/config.js before running the app.');
  }

  if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.includes('YOUR_')) {
    throw new Error('Set your Supabase publishable key in js/config.js before running the app.');
  }
}

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
}

async function callFunction(functionName, payload = {}) {
  assertConfig();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.error || json?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
}

export function resolveVisitor(tileKey) {
  return callFunction('resolve-visitor', { tile_key: tileKey });
}

export function issueDeviceSession(tileKey, label = 'web') {
  return callFunction('issue-device-session', {
    key: tileKey,
    label,
  });
}

export function getFeed(tileKey, options = {}) {
  return callFunction('get-feed', {
    tile_key: tileKey,
    ...options,
  });
}

export function sendCheckIn(tileKey, options = {}) {
  return callFunction('send-check-in', {
    tile_key: tileKey,
    ...options,
  });
}

export function addNote(tileKey, content) {
  return callFunction('add-note', { tile_key: tileKey, content });
}

export function reactNote(tileKey, noteId, reaction) {
  return callFunction('react-note', {
    tile_key: tileKey,
    note_id: noteId,
    reaction,
  });
}

export function sendUrgentSignal(tileKey, preferredResponse = 'either') {
  return callFunction('send-urgent-signal', {
    tile_key: tileKey,
    preferred_response: preferredResponse,
  });
}

export function getUrgentSignal(tileKey, signalId) {
  return callFunction('get-urgent-signal', {
    tile_key: tileKey,
    signal_id: signalId,
  });
}

export function acknowledgeUrgentSignal(tileKey, signalId) {
  return callFunction('acknowledge-urgent-signal', {
    tile_key: tileKey,
    signal_id: signalId,
  });
}

export function savePushSubscription(tileKey, subscription) {
  return callFunction('save-push-subscription', {
    key: tileKey,
    subscription,
  });
}

export function getPrivatePage(tileKey) {
  return callFunction('get-private-page', {
    tile_key: tileKey,
  });
}
