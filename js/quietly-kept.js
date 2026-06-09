import { getSecretPage } from './api.js';
import { IS_PRIVATE_BUILD } from './config.js';
import { resolveQuietSession } from './quiet-session.js';
import { initializeThemeToggle, setDocumentTheme } from './theme.js';

const statusCard = document.querySelector('#statusCard');
const statusTitle = document.querySelector('#statusTitle');
const statusBody = document.querySelector('#statusBody');
const secretPage = document.querySelector('#secretPage');
const editPageLink = document.querySelector('#editPageLink');
const themeToggle = document.querySelector('#themeToggle');

const heroEyebrow = document.querySelector('#heroEyebrow');
const heroTitle = document.querySelector('#heroTitle');
const heroOpening = document.querySelector('#heroOpening');
const openingNote = document.querySelector('#openingNote');
const poemTitle = document.querySelector('#poemTitle');
const poemBody = document.querySelector('#poemBody');
const namesTitle = document.querySelector('#namesTitle');
const namesGrid = document.querySelector('#namesGrid');
const namesClosing = document.querySelector('#namesClosing');
const littleProofIntro = document.querySelector('#littleProofIntro');
const littleProofEntries = document.querySelector('#littleProofEntries');
const thingsIntro = document.querySelector('#thingsIntro');
const thingsEntries = document.querySelector('#thingsEntries');
const stillIntro = document.querySelector('#stillIntro');
const stillEntries = document.querySelector('#stillEntries');
const tallyTitle = document.querySelector('#tallyTitle');
const tallyIntro = document.querySelector('#tallyIntro');
const tallyGrid = document.querySelector('#tallyGrid');
const askTitle = document.querySelector('#askTitle');
const askBody = document.querySelector('#askBody');
const askQuestion = document.querySelector('#askQuestion');
const askButton = document.querySelector('#askButton');
const askFootnote = document.querySelector('#askFootnote');
const entryDetail = document.querySelector('#entryDetail');

const EMPTY_CONTENT = {
  hero: {
    eyebrow: 'Private page',
    title: 'Protected content waits here.',
    opening: 'Add the protected page content from the editor.',
  },
  opening_note: '',
  poem: {
    title: 'Untitled',
    body: '',
  },
  two_names: {
    title: 'Names',
    cards: [],
    closing: '',
  },
  section_intros: {
    little_proof: '',
    thing_i_love: '',
    still_being_written: '',
  },
  tally: {
    title: 'Private tally',
    intro: '',
    thoughts_label: 'check-ins',
    notes_label: 'notes',
  },
  ask: {
    title: 'Protected note',
    body: '',
    question: '',
    button: '',
    footnote: '',
  },
};

function setStatus(title, body) {
  statusTitle.textContent = title;
  statusBody.textContent = body;
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function mergeContent(content) {
  return {
    ...EMPTY_CONTENT,
    ...(content || {}),
    hero: {
      ...EMPTY_CONTENT.hero,
      ...(content?.hero || {}),
    },
    poem: {
      ...EMPTY_CONTENT.poem,
      ...(content?.poem || {}),
    },
    two_names: {
      ...EMPTY_CONTENT.two_names,
      ...(content?.two_names || {}),
    },
    section_intros: {
      ...EMPTY_CONTENT.section_intros,
      ...(content?.section_intros || {}),
    },
    tally: {
      ...EMPTY_CONTENT.tally,
      ...(content?.tally || {}),
    },
    ask: {
      ...EMPTY_CONTENT.ask,
      ...(content?.ask || {}),
    },
  };
}

function getEntryPreview(entry) {
  const preview = text(entry.preview);
  if (preview) return preview;

  const body = text(entry.body);
  return body.length > 260 ? `${body.slice(0, 260).trim()}...` : body;
}

function flattenEntries(groups = {}) {
  return [
    ...(groups.little_proof || []),
    ...(groups.thing_i_love || []),
    ...(groups.still_being_written || []),
  ];
}

function renderNames(content) {
  namesTitle.textContent = text(content.two_names.title, 'Names');
  namesClosing.textContent = text(content.two_names.closing);
  namesGrid.innerHTML = '';

  const cards = Array.isArray(content.two_names.cards) ? content.two_names.cards : [];
  cards.forEach((card) => {
    const title = text(card?.title);
    const body = text(card?.body);
    if (!title && !body) return;

    const article = document.createElement('article');
    article.className = 'name-card';

    const heading = document.createElement('h3');
    heading.textContent = title;

    const paragraph = document.createElement('p');
    paragraph.className = 'preserve-lines';
    paragraph.textContent = body;

    article.append(heading, paragraph);
    namesGrid.appendChild(article);
  });
}

function renderEntryCard(entry) {
  const article = document.createElement('article');
  article.className = 'entry-card';

  if (entry.image_url) {
    const img = document.createElement('img');
    img.src = entry.image_url;
    img.alt = entry.image_alt || '';
    img.loading = 'lazy';
    article.appendChild(img);
  }

  const title = document.createElement('h3');
  title.textContent = entry.title || 'Untitled';
  article.appendChild(title);

  if (entry.display_date || entry.subtitle) {
    const meta = document.createElement('p');
    meta.className = 'entry-meta';
    meta.textContent = [entry.display_date, entry.subtitle].filter(Boolean).join(' · ');
    article.appendChild(meta);
  }

  const preview = document.createElement('p');
  preview.className = 'entry-preview preserve-lines';
  preview.textContent = getEntryPreview(entry);
  article.appendChild(preview);

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Read more';

  const full = document.createElement('p');
  full.className = 'entry-full preserve-lines';
  full.textContent = entry.body || '';

  details.append(summary, full);
  article.appendChild(details);

  const detailLink = document.createElement('a');
  detailLink.className = 'quiet-link';
  detailLink.href = `?entry=${encodeURIComponent(entry.id)}`;
  detailLink.textContent = 'Open';
  article.appendChild(detailLink);

  return article;
}

function renderEntries(container, entries = []) {
  container.innerHTML = '';

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'quiet-note';
    empty.textContent = 'Nothing has been added here yet.';
    container.appendChild(empty);
    return;
  }

  entries.forEach((entry) => container.appendChild(renderEntryCard(entry)));
}

