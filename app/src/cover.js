// Vice Coast Cover Studio — cover renderer.
// Draws the whole cover on a canvas from a plain state object: layout
// cells, per-panel crops, a gradient-map grade, the sunset title band
// (halftone, slatted sun, skyline with palms), lettering, badge ribbon,
// heat stars, grain and vignette. Pure canvas 2D, no network, no fonts
// beyond the system stack. `resolveImage(panel)` turns a panel's photo
// id (or uploaded image) into a drawable image, or null.
import { findGrade, findLayout, findLettering } from './presets.js';

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// A gradient-map lookup table: 256 entries of [r, g, b], one per
// luminance level, interpolated through the grade's colour stops.
export function buildLut(stops) {
  const table = new Uint8Array(256 * 3);
  const pts = stops.map(([t, hex]) => [t, hexRgb(hex)]);
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let a = pts[0];
    let b = pts[pts.length - 1];
    for (let s = 0; s < pts.length - 1; s += 1) {
      if (t >= pts[s][0] && t <= pts[s + 1][0]) {
        a = pts[s];
        b = pts[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    table[i * 3] = Math.round(a[1][0] + (b[1][0] - a[1][0]) * f);
    table[i * 3 + 1] = Math.round(a[1][1] + (b[1][1] - a[1][1]) * f);
    table[i * 3 + 2] = Math.round(a[1][2] + (b[1][2] - a[1][2]) * f);
  }
  return table;
}

// Remap an ImageData's luminance through the table, keeping a little of
// the photo's own colour so faces stay readable. Strength 0.72 keeps the
// grade dominant without flattening everything into a duotone poster.
export function applyGrade(imageData, lut, strength = 0.72) {
  const d = imageData.data;
  const keep = 1 - strength;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const j = lum * 3;
    d[i] = Math.round(d[i] * keep + lut[j] * strength);
    d[i + 1] = Math.round(d[i + 1] * keep + lut[j + 1] * strength);
    d[i + 2] = Math.round(d[i + 2] * keep + lut[j + 2] * strength);
  }
  return imageData;
}

function coverFit(img, cell, panel) {
  const zoom = panel.zoom || 1;
  const scale = Math.max(cell.w / img.naturalWidth, cell.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  return {
    dx: cell.x + (cell.w - dw) / 2 + (panel.ox || 0) * cell.w,
    dy: cell.y + (cell.h - dh) / 2 + (panel.oy || 0) * cell.h,
    dw,
    dh,
  };
}

function placeholder(ctx, cell, label) {
  const g = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.w, cell.y + cell.h);
  g.addColorStop(0, '#3a2b52');
  g.addColorStop(1, '#171226');
  ctx.fillStyle = g;
  ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 ${Math.max(12, cell.h * 0.06)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cell.x + cell.w / 2, cell.y + cell.h / 2);
  ctx.textBaseline = 'alphabetic';
}

// A palm: a leaning trunk and seven drooping fronds.
function drawPalm(ctx, x, y, s, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.3, y - s * 0.95);
  ctx.stroke();
  const topX = x + s * 0.3;
  const topY = y - s * 0.95;
  for (let k = 0; k < 7; k += 1) {
    const a = Math.PI * (0.08 + (k / 6) * 0.84);
    const len = s * (0.42 + (k % 2) * 0.1);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + s * 0.12;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + s * 0.05, ex, ey);
    ctx.stroke();
  }
}

// A city skyline silhouette with a few lit windows, plus palms.
function drawSkyline(ctx, w, bandTop, bandH) {
  const base = bandTop + 2;
  const colour = '#12081f';
  ctx.fillStyle = colour;
  let x = 0;
  let seed = 11;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (x < w) {
    const bw = w * (0.03 + next() * 0.05);
    const bh = bandH * (0.25 + next() * 0.55);
    ctx.fillRect(x, base - bh, bw, bh);
    if (next() > 0.5) {
      ctx.fillRect(x + bw * 0.3, base - bh - bandH * 0.12, bw * 0.18, bandH * 0.12);
    }
    x += bw + w * 0.008;
  }
  // Lit windows: tiny warm dots scattered over the silhouette.
  ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
  for (let i = 0; i < Math.round(w / 18); i += 1) {
    const wx = next() * w;
    const wy = base - next() * bandH * 0.6;
    ctx.fillRect(wx, wy, Math.max(2, w * 0.003), Math.max(2, w * 0.003));
  }
  // Palms punctuate the skyline.
  const palmCount = Math.max(3, Math.round(w / 260));
  for (let i = 0; i < palmCount; i += 1) {
    const px = ((i + 0.5) / palmCount) * w + (next() - 0.5) * 30;
    drawPalm(ctx, px, base + 1, bandH * 0.62, colour);
  }
}

