import { getPrivatePage, issueDeviceSession } from './api.js';
import { initializeThemeToggle, setDocumentTheme } from './theme.js';

const SESSION_KEY = 'within-reach.session-token';
const SESSION_COOKIE_NAME = 'within_reach_session_token';

const statusCard = document.querySelector('#statusCard');
const statusTitle = document.querySelector('#statusTitle');
const statusBody = document.querySelector('#statusBody');
const privatePage = document.querySelector('#privatePage');
const themeToggle = document.querySelector('#themeToggle');

const heroEyebrow = document.querySelector('#heroEyebrow');
const heroTitle = document.querySelector('#heroTitle');
const heroOpening = document.querySelector('#heroOpening');

const letterLabel = document.querySelector('#letterLabel');
const letterTitle = document.querySelector('#letterTitle');
const letterBody = document.querySelector('#letterBody');

const meaningSection = document.querySelector('#meaningSection');
const meaningLabel = document.querySelector('#meaningLabel');
const meaningTitle = document.querySelector('#meaningTitle');
const meaningCards = document.querySelector('#meaningCards');
const meaningBody = document.querySelector('#meaningBody');

const videoSection = document.querySelector('#videoSection');
const videoLabel = document.querySelector('#videoLabel');
const videoTitle = document.querySelector('#videoTitle');
const videoSlot = document.querySelector('#videoSlot');

const imagesSection = document.querySelector('#imagesSection');
const imagesLabel = document.querySelector('#imagesLabel');
const imagesTitle = document.querySelector('#imagesTitle');
const imagesGrid = document.querySelector('#imagesGrid');

const closingLine = document.querySelector('#closingLine');

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
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(normalizedToken)}; Max-Age=${60 * 60 * 24 * 90}; Path=/; SameSite=Lax${secure}`;
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
    const issued = await issueDeviceSession(incomingKey, 'private-page');
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

function setStatus(title, body) {
  statusTitle.textContent = title;
  statusBody.textContent = body;
}

function appendParagraphs(container, paragraphs = []) {
  container.innerHTML = '';

  paragraphs
    .filter((value) => typeof value === 'string' && value.trim())
    .forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      container.appendChild(p);
    });
}

function renderMeaningCards(cards = []) {
  meaningCards.innerHTML = '';

  cards.forEach((card) => {
    if (!card?.title || !card?.body) return;

    const article = document.createElement('article');
    article.className = 'name-card';

    const heading = document.createElement('h3');
    heading.textContent = card.title;

    const paragraph = document.createElement('p');
    paragraph.textContent = card.body;

    article.append(heading, paragraph);
    meaningCards.appendChild(article);
  });
}

function renderVideo(video) {
  videoSlot.innerHTML = '';

  if (video?.src) {
    const media = document.createElement('video');
    media.src = video.src;
    media.controls = true;
    media.playsInline = true;
    if (video.poster) media.poster = video.poster;
    videoSlot.appendChild(media);
  } else if (video?.embed_html) {
    videoSlot.innerHTML = video.embed_html;
  } else if (video?.placeholder) {
    const paragraph = document.createElement('p');
    paragraph.textContent = video.placeholder;
    videoSlot.appendChild(paragraph);
  }
}

function renderImages(images = []) {
  imagesGrid.innerHTML = '';

  images.forEach((image) => {
    const slot = document.createElement('div');
    slot.className = 'media-slot image-slot';

    if (image?.src) {
      const img = document.createElement('img');
      img.src = image.src;
      img.alt = image.alt || '';
      slot.appendChild(img);
    } else if (image?.placeholder) {
      slot.textContent = image.placeholder;
    }

    imagesGrid.appendChild(slot);
  });
}

function renderPage(content) {
  heroEyebrow.textContent = content.hero?.eyebrow || 'Quietly kept';
  heroTitle.textContent = content.hero?.title || 'A note that stayed.';
  heroOpening.textContent = content.hero?.opening || '';

  letterLabel.textContent = content.letter?.label || 'For you';
  letterTitle.textContent = content.letter?.title || 'There has been a note here.';
  appendParagraphs(letterBody, content.letter?.paragraphs || []);

  const hasMeaningCards = Array.isArray(content.meaning?.cards) && content.meaning.cards.length > 0;
  const hasMeaningBody = Array.isArray(content.meaning?.paragraphs) && content.meaning.paragraphs.length > 0;
  meaningSection.hidden = !(hasMeaningCards || hasMeaningBody);
  if (!meaningSection.hidden) {
    meaningLabel.textContent = content.meaning?.label || 'What this means';
    meaningTitle.textContent = content.meaning?.title || 'What this holds.';
    renderMeaningCards(content.meaning?.cards || []);
    appendParagraphs(meaningBody, content.meaning?.paragraphs || []);
  }

  const hasVideo = Boolean(content.video?.src || content.video?.embed_html || content.video?.placeholder);
  videoSection.hidden = !hasVideo;
  if (hasVideo) {
    videoLabel.textContent = content.video?.label || 'A moving piece';
    videoTitle.textContent = content.video?.title || 'A small video can live here.';
    renderVideo(content.video);
  }

  const hasImages = Array.isArray(content.images?.items) && content.images.items.length > 0;
  imagesSection.hidden = !hasImages;
  if (hasImages) {
    imagesLabel.textContent = content.images?.label || 'Kept images';
    imagesTitle.textContent = content.images?.title || 'A few still things.';
    renderImages(content.images.items);
  }

  closingLine.textContent = content.closing_line || 'Still here.';

  statusCard.hidden = true;
  privatePage.hidden = false;
}

async function bootstrap() {
  setDocumentTheme(document.documentElement.dataset.theme);
  initializeThemeToggle(themeToggle);
  const sessionToken = await resolveSessionToken();

  if (!sessionToken) {
    setStatus('This page needs your session.', 'Open the shared space first, then return through the hidden door.');
    return;
  }

  try {
    const result = await getPrivatePage(sessionToken);

    if (!result.unlocked) {
      setStatus('This doorway is still closed.', 'The private page becomes available after the hidden door has been unlocked.');
      return;
    }

    if (!result.content) {
      setStatus('The private page is ready, but still empty.', 'Add a row to public.private_pages for this user to populate the protected content.');
      return;
    }

    renderPage(result.content);
  } catch (error) {
    console.error(error);
    setStatus('This private page could not load.', error?.message || 'Try again in a moment.');
  }
}

bootstrap();
