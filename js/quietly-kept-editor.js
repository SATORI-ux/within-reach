import {
  archiveSecretEntry,
  getSecretPage,
  resetFinalAsk,
  revealFinalAsk,
  uploadSecretMedia,
  upsertSecretEntry,
  upsertSecretPageContent,
} from './api.js';
import { IS_PRIVATE_BUILD } from './config.js';
import { resolveQuietSession } from './quiet-session.js';
import { initializeThemeToggle, setDocumentTheme } from './theme.js';

const statusCard = document.querySelector('#statusCard');
const statusTitle = document.querySelector('#statusTitle');
const statusBody = document.querySelector('#statusBody');
const editorShell = document.querySelector('#editorShell');
const themeToggle = document.querySelector('#themeToggle');

const pageContentForm = document.querySelector('#pageContentForm');
const pageContentMessage = document.querySelector('#pageContentMessage');
const entryForm = document.querySelector('#entryForm');
const entryMessage = document.querySelector('#entryMessage');
const entryList = document.querySelector('#entryList');
const bodyCount = document.querySelector('#bodyCount');
const bodyMax = document.querySelector('#bodyMax');
const newEntryButton = document.querySelector('#newEntryButton');
const archiveEntryButton = document.querySelector('#archiveEntryButton');
const pageContentSection = pageContentForm?.closest('.editor-section');
const entryEditorSection = entryForm?.closest('.editor-section');
const finalAskEditorSection = document.querySelector('#finalAskEditorSection');
const finalAskStatus = document.querySelector('#finalAskStatus');
const finalAskMeta = document.querySelector('#finalAskMeta');
const revealFinalAskButton = document.querySelector('#revealFinalAskButton');
const resetFinalAskButton = document.querySelector('#resetFinalAskButton');
const finalAskMessage = document.querySelector('#finalAskMessage');
const sectionSelect = entryForm?.elements.namedItem('section_type');

let sessionToken = '';
let currentEntries = [];
let currentFinalAsk = null;
let canEditFixedContent = false;
let allowedEntrySections = [];

const SECTION_LABELS = {
  little_proof: 'Little Proofs',
  thing_i_love: 'Things I Love',
  still_being_written: 'Still Being Written',
  whisper: 'Whispers',
};

const SECTION_BODY_MAX_LENGTHS = {
  little_proof: 20000,
  thing_i_love: 20000,
  still_being_written: 20000,
  whisper: 15000,
};

