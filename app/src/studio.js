// Vice Coast Cover Studio — editor wiring (v4).
//
// Owns the page state, the pickers, undo/redo, drag-to-pan cropping and
// the PNG exports. The cover itself is painted by cover.js; this file only
// decides *what* to paint and *when*. Photos never leave the machine:
// uploads are read through object URLs and samples come from app/samples/.
import { paintCover, frameAtPoint } from './cover.js';
import {
  GRADE_ORDER,
  GRADE_TABLE,
  LAYOUT_ORDER,
  LAYOUT_TABLE,
  SAMPLE_LIST,
  SIZE_ORDER,
  SIZE_TABLE,
  layoutById,
  makeCoverState,
  sizeById,
} from './presets.js';
import { runScene } from './shots.js';

const el = (id) => document.getElementById(id);
const cv = el('cv');
const noteEl = el('note');

const cover = makeCoverState();
// Every frame keeps its image plus a key history can restore from: a
// sample key like "rooftop", or an upload tag like "upload:3".
const keys = [null, null, null, null];
const uploads = new Map();
const samples = new Map();
let uploadNo = 0;

let past = [];
let future = [];

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

// Preview resolution: cap the long side so dragging stays snappy; exports
// always render at the full post size.
function previewDims() {
  const size = sizeById(cover.size);
  const cap = 880;
  const scale = Math.min(1, cap / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function draw() {
  const { w, h } = previewDims();
  paintCover(cv, { state: cover, w, h });
  refreshReadout();
  markActive();
}

function refreshReadout() {
  const layout = layoutById(cover.layout);
  const count = layout.frames.length;
  el('slotLabel').textContent = `Frame ${cover.picked + 1} of ${count} · ${layout.name}`;
  const crop = cover.crops[cover.picked];
  el('zoomSlider').value = String(crop.zoom);
  el('zoomText').textContent = `${crop.zoom.toFixed(2)}×`;
}

// --- history ---------------------------------------------------------------
function takeSnapshot() {
  return JSON.stringify({
    layout: cover.layout,
    grade: cover.grade,
    title: cover.title,
    subtitle: cover.subtitle,
    seal: cover.seal,
    size: cover.size,
    grain: cover.grain,
    vignette: cover.vignette,
    picked: cover.picked,
    crops: cover.crops,
    keys,
  });
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  cover.layout = s.layout;
  cover.grade = s.grade;
  cover.title = s.title;
  cover.subtitle = s.subtitle;
  cover.seal = s.seal;
  cover.size = s.size;
  cover.grain = s.grain;
  cover.vignette = s.vignette;
  cover.picked = Math.min(s.picked, layoutById(s.layout).frames.length - 1);
  cover.crops = s.crops;
  s.keys.forEach((key, i) => {
    keys[i] = key;
    cover.images[i] = key ? imageForKey(key) : null;
  });
  syncForm();
  draw();
}

function imageForKey(key) {
  if (!key) return null;
  if (key.startsWith('upload:')) return uploads.get(key) ?? null;
  return samples.get(key) ?? null;
}

function remember() {
  past.push(takeSnapshot());
  if (past.length > 60) past.shift();
  future = [];
  syncHistory();
}

function stepBack() {
  if (!past.length) return;
  future.push(takeSnapshot());
  applySnapshot(past.pop());
  syncHistory();
  say('Undid that change.');
}

function stepForward() {
  if (!future.length) return;
  past.push(takeSnapshot());
  applySnapshot(future.pop());
  syncHistory();
  say('Redid that change.');
}

function syncHistory() {
  el('backBtn').disabled = past.length === 0;
  el('fwdBtn').disabled = future.length === 0;
}

function say(text) {
  noteEl.textContent = text;
}

// --- photos ------------------------------------------------------------------
async function useSample(key) {
  const sample = SAMPLE_LIST.find((s) => s.key === key);
  if (!sample) return;
  remember();
  let img = samples.get(key);
  if (!img) {
    img = await fetchImage(sample.file);
    samples.set(key, img);
  }
  cover.images = cover.images.map(() => img);
  for (let i = 0; i < keys.length; i += 1) keys[i] = key;
  draw();
  say(`Loaded sample photo “${sample.name}” into every frame.`);
}

async function placeUpload(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = await fetchImage(url);
  uploadNo += 1;
  const key = `upload:${uploadNo}`;
  uploads.set(key, img);
  remember();
  cover.images[cover.picked] = img;
  keys[cover.picked] = key;
  draw();
  say(`“${file.name}” is in frame ${cover.picked + 1}. Pick another frame to place it elsewhere.`);
}

function spreadSelected() {
  const img = cover.images[cover.picked];
  if (!img) {
    say('Load a photo into the picked frame first.');
    return;
  }
  remember();
  const key = keys[cover.picked];
  cover.images = cover.images.map(() => img);
  for (let i = 0; i < keys.length; i += 1) keys[i] = key;
  draw();
  say('That photo now fills every frame.');
}

// --- pickers -----------------------------------------------------------------
function buildPickers() {
  const layoutRow = el('layoutRow');
  LAYOUT_ORDER.forEach((id) => {
    const layout = LAYOUT_TABLE[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch layout-swatch';
    b.dataset.id = id;
    b.title = layout.note;
    b.innerHTML = `<span class="mini-grid">${layout.frames
      .map(
        (f) =>
          `<i style="left:${f.box[0] * 100}%;top:${f.box[1] * 100}%;width:${f.box[2] * 100}%;height:${f.box[3] * 100}%"></i>`,
      )
      .join('')}</span><span>${layout.name}</span>`;
    b.addEventListener('click', () => {
      if (cover.layout === id) return;
      remember();
      cover.layout = id;
      cover.picked = 0;
      draw();
      say(`Layout: ${layout.name}. ${layout.note}`);
    });
    layoutRow.appendChild(b);
  });

  const gradeRow = el('gradeRow');
  GRADE_ORDER.forEach((id) => {
    const grade = GRADE_TABLE[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch grade-swatch';
    b.dataset.id = id;
    b.title = grade.note;
    const stops = grade.stops.map(([t, r, g, bl]) => `rgb(${r},${g},${bl}) ${Math.round(t * 100)}%`).join(', ');
    b.innerHTML = `<span class="mini-grade" style="background:linear-gradient(135deg, ${stops})"></span><span>${grade.name}</span>`;
    b.addEventListener('click', () => {
      if (cover.grade === id) return;
      remember();
      cover.grade = id;
      draw();
      say(`Grade: ${grade.name}. ${grade.note}`);
    });
    gradeRow.appendChild(b);
  });

  const sizeRow = el('sizeRow');
  SIZE_ORDER.forEach((id) => {
    const size = SIZE_TABLE[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch size-swatch';
    b.dataset.id = id;
    b.textContent = size.label;
    b.addEventListener('click', () => {
      if (cover.size === id) return;
      remember();
      cover.size = id;
      draw();
      say(`Preview size: ${size.label}. Exports use the same size.`);
    });
    sizeRow.appendChild(b);
  });

  const photoRow = el('photoRow');
  SAMPLE_LIST.forEach((sample) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch sample-swatch';
    b.dataset.id = sample.key;
    b.innerHTML = `<img src="${sample.file}" alt="${sample.name}"><span>${sample.name}</span>`;
    b.addEventListener('click', () => useSample(sample.key));
    photoRow.appendChild(b);
  });
}

function markActive() {
  document.querySelectorAll('#layoutRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === cover.layout);
  });
  document.querySelectorAll('#gradeRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === cover.grade);
  });
  document.querySelectorAll('#sizeRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === cover.size);
  });
  document.querySelectorAll('#photoRow .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === keys[cover.picked]);
  });
}

