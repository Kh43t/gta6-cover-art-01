// Vice Coast Cover Studio — editor shell.
// Owns the state, the undo/redo history, every control on the page, and
// the per-panel crop interaction (click, drag, scroll-zoom, sliders,
// arrow-key nudging). Rendering itself lives in cover.js.

import { EXPORT_SIZES, GRADES, LAYOUTS, LETTERINGS, findLayout } from "./presets.js";
import { paintCover } from "./cover.js";
import { SAMPLE_SHOTS, loadImage, loadSamples, readShotParams, shotById, slugify } from "./shots.js";

const PREVIEW = 900; // backing pixels of the square preview canvas
const BAND_FRAC = 0.24; // must match the band share used by cover.js

// ------------------------------------------------------------------- state
function freshCells(layoutId, previous) {
  const layout = findLayout(layoutId);
  const pool = ["pier", "boulevard", "rooftop"];
  return Array.from({ length: layout.cells }, (_, i) => {
    const old = previous && previous[i];
    return {
      shot: old && old.shot ? old.shot : pool[i % pool.length],
      zoom: old && old.zoom ? old.zoom : 1,
      dx: old ? old.dx || 0 : 0,
      dy: old ? old.dy || 0 : 0,
    };
  });
}

function defaultState() {
  return {
    layout: "hero-trio",
    grade: "vice-sunset",
    lettering: "block",
    title: "VICE COAST",
    subtitle: "WELCOME BACK TO LEONIDA",
    ribbon: "VICE CITY",
    stars: 4,
    cells: freshCells("hero-trio", null),
  };
}

// ------------------------------------------------------------------ history
const past = [];
const future = [];
let state = defaultState();
let selected = 0;

function snapshot() {
  return JSON.stringify(state);
}

function commit(preSnapshot) {
  // Push a snapshot onto the undo stack. Call BEFORE mutating state, or
  // pass the snapshot captured before the edit began (drag / slider /
  // typing, where the live value already changed). Without the pre-edit
  // snapshot, undo would restore the new value instead of the old one.
  past.push(preSnapshot !== undefined ? preSnapshot : snapshot());
  if (past.length > 60) past.shift();
  future.length = 0;
  syncHistoryButtons();
}

function restore(json) {
  state = JSON.parse(json);
  selected = Math.min(selected, state.cells.length - 1);
  syncAllControls();
  render();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncHistoryButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncHistoryButtons();
}

// ------------------------------------------------------------------ photos
let photos = new Map();
const customPhotos = new Map(); // id -> Image, for user uploads
let customCount = 0;

// -------------------------------------------------------------------- dom
const $ = (id) => document.getElementById(id);
let stage;
let ctx;

function optionList(select, items, current) {
  select.innerHTML = "";
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.label;
    if (item.id === current) opt.selected = true;
    select.appendChild(opt);
  }
}

function buildControls() {
  optionList($("layout-pick"), LAYOUTS, state.layout);
  optionList($("grade-pick"), GRADES, state.grade);
  optionList($("lettering-pick"), LETTERINGS, state.lettering);
  $("title-input").value = state.title;
  $("subtitle-input").value = state.subtitle;
  $("ribbon-input").value = state.ribbon;
  $("stars-input").value = String(state.stars);
  buildTray();
  buildExportButtons();
  syncHistoryButtons();
}

function buildTray() {
  const tray = $("photo-tray");
  tray.innerHTML = "";
  const all = [...SAMPLE_SHOTS, ...[...customPhotos.keys()].map((id) => ({
    id,
    label: "Your photo",
    file: "",
    hint: "Uploaded on this machine",
  }))];
  for (const shot of all) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "tray-card";
    card.dataset.shot = shot.id;
    const img = photos.get(shot.id) || customPhotos.get(shot.id);
    if (img) {
      const thumb = document.createElement("img");
      thumb.src = img.src;
      thumb.alt = shot.label;
      card.appendChild(thumb);
    }
    const cap = document.createElement("span");
    cap.textContent = shot.label;
    card.appendChild(cap);
    card.addEventListener("click", () => {
      commit();
      state.cells[selected] = { ...state.cells[selected], shot: shot.id };
      render();
      markTraySelection();
    });
    tray.appendChild(card);
  }
  markTraySelection();
}