const EMPTY_CONTENT = {
  hero: {
    eyebrow: '',
    title: '',
    opening: '',
  },
  opening_note: '',
  poem: {
    title: '',
    body: '',
  },
  two_names: {
    title: '',
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
    title: '',
    intro: '',
    thoughts_label: '',
    notes_label: '',
  },
  ask: {
    title: '',
    body: '',
    question: '',
    button: '',
    footnote: '',
  },
  final_ask: {
    hidden_title: '',
    revealed_title: '',
    intro: '',
    body: '',
    question: '',
    open_label: '',
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

function setMessage(target, message) {
  target.textContent = message || '';
}

function getFormValue(form, name) {
  return String(new FormData(form).get(name) || '');
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
    final_ask: {
      ...EMPTY_CONTENT.final_ask,
      ...(content?.final_ask || {}),
    },
  };
}

function setField(form, name, value) {
  const field = form.elements.namedItem(name);
  if (!field) return;
  field.value = value || '';
}

function populateContentForm(contentValue) {
  const content = mergeContent(contentValue);

  setField(pageContentForm, 'hero_eyebrow', content.hero.eyebrow);
  setField(pageContentForm, 'hero_title', content.hero.title);
  setField(pageContentForm, 'hero_opening', content.hero.opening);
  setField(pageContentForm, 'opening_note', content.opening_note);
  setField(pageContentForm, 'poem_title', content.poem.title);
  setField(pageContentForm, 'poem_body', content.poem.body);
  setField(pageContentForm, 'two_names_title', content.two_names.title);
  setField(pageContentForm, 'two_names_cards', JSON.stringify(content.two_names.cards || [], null, 2));
  setField(pageContentForm, 'two_names_closing', content.two_names.closing);
  setField(pageContentForm, 'intro_little_proof', content.section_intros.little_proof);
  setField(pageContentForm, 'intro_thing_i_love', content.section_intros.thing_i_love);
  setField(pageContentForm, 'intro_still_being_written', content.section_intros.still_being_written);
  setField(pageContentForm, 'intro_whisper', content.section_intros.whisper);
  setField(pageContentForm, 'tally_title', content.tally.title);
  setField(pageContentForm, 'tally_intro', content.tally.intro);
  setField(pageContentForm, 'tally_thoughts_label', content.tally.thoughts_label);
  setField(pageContentForm, 'tally_notes_label', content.tally.notes_label);
  setField(pageContentForm, 'ask_title', content.ask.title);
  setField(pageContentForm, 'ask_body', content.ask.body);
  setField(pageContentForm, 'ask_question', content.ask.question);
  setField(pageContentForm, 'ask_button', content.ask.button);
  setField(pageContentForm, 'ask_footnote', content.ask.footnote);
  setField(pageContentForm, 'final_ask_hidden_title', content.final_ask.hidden_title);
  setField(pageContentForm, 'final_ask_revealed_title', content.final_ask.revealed_title);
  setField(pageContentForm, 'final_ask_intro', content.final_ask.intro);
  setField(pageContentForm, 'final_ask_body', content.final_ask.body);
  setField(pageContentForm, 'final_ask_question', content.final_ask.question);
  setField(pageContentForm, 'final_ask_open_label', content.final_ask.open_label);
  setField(pageContentForm, 'final_ask_yes_label', content.final_ask.yes_label);
  setField(pageContentForm, 'final_ask_talk_first_label', content.final_ask.talk_first_label);
  setField(pageContentForm, 'final_ask_yes_screen_copy', content.final_ask.yes_screen_copy);
  setField(pageContentForm, 'final_ask_talk_first_screen_copy', content.final_ask.talk_first_screen_copy);
  setField(pageContentForm, 'final_ask_accepted_memory_copy', content.final_ask.accepted_memory_copy);
}

function parseNameCards() {
  const raw = getFormValue(pageContentForm, 'two_names_cards').trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Name cards must be a JSON array.');
  }

  return parsed
    .filter((card) => card && typeof card === 'object')
    .map((card) => ({
      title: String(card.title || '').trim(),
      body: String(card.body || '').trim(),
    }));
}

function collectPageContent() {
  return {
    hero: {
      eyebrow: getFormValue(pageContentForm, 'hero_eyebrow'),
      title: getFormValue(pageContentForm, 'hero_title'),
      opening: getFormValue(pageContentForm, 'hero_opening'),
    },
    opening_note: getFormValue(pageContentForm, 'opening_note'),
    poem: {
      title: getFormValue(pageContentForm, 'poem_title'),
      body: getFormValue(pageContentForm, 'poem_body'),
    },
    two_names: {
      title: getFormValue(pageContentForm, 'two_names_title'),
      cards: parseNameCards(),
      closing: getFormValue(pageContentForm, 'two_names_closing'),
    },
    section_intros: {
      little_proof: getFormValue(pageContentForm, 'intro_little_proof'),
      thing_i_love: getFormValue(pageContentForm, 'intro_thing_i_love'),
      still_being_written: getFormValue(pageContentForm, 'intro_still_being_written'),
      whisper: getFormValue(pageContentForm, 'intro_whisper'),
    },
    tally: {
      title: getFormValue(pageContentForm, 'tally_title'),
      intro: getFormValue(pageContentForm, 'tally_intro'),
      thoughts_label: getFormValue(pageContentForm, 'tally_thoughts_label'),
      notes_label: getFormValue(pageContentForm, 'tally_notes_label'),
    },
    ask: {
      title: getFormValue(pageContentForm, 'ask_title'),
      body: getFormValue(pageContentForm, 'ask_body'),
      question: getFormValue(pageContentForm, 'ask_question'),
      button: getFormValue(pageContentForm, 'ask_button'),
      footnote: getFormValue(pageContentForm, 'ask_footnote'),
    },
    final_ask: {
      hidden_title: getFormValue(pageContentForm, 'final_ask_hidden_title'),
      revealed_title: getFormValue(pageContentForm, 'final_ask_revealed_title'),
      intro: getFormValue(pageContentForm, 'final_ask_intro'),
      body: getFormValue(pageContentForm, 'final_ask_body'),
      question: getFormValue(pageContentForm, 'final_ask_question'),
      open_label: getFormValue(pageContentForm, 'final_ask_open_label'),
      yes_label: getFormValue(pageContentForm, 'final_ask_yes_label'),
      talk_first_label: getFormValue(pageContentForm, 'final_ask_talk_first_label'),
      yes_screen_copy: getFormValue(pageContentForm, 'final_ask_yes_screen_copy'),
      talk_first_screen_copy: getFormValue(pageContentForm, 'final_ask_talk_first_screen_copy'),
      accepted_memory_copy: getFormValue(pageContentForm, 'final_ask_accepted_memory_copy'),
    },
  };
}

