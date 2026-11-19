// Vice Coast Cover Studio v2 — the cover engine. It paints a whole cover
// onto any 2D canvas: graded photo cells in inked or snapshot frames, a tall
// sunset title band with sunburst rays, a lit skyline, a starburst seal, a
// kicker ribbon, heat stars, grain and a vignette. Every mark is drawn from
// scratch — no image assets, no Rockstar artwork.
//
// What changed from v1, and why: the board's top covers all give the title
// a quarter of the cover with huge lettering, a sunburst behind it and a
// skyline with lit windows; v1's 16% band clipped its own title at the
// bottom edge. v1's grade at 80% also crushed photos into magenta mush.
// Here the band is 26% tall, the default grade strength is 0.45, the title
// gets a hard pink drop shadow, and a starburst seal + collector sticker
// give the poster its finishing marks.

import { GRADES, LAYOUTS, LETTERING, layoutById } from './presets.js';

const INK = '#14081f';
const PAPER = '#fff6ea';
const TITLE_FACE = '"Arial Black", "Archivo Black", Impact, "Helvetica Neue", sans-serif';

// --- gradient-map grades ---------------------------------------------------

// A grade's stops become a 256-entry lookup table (r, g, b per step).
export function makeLut(stops) {
  const rgb = stops.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const pos = (i / 255) * (rgb.length - 1);
    const lo = Math.min(rgb.length - 2, Math.floor(pos));
    const frac = pos - lo;
    for (let ch = 0; ch < 3; ch++) {
      lut[i * 3 + ch] = Math.round(rgb[lo][ch] + (rgb[lo + 1][ch] - rgb[lo][ch]) * frac);
    }
  }
  return lut;
}

const lutCache = new Map();
function lutFor(gradeId) {
  const id = GRADES[gradeId] ? gradeId : 'sunset';
  if (!lutCache.has(id)) lutCache.set(id, makeLut(GRADES[id].stops));
  return lutCache.get(id);
}

// --- graded photo cells ----------------------------------------------------

// One photo, cover-fit into a cell-sized canvas, remapped through the grade
// table and blended back toward the original photo by `strength`. The crop
// anchors near the top of the photo (faces live in the upper half — a
// centred crop of a portrait photo in a wide cell cuts them out), and the
// drawing overshoots the cell by a pixel so no hairline gap ever shows.
function tintPhoto(photo, cw, ch, gradeId, strength, zoom, ox, oy) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(cw) + 2);
  off.height = Math.max(2, Math.round(ch) + 2);
  const c = off.getContext('2d');
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const scale = Math.max(off.width / iw, off.height / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Face anchor: keep the photo's upper seventh in frame. Clamped so the
  // photo always covers the cell; oy then nudges away from the anchor.
  // 0.18 cut foreheads off in short grid cells, 0.10 hid the rooftop
  // man's face in the trio row; 0.14 keeps both readable.
  const ax = (off.width - dw) / 2;
  const ay = Math.max(off.height - dh, Math.min(0, -0.14 * dh));
  c.drawImage(photo, ax + ox * cw * 0.25 - 1, ay + oy * ch * 0.25 - 1, dw + 2, dh + 2);
  if (strength <= 0) return off;
  const lut = lutFor(gradeId);
  const data = c.getImageData(0, 0, off.width, off.height);
  const px = data.data;
  const keep = 1 - strength;
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    const t = lum * 3;
    px[i] = px[i] * keep + lut[t] * strength;
    px[i + 1] = px[i + 1] * keep + lut[t + 1] * strength;
    px[i + 2] = px[i + 2] * keep + lut[t + 2] * strength;
  }
  c.putImageData(data, 0, 0);
  return off;
}