function markTraySelection() {
  const current = state.cells[selected] && state.cells[selected].shot;
  for (const card of document.querySelectorAll(".tray-card")) {
    card.classList.toggle("picked", card.dataset.shot === current);
  }
}

function buildExportButtons() {
  const box = $("export-row");
  box.innerHTML = "";
  for (const size of EXPORT_SIZES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn export-btn";
    btn.textContent = size.label;
    btn.addEventListener("click", () => exportCover(size));
    box.appendChild(btn);
  }
  const all = document.createElement("button");
  all.type = "button";
  all.className = "btn primary";
  all.textContent = "Export all three";
  all.addEventListener("click", () => {
    for (const size of EXPORT_SIZES) exportCover(size);
  });
  box.appendChild(all);
}

// ------------------------------------------------------------- panel geometry
// Mirrors the rect math in cover.js so clicks land on the right panel.
function panelRects() {
  const layout = findLayout(state.layout);
  const photoH = PREVIEW * (1 - BAND_FRAC);
  const gap = layout.gap * Math.min(PREVIEW, photoH);
  return layout.rects.map((r) => ({
    x: r[0] * PREVIEW + gap / 2,
    y: r[1] * photoH + gap / 2,
    w: r[2] * PREVIEW - gap,
    h: r[3] * photoH - gap,
  }));
}

