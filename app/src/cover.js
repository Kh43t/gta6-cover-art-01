// Vice Coast Cover Studio — the cover engine. It paints a whole cover onto any
// 2D canvas: photo panels (each with its own crop, zoom and grade), inked frames,
// a sunset title band with halftone and skyline, a badge ribbon, heat stars,
// grain and a vignette. Everything is drawn from scratch — no image assets.

import { GRADES, LAYOUTS, TITLE_STYLES } from './presets.js';

const INK = '#14081f';
const PAPER = '#fff6ea';

// --- colour grades ---------------------------------------------------------

// Turns a grade's five stops into a 256-entry lookup table (r, g, b per step).
export function gradeTable(stops) {
  const parsed = stops.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const at = (i / 255) * (parsed.length - 1);
    const low = Math.min(parsed.length - 2, Math.floor(at));
    const mix = at - low;
    for (let c = 0; c < 3; c++) {
      table[i * 3 + c] = Math.round(parsed[low][c] + (parsed[low + 1][c] - parsed[low][c]) * mix);
    }
  }
  return table;
}

const tableCache = new Map();
function tableFor(gradeId) {
  if (!tableCache.has(gradeId)) tableCache.set(gradeId, gradeTable(GRADES[gradeId].stops));
  return tableCache.get(gradeId);
}

// --- photo panels ----------------------------------------------------------

// Draws one photo into a panel-sized offscreen canvas, cover-fit with the
// panel's zoom and pan, then remaps every pixel through the grade table.
// `strength` blends the graded pixels back toward the original photo.
function gradedPanel(photo, pw, ph, gradeId, strength, zoom, ox, oy) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(pw));
  off.height = Math.max(2, Math.round(ph));
  const c = off.getContext('2d');
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  // Frame with an anchor near the top of the photo: faces live in the upper
  // half, and a centred crop of a portrait photo in a wide panel cuts them
  // out entirely. The anchor is clamped so the photo always fills the panel.
  // oy then nudges from that anchor.
  const ax = (pw - dw) / 2;
  const ay = Math.max(ph - dh, Math.min(0, -0.08 * dh));
  c.drawImage(photo, ax + ox * pw * 0.25, ay + oy * ph * 0.25, dw, dh);
  if (strength <= 0) return off;
  const table = tableFor(gradeId);
  const data = c.getImageData(0, 0, off.width, off.height);
  const px = data.data;
  const keep = 1 - strength;
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    const t = lum * 3;
    px[i] = px[i] * keep + table[t] * strength;
    px[i + 1] = px[i + 1] * keep + table[t + 1] * strength;
    px[i + 2] = px[i + 2] * keep + table[t + 2] * strength;
  }
  c.putImageData(data, 0, 0);
  return off;
}

const panelCache = new Map();
function panelArt(photo, key, pw, ph, gradeId, strength, zoom, ox, oy) {
  const cacheKey = `${key}|${Math.round(pw)}x${Math.round(ph)}|${gradeId}|${strength}|${zoom}|${ox}|${oy}`;
  if (!panelCache.has(cacheKey)) {
    if (panelCache.size > 48) panelCache.clear();
    panelCache.set(cacheKey, gradedPanel(photo, pw, ph, gradeId, strength, zoom, ox, oy));
  }
  return panelCache.get(cacheKey);
}

