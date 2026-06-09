import { issueDeviceSession } from './api.js';

const SESSION_KEY = 'within-reach.session-token';
const SESSION_COOKIE_NAME = 'within_reach_session_token';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

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
  window.history.replaceState({}, '', cleanUrl);
}

export async function resolveQuietSession(label = 'quietly-kept') {
  const params = new URLSearchParams(window.location.search);
  const incomingSession = (params.get('session') || '').trim();

  if (incomingSession) {
    setSessionPersistence(incomingSession);
    replaceUrlParams((nextParams) => nextParams.delete('session'));
    return incomingSession;
  }

  const incomingKey = (params.get('key') || '').trim();

  if (incomingKey) {
    const issued = await issueDeviceSession(incomingKey, label);
    const sessionToken = (issued?.session_token || '').trim();

    if (!sessionToken) {
      throw new Error('Could not start this session.');
    }

    setSessionPersistence(sessionToken);
    replaceUrlParams((nextParams) => nextParams.delete('key'));
    return sessionToken;
  }

  return getStoredSessionToken();
}
