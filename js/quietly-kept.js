import { getSecretPage, respondFinalAsk } from './api.js';
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
const littleProofSection = document.querySelector('#little-proof');
const littleProofRailLink = document.querySelector('#littleProofRailLink');
const poemTitle = document.querySelector('#poemTitle');
const poemSubtitle = document.querySelector('#poemSubtitle');
const poemPreview = document.querySelector('#poemPreview');
const poemClosingLine = document.querySelector('#poemClosingLine');
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
const askIntro = document.querySelector('#askIntro');
const askSummary = document.querySelector('#askSummary');
const askOpenLink = document.querySelector('#askOpenLink');
const askStatus = document.querySelector('#askStatus');
const readingDetail = document.querySelector('#readingDetail');
const readerDialog = document.querySelector('#readerDialog');
const readerDialogInner = document.querySelector('#readerDialogInner');
const sectionRail = document.querySelector('.section-rail');
const overviewSections = Array.from(document.querySelectorAll('[data-overview-section]'));
const askSection = document.querySelector('#ask');
const askRailLink = document.querySelector('#askRailLink');

const OVERVIEW_ENTRY_LIMIT = 3;

const POEM_FALLBACK_COLUMNS = [
  'How early\ncan someone become\nunforgettable?\n\nBefore there are names\nfor what they are?',
  'We laughed\nabout mutant ladybugs\n\nas if the world\nhad handed us\nsomething small\nand strange...',
  'You made ordinary things\nfeel marked.\n\nLike some part of you\nhad touched them\nand left them warmer.',
  'After all of it,\nafter the years,\nthe distance,\nthe silence,\nthe almosts,\nthe returning...',
];
const POEM_FALLBACK_CLOSING = '...there was still one thing I recognized.\n\nYou.';

const KNOWN_USER_LABELS = {
  joey: 'Joey',
  jeszi: 'Jeszi',
};

const FINAL_ASK_ACCEPTED_FALLBACK = `Okay.

I am smiling so hard right now.

This page gets to remember that you said yes.

Not because everything started here. It did not. We have been becoming for a long time.

But because this is the moment the thing we kept circling finally got a name.

You are my girlfriend.

I get to say that now.

And I am so, so happy I do.`;

const FINAL_ASK_TALK_FIRST_FALLBACK = `Okay.

Then we talk first.

No pressure. No punishment. No door closing.

Just us, doing this the way it deserves to be done: honestly, carefully, and together.

I am here.`;

let sessionToken = '';
let currentPageData = null;
let readerTrigger = null;
let finalAskQuestionRevealed = false;

