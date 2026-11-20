// Vice Coast Cover Studio — cover painter (v4).
//
// One entry point, paintCover, draws a whole cover onto any canvas you
// hand it: frames, the gradient-map grade, the sunset lettering band with
// its retro sun, palms and skyline, then grain and vignette. It never
// touches the DOM outside that canvas, so the editor preview and the PNG
// export run the exact same code path and what you see is what you get.
import { gradeById, layoutById } from './presets.js';

// Frame rectangles in pixels for a layout at a given cover size. The gap
// is carved out of every frame so the white backing shows through as the
// poster's frame lines. Tilted frames keep their unrotated box here; the
// painter turns them around their centre when it draws them.
export function framesFor(layoutId, w, h) {
  const layout = layoutById(layoutId);
  const gap = Math.max(4, Math.round(w * 0.007));
  return layout.frames.map((f) => {
    const [fx, fy, fw, fh] = f.box;
    return {
      x: fx * w + gap / 2,
      y: fy * h + gap / 2,
      w: fw * w - gap,
      h: fh * h - gap,
      tilt: f.tilt ?? 0,
    };
  });
}

// Hit test for the editor: which frame (if any) owns a point on the
// preview. Later frames win, so a polaroid on top of the hero is picked
// before the hero underneath it.
export function frameAtPoint(layoutId, w, h, px, py) {
  const frames = framesFor(layoutId, w, h);
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    const r = frames[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

// A small deterministic generator so the grain is identical on every
// export of the same cover. xorshift32, seeded once per paint.
function seededStream(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// A gradient-map lookup: 256 entries per channel, lerped from the grade's
// stops. Shadows, mids and highlights all land on the grade's hues.
function gradeTable(grade) {
  const table = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
  const stops = grade.stops;
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let s = 0;
    while (s < stops.length - 2 && t > stops[s + 1][0]) s += 1;
    const lo = stops[s];
    const hi = stops[s + 1];
    const f = Math.min(1, Math.max(0, (t - lo[0]) / (hi[0] - lo[0] || 1)));
    for (let c = 0; c < 3; c += 1) {
      table[c][i] = Math.round(lo[c + 1] + (hi[c + 1] - lo[c + 1]) * f);
    }
  }
  return table;
}

function washPhotos(ctx, w, h, grade) {
  const table = gradeTable(grade);
  const snap = ctx.getImageData(0, 0, w, h);
  const d = snap.data;
  const warm = grade.warm ?? 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, table[0][d[i]] * warm);
    d[i + 1] = table[1][d[i + 1]];
    d[i + 2] = table[2][d[i + 2]];
  }
  ctx.putImageData(snap, 0, 0);
  if (grade.wash) {
    ctx.globalAlpha = grade.wash.strength;
    ctx.fillStyle = grade.wash.colour;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

// Cover-fit a photo into a rectangle with a zoom and a pan. A zoom of 1 is
// the plain cover fit; larger zooms crop in, dx/dy slide the crop. Wide
// frames lift the crop a touch by default, because faces usually sit in
// the top third — the user can still drag the photo anywhere.
function fitPhoto(ctx, photo, rect, crop) {
  const zoom = Math.max(1, crop.zoom || 1);
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const lift = rect.w / rect.h > 1.3 ? -0.1 * rect.h : 0;
  const cx = rect.x + rect.w / 2 + (crop.dx || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (crop.dy || 0) * rect.h + lift;
  ctx.drawImage(photo, cx - dw / 2, cy - dh / 2, dw, dh);
}

// One palm silhouette: a curved trunk and five drooping fronds, drawn in a
// single dark colour so it reads against any sunset. `lean` bends the
// trunk; `size` is the palm's height in pixels.
function paintPalm(ctx, baseX, baseY, size, lean, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  const trunkW = Math.max(2, size * 0.035);
  ctx.lineWidth = trunkW;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * size * 0.4, baseY - size * 0.55, baseX + lean * size, baseY - size);
  ctx.stroke();
  const topX = baseX + lean * size;
  const topY = baseY - size;
  for (let k = 0; k < 5; k += 1) {
    const a = -Math.PI * (0.08 + k * 0.19);
    const reach = size * (0.42 + (k % 2) * 0.1);
    const tipX = topX + Math.cos(a) * reach;
    const tipY = topY + Math.sin(a) * reach * 0.55 + size * 0.22;
    ctx.lineWidth = Math.max(1.5, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * reach * 0.5,
      topY - size * 0.06,
      tipX,
      tipY,
    );
    ctx.stroke();
  }
  ctx.restore();
}

// What an empty frame shows: a sunset gradient, two palm silhouettes and a
// nudge to add a photo. The cover stays handsome before any photo loads.
function paintBlank(ctx, rect, label) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#3b115f');
  g.addColorStop(0.55, '#c22a7a');
  g.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  paintPalm(ctx, rect.x + rect.w * 0.16, rect.y + rect.h * 0.96, rect.h * 0.42, 0.35, 'rgba(26,4,48,0.85)');
  paintPalm(ctx, rect.x + rect.w * 0.86, rect.y + rect.h * 0.96, rect.h * 0.34, -0.3, 'rgba(26,4,48,0.8)');
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.max(13, Math.round(rect.w * 0.045))}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h * 0.3);
}

