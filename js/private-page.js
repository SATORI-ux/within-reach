import { getPrivatePage, issueDeviceSession } from './api.js';
import { IS_PRIVATE_BUILD } from './config.js';
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
const thoughtReveal = document.querySelector('#thoughtReveal');
const thoughtRevealList = document.querySelector('#thoughtRevealList');

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

const emptyKeptPageContent = {
  hero: {
    eyebrow: 'Quietly kept',
    title: 'A page kept open.',
    opening: 'The note itself has not been placed here yet.',
  },
  letter: {
    label: 'Held here',
    title: 'The letter is still unwritten.',
    paragraphs: [
      'For now, this page can still hold the small trace count without becoming a public tally.',
    ],
  },
  closing_line: 'Still here.',
};

const ALLOWED_VIDEO_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
]);

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

function getCleanKeptPathname() {
  return window.location.pathname.replace(/(?:^|\/)kept\.html$/, (match) =>
    match.startsWith('/') ? '/kept' : 'kept'
  );
}

function cleanPageUrl() {
  const cleanPathname = getCleanKeptPathname();
  if (cleanPathname === window.location.pathname) return;

  window.history.replaceState(
    {},
    '',
    `${cleanPathname}${window.location.search}${window.location.hash}` || '/kept'
  );
}

function replaceUrlParams(mutator) {
  const params = new URLSearchParams(window.location.search);
  mutator(params);
  const cleanSearch = params.toString();
  const cleanPathname = getCleanKeptPathname();
  const cleanUrl = `${cleanPathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
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

function getAllowedEmbedUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw, window.location.href);
    return ALLOWED_VIDEO_EMBED_HOSTS.has(url.hostname) ? url.href : '';
  } catch (_) {
    return '';
  }
}

function getEmbedSrcFromHtml(embedHtml) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(embedHtml || ''), 'text/html');
  const iframe = parsed.querySelector('iframe[src]');
  return getAllowedEmbedUrl(iframe?.getAttribute('src'));
}

function createVideoEmbed(src) {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = 'Kept video';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
  return iframe;
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

function renderThoughtReveal(thoughtCounts = []) {
  if (!thoughtReveal || !thoughtRevealList) return;

  const counts = thoughtCounts.filter((entry) => entry?.display_name);
  thoughtReveal.hidden = counts.length === 0;
  thoughtReveal.open = false;
  thoughtRevealList.innerHTML = '';

  counts.forEach((entry) => {
    const name = entry?.display_name || 'Someone';
    const count = Number(entry?.count) || 0;
    const noun = count === 1 ? 'thought' : 'thoughts';
    const line = document.createElement('p');
    const nameEl = document.createElement('span');
    const countEl = document.createElement('span');
    const numberEl = document.createElement('span');
    const nounEl = document.createElement('span');

    line.className = 'thought-reveal__line';
    nameEl.className = 'thought-reveal__name';
    countEl.className = 'thought-reveal__count';
    numberEl.className = 'thought-reveal__number';
    nounEl.className = 'thought-reveal__noun';

    nameEl.textContent = name;
    numberEl.textContent = String(count);
    nounEl.textContent = noun;

    countEl.append(numberEl, nounEl);
    line.append(nameEl, countEl);
    thoughtRevealList.appendChild(line);
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
  } else if (video?.embed_url) {
    const src = getAllowedEmbedUrl(video.embed_url);
    if (src) videoSlot.appendChild(createVideoEmbed(src));
  } else if (video?.embed_html) {
    const src = getEmbedSrcFromHtml(video.embed_html);
    if (src) videoSlot.appendChild(createVideoEmbed(src));
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

function renderPage(content, thoughtCounts = []) {
  heroEyebrow.textContent = content.hero?.eyebrow || 'Quietly kept';
  heroTitle.textContent = content.hero?.title || 'A note that stayed.';
  heroOpening.textContent = content.hero?.opening || '';

  letterLabel.textContent = content.letter?.label || 'For you';
  letterTitle.textContent = content.letter?.title || 'There has been a note here.';
  appendParagraphs(letterBody, content.letter?.paragraphs || []);
  renderThoughtReveal(thoughtCounts);

  const hasMeaningCards = Array.isArray(content.meaning?.cards) && content.meaning.cards.length > 0;
  const hasMeaningBody = Array.isArray(content.meaning?.paragraphs) && content.meaning.paragraphs.length > 0;
  meaningSection.hidden = !(hasMeaningCards || hasMeaningBody);
  if (!meaningSection.hidden) {
    meaningLabel.textContent = content.meaning?.label || 'What this means';
    meaningTitle.textContent = content.meaning?.title || 'What this holds.';
    renderMeaningCards(content.meaning?.cards || []);
    appendParagraphs(meaningBody, content.meaning?.paragraphs || []);
  }

  const hasVideo = Boolean(content.video?.src || content.video?.embed_url || content.video?.embed_html || content.video?.placeholder);
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
  cleanPageUrl();
  setDocumentTheme(document.documentElement.dataset.theme);
  initializeThemeToggle(themeToggle);

  if (!IS_PRIVATE_BUILD) {
    setStatus('This page is not available here.', 'The kept page only opens in the private build.');
    return;
  }

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

    renderPage(result.content || emptyKeptPageContent, result.thought_counts || []);
  } catch (error) {
    console.error(error);
    setStatus('This private page could not load.', error?.message || 'Try again in a moment.');
  }
}

bootstrap();