function syncForm() {
  el('titleField').value = cover.title;
  el('subField').value = cover.subtitle;
  el('sealField').value = cover.seal;
  el('grainToggle').checked = cover.grain;
  el('shadeToggle').checked = cover.vignette;
  markActive();
}

function bindForm() {
  el('titleField').addEventListener('input', (e) => {
    cover.title = e.target.value;
    draw();
  });
  el('titleField').addEventListener('change', remember);
  el('subField').addEventListener('input', (e) => {
    cover.subtitle = e.target.value;
    draw();
  });
  el('subField').addEventListener('change', remember);
  el('sealField').addEventListener('input', (e) => {
    cover.seal = e.target.value;
    draw();
  });
  el('sealField').addEventListener('change', remember);
  el('grainToggle').addEventListener('change', (e) => {
    remember();
    cover.grain = e.target.checked;
    draw();
  });
  el('shadeToggle').addEventListener('change', (e) => {
    remember();
    cover.vignette = e.target.checked;
    draw();
  });
  el('uploadInput').addEventListener('change', (e) => {
    placeUpload(e.target.files[0]);
    e.target.value = '';
  });
  el('spreadBtn').addEventListener('click', spreadSelected);
  el('zoomSlider').addEventListener('input', (e) => {
    cover.crops[cover.picked].zoom = Number(e.target.value);
    draw();
  });
  el('zoomSlider').addEventListener('change', remember);
  el('cropReset').addEventListener('click', () => {
    remember();
    cover.crops[cover.picked] = { zoom: 1, dx: 0, dy: 0 };
    draw();
    say(`Frame ${cover.picked + 1} crop reset.`);
  });
  el('backBtn').addEventListener('click', stepBack);
  el('fwdBtn').addEventListener('click', stepForward);
  el('diceBtn').addEventListener('click', () => {
    remember();
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    cover.layout = pick(LAYOUT_ORDER);
    cover.grade = pick(GRADE_ORDER);
    cover.picked = 0;
    draw();
    say('Shuffled the layout and grade — keep the ones you like.');
  });
  el('saveOneBtn').addEventListener('click', () => saveSize(cover.size));
  el('saveAllBtn').addEventListener('click', saveAll);
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      stepBack();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      stepForward();
    } else if (e.key.startsWith('Arrow')) {
      // Arrow keys nudge the picked frame's photo; hold Shift for a
      // bigger nudge. A plain click still picks the frame first.
      e.preventDefault();
      const step = e.shiftKey ? 0.06 : 0.02;
      const crop = cover.crops[cover.picked];
      if (e.key === 'ArrowLeft') crop.dx -= step;
      if (e.key === 'ArrowRight') crop.dx += step;
      if (e.key === 'ArrowUp') crop.dy -= step;
      if (e.key === 'ArrowDown') crop.dy += step;
      crop.dx = Math.max(-0.6, Math.min(0.6, crop.dx));
      crop.dy = Math.max(-0.6, Math.min(0.6, crop.dy));
      draw();
    }
  });
}

