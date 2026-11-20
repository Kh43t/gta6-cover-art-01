// Sundown Racket — studio controller.
// Owns the editor state, the undo/redo history, the guided 3-step flow,
// the face-aware crop gestures (drag to pan, wheel to zoom, sliders,
// arrow keys), and the PNG exports (one size, or all three at once).
// Rendering itself lives in cover.js; this file only wires the page.

import {
  CAST_ROSTER, POSTER_GRADES, TITLE_FONTS, EXPORT_SIZES, DEFAULT_WORDS,
  castMember, gradeById, fontById, sizeById, freshState,
} from "./presets.js";
import { paintPoster } from "./cover.js";
import { loadCastPhotos, stateFromQuery, stateToQuery } from "./shots.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let state = freshState();
let photos = {};
let uploads = {};
let past = [];
let future = [];
let previewSize = { w: 1080, h: 1350 };

// --- history ---------------------------------------------------------------
function snapshot() {
  return JSON.stringify({ heroId: state.heroId, castIds: state.castIds, words: state.words, crops: state.crops });
}

function commit() {
  past.push(snapshot());
  if (past.length > 80) past.shift();
  future = [];
  refreshUndoButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  state.heroId = s.heroId;
  state.castIds = s.castIds;
  state.words = s.words;
  state.crops = s.crops;
  renderAll();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  refreshUndoButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  refreshUndoButtons();
}

function refreshUndoButtons() {
  const u = $("#undoBtn"), r = $("#redoBtn");
  if (u) u.disabled = !past.length;
  if (r) r.disabled = !future.length;
}

// --- rendering -------------------------------------------------------------
function currentPhotos() { return photos; }

function renderPoster() {
  const canvas = $("#posterCanvas");
  if (!canvas) return;
  paintPoster(canvas, state, currentPhotos(), previewSize.w, previewSize.h);
  const note = $("#photoNote");
  if (note) {
    const loaded = Object.keys(photos).length;
    note.textContent = loaded + " of 8 cast photos loaded" + (loaded < 8 ? " — missing faces paint as grade colour" : "");
  }
}

function renderRoster() {
  const box = $("#castRoster");
  if (!box) return;
  box.innerHTML = "";
  for (const member of CAST_ROSTER) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "cast-card" + (state.selectedId === member.id ? " selected" : "") + (state.heroId === member.id ? " is-hero" : "");
    card.dataset.id = member.id;
    const img = photos[member.id];
    card.innerHTML =
      (img ? `<img src="${img.src}" alt="">` : `<span class="cast-missing">?</span>`) +
      `<span class="cast-name">${member.name}</span>` +
      `<span class="cast-role">${member.role}</span>` +
      `<span class="cast-flag">${state.heroId === member.id ? "HERO" : state.castIds.includes(member.id) ? "ON POSTER" : "BENCH"}</span>`;
    card.addEventListener("click", () => selectCast(member.id));
    box.appendChild(card);
  }
  const heroLabel = $("#heroLabel");
  if (heroLabel) heroLabel.textContent = "Hero: " + castMember(state.heroId).name + " — " + castMember(state.heroId).role;
}

function renderSteps() {
  $$(".step-panel").forEach((p) => {
    p.hidden = Number(p.dataset.step) !== state.step;
  });
  $$(".step-tab").forEach((t) => {
    t.classList.toggle("active", Number(t.dataset.step) === state.step);
    t.setAttribute("aria-current", Number(t.dataset.step) === state.step ? "step" : "false");
  });
  const prev = $("#prevStep"), next = $("#nextStep");
  if (prev) prev.disabled = state.step <= 1;
  if (next) next.textContent = state.step >= 3 ? "Done — back to step 1" : "Next step →";
}