const EMPTY_CONTENT = {
  hero: {
    eyebrow: 'Private page',
    title: 'Protected content waits here.',
    opening: 'Add the protected page content from the editor.',
  },
  opening_note: {
    title: '',
    preview: '',
    body: '',
  },
  section_visibility: {
    little_proof: true,
  },
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
  final_ask: {
    hidden_title: '',
    revealed_title: '',
    intro: '',
    body: '',
    question: '',
    yes_label: '',
    talk_first_label: '',
    yes_screen_copy: '',
    talk_first_screen_copy: '',
    accepted_memory_copy: '',
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
    section_visibility: {
      ...EMPTY_CONTENT.section_visibility,
      ...asObject(content?.section_visibility),
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
    final_ask: {
      ...EMPTY_CONTENT.final_ask,
      ...(content?.final_ask || {}),
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
    title: text(openingObject.title, text(content.opening_note_title, 'What was behind the door')),
    body: text(openingObject.body, text(content.opening_note_body, text(opening))),
    preview: text(openingObject.preview, text(content.opening_note_preview)),
  };
}

function isSectionVisible(content, sectionType) {
  const visibility = asObject(content.section_visibility);
  return visibility[sectionType] !== false;
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

function getPoemColumns(poem) {
  if (poem.preview && !Array.isArray(poem.preview) && typeof poem.preview === 'object') {
    const cols = asArray(poem.preview.columns);
    if (cols.length >= 2) {
      return {
        columns: cols.map((c) => text(c)).filter(Boolean),
        closing: text(poem.preview.closing),
      };
    }
  }

  if (Array.isArray(poem.preview) && poem.preview.length >= 2) {
    return {
      columns: poem.preview.map((c) => text(c)).filter(Boolean),
      closing: '',
    };
  }

  return { columns: POEM_FALLBACK_COLUMNS, closing: POEM_FALLBACK_CLOSING };
}

function renderPoemColumns(poem) {
  poemPreview.innerHTML = '';

  const { columns, closing } = getPoemColumns(poem);

  const grid = document.createElement('div');
  grid.className = 'poem-excerpt-columns';

  columns.forEach((col) => {
    const div = document.createElement('div');
    div.className = 'poem-excerpt-col preserve-lines';
    div.textContent = col;
    grid.appendChild(div);
  });

  poemPreview.appendChild(grid);

  if (poemClosingLine) {
    poemClosingLine.textContent = closing;
    poemClosingLine.hidden = !closing;
  }
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
    section.hidden = isDetail || section.dataset.sectionVisible === 'false';
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
  if (entry.section_type === 'whisper') article.classList.add('whisper-card');

  const isWhisperCard = entry.section_type === 'whisper';

  if (entry.image_url && !isWhisperCard) {
    const img = document.createElement('img');
    img.src = entry.image_url;
    img.alt = entry.image_alt || '';
    img.loading = 'lazy';
    article.appendChild(img);
  }

  const titleText = isWhisperCard && (!entry.title || entry.title === 'Whisper') ? '' : entry.title || 'Untitled';
  if (titleText) {
    const title = document.createElement('h3');
    title.textContent = titleText;
    article.appendChild(title);
  }

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
  if (options.onRead) {
    detailLink.addEventListener('click', (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        history.pushState({}, '', detailLink.href);
        options.onRead(entry, detailLink);
      }
    });
  }

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

function renderDetailRow(entry, options = {}) {
  const row = document.createElement('a');
  row.className = 'detail-row';
  row.href = getPageHref({ entry: entry.id });

  const icon = document.createElement('span');
  icon.className = 'detail-row__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  const textEl = document.createElement('span');
  textEl.className = 'detail-row__text';
  textEl.textContent = text(entry.body, text(entry.preview, text(entry.title))) || 'A kept detail.';

  const chevron = document.createElement('span');
  chevron.className = 'detail-row__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';

  row.append(icon, textEl, chevron);

  if (options.onRead) {
    row.addEventListener('click', (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        history.pushState({}, '', row.href);
        options.onRead(entry, row);
      }
    });
  }

  return row;
}

function renderThingLoveGroup(container, group, options = {}) {
  const section = document.createElement('section');
  section.className = 'thing-love-group';

  const heading = document.createElement('h3');
  heading.textContent = group.title;
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'detail-list';
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

  function renderRows(isExpanded = false) {
    list.innerHTML = '';
    const visibleEntries = isExpanded ? group.entries : group.entries.slice(0, limit);
    visibleEntries.forEach((entry) => list.appendChild(renderDetailRow(entry, options)));

    if (!isExpanded && group.entries.length > limit) {
      const reveal = document.createElement('button');
      reveal.className = 'quiet-button quiet-button--ghost section-action';
      reveal.type = 'button';
      reveal.textContent = 'Show more';
      reveal.addEventListener('click', () => renderRows(true));
      list.appendChild(reveal);
    }
  }

  renderRows(false);
}

function renderThingLoveGroups(container, entries = [], people = {}, onRead) {
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
      title: `From ${getUserLabel(group.creator, people)}, for ${getUserLabel(group.subject, people)}`,
    }, { people, limit: Infinity, onRead });
  });
}

function renderTally(content, tally = []) {
  tallyTitle.textContent = text(content.tally.title, 'Private tally');
  tallyIntro.textContent = text(content.tally.intro, 'Not a score. Just a small record of returning.');
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

    const heart = document.createElement('span');
    heart.className = 'tally-heart';
    heart.setAttribute('aria-hidden', 'true');
    heart.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

    card.append(name, thoughts, thoughtsText, notes, notesText, heart);
    tallyGrid.appendChild(card);
  });
}

function getFinalAskContent(content) {
  const finalAsk = asObject(content.final_ask);

  return {
    hiddenTitle: text(finalAsk.hidden_title, 'Protected note'),
    revealedTitle: text(finalAsk.revealed_title, 'Protected note'),
    intro: text(finalAsk.intro),
    body: text(finalAsk.body),
    question: text(finalAsk.question),
    openLabel: text(finalAsk.open_label, 'Open this part'),
    yesLabel: text(finalAsk.yes_label, 'Yes'),
    talkFirstLabel: text(finalAsk.talk_first_label, 'Talk to me first'),
    yesScreenCopy: text(finalAsk.yes_screen_copy),
    talkFirstScreenCopy: text(finalAsk.talk_first_screen_copy),
    acceptedMemoryCopy: text(finalAsk.accepted_memory_copy),
  };
}

