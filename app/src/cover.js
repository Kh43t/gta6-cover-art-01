// Vice Coast Cover Studio — canvas renderer (v7).
// Draws a whole cover: graded photo panels, then a hand-drawn sunset
// title band (sky, slatted sun, rays, halftone, skyline, palms), then
// lettering, ribbon, heat stars, grain and vignette. No images are used
// for the band — every pixel of it is painted here.

import { PHOTO_ZONE, findGrade, findLayout, findLettering } from "./presets.js";

// --- small utilities -------------------------------------------------------

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbCss([r, g, b], a = 1) {
  return a === 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

// Deterministic pseudo-random stream, so the skyline looks the same
// on every render and every export size.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Colour off a grade's ramp at position t (0..1), as [r, g, b].
function rampAt(grade, t) {
  const stops = grade.stops;
  if (t <= stops[0][0]) return hexRgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      const f = (t - p0) / (p1 - p0 || 1);
      const a = hexRgb(c0);
      const b = hexRgb(c1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return hexRgb(stops[stops.length - 1][1]);
}

// A 256-entry gradient-map LUT for one grade: [r,g,b] per luminance level.
function buildLut(grade) {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) lut[i] = rampAt(grade, i / 255);
  return lut;
}

// --- geometry --------------------------------------------------------------

// Pixel rects of the layout's frames for a W x H cover. The photo zone
// is the top PHOTO_ZONE of the cover; the rest is the title band.
export function frameRects(state, W, H) {
  const photoH = H * PHOTO_ZONE;
  return findLayout(state.layout).frames.map((f) => ({
    x: f.x * W,
    y: f.y * photoH,
    w: f.w * W,
    h: f.h * photoH,
    tilt: f.tilt || 0,
    mat: !!f.mat,
  }));
}

function bandTop(H) {
  return H * PHOTO_ZONE;
}

// --- photo panels ----------------------------------------------------------

// Cover-fit with a top anchor: the photo's top edge sits on the frame's
// top edge when offsets are zero, so faces stay in frame in tall panels.
function coverDraw(img, fw, fh, zoom, ox, oy) {
  const base = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
  const s = base * Math.max(1, zoom);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  const slackX = Math.max(0, (dw - fw) / 2);
  const slackY = Math.max(0, (dh - fh) / 2);
  return { dx: (fw - dw) / 2 + ox * slackX, dy: oy * slackY, dw, dh };
}

// Paint one photo, graded, into its frame. Grading happens on a small
// offscreen canvas so the main canvas only ever receives finished pixels.
function paintPanel(ctx, img, rect, panel, lut, keep) {
  const w = Math.max(2, Math.round(rect.w));
  const h = Math.max(2, Math.round(rect.h));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d", { willReadFrequently: true });
  const d = coverDraw(img, w, h, panel.zoom, panel.ox, panel.oy);
  octx.drawImage(img, d.dx, d.dy, d.dw, d.dh);
  const data = octx.getImageData(0, 0, w, h);
  const px = data.data;
  const keepInv = 1 - keep;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) | 0;
    const c = lut[lum];
    px[i] = c[0] * keepInv + px[i] * keep;
    px[i + 1] = c[1] * keepInv + px[i + 1] * keep;
    px[i + 2] = c[2] * keepInv + px[i + 2] * keep;
  }
  octx.putImageData(data, 0, 0);

  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.tilt) ctx.rotate((rect.tilt * Math.PI) / 180);
  if (rect.mat) {
    const m = Math.max(6, rect.w * 0.02);
    ctx.fillStyle = "#fdfbf7";
    ctx.fillRect(-rect.w / 2 - m, -rect.h / 2 - m, rect.w + m * 2, rect.h + m * 3);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-rect.w / 2 - m, rect.h / 2 + m * 2, rect.w + m * 2, m);
  }
  ctx.drawImage(off, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
  if (!rect.mat) {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = Math.max(1, rect.w * 0.004);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  }
  ctx.restore();
}

function paintEmptyPanel(ctx, rect) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.tilt) ctx.rotate((rect.tilt * Math.PI) / 180);
  ctx.fillStyle = "#2a1030";
  ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeRect(-rect.w / 2 + 4, -rect.h / 2 + 4, rect.w - 8, rect.h - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 ${Math.max(13, rect.w * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TAP A PHOTO", 0, 0);
  ctx.restore();
}

// --- sunset title band -----------------------------------------------------

function paintSky(ctx, grade, W, H) {
  const top = bandTop(H);
  const bandH = H - top;
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, rgbCss(rampAt(grade, 0.12)));
  g.addColorStop(0.45, rgbCss(rampAt(grade, 0.45)));
  g.addColorStop(0.8, rgbCss(rampAt(grade, 0.78)));
  g.addColorStop(1, rgbCss(rampAt(grade, 0.95)));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, bandH);
  return { top, bandH };
}

