// Vice Coast Cover Studio v2 — the editor shell. It owns the studio state,
// builds the control rows, wires every input to the cover engine, and
// exports the PNGs. Photos stay on the machine: uploads are read with
// object URLs and never sent anywhere.
//
// Restructured from v1: the state now calls its panels "cells", the words
// are title / tagline / kicker (not title / subtitle / badge), there is a
// one-click Looks row, a title-size slider and a collector-sticker toggle,
// and the history lives in one object instead of two loose stacks.

import { composeCover, cellAt } from './cover.js';
import {
  GRADES, LAYOUTS, LOOKS, MAX_CELLS, EXPORT_SIZES, LETTERING,
  DEFAULT_KICKER, DEFAULT_TAGLINE, DEFAULT_TITLE,
  DEFAULT_GRADE_STRENGTH, DEFAULT_TITLE_SCALE, layoutById, sizeById,
} from './presets.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusLine = $('status');

// --- studio state ----------------------------------------------------------

function initialCells() {
  const drift = [0, 0.35, -0.35, 0.2, -0.2, 0.1, -0.1, 0.3, -0.3];
  return Array.from({ length: MAX_CELLS }, (_, i) => ({
    photo: i % 3,
    zoom: 1,
    ox: drift[i % drift.length],
    oy: 0,
  }));
}

function initialStudio() {
  return {
    layout: 'hero',
    grade: 'sunset',
    gradeStrength: DEFAULT_GRADE_STRENGTH,
    size: 'wide',
    title: DEFAULT_TITLE,
    tagline: DEFAULT_TAGLINE,
    lettering: 'sunset',
    kicker: DEFAULT_KICKER,
    heat: 4,
    titleScale: DEFAULT_TITLE_SCALE,
    grain: true,
    vignette: true,
    sticker: true,
    cells: initialCells(),
    selected: 0,
  };
}

let studio = initialStudio();
let photos = [];
let photoSeq = 0;

// --- undo / redo -----------------------------------------------------------

const history = { undoStack: [], redoStack: [], limit: 60 };

function takeSnapshot() {
  return JSON.stringify({ ...studio, cells: studio.cells.map((c) => ({ ...c })) });
}

function remember() {
  history.undoStack.push(takeSnapshot());
  if (history.undoStack.length > history.limit) history.undoStack.shift();
  history.redoStack.length = 0;
  refreshUndoRedo();
}

function restoreSnapshot(json) {
  const saved = JSON.parse(json);
  studio = { ...initialStudio(), ...saved, cells: saved.cells };
  syncAll();
  paintPreview();
}

function stepBack() {
  if (!history.undoStack.length) return;
  history.redoStack.push(takeSnapshot());
  restoreSnapshot(history.undoStack.pop());
  refreshUndoRedo();
}

function stepForward() {
  if (!history.redoStack.length) return;
  history.undoStack.push(takeSnapshot());
  restoreSnapshot(history.redoStack.pop());
  refreshUndoRedo();
}

function refreshUndoRedo() {
  $('undoBtn').disabled = history.undoStack.length === 0;
  $('redoBtn').disabled = history.redoStack.length === 0;
}

// --- photos ----------------------------------------------------------------

export function readImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function registerPhoto(img, name) {
  img.__id = `p${++photoSeq}`;
  photos.push({ img, name });
  buildPhotoStrip();
  paintPreview();
  return photos.length - 1;
}

async function fetchSamples() {
  const defs = [
    ['samples/boulevard.jpg', 'Boulevard'],
    ['samples/rooftop.jpg', 'Rooftop'],
    ['samples/pier.jpg', 'Pier'],
  ];
  for (const [url, name] of defs) {
    try {
      const img = await readImage(url);
      await registerPhoto(img, name);
    } catch {
      // A missing sample just leaves its slot empty; the cover still draws.
    }
  }
}

// --- painting --------------------------------------------------------------

function paintPreview() {
  const size = sizeById(studio.size);
  const scale = Math.min(640 / size.width, 560 / size.height, 1);
  preview.width = Math.round(size.width * scale);
  preview.height = Math.round(size.height * scale);
  composeCover(preview, studio, photos.map((p) => p.img));
  highlightCell();
}

function highlightCell() {
  document.querySelectorAll('#photoStrip .thumb').forEach((el, i) => {
    el.classList.toggle('active', studio.cells[studio.selected] && studio.cells[studio.selected].photo === i);
  });
  const cell = studio.cells[studio.selected];
  $('cellLabel').textContent = cell ? `Panel ${studio.selected + 1} — ${photos[cell.photo]?.name ?? 'empty'}` : 'No panel';
  $('zoomRange').value = cell ? cell.zoom : 1;
  $('panXRange').value = cell ? cell.ox : 0;
  $('panYRange').value = cell ? cell.oy : 0;
  $('zoomLabel').textContent = cell ? `${Math.round(cell.zoom * 100)}%` : '—';
}

// --- control rows ----------------------------------------------------------

