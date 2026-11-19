// Vice Coast Cover Studio — the editor shell. It owns the state, builds the
// control panels, wires every input to the cover engine, and exports the PNGs.
// Photos stay on the machine: uploads are read with object URLs, never sent.

import { renderCover, panelAt } from './cover.js';
import { GRADES, LAYOUTS, MAX_PANELS, SIZES, TITLE_STYLES, DEFAULT_BADGE, DEFAULT_SUBTITLE, DEFAULT_TITLE } from './presets.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

// --- state -----------------------------------------------------------------

function freshPanels() {
  const spread = [0, 0.35, -0.35, 0.2, -0.2, 0.1, -0.1, 0.3, -0.3];
  return Array.from({ length: MAX_PANELS }, (_, i) => ({
    photo: i % 3,
    zoom: 1,
    ox: spread[i % spread.length],
    oy: 0,
  }));
}

function freshState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    gradeStrength: 0.8,
    size: 'square',
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    titleStyle: 'sunset',
    badge: DEFAULT_BADGE,
    heat: 4,
    grain: true,
    vignette: true,
    panels: freshPanels(),
    selected: 0,
  };
}

let state = freshState();
let photos = [];
let photoSeq = 0;

// --- undo / redo -----------------------------------------------------------

const past = [];
const future = [];
const SNAP_LIMIT = 60;

function snapshot() {
  return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p })) });
}

function pushHistory() {
  past.push(snapshot());
  if (past.length > SNAP_LIMIT) past.shift();
  future.length = 0;
  refreshHistoryButtons();
}

function restore(json) {
  const saved = JSON.parse(json);
  state = { ...freshState(), ...saved, panels: saved.panels };
  syncControls();
  drawPreview();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  refreshHistoryButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  refreshHistoryButtons();
}

function refreshHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}

// --- photos ----------------------------------------------------------------

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(img, name) {
  img.__id = `p${++photoSeq}`;
  photos.push({ img, name });
  buildPhotoStrip();
  drawPreview();
  return photos.length - 1;
}

async function loadSamples() {
  const defs = [
    ['samples/boulevard.jpg', 'Boulevard'],
    ['samples/rooftop.jpg', 'Rooftop'],
    ['samples/pier.jpg', 'Pier'],
  ];
  for (const [url, name] of defs) {
    try {
      const img = await loadImage(url);
      await addPhoto(img, name);
    } catch {
      // A missing sample just leaves its slot empty; the cover still draws.
    }
  }
}

// --- drawing ---------------------------------------------------------------

function drawPreview() {
  const size = SIZES[state.size];
  const scale = Math.min(640 / size.width, 560 / size.height, 1);
  preview.width = Math.round(size.width * scale);
  preview.height = Math.round(size.height * scale);
  renderCover(preview, state, photos.map((p) => p.img));
  markSelectedPanel();
}

function markSelectedPanel() {
  document.querySelectorAll('#photoStrip .thumb').forEach((el, i) => {
    el.classList.toggle('active', state.panels[state.selected] && state.panels[state.selected].photo === i);
  });
  const slot = state.panels[state.selected];
  $('panelLabel').textContent = slot ? `Panel ${state.selected + 1} — ${photos[slot.photo]?.name ?? 'empty'}` : 'No panel';
  $('zoom').value = slot ? slot.zoom : 1;
  $('panX').value = slot ? slot.ox : 0;
  $('panY').value = slot ? slot.oy : 0;
  $('zoomVal').textContent = slot ? `${Math.round(slot.zoom * 100)}%` : '—';
}

// --- controls --------------------------------------------------------------

function buildLayoutBar() {
  const bar = $('layoutBar');
  bar.innerHTML = '';
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = layout.label;
    b.title = layout.blurb;
    b.dataset.layout = id;
    b.addEventListener('click', () => {
      if (state.layout === id) return;
      pushHistory();
      state.layout = id;
      state.selected = 0;
      syncControls();
      drawPreview();
    });
    bar.appendChild(b);
  }
}

function buildGradeBar() {
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
      if (state.grade === id) return;
      pushHistory();
      state.grade = id;
      syncControls();
      drawPreview();
    });
    bar.appendChild(b);
  }
}

function buildSizeBar() {
  const bar = $('sizeBar');
  bar.innerHTML = '';
  for (const [id, size] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = size.label;
    b.dataset.size = id;
    b.addEventListener('click', () => {
      if (state.size === id) return;
      pushHistory();
      state.size = id;
      syncControls();
      drawPreview();
    });
    bar.appendChild(b);
  }
}

function buildTitleStyleBar() {
  const bar = $('titleStyleBar');
  bar.innerHTML = '';
  for (const [id, style] of Object.entries(TITLE_STYLES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = style.label;
    b.dataset.titleStyle = id;
    b.addEventListener('click', () => {
      if (state.titleStyle === id) return;
      pushHistory();
      state.titleStyle = id;
      syncControls();
      drawPreview();
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
      pushHistory();
      state.panels[state.selected].photo = i;
      drawPreview();
    });
    strip.appendChild(d);
  });
}

function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  document.querySelectorAll('[data-title-style]').forEach((b) => b.classList.toggle('on', b.dataset.titleStyle === state.titleStyle));
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('heatInput').value = state.heat;
  $('heatVal').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  $('gradeStrength').value = state.gradeStrength;
  $('gradeVal').textContent = `${Math.round(state.gradeStrength * 100)}%`;
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  markSelectedPanel();
}

// --- export ----------------------------------------------------------------