function flattenEntries(groups = {}) {
  return [
    ...(groups.little_proof || []),
    ...(groups.thing_i_love || []),
    ...(groups.still_being_written || []),
    ...(groups.whisper || []),
  ];
}

function getSelectedSectionType() {
  return String(sectionSelect?.value || '');
}

function getCurrentBodyMaxLength() {
  return SECTION_BODY_MAX_LENGTHS[getSelectedSectionType()] || 20000;
}

function setSectionOptions(sections = []) {
  if (!sectionSelect) return;

  sectionSelect.innerHTML = '';
  sections.forEach((sectionType) => {
    const option = document.createElement('option');
    option.value = sectionType;
    option.textContent = SECTION_LABELS[sectionType] || sectionType;
    sectionSelect.appendChild(option);
  });

  sectionSelect.disabled = sections.length === 0;
}

function configureEditorPermissions(viewer = {}) {
  canEditFixedContent = Boolean(viewer.can_edit_fixed_content);
  allowedEntrySections = Array.isArray(viewer.allowed_entry_sections) ? viewer.allowed_entry_sections : [];

  if (pageContentSection) {
    pageContentSection.hidden = !canEditFixedContent;
  }

  if (entryEditorSection) {
    entryEditorSection.hidden = allowedEntrySections.length === 0;
  }

  if (finalAskEditorSection) {
    finalAskEditorSection.hidden = !canEditFixedContent;
  }

  setSectionOptions(allowedEntrySections);
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

function renderFinalAskControls(finalAsk = {}) {
  currentFinalAsk = finalAsk;
  if (!finalAskStatus || !finalAskMeta) return;

  const status = finalAsk.status || 'hidden';
  finalAskStatus.textContent = `Status: ${status}`;

  if (status === 'answered') {
    const response = finalAsk.response === 'yes' ? 'Yes' : 'Talk to me first';
    finalAskMeta.textContent = [
      `Response: ${response}.`,
      finalAsk.accepted_at ? `Accepted ${formatDateTime(finalAsk.accepted_at)}.` : '',
      finalAsk.responded_at && !finalAsk.accepted_at ? `Answered ${formatDateTime(finalAsk.responded_at)}.` : '',
    ].filter(Boolean).join(' ');
  } else if (status === 'revealed') {
    finalAskMeta.textContent = finalAsk.revealed_at
      ? `Revealed ${formatDateTime(finalAsk.revealed_at)}.`
      : 'Revealed and waiting for a response.';
  } else {
    finalAskMeta.textContent = finalAsk.reset_at
      ? `Hidden. Last reset ${formatDateTime(finalAsk.reset_at)}.`
      : 'Hidden. Not revealed yet.';
  }

  if (revealFinalAskButton) {
    revealFinalAskButton.hidden = !finalAsk.can_reveal;
    revealFinalAskButton.disabled = !finalAsk.can_reveal;
  }

  if (resetFinalAskButton) {
    resetFinalAskButton.hidden = !finalAsk.can_reset;
    resetFinalAskButton.disabled = !finalAsk.can_reset;
  }
}

function renderEntryList(entries) {
  entryList.innerHTML = '';

  const editableEntries = entries.filter((entry) => entry.can_edit);

  if (!editableEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'quiet-note';
    empty.textContent = 'No editable entries are waiting here.';
    entryList.appendChild(empty);
    return;
  }

  editableEntries.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'editor-list__item';

    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = entry.title || 'Untitled';
    const meta = document.createElement('p');
    meta.textContent = [entry.section_type, entry.display_date].filter(Boolean).join(' · ');
    copy.append(title, meta);

    const button = document.createElement('button');
    button.className = 'quiet-button quiet-button--ghost';
    button.type = 'button';
    button.textContent = 'Edit';
    button.addEventListener('click', () => populateEntryForm(entry));

    item.append(copy, button);
    entryList.appendChild(item);
  });
}