// One generic chip-row builder for layouts, sizes, lettering and looks:
// a click applies the choice (with history) and repaints.
function buildChipRow(barId, entries, isActive, onPick) {
  const bar = $(barId);
  bar.innerHTML = '';
  for (const entry of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = entry.label;
    if (entry.blurb) b.title = entry.blurb;
    b.dataset.choice = entry.id;
    b.addEventListener('click', () => {
      if (isActive(entry)) return;
      remember();
      onPick(entry);
      syncAll();
      paintPreview();
    });
    bar.appendChild(b);
  }
}

function buildGradeSwatches() {
  const bar = $('gradeBar');
  bar.innerHTML = '';
  for (const [id, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.title = grade.label;
    b.dataset.grade = id;
    b.style.background = `linear-gradient(135deg, ${grade.swatch.join(', ')})`;
    b.addEventListener('click', () => {
      if (studio.grade === id) return;
      remember();
      studio.grade = id;
      syncAll();
      paintPreview();
    });
    bar.appendChild(b);
  }
}

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  photos.forEach((photo, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.title = `${photo.name} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const cap = document.createElement('span');
    cap.textContent = photo.name;
    d.append(img, cap);
    d.addEventListener('click', () => {
      remember();
      studio.cells[studio.selected].photo = i;
      paintPreview();
    });
    strip.appendChild(d);
  });
}

function syncAll() {
  const mark = (barId, attr, current) => {
    document.querySelectorAll(`#${barId} [data-choice]`).forEach((b) => {
      b.classList.toggle('on', b.dataset.choice === current);
    });
    document.querySelectorAll(`#${barId} [data-grade]`).forEach((b) => {
      b.classList.toggle('on', b.dataset.grade === current);
    });
  };
  mark('layoutBar', 'layout', studio.layout);
  mark('gradeBar', 'grade', studio.grade);
  mark('sizeBar', 'size', studio.size);
  mark('letteringBar', 'lettering', studio.lettering);
  $('titleText').value = studio.title;
  $('taglineText').value = studio.tagline;
  $('kickerText').value = studio.kicker;
  $('heatRange').value = studio.heat;
  $('heatLabel').textContent = '★'.repeat(studio.heat) + '☆'.repeat(5 - studio.heat);
  $('gradeStrength').value = studio.gradeStrength;
  $('gradeLabel').textContent = `${Math.round(studio.gradeStrength * 100)}%`;
  $('titleScale').value = studio.titleScale;
  $('titleScaleLabel').textContent = `${Math.round(studio.titleScale * 100)}%`;
  $('grainCheck').checked = studio.grain;
  $('vignetteCheck').checked = studio.vignette;
  $('stickerCheck').checked = studio.sticker;
  highlightCell();
}

// --- export ----------------------------------------------------------------

function slug(text) {
  return (text || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

function downloadSize(sizeId) {
  return new Promise((resolve) => {
    const size = sizeById(sizeId);
    const off = document.createElement('canvas');
    off.width = size.width;
    off.height = size.height;
    composeCover(off, studio, photos.map((p) => p.img));
    off.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-${slug(studio.title)}-${size.width}x${size.height}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(true);
    }, 'image/png');
  });
}

async function downloadEverySize() {
  statusLine.textContent = 'Exporting 3 sizes…';
  for (const size of EXPORT_SIZES) {
    await downloadSize(size.id);
    await new Promise((r) => setTimeout(r, 350));
  }
  statusLine.textContent = 'Saved 3 PNGs — square, portrait and landscape.';
}

// --- canvas gestures: click to pick a cell, drag to pan, wheel to zoom -----

function canvasFraction(e) {
  const rect = preview.getBoundingClientRect();
  return {
    fx: (e.clientX - rect.left) / rect.width,
    fy: (e.clientY - rect.top) / rect.height,
  };
}

let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const { fx, fy } = canvasFraction(e);
  const slot = cellAt(studio, fx, fy);
  if (slot < 0) return;
  studio.selected = slot;
  highlightCell();
  drag = { slot, fx, fy, moved: false };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { fx, fy } = canvasFraction(e);
  const cell = studio.cells[drag.slot];
  if (!cell) return;
  const dx = fx - drag.fx;
  const dy = fy - drag.fy;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  cell.ox = Math.max(-1, Math.min(1, cell.ox + dx * 2.4));
  cell.oy = Math.max(-1, Math.min(1, cell.oy + dy * 2.4));
  drag.fx = fx;
  drag.fy = fy;
  paintPreview();
});
preview.addEventListener('pointerup', () => {
  if (drag?.moved) remember();
  drag = null;
});
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const cell = studio.cells[studio.selected];
  if (!cell) return;
  remember();
  cell.zoom = Math.max(1, Math.min(3, cell.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  paintPreview();
}, { passive: false });

// --- wiring ----------------------------------------------------------------