function slug(text) {
  return (text || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

function exportSize(sizeId) {
  return new Promise((resolve) => {
    const size = SIZES[sizeId];
    const off = document.createElement('canvas');
    off.width = size.width;
    off.height = size.height;
    renderCover(off, state, photos.map((p) => p.img));
    off.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-${slug(state.title)}-${size.width}x${size.height}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(true);
    }, 'image/png');
  });
}

async function exportAll() {
  statusEl.textContent = 'Exporting 3 sizes…';
  for (const id of Object.keys(SIZES)) {
    await exportSize(id);
    await new Promise((r) => setTimeout(r, 350));
  }
  statusEl.textContent = 'Saved 3 PNGs — square, portrait and landscape.';
}

// --- canvas interaction: click to pick a panel, drag to pan, wheel to zoom --

function canvasPoint(e) {
  const rect = preview.getBoundingClientRect();
  return {
    fx: (e.clientX - rect.left) / rect.width,
    fy: (e.clientY - rect.top) / rect.height,
  };
}

let dragging = null;
preview.addEventListener('pointerdown', (e) => {
  const { fx, fy } = canvasPoint(e);
  const slot = panelAt(state, fx, fy);
  if (slot < 0) return;
  state.selected = slot;
  markSelectedPanel();
  dragging = { slot, fx, fy, moved: false };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const { fx, fy } = canvasPoint(e);
  const slot = state.panels[dragging.slot];
  if (!slot) return;
  const dx = fx - dragging.fx;
  const dy = fy - dragging.fy;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) dragging.moved = true;
  slot.ox = Math.max(-1, Math.min(1, slot.ox + dx * 2.4));
  slot.oy = Math.max(-1, Math.min(1, slot.oy + dy * 2.4));
  dragging.fx = fx;
  dragging.fy = fy;
  drawPreview();
});
preview.addEventListener('pointerup', () => {
  if (dragging?.moved) pushHistory();
  dragging = null;
});
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.panels[state.selected];
  if (!slot) return;
  pushHistory();
  slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  drawPreview();
}, { passive: false });

// --- wiring ----------------------------------------------------------------

function wire() {
  buildLayoutBar();
  buildGradeBar();
  buildSizeBar();
  buildTitleStyleBar();

  $('upload').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
    }
    statusEl.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded. Click one to fill the selected panel.`;
    e.target.value = '';
  });

  $('fillAll').addEventListener('click', () => {
    if (!photos.length) return;
    pushHistory();
    const pick = state.panels[state.selected].photo;
    state.panels.forEach((p) => { p.photo = pick; });
    drawPreview();
    statusEl.textContent = 'One photo across every panel — drag each panel to frame a different crop.';
  });

  $('shuffle').addEventListener('click', () => {
    if (!photos.length) return;
    pushHistory();
    state.panels.forEach((p, i) => {
      p.photo = (i * 2 + 1) % photos.length;
      p.ox = ((i * 37) % 100) / 100 - 0.5;
      p.oy = ((i * 53) % 100) / 100 - 0.5;
    });
    drawPreview();
  });

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; drawPreview(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; drawPreview(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; drawPreview(); });
  $('badgeInput').addEventListener('change', pushHistory);
  $('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    $('heatVal').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    drawPreview();
  });
  $('heatInput').addEventListener('change', pushHistory);
  $('gradeStrength').addEventListener('input', (e) => {
    state.gradeStrength = Number(e.target.value);
    $('gradeVal').textContent = `${Math.round(state.gradeStrength * 100)}%`;
    drawPreview();
  });
  $('gradeStrength').addEventListener('change', pushHistory);
  $('grainToggle').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; drawPreview(); });
  $('vignetteToggle').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; drawPreview(); });

  $('zoom').addEventListener('input', (e) => {
    const slot = state.panels[state.selected];
    if (!slot) return;
    slot.zoom = Number(e.target.value);
    $('zoomVal').textContent = `${Math.round(slot.zoom * 100)}%`;
    drawPreview();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('panX').addEventListener('input', (e) => { const s = state.panels[state.selected]; if (s) { s.ox = Number(e.target.value); drawPreview(); } });
  $('panX').addEventListener('change', pushHistory);
  $('panY').addEventListener('input', (e) => { const s = state.panels[state.selected]; if (s) { s.oy = Number(e.target.value); drawPreview(); } });
  $('panY').addEventListener('change', pushHistory);
  $('resetPanel').addEventListener('click', () => {
    const s = state.panels[state.selected];
    if (!s) return;
    pushHistory();
    s.zoom = 1;
    s.ox = 0;
    s.oy = 0;
    drawPreview();
  });

  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('exportOne').addEventListener('click', async () => {
    statusEl.textContent = 'Exporting…';
    await exportSize(state.size);
    statusEl.textContent = `Saved ${SIZES[state.size].label} PNG.`;
  });
  $('exportAll').addEventListener('click', exportAll);
  $('randomize').addEventListener('click', () => {
    pushHistory();
    const layouts = Object.keys(LAYOUTS);
    const grades = Object.keys(GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    state.titleStyle = ['sunset', 'white', 'neon'][Math.floor(Math.random() * 3)];
    syncControls();
    drawPreview();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('exportOne').click(); }
  });
}

// --- boot ------------------------------------------------------------------

wire();
syncControls();
refreshHistoryButtons();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  loadSamples().then(() => {
    runShot(shot, new URLSearchParams(location.search), {
      get state() { return state; },
      setState(next) { state = { ...state, ...next }; },
      get photos() { return photos; },
      drawPreview,
      syncControls,
      pushHistory,
    });
  });
} else {
  loadSamples().then(() => {
    drawPreview();
    statusEl.textContent = 'Three sample photos loaded — or drop in your own. Click a panel, drag to frame it.';
  });
}