function pickCell(px, py) {
  const rects = panelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

// ------------------------------------------------------------------ render
function render() {
  const allPhotos = new Map([...photos, ...customPhotos]);
  paintCover(ctx, PREVIEW, PREVIEW, state, allPhotos);
  syncCropSliders();
  markTraySelection();
}

function syncCropSliders() {
  const cell = state.cells[selected] || { zoom: 1, dx: 0, dy: 0 };
  $("zoom-slider").value = String(cell.zoom || 1);
  $("x-slider").value = String(cell.dx || 0);
  $("y-slider").value = String(cell.dy || 0);
  $("zoom-readout").textContent = `${Math.round((cell.zoom || 1) * 100)}%`;
  $("panel-readout").textContent = `Panel ${selected + 1} of ${state.cells.length}`;
}

function syncAllControls() {
  $("layout-pick").value = state.layout;
  $("grade-pick").value = state.grade;
  $("lettering-pick").value = state.lettering;
  $("title-input").value = state.title;
  $("subtitle-input").value = state.subtitle;
  $("ribbon-input").value = state.ribbon;
  $("stars-input").value = String(state.stars);
  buildTray();
}

function syncHistoryButtons() {
  $("undo-btn").disabled = past.length === 0;
  $("redo-btn").disabled = future.length === 0;
}

// ------------------------------------------------------------------ export
function renderExport(size) {
  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  const c = off.getContext("2d");
  const allPhotos = new Map([...photos, ...customPhotos]);
  paintCover(c, size.w, size.h, state, allPhotos);
  return off;
}

export function exportCover(size) {
  const off = renderExport(size);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(state.title)}-${size.w}x${size.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}

// Test hook: returns a PNG data URL at the requested size.
export function exportDataUrl(w, h) {
  return renderExport({ w, h }).toDataURL("image/png");
}

// ------------------------------------------------------------------ events
function wireEvents() {
  $("layout-pick").addEventListener("change", (e) => {
    commit();
    state.layout = e.target.value;
    state.cells = freshCells(state.layout, state.cells);
    selected = 0;
    render();
  });
  $("grade-pick").addEventListener("change", (e) => {
    commit();
    state.grade = e.target.value;
    render();
  });
  $("lettering-pick").addEventListener("change", (e) => {
    commit();
    state.lettering = e.target.value;
    render();
  });
  // Text fields mutate live on every keystroke, so the pre-edit snapshot
  // is stashed on focus and only pushed when the edit finishes.
  let editStart = null;
  const stashEdit = () => { editStart = snapshot(); };
  const finishEdit = () => {
    if (editStart !== null && editStart !== snapshot()) commit(editStart);
    editStart = null;
  };
  for (const id of ["title-input", "subtitle-input", "ribbon-input"]) {
    $(id).addEventListener("focus", stashEdit);
    $(id).addEventListener("change", finishEdit);
  }
  $("title-input").addEventListener("input", (e) => {
    state.title = e.target.value.slice(0, 30);
    render();
  });
  $("subtitle-input").addEventListener("input", (e) => {
    state.subtitle = e.target.value.slice(0, 60);
    render();
  });
  $("ribbon-input").addEventListener("input", (e) => {
    state.ribbon = e.target.value.slice(0, 24);
    render();
  });
  $("stars-input").addEventListener("change", (e) => {
    commit();
    state.stars = Math.max(0, Math.min(5, Number.parseInt(e.target.value, 10) || 0));
    render();
  });
  $("undo-btn").addEventListener("click", undo);
  $("redo-btn").addEventListener("click", redo);

  // Crop sliders for the selected panel. Same stash pattern as the text
  // fields: the snapshot is taken when the drag starts, pushed on release.
  let sliderStart = null;
  const stashSlider = () => { sliderStart = snapshot(); };
  const finishSlider = () => {
    if (sliderStart !== null && sliderStart !== snapshot()) commit(sliderStart);
    sliderStart = null;
  };
  for (const id of ["zoom-slider", "x-slider", "y-slider"]) {
    $(id).addEventListener("pointerdown", stashSlider);
    $(id).addEventListener("focus", stashSlider);
    $(id).addEventListener("change", finishSlider);
  }
  $("zoom-slider").addEventListener("input", (e) => {
    state.cells[selected].zoom = Number.parseFloat(e.target.value);
    render();
  });
  $("x-slider").addEventListener("input", (e) => {
    state.cells[selected].dx = Number.parseFloat(e.target.value);
    render();
  });
  $("y-slider").addEventListener("input", (e) => {
    state.cells[selected].dy = Number.parseFloat(e.target.value);
    render();
  });

  // Upload: photos stay on this machine, loaded as object URLs.
  $("upload-input").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    if (!img) return;
    customCount += 1;
    const id = `upload-${customCount}`;
    customPhotos.set(id, img);
    commit();
    state.cells[selected] = { ...state.cells[selected], shot: id };
    buildTray();
    render();
  });

  // Canvas: click to select a panel, drag to pan it, wheel to zoom.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragMoved = false;
  let dragStart = null;

  const toCanvas = (e) => {
    const box = stage.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * PREVIEW,
      y: ((e.clientY - box.top) / box.height) * PREVIEW,
    };
  };

  stage.addEventListener("pointerdown", (e) => {
    const p = toCanvas(e);
    const hit = pickCell(p.x, p.y);
    if (hit < 0) return;
    selected = hit;
    dragging = true;
    dragMoved = false;
    dragStart = snapshot();
    lastX = p.x;
    lastY = p.y;
    stage.setPointerCapture(e.pointerId);
    stage.style.cursor = "grabbing";
    render();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = toCanvas(e);
    const cell = state.cells[selected];
    const rect = panelRects()[selected];
    if (!rect) return;
    const dx = (p.x - lastX) / rect.w;
    const dy = (p.y - lastY) / rect.h;
    if (Math.abs(dx) + Math.abs(dy) > 0.001) dragMoved = true;
    cell.dx = Math.max(-1, Math.min(1, (cell.dx || 0) + dx));
    cell.dy = Math.max(-1, Math.min(1, (cell.dy || 0) + dy));
    lastX = p.x;
    lastY = p.y;
    render();
  });
  const endDrag = () => {
    if (dragging && dragMoved && dragStart !== null && dragStart !== snapshot()) commit(dragStart);
    dragging = false;
    dragStart = null;
    stage.style.cursor = "grab";
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  // Wheel zoom, batched: one history entry per burst of scrolling.
  let wheelStart = null;
  let wheelTimer = null;
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = toCanvas(e);
    const hit = pickCell(p.x, p.y);
    if (hit < 0) return;
    selected = hit;
    if (wheelStart === null) wheelStart = snapshot();
    const cell = state.cells[selected];
    const next = (cell.zoom || 1) * (e.deltaY < 0 ? 1.08 : 1 / 1.08);
    cell.zoom = Math.max(0.5, Math.min(4, next));
    render();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      if (wheelStart !== null && wheelStart !== snapshot()) commit(wheelStart);
      wheelStart = null;
    }, 400);
  }, { passive: false });

  // Keyboard: arrows nudge the selected panel, + / - zoom it.
  // Nudges batch into one history entry, flushed when the key lifts.
  let keyBatch = null;
  window.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    const cell = state.cells[selected];
    const step = 0.02;
    let used = true;
    // Capture the pre-nudge snapshot BEFORE mutating, so undo restores it.
    const isNudge = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"].includes(e.key);
    if (isNudge && keyBatch === null) keyBatch = snapshot();
    if (e.key === "ArrowLeft") cell.dx = Math.max(-1, (cell.dx || 0) - step);
    else if (e.key === "ArrowRight") cell.dx = Math.min(1, (cell.dx || 0) + step);
    else if (e.key === "ArrowUp") cell.dy = Math.max(-1, (cell.dy || 0) - step);
    else if (e.key === "ArrowDown") cell.dy = Math.min(1, (cell.dy || 0) + step);
    else if (e.key === "+" || e.key === "=") cell.zoom = Math.min(4, (cell.zoom || 1) * 1.1);
    else if (e.key === "-") cell.zoom = Math.max(0.5, (cell.zoom || 1) / 1.1);
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) undo();
    else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) redo();
    else used = false;
    if (used) {
      e.preventDefault();
      render();
    }
  });
  window.addEventListener("keyup", () => {
    if (keyBatch !== null && keyBatch !== snapshot()) commit(keyBatch);
    keyBatch = null;
  });
}

