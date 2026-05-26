import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.js';

const SESSION_KEY = 'within-reach.session-token';
const SESSION_COOKIE_NAME = 'within_reach_session_token';
const CANVAS_WIDTH = 768;
const CANVAS_HEIGHT = 576;
const MAX_STROKES = 80;
const MAX_POINTS_PER_STROKE = 1200;

const INK_COLORS = [
  { id: 'accent', label: 'Your color', value: 'accent' },
  { id: 'rose', label: 'Rose', value: '#b98278' },
  { id: 'gold', label: 'Gold', value: '#b69a63' },
  { id: 'moss', label: 'Moss', value: '#6f8a67' },
  { id: 'plum', label: 'Plum', value: '#8661a9' },
  { id: 'ink', label: 'Ink', value: '#4b4038' },
];

const state = {
  mode: 'text',
  activeInkId: 'accent',
  activeStroke: null,
  strokes: [],
  lastEnhanceKey: '',
};

const noteComposer = document.querySelector('#noteComposer');
const noteLabel = document.querySelector('.note-composer__label');
const noteInput = document.querySelector('#noteInput');
const noteCount = document.querySelector('#noteCount');
const noteMeta = document.querySelector('.note-composer__meta');
const noteActions = document.querySelector('.note-composer__actions');
const noteMessage = document.querySelector('#noteMessage');
const submitNoteButton = document.querySelector('#submitNoteButton');
const notesFeed = document.querySelector('#notesFeed');

let canvas;
let context;
let drawingPanel;
let sendDrawingButton;
let undoButton;
let clearButton;
let modeButtons = [];

function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function getSessionToken() {
  return getCookie(SESSION_COOKIE_NAME).trim() || (localStorage.getItem(SESSION_KEY) || '').trim();
}

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('http')) {
    throw new Error('Supabase URL is not configured.');
  }

  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase publishable key is not configured.');
  }
}

async function callFunction(functionName, payload = {}) {
  assertConfig();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  }

  return body;
}

function setMessage(message, isError = false) {
  if (!noteMessage) return;
  noteMessage.textContent = message;
  noteMessage.style.color = isError ? 'var(--danger)' : 'var(--text-soft)';
  noteMessage.hidden = !message;
}

function getResolvedInkColor(colorId = state.activeInkId) {
  const color = INK_COLORS.find((item) => item.id === colorId) || INK_COLORS[0];
  if (color.value !== 'accent') return color.value;

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  return accent || '#748a68';
}