const artCache = new Map();
function cellArt(photo, key, cw, ch, gradeId, strength, zoom, ox, oy) {
  const cacheKey = `${key}|${Math.round(cw)}x${Math.round(ch)}|${gradeId}|${strength}|${zoom}|${ox}|${oy}`;
  if (!artCache.has(cacheKey)) {
    if (artCache.size > 48) artCache.clear();
    artCache.set(cacheKey, tintPhoto(photo, cw, ch, gradeId, strength, zoom, ox, oy));
  }
  return artCache.get(cacheKey);
}

// Paints one cell: the graded photo, then its frame. Tilted snapshot cells
// get a white border and a soft shadow; straight cells get the inked comic
// gutter; bare cells get nothing.
function drawCell(ctx, cell, art, W, H, gutter) {
  const x = cell.x * W;
  const y = cell.y * H;
  const w = cell.w * W;
  const h = cell.h * H;
  ctx.save();
  if (cell.tilt) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((cell.tilt * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    if (cell.frame === 'snap') {
      ctx.shadowColor = 'rgba(10, 0, 25, 0.55)';
      ctx.shadowBlur = W * 0.02;
      ctx.shadowOffsetY = W * 0.008;
    }
    ctx.fillStyle = PAPER;
    ctx.fillRect(-gutter * 2, -gutter * 2, w + gutter * 4, h + gutter * 5);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(art, -1, -1, w + 2, h + 2);
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeStyle = INK;
    ctx.strokeRect(0, 0, w, h);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(art, x - 1, y - 1, w + 2, h + 2);
    ctx.restore();
    ctx.save();
    if (cell.frame === 'ink') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(x, y, w, gutter);
      ctx.fillRect(x, y + h - gutter, w, gutter);
      ctx.fillRect(x, y, gutter, h);
      ctx.fillRect(x + w - gutter, y, gutter, h);
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeRect(x + gutter / 2, y + gutter / 2, w - gutter, h - gutter);
    }
  }
  ctx.restore();
}

// --- title band art --------------------------------------------------------

// Deterministic pseudo-random stream, so the skyline and grain look the
// same on every paint (and every export).
function seededStream(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Sunburst rays fanning out from a point just below the band, so the title
// sits on light. Alternate wedges are a touch brighter.
function drawSunburst(ctx, cx, cy, radius, colorA, colorB) {
  const rays = 28;
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 1) / rays) * Math.PI * 2;
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
}

// A skyline silhouette along the foot of the band, with a few windows lit
// gold — the detail v1's flat silhouette was missing.
function drawSkyline(ctx, x0, y0, w, h, color) {
  const rnd = seededStream(11);
  ctx.fillStyle = color;
  let x = x0;
  while (x < x0 + w) {
    const bw = w * (0.035 + rnd() * 0.05);
    const bh = h * (0.3 + rnd() * 0.7);
    ctx.fillRect(x, y0 + h - bh, bw, bh);
    if (rnd() > 0.55) ctx.fillRect(x + bw * 0.32, y0 + h - bh - h * 0.14, bw * 0.16, h * 0.14);
    // Lit windows: a couple of gold dots per tower.
    ctx.fillStyle = 'rgba(255, 196, 66, 0.9)';
    const wins = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < wins; k++) {
      ctx.fillRect(x + bw * (0.2 + rnd() * 0.6), y0 + h - bh + h * 0.15 + rnd() * bh * 0.6, Math.max(2, w * 0.004), Math.max(2, h * 0.06));
    }
    ctx.fillStyle = color;
    x += bw + w * 0.008;
  }
  // A palm or two on the horizon, like the board's top covers.
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, w * 0.002);
  for (const px of [x0 + w * 0.06, x0 + w * 0.94]) {
    ctx.beginPath();
    ctx.moveTo(px, y0 + h);
    ctx.lineTo(px, y0 + h * 0.45);
    ctx.stroke();
    for (let f = 0; f < 4; f++) {
      const a = -Math.PI / 2 + (f - 1.5) * 0.5;
      ctx.beginPath();
      ctx.moveTo(px, y0 + h * 0.45);
      ctx.quadraticCurveTo(px + Math.cos(a) * w * 0.02, y0 + h * 0.3, px + Math.cos(a) * w * 0.035, y0 + h * 0.42);
      ctx.stroke();
    }
  }
}

