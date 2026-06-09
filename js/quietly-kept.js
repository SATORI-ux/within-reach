import { getSecretPage } from './api.js';
import { IS_PRIVATE_BUILD } from './config.js';
import { resolveQuietSession } from './quiet-session.js';
import { initializeThemeToggle, setDocumentTheme } from './theme.js';

const statusCard = document.querySelector('#statusCard');
const statusTitle = document.querySelector('#statusTitle');
const statusBody = document.querySelector('#statusBody');
const secretPage = document.querySelector('#secretPage');
const themeToggle = document.querySelector('#themeToggle');

const heroEyebrow = document.querySelector('#heroEyebrow');
const heroTitle = document.querySelector('#heroTitle');
const heroOpening = document.querySelector('#heroOpening');
const openingTitle = document.querySelector('#openingTitle');
const openingPreview = document.querySelector('#openingPreview');
const openingReadLink = document.querySelector('#openingReadLink');
const poemTitle = document.querySelector('#poemTitle');
const poemSubtitle = document.querySelector('#poemSubtitle');
const poemPreview = document.querySelector('#poemPreview');
const poemReadLink = document.querySelector('#poemReadLink');
const namesTitle = document.querySelector('#namesTitle');
const namesGrid = document.querySelector('#namesGrid');
const namesClosing = document.querySelector('#namesClosing');
const littleProofIntro = document.querySelector('#littleProofIntro');
const littleProofEntries = document.querySelector('#littleProofEntries');
const thingsIntro = document.querySelector('#thingsIntro');
const thingsEntries = document.querySelector('#thingsEntries');
const thingsActions = document.querySelector('#thingsActions');
const stillIntro = document.querySelector('#stillIntro');
const stillEntries = document.querySelector('#stillEntries');
const stillActions = document.querySelector('#stillActions');
const whispersIntro = document.querySelector('#whispersIntro');
const whisperEntries = document.querySelector('#whisperEntries');
const whisperActions = document.querySelector('#whisperActions');
const tallyTitle = document.querySelector('#tallyTitle');
const tallyIntro = document.querySelector('#tallyIntro');
const tallyGrid = document.querySelector('#tallyGrid');
const askTitle = document.querySelector('#askTitle');
const askBody = document.querySelector('#askBody');
const askQuestion = document.querySelector('#askQuestion');
const askButton = document.querySelector('#askButton');
const askFootnote = document.querySelector('#askFootnote');
const readingDetail = document.querySelector('#readingDetail');
const sectionRail = document.querySelector('.section-rail');
const overviewSections = Array.from(document.querySelectorAll('[data-overview-section]'));

const OVERVIEW_ENTRY_LIMIT = 3;
const KNOWN_USER_LABELS = {
  joey: 'Joey',
  jeszi: 'Jeszi',
};

