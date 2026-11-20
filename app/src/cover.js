// Sundown Racket — poster renderer.
// Draws the whole movie-poster cover on one canvas: hero close-up, cast
// strip with slanted role tags, striped-chrome title overlapping the hero,
// stars + review quote, VOL. 1 badge, BEST CAST seal, billing block,
// barcode and COMING SOON line. One entry point: `paintPoster`.
// Grades are applied as a luminance ramp over the photos only, so the
// printed words keep their own colours in every grade.

import { gradeById, fontById, heroMember, posterCast } from "./presets.js";

// Work out where each element sits for a given output size. The poster
// (1080x1350) is the home ratio; square crops the cast strip tighter and
// wide moves the hero to the left half with the cast in a 2x3 grid right.
export function frameFor(w, h) {
  const wide = w > h * 1.3;
  const square = Math.abs(w - h) < 4;
  if (wide) {
    return {
      wide: true,
      hero: { x: 0, y: 0, w: Math.round(w * 0.50), h },
      cast: { x: Math.round(w * 0.52), y: Math.round(h * 0.18), w: Math.round(w * 0.46), h: Math.round(h * 0.38), cols: 3, rows: 2 },
      title: { x: Math.round(w * 0.52), y: Math.round(h * 0.70), w: Math.round(w * 0.46) },
      quoteY: Math.round(h * 0.04),
      quoteX: Math.round(w * 0.75),
    };
  }
  return {
    wide: false,
    hero: { x: 0, y: 0, w, h: Math.round(h * (square ? 0.62 : 0.66)) },
    cast: { x: Math.round(w * 0.045), y: Math.round(h * (square ? 0.66 : 0.70)), w: Math.round(w * 0.91), h: Math.round(h * 0.17), cols: 6, rows: 1 },
    title: { x: 0, y: Math.round(h * (square ? 0.47 : 0.50)), w },
    quoteY: Math.round(h * (square ? 0.045 : 0.04)),
    quoteX: Math.round(w / 2),
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Push a photo through the grade's three-stop luminance ramp. The photo
// keeps a little of its own colour so faces stay readable (none for Noir).
function gradePhoto(img, grade) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  const stops = grade.ramp.map(hexRgb);
  const keep = grade.id === "noir" ? 0 : 0.35;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], gg = px[i + 1], b = px[i + 2];
    const lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    let lo, hi, t;
    if (lum < 0.5) { lo = stops[0]; hi = stops[1]; t = lum * 2; }
    else { lo = stops[1]; hi = stops[2]; t = (lum - 0.5) * 2; }
    for (let k = 0; k < 3; k++) {
      const graded = lerp(lo[k], hi[k], t);
      px[i + k] = graded * (1 - keep) + [r, gg, b][k] * keep;
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}

// Cover-fit draw anchored on the face: the crop's focal point (0..1 down
// the photo) is pinned to the same fraction of the frame, then zoom and
// pan are applied. Faces never slide out of frame on tall crops.
function drawFacePhoto(ctx, img, frame, crop, focal) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(frame.w / iw, frame.h / ih);
  const scale = base * (crop.zoom || 1);
  const dw = iw * scale, dh = ih * scale;
  const anchorY = frame.y + frame.h * focal - dh * focal;
  const anchorX = frame.x + (frame.w - dw) / 2;
  const dx = (crop.dx || 0) * frame.w * 0.25;
  const dy = (crop.dy || 0) * frame.h * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  ctx.drawImage(img, anchorX + dx, anchorY + dy, dw, dh);
  ctx.restore();
}