function updateBodyCount() {
  const body = entryForm.elements.namedItem('body');
  const maxLength = getCurrentBodyMaxLength();
  if (body) {
    body.maxLength = maxLength;
  }

  bodyCount.textContent = String(body?.value?.length || 0);
  if (bodyMax) {
    bodyMax.textContent = String(maxLength);
  }
}

function resetEntryForm() {
  entryForm.reset();
  setField(entryForm, 'display_order', '0');
  entryForm.elements.namedItem('id').value = '';
  if (sectionSelect && allowedEntrySections.length) {
    sectionSelect.value = allowedEntrySections[0];
  }
  archiveEntryButton.hidden = true;
  updateBodyCount();
  setMessage(entryMessage, '');
}

function populateEntryForm(entry) {
  if (!entry.can_edit) {
    setMessage(entryMessage, 'This entry belongs to the other side of the page.');
    return;
  }

  setField(entryForm, 'id', entry.id);
  setField(entryForm, 'section_type', entry.section_type);
  setField(entryForm, 'title', entry.title);
  setField(entryForm, 'subtitle', entry.subtitle);
  setField(entryForm, 'memory_date', entry.memory_date);
  setField(entryForm, 'display_date', entry.display_date);
  setField(entryForm, 'display_order', String(entry.display_order ?? 0));
  setField(entryForm, 'preview', entry.preview);
  setField(entryForm, 'body', entry.body);
  setField(entryForm, 'image_alt', entry.image_alt);
  entryForm.elements.namedItem('is_pinned').checked = Boolean(entry.is_pinned);
  entryForm.elements.namedItem('image').value = '';
  archiveEntryButton.hidden = false;
  updateBodyCount();
  setMessage(entryMessage, '');
  entryForm.scrollIntoView({ block: 'start' });
}

function collectEntry() {
  const formData = new FormData(entryForm);
  return {
    id: String(formData.get('id') || '').trim() || undefined,
    section_type: String(formData.get('section_type') || ''),
    title: String(formData.get('title') || ''),
    subtitle: String(formData.get('subtitle') || ''),
    memory_date: String(formData.get('memory_date') || '') || null,
    display_date: String(formData.get('display_date') || ''),
    display_order: Number(formData.get('display_order') || 0),
    is_pinned: Boolean(formData.get('is_pinned')),
    preview: String(formData.get('preview') || ''),
    body: String(formData.get('body') || ''),
    image_alt: String(formData.get('image_alt') || ''),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error || new Error('Could not read image.')));
    reader.readAsDataURL(file);
  });
}

async function refreshPage() {
  const data = await getSecretPage(sessionToken);
  configureEditorPermissions(data.viewer || {});
  currentEntries = flattenEntries(data.entries);
  renderFinalAskControls(data.final_ask || {});
  if (canEditFixedContent) {
    populateContentForm(data.content);
  }
  renderEntryList(currentEntries);
}

async function handlePageContentSubmit(event) {
  event.preventDefault();
  if (!canEditFixedContent) {
    setMessage(pageContentMessage, 'Fixed page content can only be edited by its owner.');
    return;
  }

  setMessage(pageContentMessage, 'Saving...');

  try {
    const saved = await upsertSecretPageContent(sessionToken, collectPageContent());
    populateContentForm(saved.content);
    setMessage(pageContentMessage, 'Saved.');
  } catch (error) {
    console.error(error);
    setMessage(pageContentMessage, error?.message || 'Could not save page content.');
  }
}

