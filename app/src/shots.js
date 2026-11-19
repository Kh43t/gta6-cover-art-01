// Fixed scenes for screenshots: ?shot=editor shows the studio with sample
// photos loaded; ?shot=cover shows one exported cover alone, full frame.
// Query params pick the scene: look, layout, grade, gradeStrength, size,
// title, tagline, kicker, heat, titleScale, lettering, sticker and assign
// (a comma list of photo indexes, one per cell). window.__shotReady is set
// once the scene has painted, so a screenshot tool knows when to shoot.

import { composeCover } from './cover.js';
import { LOOKS, layoutById, sizeById } from './presets.js';

const FALLBACK_ASSIGN = [0, 1, 2, 0, 1, 2, 0, 1, 2];

function readNumber(query, name, fallback, min, max) {
  const raw = query.get(name);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function applyShot(shot, query, editor) {
  const studio = editor.state;
  const look = LOOKS.find((l) => l.id === query.get('look'));
  if (look) {
    studio.layout = look.layout;
    studio.grade = look.grade;
    studio.lettering = look.lettering;
  }
  const layout = query.get('layout');
  if (layout && layoutById(layout).id === layout) studio.layout = layout;
  if (query.get('grade')) studio.grade = query.get('grade');
  if (sizeById(query.get('size') ?? '').id === (query.get('size') ?? '')) studio.size = query.get('size');
  if (query.get('title') !== null) studio.title = query.get('title');
  if (query.get('tagline') !== null) studio.tagline = query.get('tagline');
  if (query.get('kicker') !== null) studio.kicker = query.get('kicker');
  if (query.get('lettering')) studio.lettering = query.get('lettering');
  studio.heat = readNumber(query, 'heat', studio.heat, 1, 5);
  studio.gradeStrength = readNumber(query, 'gradeStrength', studio.gradeStrength, 0, 1);
  studio.titleScale = readNumber(query, 'titleScale', studio.titleScale, 0.6, 1.4);
  if (query.get('sticker') !== null) studio.sticker = query.get('sticker') !== '0';

  const assign = (query.get('assign') ?? '')
    .split(',')
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < editor.photos.length);
  studio.cells.forEach((cell, i) => {
    cell.photo = assign[i] ?? FALLBACK_ASSIGN[i % FALLBACK_ASSIGN.length] % Math.max(1, editor.photos.length);
    if (i === 0) { cell.zoom = 1; cell.ox = 0; cell.oy = 0; }
  });
  studio.selected = 0;

  editor.syncControls();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = sizeById(studio.size);
    const canvas = document.getElementById('preview');
    canvas.width = size.width;
    canvas.height = size.height;
    composeCover(canvas, studio, editor.photos.map((p) => p.img));
  } else {
    editor.drawPreview();
  }

  const status = document.getElementById('status');
  if (status) status.textContent = shot === 'cover' ? 'Cover ready.' : 'Editor ready.';
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