function attachControls() {
  buildChipRow('layoutBar', LAYOUTS, (e) => studio.layout === e.id, (e) => {
    studio.layout = e.id;
    studio.selected = 0;
  });
  buildGradeSwatches();
  buildChipRow('sizeBar', EXPORT_SIZES, (e) => studio.size === e.id, (e) => {
    studio.size = e.id;
  });
  buildChipRow('letteringBar', Object.entries(LETTERING).map(([id, s]) => ({ id, label: s.label })), (e) => studio.lettering === e.id, (e) => {
    studio.lettering = e.id;
  });
  buildChipRow('looksBar', LOOKS, () => false, (look) => {
    studio.layout = look.layout;
    studio.grade = look.grade;
    studio.lettering = look.lettering;
    studio.selected = 0;
  });

  $('upload').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const img = await readImage(URL.createObjectURL(file));
      await registerPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
    }
    statusLine.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded. Click one to fill the selected panel.`;
    e.target.value = '';
  });

  $('fillAll').addEventListener('click', () => {
    if (!photos.length) return;
    remember();
    const pick = studio.cells[studio.selected].photo;
    studio.cells.forEach((c) => { c.photo = pick; });
    paintPreview();
    statusLine.textContent = 'One photo across every panel — drag each panel to frame a different crop.';
  });

  $('shufflePhotos').addEventListener('click', () => {
    if (!photos.length) return;
    remember();
    studio.cells.forEach((c, i) => {
      c.photo = (i * 2 + 1) % photos.length;
      c.ox = ((i * 37) % 100) / 100 - 0.5;
      c.oy = ((i * 53) % 100) / 100 - 0.5;
    });
    paintPreview();
  });

  const liveText = (id, key) => {
    $(id).addEventListener('input', (e) => { studio[key] = e.target.value; paintPreview(); });
    $(id).addEventListener('change', remember);
  };
  liveText('titleText', 'title');
  liveText('taglineText', 'tagline');
  liveText('kickerText', 'kicker');

  $('heatRange').addEventListener('input', (e) => {
    studio.heat = Number(e.target.value);
    $('heatLabel').textContent = '★'.repeat(studio.heat) + '☆'.repeat(5 - studio.heat);
    paintPreview();
  });
  $('heatRange').addEventListener('change', remember);
  $('gradeStrength').addEventListener('input', (e) => {
    studio.gradeStrength = Number(e.target.value);
    $('gradeLabel').textContent = `${Math.round(studio.gradeStrength * 100)}%`;
    paintPreview();
  });
  $('gradeStrength').addEventListener('change', remember);
  $('titleScale').addEventListener('input', (e) => {
    studio.titleScale = Number(e.target.value);
    $('titleScaleLabel').textContent = `${Math.round(studio.titleScale * 100)}%`;
    paintPreview();
  });
  $('titleScale').addEventListener('change', remember);

  const toggle = (id, key) => {
    $(id).addEventListener('change', (e) => { remember(); studio[key] = e.target.checked; paintPreview(); });
  };
  toggle('grainCheck', 'grain');
  toggle('vignetteCheck', 'vignette');
  toggle('stickerCheck', 'sticker');

  const cell = () => studio.cells[studio.selected];
  $('zoomRange').addEventListener('input', (e) => {
    if (!cell()) return;
    cell().zoom = Number(e.target.value);
    $('zoomLabel').textContent = `${Math.round(cell().zoom * 100)}%`;
    paintPreview();
  });
  $('zoomRange').addEventListener('change', remember);
  $('panXRange').addEventListener('input', (e) => { if (cell()) { cell().ox = Number(e.target.value); paintPreview(); } });
  $('panXRange').addEventListener('change', remember);
  $('panYRange').addEventListener('input', (e) => { if (cell()) { cell().oy = Number(e.target.value); paintPreview(); } });
  $('panYRange').addEventListener('change', remember);
  $('resetCell').addEventListener('click', () => {
    if (!cell()) return;
    remember();
    cell().zoom = 1;
    cell().ox = 0;
    cell().oy = 0;
    paintPreview();
  });

  $('undoBtn').addEventListener('click', stepBack);
  $('redoBtn').addEventListener('click', stepForward);
  $('exportOne').addEventListener('click', async () => {
    statusLine.textContent = 'Exporting…';
    await downloadSize(studio.size);
    statusLine.textContent = `Saved ${sizeById(studio.size).label} PNG.`;
  });
  $('exportAll').addEventListener('click', downloadEverySize);
  $('surpriseBtn').addEventListener('click', () => {
    remember();
    studio.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
    const grades = Object.keys(GRADES);
    studio.grade = grades[Math.floor(Math.random() * grades.length)];
    studio.lettering = ['sunset', 'poster', 'neon', 'gold'][Math.floor(Math.random() * 4)];
    syncAll();
    paintPreview();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); stepBack(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); stepForward(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('exportOne').click(); }
  });
}

// --- boot ------------------------------------------------------------------

attachControls();
syncAll();
refreshUndoRedo();

const shot = new URLSearchParams(location.search).get('shot');
const editorBridge = {
  get state() { return studio; },
  setState(next) { studio = { ...studio, ...next }; },
  get photos() { return photos; },
  drawPreview: paintPreview,
  syncControls: syncAll,
  pushHistory: remember,
};
if (shot) {
  fetchSamples().then(() => {
    applyShot(shot, new URLSearchParams(location.search), editorBridge);
  });
} else {
  fetchSamples().then(() => {
    paintPreview();
    statusLine.textContent = 'Three sample photos loaded — or drop in your own. Click a panel, drag to frame it.';
  });
}