function paintSun(ctx, W, H, top, bandH) {
  const cx = W * 0.5;
  const cy = top + bandH * 0.56;
  const r = bandH * 0.38;
  // Rays fan out above the sun.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(255, 215, 110, 0.28)";
  for (let i = -4; i <= 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 11;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.02) * r * 3.4, Math.sin(a - 0.02) * r * 3.4);
    ctx.lineTo(Math.cos(a + 0.02) * r * 3.4, Math.sin(a + 0.02) * r * 3.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Disc.
  const disc = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
  disc.addColorStop(0, "#fff7ae");
  disc.addColorStop(0.55, "#ff9a3d");
  disc.addColorStop(1, "#ff2d78");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = disc;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: sky-coloured bars cut across the lower half, thicker as they drop.
  ctx.fillStyle = rgbCss(rampAt(findGrade("vice-sunset"), 0.45));
  let y = cy + r * 0.02;
  let thick = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.11;
    thick *= 1.45;
  }
  ctx.restore();
  return { cx, cy, r };
}

function paintHalftone(ctx, W, H, top, bandH, sun) {
  const step = Math.max(9, W / 96);
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  for (let y = top + step; y < H - bandH * 0.28; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const dx = x - sun.cx;
      const dy = y - sun.cy;
      if (dx * dx + dy * dy < sun.r * sun.r * 1.15) continue;
      const depth = (y - top) / bandH;
      const rad = 0.8 + depth * 2.4;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintSkyline(ctx, W, H, top, bandH) {
  const rng = mulberry32(20261120);
  const base = H;
  const sil = "#150822";
  let x = -W * 0.01;
  while (x < W) {
    const bw = W * (0.035 + rng() * 0.05);
    const bh = bandH * (0.22 + rng() * 0.42);
    const bx = x;
    const by = base - bh;
    ctx.fillStyle = sil;
    ctx.fillRect(bx, by, bw, bh);
    if (rng() > 0.5) {
      ctx.fillRect(bx + bw * 0.25, by - bandH * 0.06, bw * 0.3, bandH * 0.06);
    }
    // Lit windows.
    ctx.fillStyle = "rgba(255, 215, 110, 0.85)";
    const cols = Math.max(1, Math.floor(bw / (W * 0.016)));
    const rows = Math.max(1, Math.floor(bh / (bandH * 0.09)));
    for (let c = 0; c < cols; c++) {
      for (let r2 = 0; r2 < rows; r2++) {
        if (rng() > 0.55) {
          ctx.fillRect(bx + 4 + c * (W * 0.016), by + 6 + r2 * (bandH * 0.09), 3, 4);
        }
      }
    }
    x += bw + W * 0.004;
  }
}

function paintPalm(ctx, x, baseY, h, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.strokeStyle = "#12041f";
  ctx.fillStyle = "#12041f";
  ctx.lineWidth = Math.max(3, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(h * 0.06, -h * 0.55, h * 0.02, -h);
  ctx.stroke();
  const topX = h * 0.02;
  const topY = -h;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + (i * 0.84) / 6);
    const len = h * (0.42 + (i % 2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6,
      topY + Math.sin(a) * len * 0.5 - h * 0.1,
      topX + Math.cos(a) * len,
      topY + Math.sin(a) * len + h * 0.16,
    );
    ctx.lineWidth = Math.max(2, h * 0.022);
    ctx.stroke();
  }
  ctx.restore();
}

function paintBand(ctx, grade, W, H) {
  const { top, bandH } = paintSky(ctx, grade, W, H);
  const sun = paintSun(ctx, W, H, top, bandH);
  paintHalftone(ctx, W, H, top, bandH, sun);
  paintSkyline(ctx, W, H, top, bandH);
  paintPalm(ctx, W * 0.055, H + 2, bandH * 0.82, 0.1);
  paintPalm(ctx, W * 0.945, H + 2, bandH * 0.62, -0.12);
}

// --- lettering, ribbon, stars ----------------------------------------------

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function paintTitle(ctx, state, W, H) {
  const top = bandTop(H);
  const bandH = H - top;
  const face = findLettering(state.lettering);
  const title = (state.title || "VICE COAST").toUpperCase().slice(0, 30);
  let size = bandH * 0.4;
  const setFont = (s) =>
    `${face.italic ? "italic " : ""}${face.weight} ${s}px ${face.family}`;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (typeof ctx.letterSpacing !== "undefined") ctx.letterSpacing = "2px";
  ctx.font = setFont(size);
  while (ctx.measureText(title).width > W * 0.92 && size > 12) {
    size -= 2;
    ctx.font = setFont(size);
  }
  const ty = top + bandH * 0.42;
  ctx.translate(W / 2, ty);
  if (face.squeeze !== 1) ctx.scale(face.squeeze, 1);
  if (face.glow) {
    ctx.shadowColor = face.glow;
    ctx.shadowBlur = size * 0.35;
  }
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(20,4,24,0.9)";
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = face.fill;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Subtitle under the title.
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (typeof ctx.letterSpacing !== "undefined") ctx.letterSpacing = "5px";
  ctx.font = `700 ${Math.max(11, bandH * 0.085)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6;
  ctx.fillText((state.subtitle || "").toUpperCase(), W / 2, top + bandH * 0.78);
  ctx.restore();
}

function paintRibbon(ctx, state, W, H) {
  const text = (state.ribbon || "").trim();
  if (!text) return;
  const u = W / 1080; // scale unit
  ctx.save();
  ctx.translate(W * 0.02, H * 0.055);
  ctx.rotate(-0.1);
  const pad = 26 * u;
  ctx.font = `800 ${Math.max(13, 24 * u)}px system-ui, sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const rw = tw + pad * 2;
  const rh = 40 * u;
  ctx.fillStyle = "#7c0a2e";
  ctx.beginPath();
  ctx.moveTo(-14 * u, rh * 0.25);
  ctx.lineTo(0, 0);
  ctx.lineTo(0, rh);
  ctx.lineTo(-14 * u, rh * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff2d78";
  ctx.fillRect(0, 0, rw, rh);
  ctx.fillStyle = "#ffd76e";
  ctx.fillRect(0, rh - 4 * u, rw, 4 * u);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), pad, rh / 2 + 1);
  ctx.restore();
}

function paintStars(ctx, state, W, H) {
  const top = bandTop(H);
  const bandH = H - top;
  const r = bandH * 0.075;
  const gap = r * 2.5;
  const total = gap * 4;
  const x0 = W - total - W * 0.035;
  const cy = top + bandH * 0.14;
  for (let i = 0; i < 5; i++) {
    const cx = x0 + i * gap;
    starPath(ctx, cx, cy, r);
    if (i < state.stars) {
      ctx.fillStyle = "#ffd76e";
      ctx.fill();
      ctx.strokeStyle = "rgba(20,4,24,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

// --- finish ----------------------------------------------------------------

function paintGrain(ctx, W, H) {
  const rng = mulberry32(77);
  ctx.save();
  for (let i = 0; i < 2600; i++) {
    const v = rng();
    ctx.fillStyle = v > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rng() * W, rng() * H, 1.4, 1.4);
  }
  ctx.restore();
}

function paintVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H * 0.42, Math.min(W, H) * 0.42,
    W / 2, H * 0.5, Math.max(W, H) * 0.78,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// --- main entry ------------------------------------------------------------

// Render a full cover onto `canvas` (sized by the caller). `photos` maps
// shot id -> HTMLImageElement. Panels whose photo has not loaded yet are
// drawn as empty placeholders and the caller re-renders on load.
export function renderCover(canvas, state, photos) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  const grade = findGrade(state.grade);
  const lut = buildLut(grade);
  ctx.fillStyle = "#14060f";
  ctx.fillRect(0, 0, W, H);
  const rects = frameRects(state, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { shot: null, zoom: 1, ox: 0, oy: 0 };
    const img = panel.shot ? photos.get(panel.shot) : null;
    if (img && img.complete && img.naturalWidth > 0) {
      paintPanel(ctx, img, rect, panel, lut, grade.keep);
    } else {
      paintEmptyPanel(ctx, rect);
    }
  });
  paintBand(ctx, grade, W, H);
  paintTitle(ctx, state, W, H);
  paintRibbon(ctx, state, W, H);
  paintStars(ctx, state, W, H);
  paintGrain(ctx, W, H);
  paintVignette(ctx, W, H);
}