// Paints one panel: the graded photo clipped to its cell, an optional tilt,
// then its frame (inked gutter, polaroid border, or none).
function paintPanel(ctx, panel, art, W, H, gutter) {
  const x = panel.x * W;
  const y = panel.y * H;
  const w = panel.w * W;
  const h = panel.h * H;
  ctx.save();
  if (panel.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    if (panel.frame === 'polaroid') {
      ctx.shadowColor = 'rgba(10, 0, 25, 0.55)';
      ctx.shadowBlur = W * 0.02;
      ctx.shadowOffsetY = W * 0.008;
    }
    ctx.fillStyle = PAPER;
    ctx.fillRect(-gutter * 2, -gutter * 2, w + gutter * 4, h + gutter * 5);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(art, 0, 0, w, h);
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeStyle = INK;
    ctx.strokeRect(0, 0, w, h);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(art, x, y, w, h);
    ctx.restore();
    ctx.save();
    if (panel.frame === 'ink') {
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

// --- title band ------------------------------------------------------------

// A little skyline silhouette for the foot of the title band.
function skyline(ctx, x0, y0, w, h, color) {
  ctx.fillStyle = color;
  let x = x0;
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (x < x0 + w) {
    const bw = w * (0.04 + next() * 0.05);
    const bh = h * (0.25 + next() * 0.75);
    ctx.fillRect(x, y0 + h - bh, bw, bh);
    if (next() > 0.6) ctx.fillRect(x + bw * 0.3, y0 + h - bh - h * 0.12, bw * 0.16, h * 0.12);
    x += bw + w * 0.008;
  }
}

// Halftone dots fading across the top of the band.
function halftone(ctx, x0, y0, w, h, color) {
  ctx.fillStyle = color;
  const step = Math.max(10, w / 64);
  for (let x = x0 + step / 2; x < x0 + w; x += step) {
    for (let y = y0 + step / 2; y < y0 + h; y += step) {
      const r = step * 0.28 * (0.4 + 0.6 * Math.abs(Math.sin((x / w) * Math.PI * 2)));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function fitFont(ctx, text, maxWidth, startPx, family) {
  let size = startPx;
  ctx.font = `900 ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

const TITLE_FAMILY = '"Arial Black", "Archivo Black", Impact, "Helvetica Neue", sans-serif';

// The title band: dusk gradient sky, a low sun, halftone corners, skyline,
// then the big sheared title and its subtitle.
function paintTitleBand(ctx, state, W, H, band) {
  const x = 0;
  const y = band.y * H;
  const w = W;
  const h = band.h * H;
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#2a0a4a');
  sky.addColorStop(0.45, '#c22a72');
  sky.addColorStop(0.8, '#ff7a3d');
  sky.addColorStop(1, '#ffb703');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  const sunX = w * 0.5;
  const sunY = y + h * 0.52;
  const sunR = h * 0.62;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  sun.addColorStop(0.6, 'rgba(255, 170, 80, 0.55)');
  sun.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  halftone(ctx, x, y, w * 0.2, h * 0.5, 'rgba(20, 8, 31, 0.28)');
  halftone(ctx, x + w * 0.8, y, w * 0.2, h * 0.5, 'rgba(20, 8, 31, 0.28)');
  skyline(ctx, x, y + h * 0.62, w, h * 0.38, 'rgba(20, 8, 31, 0.85)');

  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const style = TITLE_STYLES[state.titleStyle] || TITLE_STYLES.sunset;

  if (sub) {
    const subPx = Math.max(12, h * 0.17);
    ctx.font = `italic 800 ${subPx}px ${TITLE_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8ef6ff';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
    ctx.shadowBlur = subPx * 0.5;
    let subText = sub.toUpperCase();
    const maxW = w * 0.9;
    while (ctx.measureText(subText.split('').join(' ')).width > maxW && subPx > 8) {
      ctx.font = `italic 800 ${Math.max(8, subPx - 1)}px ${TITLE_FAMILY}`;
      break;
    }
    ctx.fillText(subText.split('').join(' '), w / 2, y + h * 0.2);
    ctx.shadowBlur = 0;
  }

  if (title) {
    const size = fitFont(ctx, title, w * 0.94, h * 0.58, TITLE_FAMILY);
    ctx.save();
    ctx.translate(w / 2, y + h * 0.88);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = INK;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = size * 0.22;
    ctx.strokeText(title, 0, 0);
    if (style.fill === 'sunset') {
      const fill = ctx.createLinearGradient(0, -size, 0, size * 0.15);
      fill.addColorStop(0, '#fff7d6');
      fill.addColorStop(0.55, '#ffb703');
      fill.addColorStop(1, '#ff5e78');
      ctx.fillStyle = fill;
    } else if (style.fill === 'neon') {
      ctx.fillStyle = '#ff2e88';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
}

// --- badge, stars, grain, vignette -----------------------------------------

function paintBadge(ctx, text, W, H) {
  const label = `★ ${text} ★`;
  const px = Math.max(14, W * 0.022);
  ctx.save();
  ctx.translate(W * 0.03, H * 0.045);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.font = `900 ${px}px ${TITLE_FAMILY}`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.beginPath();
  ctx.rect(-px * 0.7, -px * 0.95, tw + px * 1.4, px * 1.7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, -px * 0.08);
  ctx.restore();
}

function paintStars(ctx, count, W, H) {
  const size = W * 0.028;
  const gap = size * 1.35;
  const total = gap * 5;
  const x0 = W - total - W * 0.025;
  const y0 = H * 0.028;
  // A dark pill behind the stars so they read over any photo.
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

let grainPattern = null;
function grain(ctx, W, H) {
  if (!grainPattern) {
    const noise = document.createElement('canvas');
    noise.width = 140;
    noise.height = 140;
    const n = noise.getContext('2d');
    const img = n.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 28;
    }
    n.putImageData(img, 0, 0);
    grainPattern = ctx.createPattern(noise, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function vignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(16, 0, 28, 0)');
  g.addColorStop(1, 'rgba(16, 0, 28, 0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// --- entry point -----------------------------------------------------------

// Paints the full cover for `state` onto `canvas` (at the canvas's own size).
// `photos` is the array of loaded images; a panel's `photo` is an index into it.
// Missing photos paint as a deep-violet placeholder with the panel's number.
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const gutter = Math.max(3, Math.round(W * 0.006));

  ctx.fillStyle = '#1b0b2e';
  ctx.fillRect(0, 0, W, H);

  if (state.layout === 'tilt') {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#2a0a4a');
    bg.addColorStop(0.5, '#c22a72');
    bg.addColorStop(1, '#ff9a3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H * layout.titleBand.y);
    skyline(ctx, 0, H * 0.62, W, H * 0.22, 'rgba(20, 8, 31, 0.5)');
  }

  layout.panels.forEach((panel, slot) => {
    const slotState = state.panels[slot] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = photos[slotState.photo];
    const pw = Math.max(2, Math.round(panel.w * W));
    const ph = Math.max(2, Math.round(panel.h * H));
    if (!photo) {
      ctx.save();
      ctx.fillStyle = '#3a1654';
      ctx.fillRect(panel.x * W, panel.y * H, pw, ph);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `900 ${Math.round(ph * 0.3)}px ${TITLE_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(slot + 1), panel.x * W + pw / 2, panel.y * H + ph / 2);
      ctx.restore();
      return;
    }
    const art = panelArt(
      photo,
      `${photo.__id}|${slot}`,
      pw,
      ph,
      state.grade,
      state.gradeStrength,
      slotState.zoom,
      slotState.ox,
      slotState.oy,
    );
    paintPanel(ctx, panel, art, W, H, gutter);
    if (panel.titleCell) {
      const cx = (panel.x + panel.w / 2) * W;
      const cy = (panel.y + panel.h / 2) * H;
      ctx.save();
      ctx.fillStyle = '#14081f';
      ctx.fillRect(panel.x * W, panel.y * H, pw, ph);
      ctx.fillStyle = '#8ef6ff';
      ctx.font = `italic 800 ${Math.max(12, pw * 0.09)}px ${TITLE_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((state.badge || 'VICE COAST').toUpperCase(), cx, cy - ph * 0.12);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(12, pw * 0.13)}px ${TITLE_FAMILY}`;
      ctx.fillText('EST. 2026', cx, cy + ph * 0.14);
      ctx.restore();
    }
  });

  if (state.badge) paintBadge(ctx, state.badge, W, H);
  paintStars(ctx, state.heat, W, H);
  paintTitleBand(ctx, state, W, H, layout.titleBand);
  if (state.grain) grain(ctx, W, H);
  if (state.vignette) vignette(ctx, W, H);

  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(0, 0, W, H);
}

// Hit-test: which panel slot (if any) holds the point (fractions of the cover).
export function panelAt(state, fx, fy) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return -1;
}