// One tilted snapshot: a white polaroid border, a soft drop shadow and the
// photo turned a few degrees around the frame centre.
function paintSnapshot(ctx, photo, rect, crop, label) {
  const pad = Math.max(6, rect.w * 0.045);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((rect.tilt || 0) * Math.PI) / 180);
  ctx.shadowColor = 'rgba(10,0,30,0.55)';
  ctx.shadowBlur = Math.max(10, rect.w * 0.06);
  ctx.shadowOffsetY = Math.max(5, rect.w * 0.02);
  ctx.fillStyle = '#fff8ef';
  ctx.fillRect(-rect.w / 2 - pad, -rect.h / 2 - pad, rect.w + pad * 2, rect.h + pad * 2 + pad * 2.2);
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.clip();
  if (photo) {
    fitPhoto(ctx, photo, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, crop);
  } else {
    paintBlank(ctx, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, label);
  }
  ctx.restore();
}

// Shrink a headline until it fits the band, then paint it with a dark
// outline, a hard offset shadow and a white face — the poster's shout.
// A hot-pink underline bar anchors it to the band.
function paintHeadline(ctx, text, x, y, maxW, capH) {
  let size = capH;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const applyFont = (s) => {
    ctx.font = `900 ${Math.round(s)}px "Arial Black", "Segoe UI", sans-serif`;
    try {
      ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.02))}px`;
    } catch {
      // letterSpacing is Chromium-only; the fallback is still bold.
    }
  };
  applyFont(size);
  while (size > 16 && ctx.measureText(text).width > maxW) {
    size *= 0.94;
    applyFont(size);
  }
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeStyle = '#1c0533';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(20,0,40,0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = Math.max(2, size * 0.045);
  ctx.shadowOffsetY = Math.max(3, size * 0.06);
  ctx.strokeText(text, x, y);
  ctx.shadowColor = 'transparent';
  ctx.fillText(text, x, y);
  const barH = Math.max(3, size * 0.09);
  const barW = Math.min(ctx.measureText(text).width * 0.62, maxW * 0.62);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(x + Math.max(1, size * 0.02), y + size * 0.16, barW, barH);
  ctx.fillStyle = '#ffc46b';
  ctx.fillRect(x + Math.max(1, size * 0.02), y + size * 0.16, barW * 0.45, barH);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // ignore
  }
  return size;
}

// A five-pointed star at (x, y) with outer radius r.
function paintStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k += 1) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// The sunset lettering band: a vertical dusk gradient with a glowing
// horizon, a retro sun cut into slats, rays fanning out behind the title,
// a low skyline and palm silhouettes at the edges, then the big headline,
// a script subtitle, a star row and the round seal on the right.
function paintBand(ctx, w, h, job) {
  const layout = layoutById(job.state.layout);
  const bandH = Math.round(h * layout.band);
  const top = h - bandH;
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, '#2a0a4a');
  g.addColorStop(0.35, '#a4126e');
  g.addColorStop(0.7, '#ff5e3a');
  g.addColorStop(1, '#ffb347');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, bandH);

  // Glowing horizon line where the sky meets the band's lower glow.
  const horizon = ctx.createLinearGradient(0, top + bandH * 0.55, 0, top + bandH * 0.72);
  horizon.addColorStop(0, 'rgba(255,214,120,0)');
  horizon.addColorStop(0.5, 'rgba(255,214,120,0.5)');
  horizon.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, top + bandH * 0.55, w, bandH * 0.17);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, top, w, Math.max(2, h * 0.004));

  // Retro sun with slats, tucked behind the title's right end. The sun
  // and its rays are clipped to the band, so no ray ever spills onto the
  // photos above it.
  const sunX = w * 0.72;
  const sunY = top + bandH * 0.44;
  const sunR = bandH * 0.27;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, w, bandH);
  ctx.clip();
  ctx.translate(sunX, sunY);
  ctx.fillStyle = 'rgba(255,214,120,0.26)';
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sunR * 3.6, -sunR * 0.13);
    ctx.lineTo(sunR * 3.6, sunR * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const disc = ctx.createRadialGradient(0, 0, sunR * 0.1, 0, 0, sunR);
  disc.addColorStop(0, '#fff3c4');
  disc.addColorStop(0.6, '#ffd76b');
  disc.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Slats: cut the lower half of the disc into gaps. Painted in absolute
  // coordinates with the band's own gradient, so each gap matches the
  // band behind it exactly — and stays opaque on export. Outside the
  // disc the paint lands on the band itself, so it is invisible there.
  ctx.fillStyle = g;
  for (let i = 0; i < 4; i += 1) {
    const gapY = sunY + sunR * (0.08 + i * 0.22);
    ctx.fillRect(sunX - sunR, gapY, sunR * 2, sunR * (0.05 + i * 0.02));
  }

  // Low skyline blocks and palms along the band's bottom edge.
  ctx.fillStyle = 'rgba(42,10,74,0.5)';
  const skyline = [0.1, 0.16, 0.08, 0.2, 0.12, 0.18, 0.09];
  let bx = w * 0.02;
  skyline.forEach((bw, i) => {
    const bwPx = w * bw * 0.5;
    const bhPx = bandH * (0.16 + (i % 3) * 0.07);
    ctx.fillRect(bx, h - bhPx, bwPx, bhPx);
    bx += bwPx + w * 0.012;
  });
  paintPalm(ctx, w * 0.06, h - bandH * 0.02, bandH * 0.5, 0.3, 'rgba(26,4,48,0.75)');
  paintPalm(ctx, w * 0.96, h - bandH * 0.02, bandH * 0.56, -0.32, 'rgba(26,4,48,0.75)');

  const pad = Math.round(w * 0.045);
  const headline = (job.state.title || 'VICE COAST').toUpperCase();
  paintHeadline(
    ctx,
    headline,
    pad,
    top + bandH * 0.5,
    w - pad * 2 - bandH * 0.9,
    bandH * 0.4,
  );

  // Script subtitle in italic serif, gold, under the headline.
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `italic 700 ${Math.max(14, Math.round(bandH * 0.17))}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'left';
  ctx.fillText(job.state.subtitle || '', pad, top + bandH * 0.76);

  // Five-star row under the subtitle, lined up with the headline.
  const starY = top + bandH * 0.88;
  const starR = Math.max(3, bandH * 0.045);
  ctx.fillStyle = '#ffd76b';
  for (let i = 0; i < 5; i += 1) {
    paintStar(ctx, pad + i * starR * 2.6, starY, starR);
  }

  // Round seal on the right: double ring, star, seal text.
  const sealR = bandH * 0.3;
  const sealX = w - pad - sealR;
  const sealY = top + bandH * 0.5;
  ctx.save();
  ctx.strokeStyle = '#ffe9a8';
  ctx.fillStyle = 'rgba(42,10,74,0.55)';
  ctx.lineWidth = Math.max(2, sealR * 0.08);
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, sealR * 0.04);
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `700 ${Math.max(9, Math.round(sealR * 0.3))}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★', sealX, sealY - sealR * 0.08);
  ctx.font = `700 ${Math.max(8, Math.round(sealR * 0.2))}px "Segoe UI", sans-serif`;
  ctx.fillText(job.state.seal || 'EST. 2026', sealX, sealY + sealR * 0.42);
  ctx.restore();
}

function paintSpeckle(ctx, w, h) {
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const snap = tctx.createImageData(140, 140);
  const rnd = seededStream(20261120);
  for (let i = 0; i < snap.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    snap.data[i] = v;
    snap.data[i + 1] = v;
    snap.data[i + 2] = v;
    snap.data[i + 3] = 26;
  }
  tctx.putImageData(snap, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintShade(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.42,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(20,0,40,0)');
  g.addColorStop(1, 'rgba(20,0,40,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Paints a complete cover. `job` is { state, w, h }: state comes from
// presets.makeCoverState (images, crops, layout, grade, title, ...), w/h
// are the export size in pixels. The preview and the export share this
// path, so the live preview is the export.
export function paintCover(canvas, job) {
  const { state, w, h } = job;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);

  // White backing: the gaps between frames read as poster frame lines.
  ctx.fillStyle = '#fff8ef';
  ctx.fillRect(0, 0, w, h);

  const frames = framesFor(state.layout, w, h);
  const labels = ['ADD A PHOTO', 'ADD A PHOTO', 'ADD A PHOTO', 'ADD A PHOTO'];
  frames.forEach((rect, i) => {
    const photo = state.images[i] ?? null;
    const crop = state.crops[i] ?? { zoom: 1, dx: 0, dy: 0 };
    if (rect.tilt) {
      paintSnapshot(ctx, photo, rect, crop, labels[i]);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      if (photo) fitPhoto(ctx, photo, rect, crop);
      else paintBlank(ctx, rect, labels[i]);
      ctx.restore();
    }
  });

  // The hero frame — the cover's protagonist — gets a thin gold inner
  // edge so the eye lands there first, like the central panel of a
  // classic GTA cover.
  if (frames.length > 1 && layout.frames.length > 1) {
    const hero = frames[0];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,196,107,0.85)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(hero.x + 2, hero.y + 2, hero.w - 4, hero.h - 4);
    ctx.restore();
  }

  // Grade the photos, then paint the band over the top so its sunset
  // stays pure and ungraded.
  washPhotos(ctx, w, h, grade);
  paintBand(ctx, w, h, job);
  if (state.vignette) paintShade(ctx, w, h);
  if (state.grain) paintSpeckle(ctx, w, h);

  // Outer poster edge.
  ctx.strokeStyle = 'rgba(255,248,239,0.95)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  return canvas;
}
