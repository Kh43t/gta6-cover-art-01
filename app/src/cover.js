// Vice Coast Cover Studio — canvas renderer.
// Pure drawing: given a state object and loaded photos, paintCover fills
// the whole canvas. No DOM access here except creating offscreen canvases.

import { findGrade, findLayout, findLettering } from "./presets.js";

// ---------------------------------------------------------------- LUT grade
// A gradient-map lookup: for each of 256 luminance levels, interpolate the
// grade's colour stops. `keep` blends the photo's own colour back in.

const lutCache = new Map();

function lutFor(grade) {
  const hit = lutCache.get(grade.id);
  if (hit) return hit;
  const table = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) {
      table[c][i] = Math.round(a[c + 1] + (b[c + 1] - a[c + 1]) * f);
    }
  }
  lutCache.set(grade.id, table);
  return table;
}

const gradedCache = new Map();

function gradedPhoto(img, grade) {
  const key = (img.currentSrc || img.src || "") + "|" + grade.id;
  const hit = gradedCache.get(key);
  if (hit) return hit;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d");
  c.drawImage(img, 0, 0);
  const data = c.getImageData(0, 0, w, h);
  const px = data.data;
  const lut = lutFor(grade);
  const keep = grade.keep;
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    px[i] = Math.round(lut[0][lum] * (1 - keep) + px[i] * keep);
    px[i + 1] = Math.round(lut[1][lum] * (1 - keep) + px[i + 1] * keep);
    px[i + 2] = Math.round(lut[2][lum] * (1 - keep) + px[i + 2] * keep);
  }
  c.putImageData(data, 0, 0);
  if (gradedCache.size > 24) gradedCache.clear();
  gradedCache.set(key, off);
  return off;
}

// ------------------------------------------------------------ photo framing
// Cover-fit with a top anchor (faces stay in frame), then the cell's own
// zoom and pan offsets. dx/dy are fractions of the cell size, -1..1.

function paintPhoto(ctx, img, rect, cell) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = Math.max(0.2, cell.zoom || 1);
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Top-anchored: the photo's top edge starts at the rect top; panning
  // moves it down from there, never up past the top.
  let dx = rect.x + (rect.w - dw) / 2 + (cell.dx || 0) * rect.w;
  let dy = rect.y + (cell.dy || 0) * rect.h;
  if (dh > rect.h) dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  else dy = rect.y + (rect.h - dh) / 2 + (cell.dy || 0) * rect.h;
  if (dw > rect.w) dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ------------------------------------------------------------- band artwork