function syncCaptionFields() {
  const w = state.words;
  const set = (id, v) => { const el = $(id); if (el && el.value !== v) el.value = v; };
  set("#titleInput", w.title);
  set("#scriptInput", w.scriptLine);
  set("#taglineInput", w.tagline);
  set("#quoteInput", w.quote);
  set("#quoteSourceInput", w.quoteSource);
  set("#billingInput", w.billing);
  set("#sealInput", w.sealText);
  set("#sealRingInput", w.sealRing);
  set("#releaseInput", w.releaseLine);
  set("#editionInput", w.editionTag);
  $$("input[name=fontPick]").forEach((r) => { r.checked = r.value === w.fontId; });
  $$("input[name=gradePick]").forEach((r) => { r.checked = r.value === w.gradeId; });
  const tag = $("#roleTagInput");
  if (tag) tag.value = castMember(state.selectedId).role;
  const nm = $("#nameTagInput");
  if (nm) nm.value = castMember(state.selectedId).name;
}

function renderAll() {
  renderSteps();
  renderRoster();
  syncCaptionFields();
  renderPoster();
  updateShareLink();
}

function updateShareLink() {
  const a = $("#shareLink");
  if (a) a.href = stateToQuery(state);
}

// --- selection + cast management -------------------------------------------
function selectCast(id) {
  state.selectedId = id;
  renderRoster();
  syncCaptionFields();
  renderPoster();
}

function makeHero() {
  const id = state.selectedId;
  if (state.heroId === id) return;
  commit();
  const oldHero = state.heroId;
  state.heroId = id;
  if (!state.castIds.includes(oldHero)) state.castIds[0] = oldHero;
  else state.castIds = state.castIds.filter((c) => c !== id);
  if (!state.castIds.includes(oldHero)) state.castIds.push(oldHero);
  state.castIds = state.castIds.slice(0, 6);
  renderAll();
}

function toggleOnPoster() {
  const id = state.selectedId;
  if (state.heroId === id) return;
  commit();
  if (state.castIds.includes(id)) {
    state.castIds = state.castIds.filter((c) => c !== id);
    const bench = CAST_ROSTER.find((m) => m.id !== state.heroId && !state.castIds.includes(m.id));
    if (bench) state.castIds.push(bench.id);
  } else {
    state.castIds[5] = id;
  }
  renderAll();
}

function swapCast(a, b) {
  commit();
  const i = state.castIds.indexOf(a), j = state.castIds.indexOf(b);
  if (i >= 0 && j >= 0) { state.castIds[i] = b; state.castIds[j] = a; }
  renderAll();
}

// --- crop gestures ---------------------------------------------------------
function selectedCrop() {
  const id = state.selectedId;
  if (!state.crops[id]) state.crops[id] = { zoom: 1.12, dx: 0, dy: 0 };
  return state.crops[id];
}

function applyCropToSliders() {
  const c = selectedCrop();
  const z = $("#zoomSlider"), x = $("#panXSlider"), y = $("#panYSlider");
  if (z) z.value = String(c.zoom);
  if (x) x.value = String(c.dx);
  if (y) y.value = String(c.dy);
}