function skyWash(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(0.75, grade.skyLow[0]);
  sky.addColorStop(1, grade.skyLow[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

function scrim(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function star(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStars(ctx, cx, y, r, grade) {
  const gap = r * 2.5;
  const x0 = cx - gap * 2;
  for (let i = 0; i < 5; i++) star(ctx, x0 + i * gap, y, r, grade.accent);
}

// Slanted role tag: a skewed ribbon with the role in heavy capitals.
function roleTag(ctx, x, y, w, h, text, grade) {
  const slant = h * 0.45;
  ctx.save();
  ctx.fillStyle = grade.tag;
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.round(h * 0.52)}px 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1, w - 6);
  ctx.restore();
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// The giant title. Chrome treatment: a vertical metal gradient clipped
// to the letters, with thin dark stripes cut across it. Glow treatment:
// the same letters with a hot outline. Text is centred and wraps to at
// most two lines so long titles still fit the poster.
function drawTitle(ctx, text, font, box, grade, w) {
  const size = Math.min(Math.round(box.w * 0.135), Math.round(w * 0.105));
  const fontStr = font.stack.replace("{px}", String(size));
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = fontStr;
  const lines = wrapLines(ctx, text.toUpperCase(), box.w * 0.96);
  const shown = lines.slice(0, 2);
  const lineH = size * 1.02;
  const y0 = box.y + (shown.length === 1 ? 0 : -lineH / 2);
  ctx.translate(box.x + box.w / 2, 0);
  ctx.rotate(font.lean || 0);
  ctx.translate(-(box.x + box.w / 2), 0);
  shown.forEach((line, i) => {
    const y = y0 + i * lineH + lineH / 2;
    if (font.treatment === "chrome") {
      // Paint the line on its own layer first: the striped metal fill is
      // composited "atop" the letters there, so the stripes can only ever
      // land on the letters themselves — never across the hero photo.
      const off = document.createElement("canvas");
      off.width = Math.max(2, Math.ceil(box.w));
      off.height = Math.ceil(lineH * 1.9);
      const o = off.getContext("2d");
      o.font = fontStr;
      o.textAlign = "center";
      o.textBaseline = "middle";
      const cy = off.height / 2;
      const metal = o.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
      metal.addColorStop(0, "#fffbe8");
      metal.addColorStop(0.35, "#ffd166");
      metal.addColorStop(0.55, "#ff8c42");
      metal.addColorStop(0.75, "#f5f5f5");
      metal.addColorStop(1, "#c9a227");
      o.fillStyle = metal;
      o.fillText(line, off.width / 2, cy);
      o.save();
      o.globalCompositeOperation = "source-atop";
      o.fillStyle = "rgba(20,8,40,0.55)";
      for (let s = -size; s < size * 2; s += size * 0.32) {
        o.fillRect(0, cy - size / 2 + s, off.width, size * 0.10);
      }
      o.restore();
      o.strokeStyle = "rgba(20,8,40,0.85)";
      o.lineWidth = Math.max(2, size * 0.045);
      o.strokeText(line, off.width / 2, cy);
      ctx.drawImage(off, box.x, y - off.height / 2);
    } else if (font.treatment === "glow") {
      ctx.shadowColor = grade.tag;
      ctx.shadowBlur = size * 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, box.x + box.w / 2, y);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = grade.tag;
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.strokeText(line, box.x + box.w / 2, y);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(line, box.x + box.w / 2, y);
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = Math.max(2, size * 0.03);
      ctx.strokeText(line, box.x + box.w / 2, y);
    }
  });
  ctx.restore();
  return shown.length;
}

// Gold circular seal with a ring of small text and the seal words across
// the middle. Ring text is drawn letter by letter around the circle.
function drawSeal(ctx, cx, cy, r, words, grade) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = grade.accent;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#1c0b2e";
  ctx.font = `900 ${Math.round(r * 0.24)}px 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const ring = (words.sealRing || "").toUpperCase();
  const step = (Math.PI * 2) / Math.max(1, ring.length);
  ctx.font = `900 ${Math.round(r * 0.16)}px Arial, sans-serif`;
  for (let i = 0; i < ring.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.68);
    ctx.fillText(ring[i], 0, 0);
    ctx.restore();
  }
  ctx.font = `900 ${Math.round(r * 0.26)}px 'Arial Black', Impact, sans-serif`;
  const bits = (words.sealText || "BEST CAST").toUpperCase().split(" ");
  bits.forEach((b, i) => ctx.fillText(b, 0, (i - (bits.length - 1) / 2) * r * 0.34));
  ctx.restore();
}

// Deterministic barcode bars from the title text (same title, same bars).
function drawBarcode(ctx, x, y, w, h) {
  let seed = 7;
  const src = "SUNDOWN-RACKET";
  for (const ch of src) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = "#111111";
  let px = x;
  let s = seed;
  while (px < x + w - 3) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const bw = 2 + (s % 4);
    if (s % 3 !== 0) ctx.fillRect(px, y, bw, h);
    px += bw + 2;
  }
  ctx.restore();
}

function grain(ctx, w, h) {
  const c = document.createElement("canvas");
  c.width = 160; c.height = 160;
  const g = c.getContext("2d");
  const d = g.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = v; d.data[i + 3] = 14;
  }
  g.putImageData(d, 0, 0);
  const pat = ctx.createPattern(c, "repeat");
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Main entry: paint the poster for `state` onto `canvas` at (w, h).
// `photos` maps cast id -> loaded HTMLImageElement (or graded canvas).
export function paintPoster(canvas, state, photos, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const grade = gradeById(state.words.gradeId);
  const words = state.words;
  const frame = frameFor(w, h);
  const u = w / 1080; // unit: poster pixels per 1080 width

  skyWash(ctx, w, h, grade);

  // Hero close-up: one large central face the title will overlap.
  const hero = heroMember(state);
  const heroImg = photos[hero.id];
  if (heroImg) {
    const graded = gradePhoto(heroImg, grade);
    drawFacePhoto(ctx, graded, frame.hero, state.crops[hero.id] || {}, hero.focal);
  } else {
    ctx.fillStyle = grade.ramp[1];
    ctx.fillRect(frame.hero.x, frame.hero.y, frame.hero.w, frame.hero.h);
  }
  // Legibility scrim under the title + cast strip, reaching up past the
  // script line so the small print stays readable over the hero photo.
  scrim(ctx, 0, frame.title.y - 180 * u, w, h - frame.title.y + 180 * u);

  // Cast strip: six faces, each with a white mat, a name plate and a
  // slanted role tag. No photo is ever repeated on the poster.
  const cast = posterCast(state);
  const cellW = frame.cast.w / frame.cast.cols;
  const cellH = frame.cast.h / frame.cast.rows;
  cast.forEach((member, i) => {
    const col = i % frame.cast.cols;
    const row = Math.floor(i / frame.cast.cols);
    const x = frame.cast.x + col * cellW + cellW * 0.06;
    const y = frame.cast.y + row * cellH + cellH * 0.05;
    const cw = cellW * 0.88;
    // In a multi-row grid the photo must leave room for its tag and name
    // inside the cell, or the next row paints over the name.
    const ch = cellH * (frame.cast.rows > 1 ? 0.70 : 0.82);
    const img = photos[member.id];
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 4 * u, y - 4 * u, cw + 8 * u, ch + 8 * u);
    ctx.restore();
    if (img) {
      drawFacePhoto(ctx, gradePhoto(img, grade), { x, y, w: cw, h: ch }, state.crops[member.id] || {}, member.focal);
    }
    const tagH = Math.max(16 * u, ch * 0.16);
    roleTag(ctx, x, y + ch - tagH, cw, tagH, member.role, grade);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(Math.max(13 * u, cw * 0.085))}px 'Arial Black', Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 6;
    ctx.fillText(member.name.toUpperCase(), x + cw / 2, y + ch + tagH + Math.max(12 * u, ch * 0.10), cw);
    ctx.shadowBlur = 0;
  });

  // Five stars + review quote + source, centred on the quote column
  // (full width on poster/square, the right column on wide).
  const starR = Math.max(11 * u, w * 0.013);
  const quoteW = frame.wide ? frame.title.w : w * 0.92;
  drawStars(ctx, frame.quoteX, frame.quoteY + starR, starR, grade);
  ctx.fillStyle = grade.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `italic 900 ${Math.round(Math.max(17 * u, w * 0.020))}px Georgia, serif`;
  ctx.fillText(`\u201C${words.quote}\u201D`, frame.quoteX, frame.quoteY + starR * 2 + Math.round(26 * u), quoteW);
  ctx.font = `${Math.round(Math.max(13 * u, w * 0.014))}px Arial, sans-serif`;
  ctx.fillStyle = grade.accent;
  ctx.fillText(`— ${words.quoteSource}`, frame.quoteX, frame.quoteY + starR * 2 + Math.round(50 * u));

  // Script line over the hero, above the title block so the giant letters
  // never cover it, then the giant title overlapping the hero. Both are
  // centred on the title box (full width on poster, right column on wide).
  const titleSize = Math.min(Math.round(frame.title.w * 0.135), Math.round(w * 0.105));
  const titleCx = frame.title.x + frame.title.w / 2;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `italic ${Math.round(Math.max(16 * u, w * 0.019))}px Georgia, serif`;
  // Wide parks the script line in the gap between the cast names and the
  // title; poster/square have the whole hero above the title to use.
  ctx.fillText(words.scriptLine, titleCx, frame.title.y - titleSize * (frame.wide ? 0.75 : 1.15));
  drawTitle(ctx, words.title, fontById(words.fontId), frame.title, grade, w);

  // Tagline ribbon under the title, centred on the title box. The wide
  // layout sits it closer so it never runs past the bottom edge.
  const tagY = frame.title.y + Math.round((frame.wide ? 85 : 150) * u);
  ctx.save();
  ctx.font = `900 ${Math.round(Math.max(15 * u, w * 0.017))}px 'Arial Black', Impact, sans-serif`;
  const tagW = Math.min(ctx.measureText(words.tagline).width + 48 * u, frame.title.w * 0.96);
  ctx.fillStyle = grade.tag;
  ctx.beginPath();
  ctx.moveTo(titleCx - tagW / 2 + 14 * u, tagY);
  ctx.lineTo(titleCx + tagW / 2 - 14 * u, tagY);
  ctx.lineTo(titleCx + tagW / 2, tagY + 30 * u);
  ctx.lineTo(titleCx - tagW / 2, tagY + 30 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(words.tagline.toUpperCase(), titleCx, tagY + 15 * u);
  ctx.restore();

  // VOL. 1 badge, top-left.
  const badgeR = Math.round(34 * u);
  ctx.save();
  ctx.fillStyle = grade.accent;
  ctx.beginPath(); ctx.arc(badgeR + 18 * u, badgeR + 18 * u, badgeR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1c0b2e"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(badgeR + 18 * u, badgeR + 18 * u, badgeR * 0.8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#1c0b2e";
  ctx.font = `900 ${Math.round(15 * u)}px 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(words.editionTag, badgeR + 18 * u, badgeR + 18 * u);
  ctx.restore();

  // BEST CAST seal. On poster/square it parks just above the cast strip
  // so it never covers a name plate; on wide it sits on the hero's
  // shoulder instead, clear of the quote and the cast grid.
  const sealR = Math.round((frame.wide ? 58 : 52) * u);
  const sealCx = frame.wide ? frame.hero.w - sealR - 20 * u : w - sealR - 26 * u;
  const sealCy = frame.wide ? h * 0.60 : frame.cast.y - sealR * 0.55;
  drawSeal(ctx, sealCx, sealCy, sealR, words, grade);

  // Billing block: tiny centred movie credits near the foot.
  ctx.fillStyle = grade.ink;
  ctx.textAlign = "center";
  ctx.font = `${Math.round(Math.max(9 * u, w * 0.0095))}px Arial, sans-serif`;
  const billLines = wrapLines(ctx, words.billing.toUpperCase(), w * 0.86);
  billLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, w / 2, h - Math.round((58 - i * 13) * u));
  });

  // Barcode bottom-left, release line bottom-centre-right.
  drawBarcode(ctx, Math.round(28 * u), h - Math.round(44 * u), Math.round(120 * u), Math.round(30 * u));
  ctx.fillStyle = grade.accent;
  ctx.font = `900 ${Math.round(Math.max(15 * u, w * 0.017))}px 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(words.releaseLine.toUpperCase(), w - Math.round(24 * u), h - Math.round(20 * u));

  grain(ctx, w, h);
  vignette(ctx, w, h);
  return canvas;
}