async function handleEntrySubmit(event) {
  event.preventDefault();
  if (!allowedEntrySections.length) {
    setMessage(entryMessage, 'This session cannot edit living entries.');
    return;
  }

  setMessage(entryMessage, 'Saving...');

  try {
    const imageInput = entryForm.elements.namedItem('image');
    const imageFile = imageInput?.files?.[0] || null;
    const saved = await upsertSecretEntry(sessionToken, collectEntry());

    if (imageFile) {
      const imageBase64 = await readFileAsDataUrl(imageFile);
      await uploadSecretMedia(sessionToken, saved.entry.id, {
        filename: imageFile.name,
        mime_type: imageFile.type,
        image_base64: imageBase64,
        image_alt: getFormValue(entryForm, 'image_alt'),
      });
    }

    await refreshPage();
    populateEntryForm(currentEntries.find((entry) => entry.id === saved.entry.id) || saved.entry);
    setMessage(entryMessage, 'Saved.');
  } catch (error) {
    console.error(error);
    setMessage(entryMessage, error?.message || 'Could not save entry.');
  }
}

async function handleArchiveEntry() {
  const entryId = getFormValue(entryForm, 'id');
  if (!entryId) return;

  setMessage(entryMessage, 'Archiving...');

  try {
    await archiveSecretEntry(sessionToken, entryId);
    resetEntryForm();
    await refreshPage();
    setMessage(entryMessage, 'Archived.');
  } catch (error) {
    console.error(error);
    setMessage(entryMessage, error?.message || 'Could not archive entry.');
  }
}

async function handleRevealFinalAsk() {
  if (!canEditFixedContent) {
    setMessage(finalAskMessage, 'Only the page owner can reveal this.');
    return;
  }

  setMessage(finalAskMessage, 'Revealing...');

  try {
    const result = await revealFinalAsk(sessionToken);
    renderFinalAskControls(result.final_ask || currentFinalAsk || {});
    setMessage(finalAskMessage, 'Revealed.');
  } catch (error) {
    console.error(error);
    setMessage(finalAskMessage, error?.message || 'Could not reveal the Final Ask.');
  }
}

async function handleResetFinalAsk() {
  if (!canEditFixedContent) {
    setMessage(finalAskMessage, 'Only the page owner can reset this.');
    return;
  }

  const confirmed = window.confirm('Reset and hide the Final Ask? This is only for mistakes or testing.');
  if (!confirmed) return;

  setMessage(finalAskMessage, 'Resetting...');

  try {
    const result = await resetFinalAsk(sessionToken);
    renderFinalAskControls(result.final_ask || currentFinalAsk || {});
    setMessage(finalAskMessage, 'Hidden.');
  } catch (error) {
    console.error(error);
    setMessage(finalAskMessage, error?.message || 'Could not reset the Final Ask.');
  }
}

async function bootstrap() {
  setDocumentTheme(document.documentElement.dataset.theme);
  initializeThemeToggle(themeToggle, { enableSecretTheme: IS_PRIVATE_BUILD });

  if (!IS_PRIVATE_BUILD) {
    setStatus('This editor is not available here.', 'The protected editor only opens in the private build.');
    return;
  }

  try {
    sessionToken = await resolveQuietSession('quietly-kept-editor');
    if (!sessionToken) {
      setStatus('This editor needs your session.', 'Open the shared space first, then return here.');
      return;
    }

    const data = await getSecretPage(sessionToken);
    if (!data.viewer?.can_edit_fixed_content) {
      setStatus('This editor is closed.', 'This protected editor is only for the page owner.');
      return;
    }

    configureEditorPermissions(data.viewer || {});
    currentEntries = flattenEntries(data.entries);
    renderFinalAskControls(data.final_ask || {});
    if (canEditFixedContent) {
      populateContentForm(data.content);
    }
    renderEntryList(currentEntries);
    resetEntryForm();

    statusCard.hidden = true;
    editorShell.hidden = false;
  } catch (error) {
    console.error(error);
    setStatus('This editor could not open.', error?.message || 'Try again in a moment.');
  }
}

pageContentForm?.addEventListener('submit', handlePageContentSubmit);
entryForm?.addEventListener('submit', handleEntrySubmit);
entryForm?.elements.namedItem('body')?.addEventListener('input', updateBodyCount);
sectionSelect?.addEventListener('change', updateBodyCount);
newEntryButton?.addEventListener('click', resetEntryForm);
archiveEntryButton?.addEventListener('click', handleArchiveEntry);
revealFinalAskButton?.addEventListener('click', handleRevealFinalAsk);
resetFinalAskButton?.addEventListener('click', handleResetFinalAsk);

bootstrap();
