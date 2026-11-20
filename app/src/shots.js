// Vice Coast Cover Studio — fixed scenes for screenshots.
// ?shot=cover shows the cover alone; ?shot=editor shows the whole
// studio. `photo` picks the sample, `caption` the title, and `layout`,
// `grade` and `lettering` pick the look. window.__shotReady is set once
// the scene has painted, so a screenshot tool knows when to shoot.
import { findGrade, findLayout, findLettering, findSample } from './presets.js';

export async function runShot(shot, query, apply) {
  const photo = findSample(query.get('photo') ?? 'pier').id;
  const caption = query.get('caption') ?? 'Vice Coast';
  const layout = findLayout(query.get('layout') ?? 'hero-trio').id;
  const grade = findGrade(query.get('grade') ?? 'vice-sunset').id;
  const lettering = findLettering(query.get('lettering') ?? 'vice-block').id;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await apply({ photo, caption, layout, grade, lettering });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