// Drag on the preview pans the picked frame; a plain click picks a frame;
// the wheel zooms it. Coordinates are mapped from CSS pixels to the
// preview canvas's own pixels.
function bindStage() {
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;

  const toCanvas = (e) => {
    const box = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * cv.width,
      y: ((e.clientY - box.top) / box.height) * cv.height,
    };
  };

  cv.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const hit = frameAtPoint(cover.layout, cv.width, cv.height, p.x, p.y);
    if (hit < 0) return;
    if (hit !== cover.picked) {
      cover.picked = hit;
      draw();
    }
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const box = cv.getBoundingClientRect();
    const dx = (e.clientX - lastX) / box.width;
    const dy = (e.clientY - lastY) / box.height;
    if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 3) moved = true;
    lastX = e.clientX;
    lastY = e.clientY;
    if (moved) {
      const crop = cover.crops[cover.picked];
      crop.dx = Math.max(-0.6, Math.min(0.6, crop.dx + dx));
      crop.dy = Math.max(-0.6, Math.min(0.6, crop.dy + dy));
      draw();
    }
  });
  cv.addEventListener('pointerup', () => {
    if (dragging && moved) remember();
    dragging = false;
  });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const crop = cover.crops[cover.picked];
    crop.zoom = Math.max(1, Math.min(2.5, crop.zoom - Math.sign(e.deltaY) * 0.08));
    draw();
  }, { passive: false });
}

// --- exports -----------------------------------------------------------------
function fileSlug() {
  const slug = (cover.title || 'vice-coast')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'vice-coast';
}

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

async function saveSize(sizeId) {
  const size = sizeById(sizeId);
  const off = document.createElement('canvas');
  paintCover(off, { state: cover, w: size.w, h: size.h });
  await downloadCanvas(off, `${fileSlug()}-${size.w}x${size.h}.png`);
  say(`Saved ${fileSlug()}-${size.w}x${size.h}.png — share it anywhere.`);
}

async function saveAll() {
  for (const id of SIZE_ORDER) {
    await saveSize(id);
    await new Promise((r) => setTimeout(r, 250));
  }
  say('Saved all three sizes: square, story and wide.');
}

// --- boot ----------------------------------------------------------------------
const stage = {
  applyLayout(id) {
    cover.layout = id;
  },
  applyGrade(id) {
    cover.grade = id;
  },
  applyTitle(text) {
    cover.title = text;
  },
  applySubtitle(text) {
    cover.subtitle = text;
  },
  async loadSample(key) {
    const sample = SAMPLE_LIST.find((s) => s.key === key);
    if (!sample) return;
    let img = samples.get(key);
    if (!img) {
      img = await fetchImage(sample.file);
      samples.set(key, img);
    }
    cover.images = cover.images.map(() => img);
    for (let i = 0; i < keys.length; i += 1) keys[i] = key;
  },
  draw() {
    syncForm();
    draw();
  },
  drawAtSize(w, h) {
    paintCover(cv, { state: cover, w, h });
  },
};

buildPickers();
bindForm();
bindStage();
syncForm();
syncHistory();
draw();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runScene(shot, query, stage).catch((err) => {
    say(`Scene failed: ${err.message}`);
  });
} else {
  // The first paint already shows art: load the rooftop sample so nobody
  // stares at empty frames while deciding what to make.
  useSample('rooftop').catch((err) => say(`Sample failed: ${err.message}`));
}