// Halftone dots fading across a corner of the band.
function drawHalftone(ctx, x0, y0, w, h, color) {
  ctx.fillStyle = color;
  const step = Math.max(10, w / 48);
  for (let x = x0 + step / 2; x < x0 + w; x += step) {
    for (let y = y0 + step / 2; y < y0 + h; y += step) {
      const r = step * 0.26 * (0.4 + 0.6 * Math.abs(Math.sin((x / w) * Math.PI * 2)));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Shrinks a font until the text fits, and returns the size that fits.
function shrinkToFit(ctx, text, maxWidth, startPx) {
  let size = startPx;
  ctx.font = `900 ${size}px ${TITLE_FACE}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${TITLE_FACE}`;
  }
  return size;
}

// Tracked-out caps text (letter-spaced by drawing it with thin spaces).
function tracked(text) {
  return text.split('').join(' ');
}

// The title band: dusk gradient sky, sunburst rays, a low sun, halftone
// corners, a lit skyline, then kicker / title / tagline stacked with room
// to breathe — nothing here may touch the band's edges.
function drawTitleBand(ctx, state, W, H, band) {
  const y = band.top * H;
  const w = W;
  const h = band.height * H;
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#2a0a4a');
  sky.addColorStop(0.42, '#c22a72');
  sky.addColorStop(0.78, '#ff7a3d');
  sky.addColorStop(1, '#ffb703');
  ctx.fillStyle = sky;
  ctx.fillRect(0, y, w, h);

  const sunX = w * 0.5;
  const sunY = y + h * 1.02;
  drawSunburst(ctx, sunX, sunY, h * 1.5, 'rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.0)');

  const discR = h * 0.5;
  const discY = y + h * 0.42;
  const disc = ctx.createRadialGradient(sunX, discY, discR * 0.1, sunX, discY, discR);
  disc.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  disc.addColorStop(0.6, 'rgba(255, 170, 80, 0.55)');
  disc.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sunX, discY, discR, 0, Math.PI * 2);
  ctx.fill();

  drawHalftone(ctx, 0, y, w * 0.16, h * 0.42, 'rgba(20, 8, 31, 0.28)');
  drawHalftone(ctx, w * 0.84, y, w * 0.16, h * 0.42, 'rgba(20, 8, 31, 0.28)');
  drawSkyline(ctx, 0, y + h * 0.72, w, h * 0.28, 'rgba(20, 8, 31, 0.85)');

  const kicker = (state.kicker || '').trim().toUpperCase();
  const title = (state.title || '').trim().toUpperCase();
  const tag = (state.tagline || '').trim();
  const look = LETTERING[state.lettering] || LETTERING.sunset;

  if (kicker) {
    const kPx = Math.max(12, h * 0.11);
    ctx.font = `900 ${kPx}px ${TITLE_FACE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(20, 8, 31, 0.9)';
    ctx.shadowBlur = kPx * 0.35;
    ctx.fillText(tracked(`★ ${kicker} ★`), w / 2, y + h * 0.15);
    ctx.shadowBlur = 0;
  }

  if (title) {
    const scale = state.titleScale || 1;
    const size = shrinkToFit(ctx, title, w * 0.92, h * 0.44 * scale);
    ctx.save();
    ctx.translate(w / 2, y + h * 0.62);
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    // Hard pink drop shadow first, then the black comic outline, then fill.
    ctx.font = `900 ${size}px ${TITLE_FACE}`;
    ctx.fillStyle = look.glow;
    ctx.fillText(title, size * 0.045, size * 0.09);
    ctx.lineWidth = size * 0.11;
    ctx.strokeStyle = INK;
    ctx.shadowColor = look.glow;
    ctx.shadowBlur = size * 0.16;
    ctx.strokeText(title, 0, 0);
    if (look.fill === 'sunset') {
      const fill = ctx.createLinearGradient(0, -size, 0, size * 0.15);
      fill.addColorStop(0, '#fff7d6');
      fill.addColorStop(0.55, '#ffb703');
      fill.addColorStop(1, '#ff5e78');
      ctx.fillStyle = fill;
    } else if (look.fill === 'neon') {
      ctx.fillStyle = '#ff2e88';
    } else if (look.fill === 'gold') {
      const fill = ctx.createLinearGradient(0, -size, 0, size * 0.15);
      fill.addColorStop(0, '#fff3b0');
      fill.addColorStop(0.5, '#ffb703');
      fill.addColorStop(1, '#b57708');
      ctx.fillStyle = fill;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }

  if (tag) {
    const tPx = Math.max(11, h * 0.115);
    ctx.font = `italic 800 ${tPx}px ${TITLE_FACE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#bff6ff';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.85)';
    ctx.shadowBlur = tPx * 0.5;
    ctx.fillText(tracked(tag.toUpperCase()), w / 2, y + h * 0.86);
    ctx.shadowBlur = 0;
  }
}

// --- ribbons, seal, sticker, stars -----------------------------------------

// Kicker ribbon, top-left — kept fully inside the frame this time (v1's
// rotated ribbon ran off the left edge and got clipped).
function drawRibbon(ctx, text, W, H) {
  const label = `★ ${text} ★`;
  const px = Math.max(13, W * 0.02);
  ctx.save();
  // Kept low enough that the rotation can never lift the ribbon's left
  // end above the frame (v1's ribbon was clipped at the top edge).
  ctx.translate(W * 0.03, H * 0.06);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.font = `900 ${px}px ${TITLE_FACE}`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.beginPath();
  ctx.rect(0, -px * 0.95, tw + px * 1.4, px * 1.7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px * 0.7, -px * 0.08);
  ctx.restore();
}

// Starburst seal ("EST. 2026") overlapping the band's top edge on the
// right, like the stickers on the board's top covers.
function drawSeal(ctx, W, H, bandTop) {
  const cx = W * 0.9;
  const cy = bandTop * H;
  const r = Math.max(26, W * 0.038);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((8 * Math.PI) / 180);
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffc93d';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(10, r * 0.3)}px ${TITLE_FACE}`;
  ctx.fillText('EST.', 0, -r * 0.22);
  ctx.fillText('2026', 0, r * 0.24);
  ctx.restore();
}

// "Collector's cut" pill tucked at the photo area's bottom-left corner,
// clear of the starburst seal on the right (v2's first paint put the two
// on top of each other).
function drawSticker(ctx, W, H, bandTop) {
  const label = "COLLECTOR'S CUT";
  const px = Math.max(11, W * 0.017);
  ctx.save();
  ctx.translate(W * 0.03, bandTop * H - px * 1.3);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.font = `900 ${px}px ${TITLE_FACE}`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = '#ffe66d';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, W * 0.0025);
  ctx.beginPath();
  ctx.rect(-px * 0.7, -px, tw + px * 1.4, px * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawStars(ctx, count, W, H) {
  const size = W * 0.026;
  const gap = size * 1.35;
  const total = gap * 5;
  const x0 = W - total - W * 0.022;
  const y0 = H * 0.026;
  ctx.fillStyle = 'rgba(20, 8, 31, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x0 - size * 0.35, y0 - size * 0.3, total + size * 0.7, size * 1.6, size * 0.8);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const cx = x0 + gap * i + size / 2;
    const cy = y0 + size / 2;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? size / 2 : size / 5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = i < count ? '#ffc93d' : 'rgba(255, 255, 255, 0.25)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, W * 0.002);
    ctx.fill();
    ctx.stroke();
  }
}

// --- grain + vignette ------------------------------------------------------

let grainTile = null;
function drawGrain(ctx, W, H) {
  if (!grainTile) {
    const noise = document.createElement('canvas');
    noise.width = 140;
    noise.height = 140;
    const n = noise.getContext('2d');
    const img = n.createImageData(140, 140);
    const rnd = seededStream(2026);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 28;
    }
    n.putImageData(img, 0, 0);
    grainTile = ctx.createPattern(noise, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grainTile;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(16, 0, 28, 0)');
  g.addColorStop(1, 'rgba(16, 0, 28, 0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// --- entry point -----------------------------------------------------------

// Paints the full cover for `state` onto `canvas` (at the canvas's own
// size). `photos` is the array of loaded images; a cell's `photo` is an
// index into it. A missing photo paints as a deep-violet placeholder with
// its cell number, so the layout is always visible.
export function composeCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = layoutById(state.layout);
  const gutter = Math.max(3, Math.round(W * 0.006));

  ctx.fillStyle = '#1b0b2e';
  ctx.fillRect(0, 0, W, H);

  if (state.layout === 'tilt') {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#2a0a4a');
    bg.addColorStop(0.5, '#c22a72');
    bg.addColorStop(1, '#ff9a3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H * layout.band.top);
    drawSkyline(ctx, 0, H * 0.58, W, H * 0.16, 'rgba(20, 8, 31, 0.5)');
  }

  layout.cells.forEach((cell, slot) => {
    const slotState = state.cells[slot] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = photos[slotState.photo];
    const cw = Math.max(2, Math.round(cell.w * W));
    const ch = Math.max(2, Math.round(cell.h * H));
    if (cell.titleCell) {
      ctx.save();
      ctx.fillStyle = '#14081f';
      ctx.fillRect(cell.x * W, cell.y * H, cw, ch);
      ctx.fillStyle = '#8ef6ff';
      ctx.font = `italic 800 ${Math.max(12, cw * 0.09)}px ${TITLE_FACE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((state.kicker || 'VICE COAST').toUpperCase(), (cell.x + cell.w / 2) * W, (cell.y + cell.h / 2) * H - ch * 0.12);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(12, cw * 0.13)}px ${TITLE_FACE}`;
      ctx.fillText('EST. 2026', (cell.x + cell.w / 2) * W, (cell.y + cell.h / 2) * H + ch * 0.14);
      ctx.restore();
      return;
    }
    if (!photo) {
      ctx.save();
      ctx.fillStyle = '#3a1654';
      ctx.fillRect(cell.x * W, cell.y * H, cw, ch);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `900 ${Math.round(ch * 0.3)}px ${TITLE_FACE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(slot + 1), cell.x * W + cw / 2, cell.y * H + ch / 2);
      ctx.restore();
      return;
    }
    const art = cellArt(
      photo,
      `${photo.__id}|${slot}`,
      cw,
      ch,
      state.grade,
      state.gradeStrength,
      slotState.zoom,
      slotState.ox,
      slotState.oy,
    );
    drawCell(ctx, cell, art, W, H, gutter);
  });

  if (state.kicker) drawRibbon(ctx, state.kicker, W, H);
  drawStars(ctx, state.heat, W, H);
  if (state.sticker) drawSticker(ctx, W, H, layout.band.top);
  drawTitleBand(ctx, state, W, H, layout.band);
  drawSeal(ctx, W, H, layout.band.top);
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);

  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(0, 0, W, H);
}

// Hit-test: which cell index (if any) holds the point (fractions of cover).
export function cellAt(state, fx, fy) {
  const layout = layoutById(state.layout);
  for (let i = layout.cells.length - 1; i >= 0; i--) {
    const c = layout.cells[i];
    if (fx >= c.x && fx <= c.x + c.w && fy >= c.y && fy <= c.y + c.h) return i;
  }
  return -1;
}