const EMPTY_CONTENT = {
  hero: {
    eyebrow: 'Private page',
    title: 'Protected content waits here.',
    opening: 'Add the protected page content from the editor.',
  },
  opening_note: '',
  poem: {
    title: 'Untitled',
    subtitle: 'A poem for you.',
    preview: '',
    body: '',
    segments: [],
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
    whisper: '',
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

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function getPageHref(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  const query = search.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

function getContributionHref(sectionType) {
  const search = new URLSearchParams({ section: sectionType });
  return `./quietly-kept-entry.html?${search.toString()}`;
}

function getEntryEditHref(entryId) {
  const search = new URLSearchParams({ entry: entryId });
  return `./quietly-kept-entry.html?${search.toString()}`;
}

function getCounterpartName(viewer = {}) {
  if (viewer.user_slug === 'joey') return 'Jeszi';
  if (viewer.user_slug === 'jeszi') return 'Joey';
  return 'the other side';
}

function getCounterpartSlug(userSlug = '') {
  if (userSlug === 'joey') return 'jeszi';
  if (userSlug === 'jeszi') return 'joey';
  return '';
}

function getPeopleBySlug(data = {}) {
  const people = {};
  (data.tally || []).forEach((row) => {
    if (row.user_slug) {
      people[row.user_slug] = row.display_name || KNOWN_USER_LABELS[row.user_slug] || row.user_slug;
    }
  });

  if (data.viewer?.user_slug) {
    people[data.viewer.user_slug] =
      data.viewer.display_name || KNOWN_USER_LABELS[data.viewer.user_slug] || data.viewer.user_slug;
  }

  Object.entries(KNOWN_USER_LABELS).forEach(([slug, label]) => {
    if (!people[slug]) people[slug] = label;
  });

  return people;
}

function getUserLabel(userSlug, people = {}) {
  if (!userSlug) return '';
  return people[userSlug] || KNOWN_USER_LABELS[userSlug] || userSlug;
}

function makePreview(value, maxLength = 260) {
  const normalized = text(value).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function getOpeningContent(content) {
  const opening = content.opening_note;
  const openingObject = asObject(opening);

  return {
    title: text(openingObject.title, text(content.opening_note_title, 'A protected note.')),
    body: text(openingObject.body, text(content.opening_note_body, text(opening))),
    preview: text(openingObject.preview, text(content.opening_note_preview)),
  };
}

function getPoemContent(content) {
  const rawPoem = content.poem;
  const poem = asObject(rawPoem);
  return {
    title: text(poem.title, text(content.poem_title, 'Constantia')),
    subtitle: text(poem.subtitle, text(content.poem_subtitle, 'A poem for you.')),
    body: text(poem.body, text(content.poem_body, text(rawPoem))),
    preview: poem.preview ?? content.poem_preview,
    segments: asArray(poem.segments).length ? asArray(poem.segments) : asArray(content.poem_segments),
  };
}

function getPoemPreviewText(poem) {
  if (Array.isArray(poem.preview)) {
    return poem.preview.map((line) => text(line)).filter(Boolean).slice(0, 5).join('\n');
  }

  const explicitPreview = text(poem.preview);
  if (explicitPreview) return explicitPreview;

  const lines = poem.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 5) return lines.join('\n');

  const indices = [0, 0.24, 0.48, 0.72, 1]
    .map((position) => Math.round((lines.length - 1) * position));

  return Array.from(new Set(indices))
    .map((index) => lines[index])
    .filter(Boolean)
    .join('\n');
}

function createPoemSegments(poem) {
  const lines = poem.body.split(/\r?\n/);
  const configuredSegments = asArray(poem.segments);

  const segments = configuredSegments
    .map((segment, index) => {
      const title = text(segment?.title);
      const directBody = Array.isArray(segment?.lines)
        ? segment.lines.join('\n')
        : text(segment?.body);

      if (directBody) {
        return {
          id: text(segment?.id, `segment-${index + 1}`),
          title,
          body: directBody,
        };
      }

      const startLine = Number(segment?.startLine);
      const endLine = Number(segment?.endLine);
      if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 0 || endLine < startLine) {
        return null;
      }

      const body = lines.slice(startLine, Math.min(lines.length, endLine + 1)).join('\n').trim();
      if (!body) return null;

      return {
        id: text(segment?.id, `segment-${index + 1}`),
        title,
        body,
      };
    })
    .filter(Boolean);

  if (segments.length) return segments;

  return [
    {
      id: 'constantia',
      title: '',
      body: poem.body,
    },
  ];
}

function flattenEntries(groups = {}) {
  return [
    ...(groups.little_proof || []),
    ...(groups.thing_i_love || []),
    ...(groups.still_being_written || []),
    ...(groups.whisper || []),
  ];
}

function setDetailMode(isDetail) {
  overviewSections.forEach((section) => {
    section.hidden = isDetail;
  });

  if (readingDetail) {
    readingDetail.hidden = !isDetail;
  }

  if (sectionRail) {
    sectionRail.hidden = isDetail;
  }

  secretPage?.classList.toggle('secret-page--detail', isDetail);
}

function renderSectionAction(container, allowedSections, sectionType, label) {
  if (!container) return;

  container.innerHTML = '';
  const canCreate = Array.isArray(allowedSections) && allowedSections.includes(sectionType);
  container.hidden = !canCreate;
  if (!canCreate) return;

  const link = document.createElement('a');
  link.className = 'quiet-button quiet-button--soft section-action';
  link.href = getContributionHref(sectionType);
  link.textContent = label;
  container.appendChild(link);
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

function renderEntryCard(entry, options = {}) {
  const article = document.createElement('article');
  article.className = 'entry-card';
  if (options.compact) article.classList.add('entry-card--compact');

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

  if (options.showAuthor && entry.created_by) {
    const author = document.createElement('p');
    author.className = 'entry-author';
    author.textContent = `By ${getUserLabel(entry.created_by, options.people)}`;
    article.appendChild(author);
  }

  const preview = document.createElement('p');
  preview.className = 'entry-preview preserve-lines';
  preview.textContent = getEntryPreview(entry);
  article.appendChild(preview);

  const detailLink = document.createElement('a');
  detailLink.className = 'quiet-link section-action';
  detailLink.href = getPageHref({ entry: entry.id });
  detailLink.textContent = entry.section_type === 'whisper' ? 'Read whisper' : 'Read the rest';

  const actions = document.createElement('div');
  actions.className = 'entry-card__actions';
  actions.appendChild(detailLink);

  if (entry.can_edit) {
    const editLink = document.createElement('a');
    editLink.className = 'quiet-link quiet-link--secondary section-action';
    editLink.href = getEntryEditHref(entry.id);
    editLink.textContent = 'Edit';
    actions.appendChild(editLink);
  }

  article.appendChild(actions);

  return article;
}

function renderEntries(container, entries = [], options = {}) {
  container.innerHTML = '';

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'quiet-note';
    empty.textContent = 'Nothing has been added here yet.';
    container.appendChild(empty);
    return;
  }

  const limit = Number(options.limit) || OVERVIEW_ENTRY_LIMIT;

  function renderCards(isExpanded = false) {
    container.innerHTML = '';
    const visibleEntries = isExpanded ? entries : entries.slice(0, limit);
    visibleEntries.forEach((entry) => container.appendChild(renderEntryCard(entry, options)));

    if (!isExpanded && entries.length > limit) {
      const reveal = document.createElement('button');
      reveal.className = 'quiet-button quiet-button--ghost section-action';
      reveal.type = 'button';
      reveal.textContent = 'Show more';
      reveal.addEventListener('click', () => renderCards(true));
      container.appendChild(reveal);
    }
  }

  renderCards(false);
}

function renderThingLoveGroup(container, group, options = {}) {
  const section = document.createElement('section');
  section.className = 'thing-love-group';

  const heading = document.createElement('h3');
  heading.textContent = group.title;
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'entry-list entry-list--compact';
  section.appendChild(list);
  container.appendChild(section);

  if (!group.entries.length) {
    const empty = document.createElement('p');
    empty.className = 'quiet-note';
    empty.textContent = 'Nothing written here yet.';
    list.appendChild(empty);
    return;
  }

  const limit = Number(options.limit) || OVERVIEW_ENTRY_LIMIT;

  function renderCards(isExpanded = false) {
    list.innerHTML = '';
    const visibleEntries = isExpanded ? group.entries : group.entries.slice(0, limit);
    visibleEntries.forEach((entry) => list.appendChild(renderEntryCard(entry, {
      ...options,
      compact: true,
    })));

    if (!isExpanded && group.entries.length > limit) {
      const reveal = document.createElement('button');
      reveal.className = 'quiet-button quiet-button--ghost section-action';
      reveal.type = 'button';
      reveal.textContent = 'Show more';
      reveal.addEventListener('click', () => renderCards(true));
      list.appendChild(reveal);
    }
  }

  renderCards(false);
}

function renderThingLoveGroups(container, entries = [], people = {}) {
  container.innerHTML = '';

  const groups = [
    { creator: 'joey', subject: 'jeszi', entries: [] },
    { creator: 'jeszi', subject: 'joey', entries: [] },
  ];

  entries.forEach((entry) => {
    const createdBy = entry.created_by || '';
    const subjectSlug = entry.subject_user_slug || getCounterpartSlug(createdBy);
    const group = groups.find((item) => item.creator === createdBy && item.subject === subjectSlug);
    if (group) group.entries.push(entry);
  });

  groups.forEach((group) => {
    renderThingLoveGroup(container, {
      ...group,
      title: `Things ${getUserLabel(group.creator, people)} loves about ${getUserLabel(group.subject, people)}`,
    }, { people, limit: 3 });
  });
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

function renderBackLink(label = 'Back to Quietly Kept') {
  const back = document.createElement('a');
  back.className = 'quiet-link section-action';
  back.href = getPageHref();
  back.textContent = label;
  return back;
}

function renderOpeningDetail(content) {
  const opening = getOpeningContent(content);
  setDetailMode(true);
  readingDetail.innerHTML = '';

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Opening';

  const heading = document.createElement('h1');
  heading.textContent = opening.title || 'A protected note.';

  const body = document.createElement('div');
  body.className = 'prose preserve-lines detail-copy';
  body.textContent = opening.body || 'Nothing has been placed here yet.';

  readingDetail.append(label, heading, body, renderBackLink());
}

function renderPoemDetail(content) {
  const poem = getPoemContent(content);
  setDetailMode(true);
  readingDetail.innerHTML = '';
  readingDetail.classList.add('detail-section--reader');

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Constantia';

  const heading = document.createElement('h1');
  heading.textContent = poem.title || 'Constantia';

  const subtitle = document.createElement('p');
  subtitle.className = 'poem-subtitle';
  subtitle.textContent = poem.subtitle || 'A poem for you.';

  readingDetail.append(label, heading, subtitle);

  if (poem.body) {
    createPoemSegments(poem).forEach((segment) => {
      const section = document.createElement('section');
      section.className = 'poem-reader__segment';

      if (segment.title) {
        const segmentTitle = document.createElement('h2');
        segmentTitle.textContent = segment.title;
        section.appendChild(segmentTitle);
      }

      const body = document.createElement('div');
      body.className = 'poem-reader__body preserve-lines';
      body.textContent = segment.body;
      section.appendChild(body);
      readingDetail.appendChild(section);
    });
  } else {
    const empty = document.createElement('p');
    empty.className = 'quiet-note';
    empty.textContent = 'Nothing has been placed here yet.';
    readingDetail.appendChild(empty);
  }

  readingDetail.appendChild(renderBackLink());
}

function renderEntryDetail(entries, people = {}) {
  const entryId = new URLSearchParams(window.location.search).get('entry');
  if (!entryId) return false;

  const entry = entries.find((item) => item.id === entryId);
  if (!entry) return false;

  setDetailMode(true);
  readingDetail.innerHTML = '';
  readingDetail.classList.remove('detail-section--reader');

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = entry.section_type === 'whisper' ? 'Whisper' : 'Entry';

  const heading = document.createElement('h2');
  heading.textContent = entry.title || 'Untitled';

  const meta = document.createElement('p');
  meta.className = 'entry-meta';
  meta.textContent = [entry.display_date, entry.subtitle].filter(Boolean).join(' · ');

  const author = document.createElement('p');
  author.className = 'entry-author';
  author.textContent = entry.created_by ? `By ${getUserLabel(entry.created_by, people)}` : '';
  author.hidden = !entry.created_by;

  const nodes = [label, heading, meta, author];

  if (entry.image_url) {
    const img = document.createElement('img');
    img.src = entry.image_url;
    img.alt = entry.image_alt || '';
    nodes.push(img);
  }

  const body = document.createElement('div');
  body.className = 'prose preserve-lines';
  body.textContent = entry.body || '';

  const actions = document.createElement('div');
  actions.className = 'entry-card__actions detail-actions';
  actions.appendChild(renderBackLink());

  if (entry.can_edit) {
    const editLink = document.createElement('a');
    editLink.className = 'quiet-link quiet-link--secondary section-action';
    editLink.href = getEntryEditHref(entry.id);
    editLink.textContent = 'Edit';
    actions.appendChild(editLink);
  }

  readingDetail.append(...nodes, body, actions);
  return true;
}

function renderDetail(content, entries, people) {
  const params = new URLSearchParams(window.location.search);
  readingDetail?.classList.remove('detail-section--reader');

  if (params.get('read') === 'constantia') {
    renderPoemDetail(content);
    return;
  }

  if (params.get('section') === 'opening') {
    renderOpeningDetail(content);
    return;
  }

  if (renderEntryDetail(entries, people)) return;

  setDetailMode(false);
}

function renderPage(data) {
  const content = mergeContent(data.content);
  const entries = data.entries || {};
  const allEntries = flattenEntries(entries);
  const people = getPeopleBySlug(data);
  const allowedEntrySections = Array.isArray(data.viewer?.allowed_entry_sections)
    ? data.viewer.allowed_entry_sections
    : [];
  const counterpartName = getCounterpartName(data.viewer);

  heroEyebrow.textContent = text(content.hero.eyebrow, 'Private page');
  heroTitle.textContent = text(content.hero.title, 'Protected content waits here.');
  heroOpening.textContent = text(content.hero.opening);

  const opening = getOpeningContent(content);
  openingTitle.textContent = opening.title || 'A protected note.';
  openingPreview.textContent = opening.preview || makePreview(opening.body);
  openingReadLink.href = getPageHref({ section: 'opening' });
  openingReadLink.hidden = !opening.body;

  const poem = getPoemContent(content);
  poemTitle.textContent = poem.title || 'Constantia';
  poemSubtitle.textContent = poem.subtitle || 'A poem for you.';
  poemPreview.textContent = getPoemPreviewText(poem);
  poemReadLink.href = getPageHref({ read: 'constantia' });
  poemReadLink.hidden = !poem.body;

  renderNames(content);

  littleProofIntro.textContent = text(content.section_intros.little_proof);
  thingsIntro.textContent = text(content.section_intros.thing_i_love);
  stillIntro.textContent = text(content.section_intros.still_being_written);
  whispersIntro.textContent = text(content.section_intros.whisper);
  renderSectionAction(stillActions, allowedEntrySections, 'still_being_written', 'Add a memory');
  renderSectionAction(
    thingsActions,
    allowedEntrySections,
    'thing_i_love',
    `Add something I love about ${counterpartName}`,
  );
  renderSectionAction(whisperActions, allowedEntrySections, 'whisper', 'Add a whisper');

  renderEntries(littleProofEntries, entries.little_proof || []);
  renderThingLoveGroups(thingsEntries, entries.thing_i_love || [], people);
  renderEntries(stillEntries, entries.still_being_written || [], { showAuthor: true, people });
  renderEntries(whisperEntries, entries.whisper || [], { limit: 2 });
  renderTally(content, data.tally || []);
  renderAsk(content);
  renderDetail(content, allEntries, people);

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