function updateInkButtons() {
  drawingPanel?.querySelectorAll('.drawing-ink').forEach((button) => {
    const selected = button.dataset.inkId === state.activeInkId;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function updateDrawingActions() {
  const hasStrokes = state.strokes.length > 0;
  if (undoButton) undoButton.disabled = !hasStrokes;
  if (clearButton) clearButton.disabled = !hasStrokes;
  if (sendDrawingButton) sendDrawingButton.disabled = !hasStrokes;
}

function clearCanvas() {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawStroke(stroke) {
  if (!stroke?.points?.length) return;

  context.save();
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();

  const [firstPoint, secondPoint] = stroke.points;
  context.moveTo(firstPoint.x, firstPoint.y);

  if (!secondPoint) {
    context.lineTo(firstPoint.x + 0.01, firstPoint.y + 0.01);
  } else {
    for (let index = 1; index < stroke.points.length - 1; index += 1) {
      const current = stroke.points[index];
      const next = stroke.points[index + 1];
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = stroke.points[stroke.points.length - 1];
    context.lineTo(last.x, last.y);
  }

  context.stroke();
  context.restore();
}

function redrawCanvas() {
  clearCanvas();
  state.strokes.forEach(drawStroke);
  if (state.activeStroke) drawStroke(state.activeStroke);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
}

function startStroke(event) {
  if (!canvas || event.button > 0) return;

  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  state.activeStroke = {
    color: getResolvedInkColor(),
    width: 5,
    points: [getCanvasPoint(event)],
  };
  redrawCanvas();
}

function continueStroke(event) {
  if (!state.activeStroke) return;

  event.preventDefault();
  if (state.activeStroke.points.length < MAX_POINTS_PER_STROKE) {
    state.activeStroke.points.push(getCanvasPoint(event));
  }
  redrawCanvas();
}

function finishStroke(event) {
  if (!state.activeStroke) return;

  event.preventDefault();
  if (state.activeStroke.points.length > 0) {
    state.strokes.push(state.activeStroke);
    state.strokes = state.strokes.slice(-MAX_STROKES);
  }
  state.activeStroke = null;
  redrawCanvas();
  updateDrawingActions();
}

function undoStroke() {
  state.strokes.pop();
  redrawCanvas();
  updateDrawingActions();
}

function clearDrawing() {
  state.strokes = [];
  state.activeStroke = null;
  clearCanvas();
  updateDrawingActions();
}

function setMode(mode) {
  state.mode = mode;
  const drawingMode = mode === 'drawing';

  noteInput.hidden = drawingMode;
  if (noteCount) noteCount.hidden = drawingMode;
  if (submitNoteButton) submitNoteButton.hidden = drawingMode;
  if (drawingPanel) drawingPanel.hidden = !drawingMode;
  if (sendDrawingButton) sendDrawingButton.hidden = !drawingMode;

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  setMessage('');
  window.setTimeout(() => {
    if (drawingMode) canvas?.focus();
    else noteInput?.focus();
  }, 40);
}

function createModeToggle() {
  const toggle = document.createElement('div');
  toggle.className = 'note-mode-toggle';
  toggle.setAttribute('role', 'group');
  toggle.setAttribute('aria-label', 'Choose note type');

  [
    { mode: 'text', label: 'Typed' },
    { mode: 'drawing', label: 'Drawn' },
  ].forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-mode-toggle__button';
    button.dataset.mode = item.mode;
    button.textContent = item.label;
    button.addEventListener('click', () => setMode(item.mode));
    toggle.appendChild(button);
    modeButtons.push(button);
  });

  return toggle;
}

function createInkPicker() {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'drawing-ink-fieldset';

  const legend = document.createElement('legend');
  legend.textContent = 'Ink';
  fieldset.appendChild(legend);

  const row = document.createElement('div');
  row.className = 'drawing-ink-row';

  INK_COLORS.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'drawing-ink';
    button.dataset.inkId = color.id;
    button.setAttribute('aria-label', color.label);
    button.style.setProperty('--drawing-ink', color.value === 'accent' ? 'var(--accent)' : color.value);
    button.addEventListener('click', () => {
      state.activeInkId = color.id;
      updateInkButtons();
    });
    row.appendChild(button);
  });

  fieldset.appendChild(row);
  return fieldset;
}

function createDrawingPanel() {
  const panel = document.createElement('div');
  panel.className = 'drawing-note-panel';
  panel.hidden = true;

  const prompt = document.createElement('p');
  prompt.className = 'drawing-note-panel__prompt';
  prompt.textContent = 'Leave a little trace.';

  canvas = document.createElement('canvas');
  canvas.className = 'drawing-note-canvas';
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Small drawing area');

  context = canvas.getContext('2d');

  canvas.addEventListener('pointerdown', startStroke);
  canvas.addEventListener('pointermove', continueStroke);
  canvas.addEventListener('pointerup', finishStroke);
  canvas.addEventListener('pointercancel', finishStroke);
  canvas.addEventListener('pointerleave', finishStroke);

  const toolRow = document.createElement('div');
  toolRow.className = 'drawing-tools';

  undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'ghost-button drawing-tool-button';
  undoButton.textContent = 'Undo';
  undoButton.addEventListener('click', undoStroke);

  clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'ghost-button drawing-tool-button';
  clearButton.textContent = 'Clear';
  clearButton.addEventListener('click', clearDrawing);

  toolRow.append(undoButton, clearButton);
  panel.append(prompt, canvas, createInkPicker(), toolRow);
  return panel;
}

function canvasToBase64() {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

async function sendDrawingNote() {
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    setMessage('Tap your tile again before sending a drawing.', true);
    return;
  }

  if (!state.strokes.length) {
    setMessage('Draw something small first.', true);
    return;
  }

  sendDrawingButton.disabled = true;
  setMessage('Keeping the drawing...');

  try {
    await callFunction('add-drawing-note', {
      tile_key: sessionToken,
      image_base64: canvasToBase64(),
      ink_color: getResolvedInkColor(),
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    setMessage('Drawing kept here.');
    window.setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    console.error(error);
    setMessage(error.message || 'Could not save that drawing.', true);
    updateDrawingActions();
  }
}

function createSendDrawingButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'solid-button';
  button.id = 'submitDrawingNoteButton';
  button.textContent = 'Send drawing';
  button.hidden = true;
  button.addEventListener('click', sendDrawingNote);
  return button;
}

function setupComposer() {
  if (!noteComposer || !noteInput || !noteMeta || !noteActions) return;
  if (document.querySelector('.note-mode-toggle')) return;

  noteLabel.textContent = 'Leave a note';
  noteComposer.insertBefore(createModeToggle(), noteInput);
  drawingPanel = createDrawingPanel();
  noteComposer.insertBefore(drawingPanel, noteMeta);
  sendDrawingButton = createSendDrawingButton();
  noteActions.appendChild(sendDrawingButton);

  updateInkButtons();
  updateDrawingActions();
  setMode('text');
}

function getVisibleNoteIds() {
  return Array.from(notesFeed.querySelectorAll('.note-card[data-note-id]'))
    .map((card) => Number(card.dataset.noteId))
    .filter((id) => Number.isFinite(id));
}

async function fetchDrawingNotes(noteIds) {
  const sessionToken = getSessionToken();
  if (!sessionToken || !noteIds.length) return [];

  const result = await callFunction('get-drawing-notes', {
    tile_key: sessionToken,
    note_ids: noteIds,
  });

  return result.drawings || [];
}

function renderDrawingOnCard(card, drawing) {
  if (!card || !drawing?.url || card.dataset.drawingEnhanced === 'true') return;

  card.dataset.drawingEnhanced = 'true';
  card.classList.add('note-card--drawing');

  const content = card.querySelector('.note-card__content');
    if (content) {
      content.classList.add('note-card__content--drawing');
    }

  const figure = document.createElement('figure');
  figure.className = 'note-card__drawing';

  const image = document.createElement('img');
  image.src = drawing.url;
  image.alt = 'Hand-drawn note';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.width = drawing.width || CANVAS_WIDTH;
  image.height = drawing.height || CANVAS_HEIGHT;

  figure.appendChild(image);
  content?.insertAdjacentElement('afterend', figure);
}

async function enhanceVisibleDrawingNotes() {
  if (!notesFeed) return;

  const noteIds = getVisibleNoteIds();
  const key = noteIds.join(',');
  if (!key || key === state.lastEnhanceKey) return;

  state.lastEnhanceKey = key;

  try {
    const drawings = await fetchDrawingNotes(noteIds);
    drawings.forEach((drawing) => {
      const noteId = Number(drawing.note_id);
      const card = notesFeed.querySelector(`.note-card[data-note-id="${noteId}"]`);
      renderDrawingOnCard(card, drawing);
    });
  } catch (error) {
    console.warn('Could not enhance drawing notes.', error);
  }
}

function observeNotesFeed() {
  if (!notesFeed) return;

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(enhanceVisibleDrawingNotes);
  });

  observer.observe(notesFeed, { childList: true, subtree: true });
  window.requestAnimationFrame(enhanceVisibleDrawingNotes);
}

setupComposer();
observeNotesFeed();