function renderTally(content, tally = []) {
  tallyTitle.textContent = text(content.tally.title, 'Private tally');
  tallyIntro.textContent = text(content.tally.intro);
  tallyGrid.innerHTML = '';

  const thoughtsLabel = text(content.tally.thoughts_label, 'check-ins');
  const notesLabel = text(content.tally.notes_label, 'notes');

  tally.forEach((row) => {
    const card = document.createElement('article');
    card.className = 'tally-card';

    const name = document.createElement('h3');
    name.textContent = row.display_name || row.user_slug || 'Someone';

    const thoughts = document.createElement('strong');
    thoughts.textContent = String(Number(row.thoughts_count) || 0);
    const thoughtsText = document.createElement('span');
    thoughtsText.textContent = thoughtsLabel;

    const notes = document.createElement('strong');
    notes.textContent = String(Number(row.notes_count) || 0);
    const notesText = document.createElement('span');
    notesText.textContent = notesLabel;

    card.append(name, thoughts, thoughtsText, notes, notesText);
    tallyGrid.appendChild(card);
  });
}

function renderAsk(content) {
  askTitle.textContent = text(content.ask.title, 'Protected note');
  askBody.textContent = text(content.ask.body);
  askQuestion.textContent = text(content.ask.question);
  askFootnote.textContent = text(content.ask.footnote);

  const buttonText = text(content.ask.button);
  askButton.hidden = !buttonText;
  askButton.textContent = buttonText;
}

function renderDetail(entries) {
  const entryId = new URLSearchParams(window.location.search).get('entry');
  if (!entryId) return;

  const entry = entries.find((item) => item.id === entryId);
  if (!entry) return;

  entryDetail.hidden = false;
  entryDetail.innerHTML = '';

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Entry';

  const heading = document.createElement('h2');
  heading.textContent = entry.title || 'Untitled';

  const meta = document.createElement('p');
  meta.className = 'entry-meta';
  meta.textContent = [entry.display_date, entry.subtitle].filter(Boolean).join(' · ');

  const nodes = [label, heading, meta];

  if (entry.image_url) {
    const img = document.createElement('img');
    img.src = entry.image_url;
    img.alt = entry.image_alt || '';
    nodes.push(img);
  }

  const body = document.createElement('div');
  body.className = 'prose preserve-lines';
  body.textContent = entry.body || '';

  const back = document.createElement('a');
  back.className = 'quiet-link';
  back.href = window.location.pathname;
  back.textContent = 'Return to page';

  entryDetail.append(...nodes, body, back);
  window.requestAnimationFrame(() => entryDetail.scrollIntoView({ block: 'start' }));
}

function renderPage(data) {
  const content = mergeContent(data.content);
  const entries = data.entries || {};
  const allEntries = flattenEntries(entries);

  if (editPageLink) {
    editPageLink.hidden = !data.viewer?.can_edit_secret_page;
  }

  heroEyebrow.textContent = text(content.hero.eyebrow, 'Private page');
  heroTitle.textContent = text(content.hero.title, 'Protected content waits here.');
  heroOpening.textContent = text(content.hero.opening);
  openingNote.textContent = text(content.opening_note);
  poemTitle.textContent = text(content.poem.title, 'Untitled');
  poemBody.textContent = text(content.poem.body);

  renderNames(content);

  littleProofIntro.textContent = text(content.section_intros.little_proof);
  thingsIntro.textContent = text(content.section_intros.thing_i_love);
  stillIntro.textContent = text(content.section_intros.still_being_written);

  renderEntries(littleProofEntries, entries.little_proof || []);
  renderEntries(thingsEntries, entries.thing_i_love || []);
  renderEntries(stillEntries, entries.still_being_written || []);
  renderTally(content, data.tally || []);
  renderAsk(content);
  renderDetail(allEntries);

  statusCard.hidden = true;
  secretPage.hidden = false;
}

async function bootstrap() {
  setDocumentTheme(document.documentElement.dataset.theme);
  initializeThemeToggle(themeToggle, { enableSecretTheme: IS_PRIVATE_BUILD });

  if (!IS_PRIVATE_BUILD) {
    setStatus('This page is not available here.', 'The protected page only opens in the private build.');
    return;
  }

  try {
    const sessionToken = await resolveQuietSession('quietly-kept');
    if (!sessionToken) {
      setStatus('This page needs your session.', 'Open the shared space first, then return here.');
      return;
    }

    const data = await getSecretPage(sessionToken);
    renderPage(data);
  } catch (error) {
    console.error(error);
    setStatus('This page could not open.', error?.message || 'Try again in a moment.');
  }
}

bootstrap();
