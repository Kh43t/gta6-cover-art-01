// Vice Coast Cover Studio — cover renderer (v3).
// One function, renderCover, paints a whole cover onto any canvas: panels,
// gradient-map grade, sunset title band with sunburst, seal, grain and
// vignette. It never touches the DOM outside the canvas it is handed, so the
// editor preview and the PNG export run the exact same code path.
import { findGrade, findLayout } from './presets.js';

// Panel rectangles in pixels for a layout at a given cover size. The gutter
// is carved out of each panel so the white backing shows through as the
// poster's frame lines. Tilted panels keep their unrotated box here; the
// renderer rotates them around their centre when it paints.
export function layoutRectsPx(layoutId, w, h) {
  const layout = findLayout(layoutId);
  const gutter = Math.max(4, Math.round(w * 0.007));
  return layout.panels.map((p) => {
    const [fx, fy, fw, fh] = p.rect;
    return {
      x: fx * w + gutter / 2,
      y: fy * h + gutter / 2,
      w: fw * w - gutter,
      h: fh * h - gutter,
      tilt: p.tilt ?? 0,
    };
  });
}

// Hit-test for the editor: which panel (if any) owns a point on the preview.
export function panelHit(layoutId, w, h, px, py) {
  const rects = layoutRectsPx(layoutId, w, h);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

// Small deterministic PRNG so the grain looks the same on every export.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A gradient-map lookup table: 256 entries per channel, lerped from the
// grade's stops. Shadows, mids and highlights all land on the grade's hues.
function buildLut(grade) {
  const lut = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
  const stops = grade.stops;
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let s = 0;
    while (s < stops.length - 2 && t > stops[s + 1][0]) s += 1;
    const a = stops[s];
    const b = stops[s + 1];
    const f = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1)));
    for (let c = 0; c < 3; c += 1) {
      lut[c][i] = Math.round(a[c + 1] + (b[c + 1] - a[c + 1]) * f);
    }
  }
  return lut;
}

function applyGrade(ctx, w, h, grade) {
  const lut = buildLut(grade);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const warm = grade.warm ?? 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, lut[0][d[i]] * warm);
    d[i + 1] = lut[1][d[i + 1]];
    d[i + 2] = lut[2][d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
  if (grade.tint) {
    ctx.globalAlpha = grade.tint.alpha;
    ctx.fillStyle = grade.tint.color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

// Cover-fit a photo into a rectangle with a zoom and a pan. `slot.zoom` of 1
// is the plain cover fit; larger zooms crop in, `dx`/`dy` slide the crop.
function drawPhotoInto(ctx, photo, rect, slot) {
  const zoom = Math.max(1, slot.zoom || 1);
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  // Wide panels crop the photo's middle band; faces usually sit in the top
  // third, so a wide crop is lifted a touch by default. The user can still
  // drag the photo anywhere with the pan controls.
  const lift = rect.w / rect.h > 1.3 ? -0.1 * rect.h : 0;
  const cx = rect.x + rect.w / 2 + (slot.dx || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (slot.dy || 0) * rect.h + lift;
  ctx.drawImage(photo, cx - dw / 2, cy - dh / 2, dw, dh);
}

// What an empty panel shows: a sunset gradient, a simple palm silhouette and
// a nudge to add a photo. Keeps the cover handsome before any photo loads.
function drawEmptyPanel(ctx, rect, label) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#3b115f');
  g.addColorStop(0.55, '#c22a7a');
  g.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * 0.5, rect.y + rect.h * 0.62, rect.h * 0.16, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.w * 0.5, rect.y + rect.h * 0.62);
  ctx.lineTo(rect.x + rect.w * 0.5, rect.y + rect.h * 0.94);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.max(13, Math.round(rect.w * 0.045))}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h * 0.34);
}

// One tilted snapshot: a white polaroid border, a soft shadow, the photo
// rotated a few degrees around the panel centre.
function drawTiltedPanel(ctx, photo, rect, slot, label) {
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
    drawPhotoInto(ctx, photo, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, slot);
  } else {
    drawEmptyPanel(ctx, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, label);
  }
  ctx.restore();
}

