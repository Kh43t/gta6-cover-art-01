// Fixed scenes for screenshots: ?shot=editor shows the studio with sample photos
// loaded; ?shot=cover shows one exported cover alone, full frame. Query params
// pick the scene: layout, grade, size, title, subtitle, badge, heat and assign
// (a comma list of photo indexes, one per panel slot). window.__shotReady is
// set once the scene has painted, so a screenshot tool knows when to shoot.

import { renderCover } from './cover.js';
import { LAYOUTS, SIZES } from './presets.js';

const FALLBACK_ASSIGN = [0, 1, 2, 0, 1, 2, 0, 1, 2];

export function runShot(shot, query, editor) {
  const state = editor.state;
  const pick = (name, fallback) => query.get(name) ?? fallback;

  if (LAYOUTS[pick('layout', state.layout)]) state.layout = pick('layout', state.layout);
  if (pick('grade', null)) state.grade = pick('grade', state.grade);
  if (SIZES[pick('size', state.size)]) state.size = pick('size', state.size);
  if (pick('title', null) !== null) state.title = pick('title', state.title);
  if (pick('subtitle', null) !== null) state.subtitle = pick('subtitle', state.subtitle);
  if (pick('badge', null) !== null) state.badge = pick('badge', state.badge);
  if (pick('heat', null) !== null) state.heat = Math.max(1, Math.min(5, Number(pick('heat', state.heat)) || 4));
  if (pick('gradeStrength', null) !== null) state.gradeStrength = Math.max(0, Math.min(1, Number(pick('gradeStrength', state.gradeStrength)) || 0.8));
  if (pick('titleStyle', null) !== null) state.titleStyle = pick('titleStyle', state.titleStyle);

  const assign = (query.get('assign') ?? '')
    .split(',')
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < editor.photos.length);
  state.panels.forEach((slot, i) => {
    slot.photo = assign[i] ?? FALLBACK_ASSIGN[i % FALLBACK_ASSIGN.length] % Math.max(1, editor.photos.length);
    if (i === 0) { slot.zoom = 1; slot.ox = 0; slot.oy = 0; }
  });
  state.selected = 0;

  editor.syncControls();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[state.size];
    const canvas = document.getElementById('preview');
    canvas.width = size.width;
    canvas.height = size.height;
    renderCover(canvas, state, editor.photos.map((p) => p.img));
  } else {
    editor.drawPreview();
  }

  const status = document.getElementById('status');
  if (status) status.textContent = shot === 'cover' ? 'Cover ready.' : 'Editor ready.';
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
