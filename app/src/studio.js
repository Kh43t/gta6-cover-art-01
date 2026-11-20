// Vice Coast Cover Studio — the editor wiring.
// Owns the state, undo/redo history, panel picking (click, drag, wheel
// zoom, sliders, arrow keys), photo upload, and PNG export. The drawing
// itself lives in cover.js; this file only moves state around.
//
// History rule: a history entry is always the state BEFORE an edit.
// beginEdit() snapshots the current state when an edit starts; endEdit()
// files that snapshot when the edit lands. Undo restores the snapshot,
// so one undo always steps back exactly one edit.
import { drawCover, renderCover, slugify } from './cover.js';
import {
  EXPORT_SIZES, GRADES, LAYOUTS, LETTERING, SAMPLES,
  findLayout, findSample,
} from './presets.js';
import { runShot } from './shots.js';

const PREVIEW = 900;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
canvas.width = PREVIEW;
canvas.height = PREVIEW;

const $ = (id) => document.getElementById(id);
const statusEl = $('status');

const SAMPLE_CYCLE = ['pier', 'boulevard', 'rooftop'];

function freshPanels(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ photo: SAMPLE_CYCLE[i % SAMPLE_CYCLE.length], custom: false, zoom: 1, ox: 0, oy: 0 });
  }
  return out;
}

function defaultState() {
  return {
    layout: 'hero-trio',
    grade: 'vice-sunset',
    lettering: 'vice-block',
    title: 'VICE COAST',
    subtitle: 'A STORY IN THREE ACTS',
    badge: 'VICE CITY',
    stars: 4,
    grain: true,
    vignette: true,
    panels: freshPanels(findLayout('hero-trio').cells(PREVIEW, PREVIEW).length),
  };
}

let state = defaultState();
let selected = 0;
// Uploaded photos live outside the JSON state, one slot per panel.
let customImages = [];
const sampleImages = {};

let past = [];
let future = [];
let beforeEdit = null;

function snapshot() {
  return JSON.stringify(state);
}

// Snapshot the state an edit is about to change. Safe to call twice:
// the first snapshot of a running edit is the one that counts.
function beginEdit() {
  if (beforeEdit === null) beforeEdit = snapshot();
}

// File the snapshot taken by beginEdit() as one undo step.
function endEdit() {
  if (beforeEdit === null) return;
  past.push(beforeEdit);
  if (past.length > 60) past.shift();
  future = [];
  beforeEdit = null;
  syncHistoryButtons();
}

function restore(json) {
  state = JSON.parse(json);
  selected = Math.min(selected, state.panels.length - 1);
  syncControls();
  redraw();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncHistoryButtons();
  setStatus('Undid the last change.');
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncHistoryButtons();
  setStatus('Redid the change.');
}

function syncHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}

function setStatus(text) {
  statusEl.textContent = text;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function loadSamples() {
  await Promise.all(SAMPLES.map(async (s) => {
    try {
      sampleImages[s.id] = await loadImage(s.file);
    } catch {
      sampleImages[s.id] = null;
    }
  }));
}

function resolveImage(panel, index) {
  if (panel.custom && customImages[index]) return customImages[index];
  if (panel.photo) return sampleImages[panel.photo] || null;
  return null;
}

function redraw() {
  drawCover(ctx, state, (panel) => resolveImage(panel, state.panels.indexOf(panel)), PREVIEW, PREVIEW);
}

// Keep the panel list the same length as the layout's cell count when
// the layout changes, reusing panels that already exist.
function fitPanelsToLayout() {
  const count = findLayout(state.layout).cells(PREVIEW, PREVIEW).length;
  while (state.panels.length < count) {
    state.panels.push({
      photo: SAMPLE_CYCLE[state.panels.length % SAMPLE_CYCLE.length],
      custom: false, zoom: 1, ox: 0, oy: 0,
    });
  }
  state.panels.length = count;
  customImages.length = count;
  selected = Math.min(selected, count - 1);
}

function syncControls() {
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('lettering').value = state.lettering;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  $('stars').value = String(state.stars);
  $('starsOut').textContent = `${state.stars} / 5`;
  $('grain').checked = state.grain !== false;
  $('vignette').checked = state.vignette !== false;
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[selected];
  if (!panel) return;
  $('panelLabel').textContent = `Panel ${selected + 1} of ${state.panels.length}`;
  $('panelPhoto').value = panel.custom ? '__custom__' : (panel.photo || '');
  $('zoom').value = String(panel.zoom);
  $('zoomOut').textContent = `${panel.zoom.toFixed(2)}x`;
  $('panX').value = String(panel.ox);
  $('panY').value = String(panel.oy);
}

function fillSelect(select, items) {
  select.innerHTML = '';
  items.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  });
}

