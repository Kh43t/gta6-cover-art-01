// Vice Coast Cover Studio — editor wiring (v3).
// Owns the page state, the controls, undo/redo, drag-to-pan cropping and the
// PNG exports. The cover itself is painted by cover.js; this file only
// decides *what* to paint and *when*. Photos never leave the machine: uploads
// are read with object URLs and samples come from app/samples/.
import { renderCover, panelHit } from './cover.js';
import { EXPORT_SIZES, GRADES, LAYOUTS, SAMPLES, findLayout, findSize, freshState } from './presets.js';
import { stageScene } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

const state = freshState();
// Every photo slot keeps its image plus a key we can restore from history:
// a sample id like "rooftop", or an upload tag like "upload:3".
const photoKeys = [null, null, null, null];
const uploadCache = new Map();
let uploadCount = 0;

let undoStack = [];
let redoStack = [];

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

// Preview resolution: cap the long side so dragging stays snappy; exports
// always render at the full post size.
function previewSize() {
  const size = findSize(state.sizeId);
  const cap = 880;
  const scale = Math.min(1, cap / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function render() {
  const { w, h } = previewSize();
  renderCover(preview, { state, w, h });
  syncPanelReadout();
}

function syncPanelReadout() {
  const layout = findLayout(state.layoutId);
  const count = layout.panels.length;
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${count} · ${layout.name}`;
  const slot = state.slots[state.selected];
  $('zoomRange').value = String(slot.zoom);
  $('zoomValue').textContent = `${slot.zoom.toFixed(2)}×`;
}

// --- history ---------------------------------------------------------------
function snapshot() {
  return JSON.stringify({
    layoutId: state.layoutId,
    gradeId: state.gradeId,
    title: state.title,
    subtitle: state.subtitle,
    seal: state.seal,
    sizeId: state.sizeId,
    grain: state.grain,
    vignette: state.vignette,
    selected: state.selected,
    slots: state.slots,
    photoKeys,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  state.layoutId = s.layoutId;
  state.gradeId = s.gradeId;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.seal = s.seal;
  state.sizeId = s.sizeId;
  state.grain = s.grain;
  state.vignette = s.vignette;
  state.selected = Math.min(s.selected, findLayout(s.layoutId).panels.length - 1);
  state.slots = s.slots;
  s.photoKeys.forEach((key, i) => {
    photoKeys[i] = key;
    state.photos[i] = key ? photoForKey(key) : null;
  });
  syncControlValues();
  render();
}

function photoForKey(key) {
  if (!key) return null;
  if (key.startsWith('upload:')) return uploadCache.get(key) ?? null;
  const sample = SAMPLES.find((s) => s.id === key);
  return sample ? sampleCache.get(sample.id) ?? null : null;
}

const sampleCache = new Map();

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncHistoryButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
  setStatus('Undid that change.');
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
  setStatus('Redid that change.');
}

function syncHistoryButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- photos ------------------------------------------------------------------
async function fillWithSample(id) {
  const sample = SAMPLES.find((s) => s.id === id);
  if (!sample) return;
  pushHistory();
  let img = sampleCache.get(id);
  if (!img) {
    img = await loadImage(sample.file);
    sampleCache.set(id, img);
  }
  state.photos = state.photos.map(() => img);
  for (let i = 0; i < photoKeys.length; i += 1) photoKeys[i] = id;
  render();
  setStatus(`Loaded sample photo “${sample.name}” into every panel.`);
}

async function fillSelectedWithFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  uploadCount += 1;
  const key = `upload:${uploadCount}`;
  uploadCache.set(key, img);
  pushHistory();
  state.photos[state.selected] = img;
  photoKeys[state.selected] = key;
  render();
  setStatus(`“${file.name}” is in panel ${state.selected + 1}. Pick another panel to place it elsewhere.`);
}

function fillEverywhereFromSelected() {
  const img = state.photos[state.selected];
  if (!img) {
    setStatus('Load a photo into the selected panel first.');
    return;
  }
  pushHistory();
  const key = photoKeys[state.selected];
  state.photos = state.photos.map(() => img);
  for (let i = 0; i < photoKeys.length; i += 1) photoKeys[i] = key;
  render();
  setStatus('That photo now fills every panel.');
}

// --- controls ----------------------------------------------------------------
function buildSwatches() {
  const layoutRow = $('layoutRow');
  LAYOUTS.forEach((layout) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch layout-swatch';
    b.dataset.id = layout.id;
    b.title = layout.blurb;
    b.innerHTML = `<span class="mini-grid">${layout.panels
      .map(
        (p) =>
          `<i style="left:${p.rect[0] * 100}%;top:${p.rect[1] * 100}%;width:${p.rect[2] * 100}%;height:${p.rect[3] * 100}%"></i>`,
      )
      .join('')}</span><span>${layout.name}</span>`;
    b.addEventListener('click', () => {
      if (state.layoutId === layout.id) return;
      pushHistory();
      state.layoutId = layout.id;
      state.selected = 0;
      render();
      setStatus(`Layout: ${layout.name}. ${layout.blurb}`);
    });
    layoutRow.appendChild(b);
  });

  const gradeRow = $('gradeRow');
  GRADES.forEach((grade) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch grade-swatch';
    b.dataset.id = grade.id;
    b.title = grade.blurb;
    const stops = grade.stops.map(([t, r, g, bl]) => `rgb(${r},${g},${bl}) ${Math.round(t * 100)}%`).join(', ');
    b.innerHTML = `<span class="mini-grade" style="background:linear-gradient(135deg, ${stops})"></span><span>${grade.name}</span>`;
    b.addEventListener('click', () => {
      if (state.gradeId === grade.id) return;
      pushHistory();
      state.gradeId = grade.id;
      render();
      setStatus(`Grade: ${grade.name}. ${grade.blurb}`);
    });
    gradeRow.appendChild(b);
  });

  const sizeRow = $('sizeRow');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch size-swatch';
    b.dataset.id = size.id;
    b.textContent = size.label;
    b.addEventListener('click', () => {
      if (state.sizeId === size.id) return;
      pushHistory();
      state.sizeId = size.id;
      render();
      setStatus(`Preview size: ${size.label}. Exports use the same size.`);
    });
    sizeRow.appendChild(b);
  });

  const sampleRow = $('sampleRow');
  SAMPLES.forEach((sample) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch sample-swatch';
    b.dataset.id = sample.id;
    b.innerHTML = `<img src="${sample.file}" alt="${sample.name}"><span>${sample.name}</span>`;
    b.addEventListener('click', () => fillWithSample(sample.id));
    sampleRow.appendChild(b);
  });
}

function markActiveSwatches() {
  document.querySelectorAll('#layoutRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === state.layoutId);
  });
  document.querySelectorAll('#gradeRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === state.gradeId);
  });
  document.querySelectorAll('#sizeRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === state.sizeId);
  });
  document.querySelectorAll('#sampleRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === photoKeys[state.selected]);
  });
}

function syncControlValues() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('sealInput').value = state.seal;
  $('grainCheck').checked = state.grain;
  $('vignetteCheck').checked = state.vignette;
  markActiveSwatches();
}

function wireControls() {
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('sealInput').addEventListener('input', (e) => {
    state.seal = e.target.value;
    render();
  });
  $('sealInput').addEventListener('change', pushHistory);
  $('grainCheck').addEventListener('change', (e) => {
    pushHistory();
    state.grain = e.target.checked;
    render();
  });
  $('vignetteCheck').addEventListener('change', (e) => {
    pushHistory();
    state.vignette = e.target.checked;
    render();
  });
  $('photoFile').addEventListener('change', (e) => {
    fillSelectedWithFile(e.target.files[0]);
    e.target.value = '';
  });
  $('fillEverywhere').addEventListener('click', fillEverywhereFromSelected);
  $('zoomRange').addEventListener('input', (e) => {
    state.slots[state.selected].zoom = Number(e.target.value);
    render();
  });
  $('zoomRange').addEventListener('change', pushHistory);
  $('resetCrop').addEventListener('click', () => {
    pushHistory();
    state.slots[state.selected] = { zoom: 1, dx: 0, dy: 0 };
    render();
    setStatus(`Panel ${state.selected + 1} crop reset.`);
  });
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('shuffleBtn').addEventListener('click', () => {
    pushHistory();
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    state.layoutId = pick(LAYOUTS).id;
    state.gradeId = pick(GRADES).id;
    state.selected = 0;
    render();
    setStatus('Shuffled the layout and grade — keep the ones you like.');
  });
  $('exportOne').addEventListener('click', () => exportCover(state.sizeId));
  $('exportAll').addEventListener('click', exportAllSizes);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      redo();
    }
  });
}

// Drag on the preview pans the selected panel; a plain click selects a
// panel; the wheel zooms it. Coordinates are mapped from CSS pixels to the
// preview canvas's own pixels.
function wirePreview() {
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;

  const toCanvas = (e) => {
    const box = preview.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * preview.width,
      y: ((e.clientY - box.top) / box.height) * preview.height,
      rect: box,
    };
  };

  preview.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const hit = panelHit(state.layoutId, preview.width, preview.height, p.x, p.y);
    if (hit < 0) return;
    if (hit !== state.selected) {
      state.selected = hit;
      render();
    }
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const box = preview.getBoundingClientRect();
    const dx = (e.clientX - lastX) / box.width;
    const dy = (e.clientY - lastY) / box.height;
    if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 3) moved = true;
    lastX = e.clientX;
    lastY = e.clientY;
    if (moved) {
      const slot = state.slots[state.selected];
      slot.dx = Math.max(-0.6, Math.min(0.6, slot.dx + dx));
      slot.dy = Math.max(-0.6, Math.min(0.6, slot.dy + dy));
      render();
    }
  });
  preview.addEventListener('pointerup', () => {
    if (dragging && moved) pushHistory();
    dragging = false;
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.slots[state.selected];
    slot.zoom = Math.max(1, Math.min(2.5, slot.zoom - Math.sign(e.deltaY) * 0.08));
    render();
  }, { passive: false });
}

// --- exports -----------------------------------------------------------------
function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportCover(sizeId) {
  const size = findSize(sizeId);
  const off = document.createElement('canvas');
  renderCover(off, { state, w: size.w, h: size.h });
  await downloadCanvas(off, `vice-coast-${size.w}x${size.h}.png`);
  setStatus(`Saved vice-coast-${size.w}x${size.h}.png — share it anywhere.`);
}

async function exportAllSizes() {
  for (const size of EXPORT_SIZES) {
    await exportCover(size.id);
    await new Promise((r) => setTimeout(r, 250));
  }
  setStatus('Saved all three sizes: square, story and wide.');
}

// --- boot ----------------------------------------------------------------------
const stage = {
  setLayout(id) {
    state.layoutId = id;
  },
  setGrade(id) {
    state.gradeId = id;
  },
  setTitle(text) {
    state.title = text;
  },
  setSubtitle(text) {
    state.subtitle = text;
  },
  async loadSample(id) {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    let img = sampleCache.get(id);
    if (!img) {
      img = await loadImage(sample.file);
      sampleCache.set(id, img);
    }
    state.photos = state.photos.map(() => img);
    for (let i = 0; i < photoKeys.length; i += 1) photoKeys[i] = id;
  },
  render() {
    syncControlValues();
    render();
  },
  renderCoverSize(w, h) {
    renderCover(preview, { state, w, h });
  },
};

buildSwatches();
wireControls();
wirePreview();
syncControlValues();
syncHistoryButtons();
render();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  stageScene(shot, query, stage).catch((err) => {
    setStatus(`Scene failed: ${err.message}`);
  });
} else {
  // First paint already shows art: load the rooftop sample so nobody stares
  // at empty panels while deciding what to make.
  fillWithSample('rooftop').catch((err) => setStatus(`Sample failed: ${err.message}`));
}