function paintPalm(ctx, x, y, s, lean, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.lineCap = "round";
  // Curved trunk.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.14, -s * 0.95);
  ctx.stroke();
  // Fronds fanning from the crown.
  const cx = s * 0.14;
  const cy = -s * 0.95;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = s * (0.52 - Math.abs(i - 3) * 0.045);
    const tipX = cx + Math.cos(a) * len;
    const tipY = cy - Math.sin(a) * len * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.55, cy - Math.sin(a) * len * 0.75, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(cx - s * 0.03, cy + s * 0.02, s * 0.035, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.04, cy + s * 0.03, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintSkyline(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour;
  let cx = x;
  // Deterministic pseudo-random skyline from a sine hash — same band every
  // render, no Math.random in the paint path.
  let i = 0;
  while (cx < x + w) {
    const bw = w * (0.05 + 0.035 * Math.abs(Math.sin(i * 12.9898)));
    const bh = h * (0.3 + 0.55 * Math.abs(Math.sin(i * 78.233)));
    ctx.fillRect(cx, y - bh, bw, bh + 2);
    // Rooftop antenna on every third block.
    if (i % 3 === 1) ctx.fillRect(cx + bw / 2 - 1, y - bh - h * 0.14, 2, h * 0.14);
    cx += bw + w * 0.008;
    i++;
  }
}

function paintHalftone(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour;
  const step = Math.max(7, w / 90);
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      // Dots grow towards the bottom of the band.
      const grow = (row * step) / h;
      const r = step * (0.08 + grow * 0.22);
      const px = x + col * step + (row % 2 ? step / 2 : 0);
      const py = y + row * step;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintSun(ctx, cx, cy, r, top, bottom) {
  // Slatted low sun: a disc with horizontal gaps cut out, plus rays.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, "#ffe9a8");
  grad.addColorStop(0.55, "#ff9a3d");
  grad.addColorStop(1, "#ff2e63");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: sky-coloured bars, thicker towards the bottom.
  ctx.fillStyle = top;
  let y = cy + r * 0.08;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.16;
    gap *= 1.5;
  }
  ctx.restore();
  // Rays fanning out behind the disc.
  ctx.save();
  ctx.strokeStyle = "rgba(255, 214, 120, 0.5)";
  ctx.lineWidth = Math.max(2, r * 0.03);
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.08 + (i / 8) * 0.84);
    const x1 = cx + Math.cos(a) * r * 1.25;
    const y1 = cy + Math.sin(a) * r * 1.25;
    const x2 = cx + Math.cos(a) * r * 1.85;
    const y2 = cy + Math.sin(a) * r * 1.85;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function sparkle(ctx, x, y, r, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

// -------------------------------------------------------------- title words
function paintTitle(ctx, state, band) {
  const style = findLettering(state.lettering);
  const W = band.w;
  const title = (state.title || "VICE COAST").toUpperCase().slice(0, 30);
  let size = band.h * 0.42;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Shrink until the title fits the band width.
  for (let tries = 0; tries < 12; tries++) {
    ctx.font = style.font.replace("%SIZE%", String(Math.round(size)));
    const wide = ctx.measureText(title).width;
    if (wide <= W * 0.94) break;
    size *= 0.92;
  }
  const cx = band.x + W / 2;
  const cy = band.y + band.h * 0.46;
  ctx.translate(cx, cy);
  if (style.skew) ctx.transform(1, 0, style.skew, 1, 0, 0);
  if (style.shadow) {
    ctx.shadowColor = style.shadow;
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
  }
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, size * style.outlineWidth);
  ctx.strokeStyle = style.outline;
  ctx.strokeText(title, 0, 0);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillStyle = style.fill;
  ctx.fillText(title, 0, 0);
  ctx.restore();
  // Subtitle, tracked out, under the title.
  const sub = (state.subtitle || "").toUpperCase().slice(0, 60);
  if (sub) {
    ctx.save();
    ctx.font = `700 ${Math.round(band.h * 0.115)}px 'Arial Narrow', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 246, 232, 0.92)";
    const spaced = sub.split("").join("  ");
    ctx.fillText(spaced, band.x + W / 2, band.y + band.h * 0.82);
    ctx.restore();
  }
}

// ------------------------------------------------------------------- ribbon
function paintRibbon(ctx, text, W, H) {
  if (!text) return;
  const label = text.toUpperCase().slice(0, 24);
  ctx.save();
  ctx.translate(W * 0.02, H * 0.045);
  ctx.rotate(-0.06);
  ctx.font = `900 ${Math.round(H * 0.028)}px Impact, 'Arial Black', sans-serif`;
  const pad = H * 0.02;
  const tw = ctx.measureText(label).width;
  const bw = tw + pad * 2;
  const bh = H * 0.052;
  ctx.fillStyle = "#ff2e63";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(bw, 0);
  ctx.lineTo(bw - bh * 0.45, bh);
  ctx.lineTo(0, bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bw / 2, bh / 2 + 1);
  // Folded tail.
  ctx.fillStyle = "#c21645";
  ctx.beginPath();
  ctx.moveTo(bw - bh * 0.45, bh);
  ctx.lineTo(bw, 0);
  ctx.lineTo(bw + bh * 0.4, bh * 0.35);
  ctx.lineTo(bw - bh * 0.05, bh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------- grain + shade
const grainTile = { canvas: null };

function paintGrain(ctx, W, H) {
  if (!grainTile.canvas) {
    const t = document.createElement("canvas");
    t.width = 128;
    t.height = 128;
    const c = t.getContext("2d");
    const img = c.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    c.putImageData(img, 0, 0);
    grainTile.canvas = t;
  }
  const pattern = ctx.createPattern(grainTile.canvas, "repeat");
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function paintVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(8,2,16,0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ entry
// state: { layout, grade, lettering, title, subtitle, ribbon, stars,
//          cells: [{ shot, zoom, dx, dy }] }
// photos: Map shot id -> HTMLImageElement (already loaded).

export function paintCover(ctx, W, H, state, photos) {
  const layout = findLayout(state.layout);
  const grade = findGrade(state.grade);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#12061f";
  ctx.fillRect(0, 0, W, H);

  const bandH = Math.round(H * 0.24);
  const photoH = H - bandH;
  const gapPx = layout.gap * Math.min(W, photoH);

  // ---- photo panels
  layout.rects.forEach((r, i) => {
    const cell = state.cells[i] || { shot: null, zoom: 1, dx: 0, dy: 0 };
    const rect = {
      x: r[0] * W + gapPx / 2,
      y: r[1] * photoH + gapPx / 2,
      w: r[2] * W - gapPx,
      h: r[3] * photoH - gapPx,
    };
    if (rect.w <= 0 || rect.h <= 0) return;
    const img = cell.shot ? photos.get(cell.shot) : null;
    ctx.save();
    // Rounded panel corners.
    const rad = Math.min(14, Math.min(rect.w, rect.h) * 0.04);
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, rad);
    ctx.clip();
    if (layout.tilt && layout.spins) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((layout.spins[i] || 0) * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    if (img) {
      const graded = gradedPhoto(img, grade);
      // Tilted snaps get a white polaroid frame.
      if (layout.border) {
        ctx.fillStyle = "#fff8ef";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        const b = rect.w * layout.border;
        paintPhoto(ctx, graded, {
          x: rect.x + b,
          y: rect.y + b,
          w: rect.w - b * 2,
          h: rect.h - b * 2.4,
        }, cell);
      } else {
        paintPhoto(ctx, graded, rect, cell);
      }
    } else {
      // Empty slot: dusk gradient + hint.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, "#3a1440");
      g.addColorStop(1, "#12061f");
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "rgba(255,246,232,0.55)";
      ctx.font = `${Math.round(Math.min(rect.w, rect.h) * 0.09)}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("drop a photo", rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Panel edge + inner shade.
    ctx.strokeStyle = "rgba(255,246,232,0.28)";
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  // ---- sunset title band
  const band = { x: 0, y: photoH, w: W, h: bandH };
  const sky = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  sky.addColorStop(0, "#2b0a4a");
  sky.addColorStop(0.35, "#a31d68");
  sky.addColorStop(0.65, "#ff5e3a");
  sky.addColorStop(1, "#ffb347");
  ctx.fillStyle = sky;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Slatted sun, low and centred, half-sunk behind the skyline.
  // Clipped to the band so its rays never spill onto the photos above.
  const sunR = band.h * 0.52;
  const sunX = W * 0.5;
  const sunY = band.y + band.h * 0.62;
  ctx.save();
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  paintSun(ctx, sunX, sunY, sunR, "#2b0a4a", "#ff5e3a");
  ctx.restore();

  // Halftone dots wash over the sky.
  ctx.save();
  ctx.globalAlpha = 0.16;
  paintHalftone(ctx, band.x, band.y, band.w, band.h * 0.55, "#1a0518");
  ctx.restore();

  // Skyline + palms along the bottom of the band.
  paintSkyline(ctx, 0, band.y + band.h * 0.98, W, band.h * 0.34, "#16041f");
  paintPalm(ctx, W * 0.045, band.y + band.h * 0.99, band.h * 0.62, -0.14, "#16041f");
  paintPalm(ctx, W * 0.955, band.y + band.h * 0.99, band.h * 0.7, 0.12, "#16041f");
  paintPalm(ctx, W * 0.885, band.y + band.h * 0.99, band.h * 0.45, 0.22, "#16041f");

  // Title + subtitle sit over the band.
  paintTitle(ctx, state, band);

  // Heat stars: a row of sparkles at the band's top-right.
  const stars = Math.max(0, Math.min(5, state.stars || 0));
  const sr = Math.max(6, band.h * 0.075);
  for (let i = 0; i < stars; i++) {
    sparkle(ctx, W - (0.05 + i * 0.045) * W, band.y + band.h * 0.2, sr, "#ffe9a8");
  }

  // Badge ribbon, top-left of the whole cover.
  paintRibbon(ctx, state.ribbon, W, H);

  // ---- finish: grain + vignette
  paintGrain(ctx, W, H);
  paintVignette(ctx, W, H);
}