// --------------------------------------------------------------- shot mode
function applyShotParams(params) {
  if (params.layout && findLayout(params.layout)) {
    state.layout = params.layout;
    state.cells = freshCells(state.layout, state.cells);
  }
  if (params.grade) state.grade = params.grade;
  if (params.lettering) state.lettering = params.lettering;
  if (params.caption) state.title = params.caption.slice(0, 30);
  if (params.subtitle) state.subtitle = params.subtitle.slice(0, 60);
  if (params.ribbon) state.ribbon = params.ribbon.slice(0, 24);
  if (typeof params.stars === "number") state.stars = Math.max(0, Math.min(5, params.stars));
  if (params.photo && shotById(params.photo)) {
    state.cells = state.cells.map((cell) => ({ ...cell, shot: params.photo }));
  }
}

// -------------------------------------------------------------------- boot
async function boot() {
  stage = $("cover-canvas");
  stage.width = PREVIEW;
  stage.height = PREVIEW;
  ctx = stage.getContext("2d");
  photos = await loadSamples("");
  const params = readShotParams();
  if (Object.keys(params).length) applyShotParams(params);
  buildControls();
  wireEvents();
  if (params.shot === "cover") {
    document.body.classList.add("shot-cover");
    stage.style.width = "100vw";
    stage.style.height = "100vh";
    stage.style.maxWidth = "none";
    const side = Math.min(window.innerWidth, window.innerHeight);
    stage.width = side;
    stage.height = side;
    ctx = stage.getContext("2d");
    paintCover(ctx, side, side, state, new Map([...photos, ...customPhotos]));
    document.title = "Vice Coast — cover shot";
  } else {
    render();
  }
  window.__vice = {
    get state() { return state; },
    render,
    undo,
    redo,
    exportDataUrl,
    selectCell(i) { selected = i; render(); },
  };
}

boot();