// Shrink a title until it fits the band, then paint it with a dark outline,
// a hard offset shadow and a white face — the poster's shout.
function paintTitle(ctx, text, x, y, maxW, capH) {
  let size = capH;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => {
    ctx.font = `900 ${Math.round(s)}px "Arial Black", "Segoe UI", sans-serif`;
    try {
      ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.02))}px`;
    } catch {
      // letterSpacing is Chromium-only; the fallback is still bold.
    }
  };
  setFont(size);
  while (size > 16 && ctx.measureText(text).width > maxW) {
    size *= 0.94;
    setFont(size);
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
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // ignore
  }
  return size;
}

// The sunset title band: a vertical dusk gradient, a sun disc with rays
// fanning out behind the title, the big title, a script subtitle, a star row
// and the round seal on the right.
function paintTitleBand(ctx, w, h, job) {
  const layout = findLayout(job.state.layoutId);
  const bandH = Math.round(h * layout.band);
  const top = h - bandH;
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, '#2a0a4a');
  g.addColorStop(0.35, '#a4126e');
  g.addColorStop(0.7, '#ff5e3a');
  g.addColorStop(1, '#ffb347');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, bandH);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, top, w, Math.max(2, h * 0.004));

  // Sun disc + rays, tucked behind the title's right end.
  const sunX = w * 0.74;
  const sunY = top + bandH * 0.46;
  const sunR = bandH * 0.26;
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.fillStyle = 'rgba(255,214,120,0.28)';
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sunR * 3.4, -sunR * 0.16);
    ctx.lineTo(sunR * 3.4, sunR * 0.16);
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

  const pad = Math.round(w * 0.045);
  const title = (job.state.title || 'VICE COAST').toUpperCase();
  const titleSize = paintTitle(
    ctx,
    title,
    pad,
    top + bandH * 0.52,
    w - pad * 2 - bandH * 0.9,
    bandH * 0.42,
  );

  // Script subtitle in italic serif, gold, under the title.
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `italic 700 ${Math.max(14, Math.round(bandH * 0.17))}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'left';
  ctx.fillText(job.state.subtitle || '', pad, top + bandH * 0.78);

  // Five-star row under the subtitle, left aligned with the title.
  const starY = top + bandH * 0.87;
  const starR = Math.max(3, bandH * 0.045);
  ctx.fillStyle = '#ffd76b';
  for (let i = 0; i < 5; i += 1) {
    const sx = pad + i * starR * 2.6;
    ctx.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 === 0 ? starR : starR * 0.45;
      const px = sx + Math.cos(a) * r;
      const py = starY + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
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
  return titleSize;
}

function paintGrain(ctx, w, h) {
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(140, 140);
  const rnd = mulberry32(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 26;
  }
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintVignette(ctx, w, h) {
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
// presets.freshState (photos, slots, layoutId, gradeId, title, ...), w/h are
// the export size in pixels. The preview and the export share this path.
export function renderCover(canvas, job) {
  const { state, w, h } = job;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const layout = findLayout(state.layoutId);
  const grade = findGrade(state.gradeId);

  // White backing: the gutters between panels read as poster frame lines.
  ctx.fillStyle = '#fff8ef';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRectsPx(state.layoutId, w, h);
  const labels = ['ADD A PHOTO', 'ADD A PHOTO', 'ADD A PHOTO', 'ADD A PHOTO'];
  rects.forEach((rect, i) => {
    const photo = state.photos[i] ?? null;
    const slot = state.slots[i] ?? { zoom: 1, dx: 0, dy: 0 };
    if (rect.tilt) {
      drawTiltedPanel(ctx, photo, rect, slot, labels[i]);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      if (photo) drawPhotoInto(ctx, photo, rect, slot);
      else drawEmptyPanel(ctx, rect, labels[i]);
      ctx.restore();
    }
  });

  // Grade the photos, then paint the band over the top so its sunset stays pure.
  applyGrade(ctx, w, h, grade);
  paintTitleBand(ctx, w, h, job);
  if (state.vignette) paintVignette(ctx, w, h);
  if (state.grain) paintGrain(ctx, w, h);

  // Outer poster edge.
  ctx.strokeStyle = 'rgba(255,248,239,0.95)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  return canvas;
}
