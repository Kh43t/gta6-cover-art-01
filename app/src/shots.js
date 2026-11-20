// Sundown Racket — photo loading + deep links.
// Loads the demo-cast portraits (local samples/ files, or an uploaded
// object URL), caches them, and parses the ?shot= deep links used by
// shots.json so a screenshot run can open the exact poster or editor
// state the manifest asks for.

import { CAST_ROSTER, castMember, gradeById, fontById, freshState } from "./presets.js";

const cache = new Map();

// Load one image from a URL. Resolves with the element, rejects on error.
export function loadImage(src) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("cannot load " + src));
    img.src = src;
  });
  cache.set(src, p);
  return p;
}

// Load every cast portrait. `overrides` maps cast id -> custom URL
// (uploaded photos). Returns a map id -> image; a photo that fails to
// load is simply absent and the renderer paints the grade colour instead.
export async function loadCastPhotos(overrides = {}) {
  const photos = {};
  await Promise.all(CAST_ROSTER.map(async (member) => {
    const src = overrides[member.id] || ("samples/" + member.file);
    try { photos[member.id] = await loadImage(src); }
    catch (err) { console.warn("cast photo missing:", member.id, err.message); }
  }));
  return photos;
}

export function photoCount(photos) {
  return Object.keys(photos).length;
}

// Parse a deep link such as:
//   ?shot=cover&cast=marcus&title=SUNDOWN%20RACKET&grade=sundown
//   ?shot=editor&cast=lena&grade=neon&font=sunset-slant
// Returns { mode, state } where mode is "cover" or "editor". Unknown
// values fall back to the defaults instead of breaking the page.
export function stateFromQuery(search) {
  const q = new URLSearchParams(search || "");
  const state = freshState();
  const mode = q.get("shot") === "editor" ? "editor" : "cover";

  const hero = q.get("hero");
  if (hero && castMember(hero)) state.heroId = hero;

  const cast = (q.get("cast") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (cast.length === 6 && cast.every((id) => CAST_ROSTER.some((m) => m.id === id))) {
    state.castIds = cast;
  } else if (cast.length === 1 && CAST_ROSTER.some((m) => m.id === cast[0])) {
    state.heroId = cast[0];
  }

  const title = q.get("title");
  if (title) state.words.title = title.slice(0, 30);
  const grade = q.get("grade");
  if (grade && gradeById(grade)) state.words.gradeId = grade;
  const font = q.get("font");
  if (font && fontById(font)) state.words.fontId = font;
  const quote = q.get("quote");
  if (quote) state.words.quote = quote.slice(0, 60);
  const tagline = q.get("tagline");
  if (tagline) state.words.tagline = tagline.slice(0, 48);
  const release = q.get("release");
  if (release) state.words.releaseLine = release.slice(0, 24);
  const step = parseInt(q.get("step") || "", 10);
  if (step >= 1 && step <= 3) state.step = step;
  return { mode, state };
}

// Serialise the current state back into a shareable deep link.
export function stateToQuery(state) {
  const q = new URLSearchParams();
  q.set("shot", "editor");
  q.set("hero", state.heroId);
  q.set("cast", state.castIds.join(","));
  q.set("title", state.words.title);
  q.set("grade", state.words.gradeId);
  q.set("font", state.words.fontId);
  q.set("step", String(state.step));
  return "?" + q.toString();
}