function bindCrop() {
  const canvas = $("#posterCanvas");
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, committed: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const c = selectedCrop();
    if (!drag.committed) { commit(); drag.committed = true; }
    c.dx = clamp(c.dx + ((e.clientX - drag.x) / rect.width) * 1.6, -1, 1);
    c.dy = clamp(c.dy + ((e.clientY - drag.y) / rect.height) * 1.6, -1, 1);
    drag.x = e.clientX; drag.y = e.clientY;
    renderPoster();
    applyCropToSliders();
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    commit();
    const c = selectedCrop();
    c.zoom = clamp(c.zoom * (e.deltaY < 0 ? 1.08 : 0.92), 1, 3);
    renderPoster();
    applyCropToSliders();
  }, { passive: false });

  const z = $("#zoomSlider"), x = $("#panXSlider"), y = $("#panYSlider");
  if (z) z.addEventListener("input", () => { const c = selectedCrop(); c.zoom = Number(z.value); renderPoster(); });
  if (x) x.addEventListener("input", () => { const c = selectedCrop(); c.dx = Number(x.value); renderPoster(); });
  if (y) y.addEventListener("input", () => { const c = selectedCrop(); c.dy = Number(y.value); renderPoster(); });
  [z, x, y].forEach((el) => el && el.addEventListener("change", () => commit()));

  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const fine = e.shiftKey ? 0.02 : 0.06;
    const c = selectedCrop();
    let used = true;
    if (e.key === "ArrowLeft") { commit(); c.dx = clamp(c.dx - fine, -1, 1); }
    else if (e.key === "ArrowRight") { commit(); c.dx = clamp(c.dx + fine, -1, 1); }
    else if (e.key === "ArrowUp") { commit(); c.dy = clamp(c.dy - fine, -1, 1); }
    else if (e.key === "ArrowDown") { commit(); c.dy = clamp(c.dy + fine, -1, 1); }
    else if (e.key === "+" || e.key === "=") { commit(); c.zoom = clamp(c.zoom * 1.1, 1, 3); }
    else if (e.key === "-") { commit(); c.zoom = clamp(c.zoom / 1.1, 1, 3); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else used = false;
    if (used) { renderPoster(); applyCropToSliders(); }
  });
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// --- caption fields --------------------------------------------------------
function bindCaption() {
  const w = state.words;
  const text = (id, key, max) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      w[key] = el.value.slice(0, max);
      renderPoster();
      updateShareLink();
    });
    el.addEventListener("change", () => commit());
  };
  text("#titleInput", "title", 30);
  text("#scriptInput", "scriptLine", 60);
  text("#taglineInput", "tagline", 48);
  text("#quoteInput", "quote", 60);
  text("#quoteSourceInput", "quoteSource", 40);
  text("#billingInput", "billing", 400);
  text("#sealInput", "sealText", 16);
  text("#sealRingInput", "sealRing", 40);
  text("#releaseInput", "releaseLine", 24);
  text("#editionInput", "editionTag", 12);

  $$("input[name=fontPick]").forEach((r) => r.addEventListener("change", () => {
    commit();
    w.fontId = fontById(r.value).id;
    renderPoster();
  }));
  $$("input[name=gradePick]").forEach((r) => r.addEventListener("change", () => {
    commit();
    w.gradeId = gradeById(r.value).id;
    renderPoster();
  }));

  const role = $("#roleTagInput"), nm = $("#nameTagInput");
  if (role) role.addEventListener("input", () => {
    const m = castMember(state.selectedId);
    m.role = role.value.toUpperCase().slice(0, 16);
    renderPoster();
  });
  if (role) role.addEventListener("change", () => commit());
  if (nm) nm.addEventListener("input", () => {
    const m = castMember(state.selectedId);
    m.name = nm.value.slice(0, 24);
    renderPoster();
    renderRoster();
  });
  if (nm) nm.addEventListener("change", () => commit());
}

// --- uploads ---------------------------------------------------------------
function bindUpload() {
  const input = $("#uploadInput");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    uploads[state.selectedId] = url;
    try {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      photos[state.selectedId] = img;
      commit();
      renderAll();
    } catch (err) {
      console.warn("upload failed", err);
    }
    input.value = "";
  });
}

// --- export ----------------------------------------------------------------
function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sundown-racket";
}

function downloadPNG(canvas, name) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob ? blob.size : 0);
    }, "image/png");
  });
}

async function exportOne(size) {
  const off = document.createElement("canvas");
  paintPoster(off, state, currentPhotos(), size.w, size.h);
  const name = `${slug(state.words.title)}-${size.w}x${size.h}.png`;
  const bytes = await downloadPNG(off, name);
  const log = $("#exportLog");
  if (log) log.textContent = `Exported ${name} (${bytes.toLocaleString()} bytes)`;
  return bytes;
}

async function exportAll() {
  const btn = $("#exportAllBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Exporting…"; }
  try {
    for (const size of EXPORT_SIZES) await exportOne(size);
    const log = $("#exportLog");
    if (log) log.textContent = "All 3 PNGs exported: 1080×1080, 1080×1350, 1920×1080.";
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "EXPORT ALL 3 PNGS"; }
  }
}

