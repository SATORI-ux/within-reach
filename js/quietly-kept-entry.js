import {
  archiveSecretEntry,
  getSecretPage,
  uploadSecretMedia,
  upsertSecretEntry,
} from './api.js';
import { IS_PRIVATE_BUILD } from './config.js';
import { resolveQuietSession } from './quiet-session.js';
import { initializeThemeToggle, setDocumentTheme } from './theme.js';

const statusCard = document.querySelector('#statusCard');
const statusTitle = document.querySelector('#statusTitle');
const statusBody = document.querySelector('#statusBody');
const entryShell = document.querySelector('#entryShell');
const themeToggle = document.querySelector('#themeToggle');

const entryKicker = document.querySelector('#entryKicker');
const entryTitle = document.querySelector('#entryTitle');
const entryDescription = document.querySelector('#entryDescription');
const entryForm = document.querySelector('#entryForm');
const entryMessage = document.querySelector('#entryMessage');
const memoryDateField = document.querySelector('#memoryDateField');
const bodyLabel = document.querySelector('#bodyLabel');
const bodyCount = document.querySelector('#bodyCount');
const bodyMax = document.querySelector('#bodyMax');
const cancelLink = document.querySelector('#cancelLink');
const archiveEntryButton = document.querySelector('#archiveEntryButton');

const SECTION_CONFIG = {
  still_being_written: {
    label: 'Living Memory',
    createTitle: 'Add a memory.',
    editTitle: 'Edit this memory.',
    description: 'A future piece of the story, kept in one focused place.',
    bodyLabel: 'Story',
    bodyMax: 20000,
    showMemoryDate: true,
    returnHash: 'still-being-written',
  },
  thing_i_love: {
    label: 'Thing I Love',
    createTitle: 'Add something I love.',
    editTitle: 'Edit this love.',
    description: 'A small specific thing noticed and kept.',
    bodyLabel: 'What you want to keep',
    bodyMax: 20000,
    showMemoryDate: false,
    returnHash: 'thing-i-love',
  },
  whisper: {
    label: 'Whisper',
    createTitle: 'Add a whisper.',
    editTitle: 'Edit this whisper.',
    description: 'Longer things, kept softer.',
    bodyLabel: 'Whisper',
    bodyMax: 15000,
    showMemoryDate: false,
    returnHash: 'whispers',
  },
  little_proof: {
    label: 'Little Proof',
    createTitle: 'Add a little proof.',
    editTitle: 'Edit this little proof.',
    description: 'A protected proof, kept by the owner.',
    bodyLabel: 'Proof',
    bodyMax: 20000,
    showMemoryDate: true,
    returnHash: 'little-proof',
  },
};

let sessionToken = '';
let mode = 'create';
let sectionType = '';
let currentEntry = null;
let archiveArmed = false;

function setStatus(title, body) {
  statusTitle.textContent = title;
  statusBody.textContent = body;
}

function setMessage(message) {
  entryMessage.textContent = message || '';
}

function getFormValue(name) {
  return String(new FormData(entryForm).get(name) || '');
}

function setField(name, value) {
  const field = entryForm.elements.namedItem(name);
  if (!field) return;
  field.value = value || '';
}

function flattenEntries(groups = {}) {
  return [
    ...(groups.little_proof || []),
    ...(groups.thing_i_love || []),
    ...(groups.still_being_written || []),
    ...(groups.whisper || []),
  ];
}

function getConfig() {
  return SECTION_CONFIG[sectionType] || null;
}

function getBodyMaxLength() {
  return getConfig()?.bodyMax || 20000;
}

function getReturnHref(entryId = '') {
  if (entryId) return `./quietly-kept.html?entry=${encodeURIComponent(entryId)}`;
  const hash = getConfig()?.returnHash;
  return `./quietly-kept.html${hash ? `#${hash}` : ''}`;
}

function updateBodyCount() {
  const body = entryForm.elements.namedItem('body');
  const maxLength = getBodyMaxLength();
  if (body) {
    body.maxLength = maxLength;
  }

  bodyCount.textContent = String(body?.value?.length || 0);
  bodyMax.textContent = String(maxLength);
}

function renderShell() {
  const config = getConfig();
  if (!config) {
    setStatus('This room is not ready.', 'That section is not available here yet.');
    return;
  }

  entryKicker.textContent = config.label;
  entryTitle.textContent = mode === 'edit' ? config.editTitle : config.createTitle;
  entryDescription.textContent = config.description;
  bodyLabel.textContent = config.bodyLabel;
  memoryDateField.hidden = !config.showMemoryDate;
  archiveEntryButton.hidden = mode !== 'edit';
  cancelLink.href = getReturnHref(currentEntry?.id);
  updateBodyCount();

  statusCard.hidden = true;
  entryShell.hidden = false;
}

