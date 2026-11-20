// Vice Coast Cover Studio — fixed scenes for screenshots (v4).
//
// `?shot=cover` shows the exported cover alone, full frame, so the shot
// is the art itself. `?shot=editor` shows the whole studio with a sample
// photo loaded. Both set window.__shotReady once painted, which is the
// signal the screenshot run waits for. The scene never fetches anything
// outside app/: photos come from samples/ through the stage the editor
// hands in, and the size comes from the query, never from the network.
export async function runScene(kind, query, stage) {
  const photo = query.get('photo') ?? 'rooftop';
  const caption = query.get('caption') ?? 'VICE COAST';
  const layout = query.get('layout');
  const grade = query.get('grade');
  const subtitle = query.get('subtitle');

  if (layout) stage.applyLayout(layout);
  if (grade) stage.applyGrade(grade);
  if (subtitle) stage.applySubtitle(subtitle);
  await stage.loadSample(photo);
  stage.applyTitle(caption);
  stage.draw();

  if (kind === 'cover') {
    document.body.classList.add('shot-cover');
    const w = Number(query.get('w') ?? 1080);
    const h = Number(query.get('h') ?? 1080);
    stage.drawAtSize(w, h);
  }
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