// --- steps -----------------------------------------------------------------
function goStep(n) {
  if (n < 1) n = 1;
  if (n > 3) n = 1;
  state.step = n;
  renderAll();
}

// --- boot ------------------------------------------------------------------
function buildPickers() {
  const fonts = $("#fontPicker");
  if (fonts) {
    fonts.innerHTML = "";
    for (const f of TITLE_FONTS) {
      const lab = document.createElement("label");
      lab.className = "pick";
      lab.innerHTML = `<input type="radio" name="fontPick" value="${f.id}"> ${f.label}`;
      fonts.appendChild(lab);
    }
  }
  const grades = $("#gradePicker");
  if (grades) {
    grades.innerHTML = "";
    for (const g of POSTER_GRADES) {
      const lab = document.createElement("label");
      lab.className = "pick";
      lab.innerHTML = `<input type="radio" name="gradePick" value="${g.id}"> <span class="swatch" style="background:linear-gradient(135deg, ${g.ramp[0]}, ${g.ramp[1]}, ${g.ramp[2]})"></span> ${g.label}`;
      grades.appendChild(lab);
    }
  }
  const sizes = $("#sizePicker");
  if (sizes) {
    sizes.innerHTML = "";
    for (const s of EXPORT_SIZES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "size-btn";
      b.dataset.size = s.id;
      b.textContent = `${s.label} ${s.w}×${s.h}`;
      b.addEventListener("click", () => {
        previewSize = { w: s.w, h: s.h };
        $$(".size-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        renderPoster();
      });
      sizes.appendChild(b);
    }
    const first = sizes.querySelector(".size-btn");
    if (first) first.classList.add("active");
  }
}

async function boot() {
  buildPickers();
  const { mode, state: linked } = stateFromQuery(location.search);
  state = linked;
  // A deep link may ask for a preview size (?size=square|poster|wide) so
  // a screenshot run renders the poster at exactly the shot's dimensions.
  const sizeParam = new URLSearchParams(location.search).get("size");
  const wanted = sizeParam ? sizeById(sizeParam) : null;
  previewSize = wanted ? { w: wanted.w, h: wanted.h } : { w: 1080, h: 1350 };
  $$(".size-btn").forEach((b) => b.classList.toggle("active", b.dataset.size === (wanted ? wanted.id : "poster")));
  if (mode === "cover") document.body.classList.add("cover-mode");
  photos = await loadCastPhotos(uploads);
  bindCrop();
  bindCaption();
  bindUpload();
  $$(".step-tab").forEach((t) => t.addEventListener("click", () => goStep(Number(t.dataset.step))));
  const prev = $("#prevStep"), next = $("#nextStep");
  if (prev) prev.addEventListener("click", () => goStep(state.step - 1));
  if (next) next.addEventListener("click", () => goStep(state.step + 1));
  const heroBtn = $("#makeHeroBtn");
  if (heroBtn) heroBtn.addEventListener("click", makeHero);
  const togBtn = $("#togglePosterBtn");
  if (togBtn) togBtn.addEventListener("click", toggleOnPoster);
  const undoBtn = $("#undoBtn"), redoBtn = $("#redoBtn");
  if (undoBtn) undoBtn.addEventListener("click", undo);
  if (redoBtn) redoBtn.addEventListener("click", redo);
  const allBtn = $("#exportAllBtn");
  if (allBtn) allBtn.addEventListener("click", exportAll);
  $$("[data-export]").forEach((b) => b.addEventListener("click", () => exportOne(sizeById(b.dataset.export))));
  const resetBtn = $("#resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    commit();
    const keepStep = state.step;
    state = freshState();
    state.step = keepStep;
    renderAll();
  });
  renderAll();
  applyCropToSliders();
  refreshUndoButtons();
}

document.addEventListener("DOMContentLoaded", boot);