function getFinalAskOutcomeContent(copy, finalAsk = {}) {
  if (finalAsk.response === 'yes') {
    return {
      title: 'The part that became ours',
      body: copy.yesScreenCopy || FINAL_ASK_ACCEPTED_FALLBACK,
      variant: 'yes',
    };
  }

  return {
    title: 'Then we talk first',
    body: copy.talkFirstScreenCopy || FINAL_ASK_TALK_FIRST_FALLBACK,
    variant: 'talk-first',
  };
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function renderFinalAskPreview(content, finalAsk = {}) {
  const copy = getFinalAskContent(content);
  const isVisible = Boolean(finalAsk.visible);

  if (!askSection) return;
  askSection.hidden = !isVisible;
  if (askRailLink) askRailLink.hidden = !isVisible;
  if (!isVisible) return;
  askSection.classList.toggle('ask-section--answered', finalAsk.status === 'answered');

  askTitle.textContent = finalAsk.status === 'revealed'
    ? copy.revealedTitle
    : copy.hiddenTitle;
  askIntro.textContent = copy.intro;
  askOpenLink.href = getPageHref({ finalAsk: '1' });
  askOpenLink.textContent = copy.openLabel;
  askOpenLink.hidden = finalAsk.status === 'answered';
  askSummary.classList.remove('ask-section__sealed', 'ask-section__outcome-summary');

  if (finalAsk.status === 'answered') {
    const outcome = getFinalAskOutcomeContent(copy, finalAsk);
    askTitle.textContent = outcome.title;
    askSummary.classList.add('ask-section__outcome-summary');
    askSummary.textContent = outcome.variant === 'yes'
      ? (copy.acceptedMemoryCopy || 'This part is kept as ours.')
      : (copy.talkFirstScreenCopy || 'This part is being held gently.');
    askStatus.textContent = finalAsk.accepted_at ? formatDateTime(finalAsk.accepted_at) : '';
    if (!askStatus.textContent && finalAsk.responded_at) askStatus.textContent = formatDateTime(finalAsk.responded_at);
    return;
  }

  askSummary.classList.add('ask-section__sealed');
  askSummary.innerHTML = '<span class="quiet-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 4l10 8 10-8"/><circle cx="12" cy="15" r="1.5"/></svg></span>';
  askStatus.textContent = '';
}

function renderBackLink(label = 'Back to Quietly Kept') {
  const back = document.createElement('a');
  back.className = 'quiet-link section-action';
  back.href = getPageHref();
  back.textContent = label;
  return back;
}

function renderFinalAskOutcome(content, finalAsk = {}) {
  const copy = getFinalAskContent(content);
  const outcome = getFinalAskOutcomeContent(copy, finalAsk);
  const rememberedAt = finalAsk.accepted_at || finalAsk.responded_at;

  setDetailMode(true);
  readingDetail.innerHTML = '';
  readingDetail.classList.remove('detail-section--reader');
  readingDetail.classList.add('detail-section--outcome');

  const article = document.createElement('article');
  article.className = `final-ask-outcome final-ask-outcome--${outcome.variant}`;

  const icon = document.createElement('span');
  icon.className = 'final-ask-outcome__icon quiet-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'A protected part';

  const title = document.createElement('h1');
  title.className = 'final-ask-outcome__title';
  title.textContent = outcome.title;

  const body = document.createElement('div');
  body.className = 'final-ask-outcome__body preserve-lines';
  body.textContent = outcome.body;

  const meta = document.createElement('p');
  meta.className = 'final-ask-outcome__meta';
  meta.textContent = rememberedAt ? `Remembered ${formatDateTime(rememberedAt)}` : '';
  meta.hidden = !meta.textContent;

  const actions = document.createElement('div');
  actions.className = 'final-ask-outcome__actions';
  actions.appendChild(renderBackLink());

  article.append(icon, label, title, body, meta, actions);
  readingDetail.appendChild(article);
  return true;
}

function openReader(trigger) {
  readerTrigger = trigger || null;
  if (!readerDialog.open) readerDialog.showModal();
  document.body.style.overflow = 'hidden';
  const firstFocusable = readerDialogInner.querySelector('[href], button, [tabindex]:not([tabindex="-1"])');
  (firstFocusable || document.querySelector('#readerClose'))?.focus();
}

function openOpeningReader(content, trigger) {
  const opening = getOpeningContent(content);
  readerDialogInner.innerHTML = '';

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Opening';

  const heading = document.createElement('h2');
  heading.className = 'reader-heading';
  heading.textContent = opening.title || 'What was behind the door';

  const body = document.createElement('div');
  body.className = 'prose preserve-lines';
  body.textContent = opening.body || 'Nothing has been placed here yet.';

  readerDialogInner.append(label, heading, body);
  openReader(trigger);
}

function openPoemReader(content, trigger) {
  const poem = getPoemContent(content);
  readerDialogInner.innerHTML = '';

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'Constantia';

  const heading = document.createElement('h2');
  heading.className = 'reader-heading';
  heading.textContent = poem.title || 'Constantia';

  const subtitle = document.createElement('p');
  subtitle.className = 'poem-subtitle';
  subtitle.textContent = poem.subtitle || 'A poem for you.';

  readerDialogInner.append(label, heading, subtitle);

  if (poem.body) {
    createPoemSegments(poem).forEach((segment) => {
      const section = document.createElement('section');
      section.className = 'poem-reader__segment';

      if (segment.title) {
        const segTitle = document.createElement('h2');
        segTitle.textContent = segment.title;
        section.appendChild(segTitle);
      }

      const segBody = document.createElement('div');
      segBody.className = 'poem-reader__body preserve-lines';
      segBody.textContent = segment.body;
      section.appendChild(segBody);
      readerDialogInner.appendChild(section);
    });
  } else {
    const empty = document.createElement('p');
    empty.className = 'quiet-note';
    empty.textContent = 'Nothing has been placed here yet.';
    readerDialogInner.appendChild(empty);
  }

  openReader(trigger);
}

function openEntryReader(entry, people = {}, trigger) {
  readerDialogInner.innerHTML = '';

  const isThingLove = entry.section_type === 'thing_i_love';
  const isWhisper = entry.section_type === 'whisper';

  const label = document.createElement('p');
  label.className = 'section-label';
  if (isThingLove) label.textContent = 'A detail that stayed';
  else if (isWhisper) label.textContent = 'Whisper';
  else label.textContent = 'Entry';

  const nodes = [label];

  if (!isThingLove) {
    const showHeading = !isWhisper || (entry.title && entry.title !== 'Whisper');
    if (showHeading) {
      const heading = document.createElement('h2');
      heading.className = 'reader-heading';
      heading.textContent = entry.title || 'Untitled';
      nodes.push(heading);
    }
  }

  const metaParts = [!isWhisper && entry.display_date, entry.subtitle].filter(Boolean);
  if (metaParts.length) {
    const meta = document.createElement('p');
    meta.className = 'entry-meta';
    meta.textContent = metaParts.join(' · ');
    nodes.push(meta);
  }

  if (entry.created_by) {
    const author = document.createElement('p');
    author.className = 'entry-author';
    author.textContent = `By ${getUserLabel(entry.created_by, people)}`;
    nodes.push(author);
  }

  if (entry.image_url && !isThingLove && !isWhisper) {
    const img = document.createElement('img');
    img.src = entry.image_url;
    img.alt = entry.image_alt || '';
    nodes.push(img);
  }

  const body = document.createElement('div');
  body.className = 'prose preserve-lines';
  body.textContent = entry.body || '';
  nodes.push(body);

  readerDialogInner.append(...nodes);
  openReader(trigger);
}

async function handleFinalAskResponse(response) {
  if (!sessionToken || !currentPageData?.final_ask?.can_respond) return;

  const message = readingDetail?.querySelector('[data-final-ask-message]');
  if (message) message.textContent = 'Saving...';

  try {
    await respondFinalAsk(sessionToken, response);
    currentPageData = await getSecretPage(sessionToken);
    renderPage(currentPageData);
  } catch (error) {
    console.error(error);
    if (message) message.textContent = error?.message || 'Could not save this response.';
  }
}

function renderFinalAskDetail(content, finalAsk = {}) {
  if (!finalAsk.visible || finalAsk.status === 'hidden') return false;

  if (finalAsk.status === 'answered') {
    return renderFinalAskOutcome(content, finalAsk);
  }

  const copy = getFinalAskContent(content);
  finalAskQuestionRevealed = false;
  setDetailMode(true);
  readingDetail.innerHTML = '';
  readingDetail.classList.remove('detail-section--reader', 'detail-section--outcome');

  const label = document.createElement('p');
  label.className = 'section-label';
  label.textContent = 'A protected part';

  const heading = document.createElement('h1');
  heading.textContent = finalAsk.status === 'answered' ? copy.hiddenTitle : copy.revealedTitle;

  const body = document.createElement('div');
  body.className = 'prose preserve-lines detail-copy';

  const actions = document.createElement('div');
  actions.className = 'entry-card__actions detail-actions';

  body.textContent = copy.body || 'This protected part is waiting.';

  const revealActions = document.createElement('div');
  revealActions.className = 'entry-card__actions detail-actions final-ask-reveal-actions';

  const revealButton = document.createElement('button');
  revealButton.className = 'quiet-button quiet-button--soft final-ask-reveal-button';
  revealButton.type = 'button';
  revealButton.textContent = 'Reveal the question';
  revealButton.setAttribute('aria-expanded', 'false');
  revealButton.setAttribute('aria-controls', 'finalAskRevealedPanel');

  const questionPanel = document.createElement('section');
  questionPanel.id = 'finalAskRevealedPanel';
  questionPanel.className = 'final-ask-revealed-panel';
  questionPanel.hidden = !finalAskQuestionRevealed;
  questionPanel.tabIndex = -1;
  questionPanel.setAttribute('aria-live', 'polite');

  const question = document.createElement('p');
  question.className = 'final-ask-question';
  question.textContent = copy.question;
  question.hidden = !copy.question;

  const message = document.createElement('p');
  message.className = 'inline-message';
  message.dataset.finalAskMessage = 'true';
  message.setAttribute('aria-live', 'polite');

  if (finalAsk.can_respond) {
    const yesButton = document.createElement('button');
    yesButton.className = 'quiet-button quiet-button--soft final-ask-response-button final-ask-response-button--yes';
    yesButton.type = 'button';
    yesButton.textContent = copy.yesLabel;
    yesButton.addEventListener('click', () => handleFinalAskResponse('yes'));

    const talkFirstButton = document.createElement('button');
    talkFirstButton.className = 'quiet-button quiet-button--ghost final-ask-response-button final-ask-response-button--talk';
    talkFirstButton.type = 'button';
    talkFirstButton.textContent = copy.talkFirstLabel;
    talkFirstButton.addEventListener('click', () => handleFinalAskResponse('talk_first'));

    actions.append(yesButton, talkFirstButton);
  }

  actions.appendChild(renderBackLink());
  questionPanel.append(question, actions);

  revealButton.addEventListener('click', () => {
    finalAskQuestionRevealed = true;
    revealButton.setAttribute('aria-expanded', 'true');
    revealActions.hidden = true;
    questionPanel.hidden = false;
    questionPanel.classList.add('final-ask-revealed-panel--visible');
    window.requestAnimationFrame(() => {
      (copy.question ? questionPanel : actions.querySelector('button'))?.focus();
    });
  });

  revealActions.append(revealButton, renderBackLink());
  revealActions.hidden = finalAskQuestionRevealed;
  readingDetail.append(label, heading, body, revealActions, questionPanel, message);
  return true;
}

function renderDetail(content, entries, people, finalAsk) {
  const params = new URLSearchParams(window.location.search);

  if (params.get('finalAsk') === '1') {
    if (renderFinalAskDetail(content, finalAsk)) return;
  }

  finalAskQuestionRevealed = false;

  if (params.get('read') === 'constantia') {
    openPoemReader(content);
    return;
  }

  if (params.get('section') === 'opening') {
    openOpeningReader(content);
    return;
  }

  const entryId = params.get('entry');
  if (entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (entry) {
      openEntryReader(entry, people);
      return;
    }
  }

  setDetailMode(false);
}

function renderPage(data) {
  currentPageData = data;
  const content = mergeContent(data.content);
  const entries = data.entries || {};
  const littleProofVisible = isSectionVisible(content, 'little_proof');
  const visibleEntryGroups = {
    ...entries,
    little_proof: littleProofVisible ? entries.little_proof || [] : [],
  };
  const allEntries = flattenEntries(visibleEntryGroups);
  const people = getPeopleBySlug(data);
  const allowedEntrySections = Array.isArray(data.viewer?.allowed_entry_sections)
    ? data.viewer.allowed_entry_sections
    : [];
  const counterpartName = getCounterpartName(data.viewer);

  heroEyebrow.textContent = text(content.hero.eyebrow, 'Private page');
  heroTitle.textContent = text(content.hero.title, 'Protected content waits here.');
  heroOpening.textContent = text(content.hero.opening);

  const opening = getOpeningContent(content);
  openingTitle.textContent = opening.title || 'What was behind the door';
  openingPreview.textContent = opening.preview || makePreview(opening.body);
  openingReadLink.href = getPageHref({ section: 'opening' });
  openingReadLink.hidden = !opening.body;

  const poem = getPoemContent(content);
  poemTitle.textContent = poem.title || 'Constantia';
  poemSubtitle.textContent = poem.subtitle || 'A poem for you.';
  renderPoemColumns(poem);
  poemReadLink.href = getPageHref({ read: 'constantia' });
  poemReadLink.hidden = !poem.body;

  renderNames(content);

  if (littleProofSection) {
    littleProofSection.dataset.sectionVisible = littleProofVisible ? 'true' : 'false';
    littleProofSection.hidden = !littleProofVisible;
  }
  if (littleProofRailLink) littleProofRailLink.hidden = !littleProofVisible;
  littleProofIntro.textContent = text(content.section_intros.little_proof);
  thingsIntro.textContent = text(
    content.section_intros.thing_i_love,
    'For the little things we noticed once and somehow never put down.',
  );
  stillIntro.textContent = text(content.section_intros.still_being_written);
  whispersIntro.textContent = text(
    content.section_intros.whisper,
    'Traces translated from skin to ink.\n\nSmall thoughts left in the moment, then returned to later with the words they were waiting for.',
  );
  renderSectionAction(stillActions, allowedEntrySections, 'still_being_written', 'Add a memory');
  renderSectionAction(thingsActions, allowedEntrySections, 'thing_i_love', 'Add what stayed');
  renderSectionAction(whisperActions, allowedEntrySections, 'whisper', 'Add a whisper');

  const onRead = (entry, trigger) => openEntryReader(entry, people, trigger);
  if (littleProofVisible) {
    renderEntries(littleProofEntries, entries.little_proof || [], { onRead });
  } else {
    littleProofEntries.innerHTML = '';
  }
  renderThingLoveGroups(thingsEntries, entries.thing_i_love || [], people, onRead);
  renderEntries(stillEntries, entries.still_being_written || [], { showAuthor: true, people, onRead });
  renderEntries(whisperEntries, entries.whisper || [], { limit: 2, onRead });
  renderTally(content, data.tally || []);
  renderFinalAskPreview(content, data.final_ask || {});
  renderDetail(content, allEntries, people, data.final_ask || {});

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
    sessionToken = await resolveQuietSession('quietly-kept');
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

openingReadLink?.addEventListener('click', (e) => {
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && currentPageData) {
    e.preventDefault();
    history.pushState({}, '', openingReadLink.href);
    openOpeningReader(mergeContent(currentPageData.content), openingReadLink);
  }
});

poemReadLink?.addEventListener('click', (e) => {
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && currentPageData) {
    e.preventDefault();
    history.pushState({}, '', poemReadLink.href);
    openPoemReader(mergeContent(currentPageData.content), poemReadLink);
  }
});

document.querySelector('#readerClose')?.addEventListener('click', () => {
  readerDialog?.close();
});

readerDialog?.addEventListener('click', (e) => {
  if (e.target === readerDialog) readerDialog.close();
});

readerDialog?.addEventListener('close', () => {
  document.body.style.overflow = '';
  if (window.location.search) {
    history.pushState({}, '', window.location.pathname);
  }
  if (readerTrigger) {
    try { readerTrigger.focus(); } catch (_) {}
    readerTrigger = null;
  }
});

window.addEventListener('popstate', () => {
  if (readerDialog?.open) readerDialog.close();
});

bootstrap();