fillSelect($('layout'), LAYOUTS);
fillSelect($('grade'), GRADES);
fillSelect($('lettering'), LETTERING);
{
  const photo = $('panelPhoto');
  photo.innerHTML = '';
  SAMPLES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    photo.appendChild(opt);
  });
  const custom = document.createElement('option');
  custom.value = '__custom__';
  custom.textContent = 'Uploaded photo';
  photo.appendChild(custom);
}

// --- control events -------------------------------------------------------
// Pattern for a one-shot control (select, checkbox, button): snapshot,
// mutate, file the edit, redraw. Live controls (text, sliders) snapshot
// on focus / first touch and file on change, so a whole drag or typing
// session is a single undo step.

function commit(message) {
  endEdit();
  fitPanelsToLayout();
  syncControls();
  redraw();
  if (message) setStatus(message);
}

$('layout').addEventListener('change', (e) => {
  beginEdit();
  state.layout = e.target.value;
  commit(`Layout: ${findLayout(state.layout).name}.`);
});

$('grade').addEventListener('change', (e) => {
  beginEdit();
  state.grade = e.target.value;
  commit(`Grade: ${GRADES.find((g) => g.id === state.grade)?.name ?? state.grade}.`);
});

$('lettering').addEventListener('change', (e) => {
  beginEdit();
  state.lettering = e.target.value;
  commit(`Lettering: ${LETTERING.find((l) => l.id === state.lettering)?.name ?? state.lettering}.`);
});

function liveText(id, key) {
  const el = $(id);
  el.addEventListener('focus', beginEdit);
  el.addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
  el.addEventListener('change', () => endEdit());
}

liveText('title', 'title');
liveText('subtitle', 'subtitle');
liveText('badge', 'badge');

$('stars').addEventListener('focus', beginEdit);
$('stars').addEventListener('input', (e) => {
  state.stars = Number(e.target.value);
  $('starsOut').textContent = `${state.stars} / 5`;
  redraw();
});
$('stars').addEventListener('change', () => endEdit());

$('grain').addEventListener('change', (e) => {
  beginEdit();
  state.grain = e.target.checked;
  commit(e.target.checked ? 'Grain on.' : 'Grain off.');
});
$('vignette').addEventListener('change', (e) => {
  beginEdit();
  state.vignette = e.target.checked;
  commit(e.target.checked ? 'Vignette on.' : 'Vignette off.');
});

$('panelPhoto').addEventListener('change', (e) => {
  const panel = state.panels[selected];
  if (e.target.value === '__custom__' && !customImages[selected]) {
    setStatus('No uploaded photo yet — use Upload photo first.');
    syncPanelControls();
    return;
  }
  beginEdit();
  if (e.target.value === '__custom__') {
    panel.custom = true;
  } else {
    panel.photo = e.target.value;
    panel.custom = false;
  }
  commit(`Panel ${selected + 1} photo changed.`);
});

function panelSlider(input, apply) {
  input.addEventListener('focus', beginEdit);
  input.addEventListener('pointerdown', beginEdit);
  input.addEventListener('input', (e) => {
    apply(Number(e.target.value));
    syncPanelControls();
    redraw();
  });
  input.addEventListener('change', () => endEdit());
}

panelSlider($('zoom'), (v) => { state.panels[selected].zoom = v; });
panelSlider($('panX'), (v) => { state.panels[selected].ox = v; });
panelSlider($('panY'), (v) => { state.panels[selected].oy = v; });