function populateEntryForm(entry) {
  setField('title', entry.title);
  setField('subtitle', entry.subtitle);
  setField('memory_date', entry.memory_date);
  setField('preview', entry.preview);
  setField('body', entry.body);
  setField('image_alt', entry.image_alt);
  const imageField = entryForm.elements.namedItem('image');
  if (imageField) imageField.value = '';
}

function collectEntry() {
  const existing = currentEntry || {};
  const config = getConfig();

  return {
    id: mode === 'edit' ? existing.id : undefined,
    section_type: sectionType,
    title: getFormValue('title'),
    subtitle: getFormValue('subtitle'),
    memory_date: config?.showMemoryDate ? getFormValue('memory_date') || null : existing.memory_date ?? null,
    display_date: existing.display_date || '',
    display_order: Number(existing.display_order ?? 0),
    is_pinned: Boolean(existing.is_pinned),
    preview: getFormValue('preview'),
    body: getFormValue('body'),
    image_alt: getFormValue('image_alt'),
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

async function handleSubmit(event) {
  event.preventDefault();
  archiveArmed = false;
  archiveEntryButton.textContent = 'Archive entry';
  setMessage('Saving...');

  try {
    const imageInput = entryForm.elements.namedItem('image');
    const imageFile = imageInput?.files?.[0] || null;
    const saved = await upsertSecretEntry(sessionToken, collectEntry());

    let savedEntry = saved.entry;
    if (imageFile) {
      const imageBase64 = await readFileAsDataUrl(imageFile);
      const uploaded = await uploadSecretMedia(sessionToken, savedEntry.id, {
        filename: imageFile.name,
        mime_type: imageFile.type,
        image_base64: imageBase64,
        image_alt: getFormValue('image_alt'),
      });
      savedEntry = uploaded.entry || savedEntry;
    }

    mode = 'edit';
    currentEntry = savedEntry;
    sectionType = savedEntry.section_type;
    populateEntryForm(savedEntry);
    renderShell();
    setMessage('Saved.');
  } catch (error) {
    console.error(error);
    setMessage(error?.message || 'Could not save this entry.');
  }
}

async function handleArchive() {
  if (!currentEntry?.id) return;

  if (!archiveArmed) {
    archiveArmed = true;
    archiveEntryButton.textContent = 'Archive for real';
    setMessage('Press Archive again to put this entry away.');
    return;
  }

  setMessage('Archiving...');

  try {
    await archiveSecretEntry(sessionToken, currentEntry.id);
    window.location.href = getReturnHref();
  } catch (error) {
    console.error(error);
    archiveArmed = false;
    archiveEntryButton.textContent = 'Archive entry';
    setMessage(error?.message || 'Could not archive this entry.');
  }
}

function getRequestedMode(data) {
  const params = new URLSearchParams(window.location.search);
  const entryId = params.get('entry') || '';
  const requestedSection = params.get('section') || '';
  const allowedSections = Array.isArray(data.viewer?.allowed_entry_sections)
    ? data.viewer.allowed_entry_sections
    : [];

  if (entryId) {
    const entry = flattenEntries(data.entries).find((item) => item.id === entryId);
    if (!entry) {
      setStatus('This entry is not here.', 'It may have been archived or moved.');
      return false;
    }

    if (!entry.can_edit) {
      setStatus('This entry is closed.', 'This session cannot edit that part of the page.');
      return false;
    }

    mode = 'edit';
    currentEntry = entry;
    sectionType = entry.section_type;
    populateEntryForm(entry);
    return true;
  }

  if (!requestedSection) {
    setStatus('Choose a place to write.', 'Open one of the quiet add buttons from the page.');
    return false;
  }

  if (!SECTION_CONFIG[requestedSection]) {
    setStatus('This room is not ready.', 'That section is not available here yet.');
    return false;
  }

  if (!allowedSections.includes(requestedSection)) {
    setStatus('This room is closed.', 'This session cannot add to that section.');
    return false;
  }

  mode = 'create';
  sectionType = requestedSection;
  currentEntry = null;
  return true;
}

async function bootstrap() {
  setDocumentTheme(document.documentElement.dataset.theme);
  initializeThemeToggle(themeToggle, { enableSecretTheme: IS_PRIVATE_BUILD });

  if (!IS_PRIVATE_BUILD) {
    setStatus('This page is not available here.', 'The protected contribution page only opens in the private build.');
    return;
  }

  try {
    sessionToken = await resolveQuietSession('quietly-kept-entry');
    if (!sessionToken) {
      setStatus('This page needs your session.', 'Open the shared space first, then return here.');
      return;
    }

    const data = await getSecretPage(sessionToken);
    if (!getRequestedMode(data)) return;
    renderShell();
  } catch (error) {
    console.error(error);
    setStatus('This page could not open.', error?.message || 'Try again in a moment.');
  }
}

entryForm?.addEventListener('submit', handleSubmit);
entryForm?.elements.namedItem('body')?.addEventListener('input', updateBodyCount);
archiveEntryButton?.addEventListener('click', handleArchive);

bootstrap();