// The low sun: a disc cut by horizontal slats that get thicker toward
// its base, with long rays fanning out behind it.
function drawSun(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(255, 190, 90, 0.5)';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.lineCap = 'round';
  for (let k = -4; k <= 4; k += 1) {
    if (k === 0) continue;
    const a = (k / 4) * 0.5;
    const len = r * 2.1;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * r * 1.25, -Math.cos(a) * r * 1.25);
    ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.55, '#ffb03d');
  g.addColorStop(1, '#ff5e62');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Slats: bands of the sky colour slicing the lower half.
  ctx.fillStyle = 'rgba(24, 8, 32, 0.92)';
  let y = r * 0.08;
  let thick = r * 0.045;
  while (y < r) {
    ctx.fillRect(-r, y, r * 2, thick);
    y += thick + r * 0.11;
    thick *= 1.45;
  }
  ctx.restore();
}

// Halftone dots over the band, small at the top and swelling downward.
function drawHalftone(ctx, w, bandTop, bandH) {
  const step = Math.max(10, w * 0.016);
  ctx.fillStyle = 'rgba(20, 6, 28, 0.35)';
  let row = 0;
  for (let y = bandTop; y < bandTop + bandH; y += step, row += 1) {
    const f = (y - bandTop) / bandH;
    const r = Math.max(0.6, step * 0.22 * f + step * 0.05);
    for (let x = row % 2 === 0 ? 0 : step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStars(ctx, cx, y, size, filled, total = 5) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px system-ui, sans-serif`;
  const gap = size * 1.25;
  const startX = cx - ((total - 1) * gap) / 2;
  for (let i = 0; i < total; i += 1) {
    ctx.fillStyle = i < filled ? '#ffd23d' : 'rgba(255,255,255,0.28)';
    ctx.shadowColor = i < filled ? 'rgba(255, 180, 40, 0.8)' : 'transparent';
    ctx.shadowBlur = i < filled ? size * 0.25 : 0;
    ctx.fillText('★', startX + i * gap, y);
  }
  ctx.restore();
}

function drawBadge(ctx, w, h, text, lettering) {
  if (!text || !text.trim()) return;
  const label = text.trim().toUpperCase();
  ctx.save();
  const bandH = Math.max(26, h * 0.045);
  const pad = bandH * 0.7;
  ctx.font = `800 ${bandH * 0.52}px ${lettering.family}`;
  const tw = ctx.measureText(label).width + pad * 2;
  ctx.translate(0, bandH * 0.9);
  ctx.rotate(-0.06);
  const grad = ctx.createLinearGradient(0, 0, tw, 0);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tw, 0);
  ctx.lineTo(tw - bandH * 0.35, bandH);
  ctx.lineTo(0, bandH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pad, bandH * 0.54);
  ctx.restore();
}

// Deterministic grain: a small noise tile made from a fixed-seed LCG,
// stamped over the cover at low alpha.
let noiseTile = null;
function grainTile(size = 128) {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = seed % 256;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 26;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

export function slugify(title) {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'vice-coast-cover';
}

// Render the whole cover onto ctx (already sized w x h). `state` is the
// studio state; `resolveImage(panel)` returns a drawable image or null.
export function drawCover(ctx, state, resolveImage, w, h) {
  const layout = findLayout(state.layout);
  const grade = findGrade(state.grade);
  const lettering = findLettering(state.lettering);
  const cells = layout.cells(w, h);

  // 1. Panels, drawn to an offscreen canvas so the grade LUT can run
  //    over the photos before any overlay is painted on top.
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  octx.fillStyle = '#0d0a12';
  octx.fillRect(0, 0, w, h);
  cells.forEach((cell, i) => {
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const img = resolveImage(panel);
    octx.save();
    if (cell.rot) {
      octx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
      octx.rotate(cell.rot);
      octx.translate(-cell.w / 2, -cell.h / 2);
    } else {
      octx.translate(cell.x, cell.y);
    }
    const local = { x: 0, y: 0, w: cell.w, h: cell.h };
    octx.beginPath();
    octx.rect(0, 0, cell.w, cell.h);
    octx.clip();
    if (img) {
      const fit = coverFit(img, local, panel);
      octx.drawImage(img, fit.dx, fit.dy, fit.dw, fit.dh);
    } else {
      placeholder(octx, local, 'NO PHOTO');
    }
    octx.restore();
  });
  const lut = buildLut(grade.stops);
  const graded = octx.getImageData(0, 0, w, h);
  applyGrade(graded, lut);
  octx.putImageData(graded, 0, 0);
  ctx.drawImage(off, 0, 0);
  // Polaroid-style white borders on tilted snaps, painted after the
  // grade pass so they stay white instead of taking the grade's tint.
  cells.forEach((cell) => {
    if (!cell.rot) return;
    ctx.save();
    ctx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
    ctx.rotate(cell.rot);
    ctx.strokeStyle = '#f5f0e6';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(-cell.w / 2, -cell.h / 2, cell.w, cell.h);
    ctx.restore();
  });

  // 2. The sunset title band.
  const bandH = Math.round(h * 0.24);
  const bandTop = h - bandH;
  const bandGrad = ctx.createLinearGradient(0, bandTop, 0, h);
  bandGrad.addColorStop(0, 'rgba(58, 16, 74, 0.88)');
  bandGrad.addColorStop(0.45, 'rgba(178, 58, 110, 0.92)');
  bandGrad.addColorStop(1, 'rgba(255, 122, 61, 0.95)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandTop, w, bandH);
  drawHalftone(ctx, w, bandTop, bandH);
  drawSkyline(ctx, w, bandTop, bandH);
  drawSun(ctx, w * 0.8, bandTop + bandH * 0.16, bandH * 0.4);

  // 3. Title, subtitle and heat stars.
  const title = (state.title || '').trim();
  if (title) {
    const text = lettering.upper ? title.toUpperCase() : title;
    let size = Math.round(bandH * 0.44);
    ctx.font = `${lettering.weight} ${size}px ${lettering.family}`;
    try {
      ctx.letterSpacing = `${size * lettering.tracking}px`;
    } catch {
      /* letterSpacing is optional; the fallback is plain text */
    }
    while (ctx.measureText(text).width > w * 0.62 && size > 14) {
      size -= 2;
      ctx.font = `${lettering.weight} ${size}px ${lettering.family}`;
      try {
        ctx.letterSpacing = `${size * lettering.tracking}px`;
      } catch {
        /* ignore */
      }
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = lettering.shadow;
    ctx.shadowBlur = size * 0.22;
    ctx.lineWidth = Math.max(2, size * lettering.strokeWidth);
    ctx.strokeStyle = lettering.stroke;
    ctx.strokeText(text, w * 0.05, bandTop + bandH * 0.52);
    ctx.fillStyle = lettering.fill;
    ctx.fillText(text, w * 0.05, bandTop + bandH * 0.52);
    ctx.shadowBlur = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
  }
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(13, Math.round(bandH * 0.13));
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try {
      ctx.letterSpacing = `${subSize * 0.32}px`;
    } catch {
      /* ignore */
    }
    ctx.fillStyle = 'rgba(255, 244, 230, 0.92)';
    ctx.textAlign = 'left';
    ctx.fillText(subtitle.toUpperCase(), w * 0.05, bandTop + bandH * 0.82);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
  }
  if (state.stars > 0) {
    drawStars(ctx, w * 0.8, bandTop + bandH * 0.78, Math.max(16, bandH * 0.17), state.stars);
  }

  // 4. Badge ribbon, grain, vignette.
  drawBadge(ctx, w, h, state.badge, lettering);
  if (state.grain !== false) {
    const tile = grainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette !== false) {
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,2,14,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}

// Render the cover at any size and hand back the canvas (for exports).
export function renderCover(state, resolveImage, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), state, resolveImage, w, h);
  return canvas;
}