$('upload').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    beginEdit();
    customImages[selected] = img;
    state.panels[selected].custom = true;
    state.panels[selected].photo = null;
    commit(`Uploaded “${file.name}” into panel ${selected + 1}.`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
  e.target.value = '';
});

$('resetPanels').addEventListener('click', () => {
  beginEdit();
  state.panels = freshPanels(state.panels.length);
  customImages = [];
  commit('All panels reset to the starter photos.');
});

$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);

// --- picking, dragging, wheel zoom, arrow nudging -------------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * PREVIEW,
    y: ((event.clientY - rect.top) / rect.height) * PREVIEW,
  };
}

function hitPanel(point) {
  const cells = findLayout(state.layout).cells(PREVIEW, PREVIEW);
  for (let i = cells.length - 1; i >= 0; i -= 1) {
    const c = cells[i];
    let { x, y } = point;
    if (c.rot) {
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const cos = Math.cos(-c.rot);
      const sin = Math.sin(-c.rot);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * cos - dy * sin;
      y = cy + dx * sin + dy * cos;
    }
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (hit < 0) return;
  selected = hit;
  syncPanelControls();
  canvas.setPointerCapture(event.pointerId);
  drag = { startX: point.x, startY: point.y, moved: false, before: snapshot() };
  redraw();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const cells = findLayout(state.layout).cells(PREVIEW, PREVIEW);
  const cell = cells[selected];
  const panel = state.panels[selected];
  const dx = point.x - drag.startX;
  const dy = point.y - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox + dx / cell.w));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy + dy / cell.h));
  drag.startX = point.x;
  drag.startY = point.y;
  syncPanelControls();
  redraw();
});

canvas.addEventListener('pointerup', () => {
  if (drag?.moved) {
    past.push(drag.before);
    if (past.length > 60) past.shift();
    future = [];
    syncHistoryButtons();
    setStatus(`Panel ${selected + 1} moved.`);
  }
  drag = null;
});

let wheelTimer = null;
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (selected < 0) return;
  const panel = state.panels[selected];
  const before = panel.zoom;
  beginEdit();
  panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
  if (panel.zoom !== before) {
    syncPanelControls();
    redraw();
  }
  // A flurry of wheel ticks is one undo step once the wheel rests.
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => endEdit(), 400);
}, { passive: false });

window.addEventListener('keydown', (event) => {
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '');
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
    return;
  }
  if (typing || selected < 0) return;
  const step = event.shiftKey ? 0.05 : 0.01;
  const panel = state.panels[selected];
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  beginEdit();
  if (event.key === 'ArrowLeft') panel.ox = Math.max(-0.6, panel.ox - step);
  else if (event.key === 'ArrowRight') panel.ox = Math.min(0.6, panel.ox + step);
  else if (event.key === 'ArrowUp') panel.oy = Math.max(-0.6, panel.oy - step);
  else if (event.key === 'ArrowDown') panel.oy = Math.min(0.6, panel.oy + step);
  syncPanelControls();
  redraw();
});
window.addEventListener('keyup', (event) => {
  // A run of arrow nudges lands as one history entry when the key lifts.
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) endEdit();
});

// --- export ---------------------------------------------------------------

function exportCover(size) {
  const out = renderCover(
    state,
    (panel) => resolveImage(panel, state.panels.indexOf(panel)),
    size.w,
    size.h,
  );
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the browser could not make the PNG.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(state.title || 'vice-coast-cover')}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved ${a.download}.`);
  }, 'image/png');
}

EXPORT_SIZES.forEach((size) => {
  const button = $(`export-${size.id}`);
  if (button) button.addEventListener('click', () => exportCover(size));
});

// --- boot -----------------------------------------------------------------

syncControls();
syncHistoryButtons();
loadSamples().then(() => {
  redraw();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    runShot(shot, params, async ({ photo, caption, layout, grade, lettering }) => {
      state.layout = layout;
      state.grade = grade;
      state.lettering = lettering;
      state.title = caption;
      fitPanelsToLayout();
      state.panels.forEach((panel) => {
        panel.photo = photo;
        panel.custom = false;
        panel.zoom = 1;
        panel.ox = 0;
        panel.oy = 0;
      });
      syncControls();
      redraw();
    });
  } else {
    redraw();
  }
});
