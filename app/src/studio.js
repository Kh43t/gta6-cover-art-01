// Vice Coast Cover Studio — editor controller (v7).
// Owns the cover state, the undo/redo history, every control on the
// page, panel picking and cropping, and the one-click exports.
// The renderer (cover.js) only paints; this module decides what to paint.

import {
  EXPORT_SIZES,
  GRADES,
  LAYOUTS,
  LETTERINGS,
  MAX_TITLE,
  findLayout,
  freshCover,
  slugify,
} from "./presets.js";
import { frameRects, renderCover } from "./cover.js";
import {
  SAMPLES,
  addUserPhoto,
  applyLinkParams,
  loadSamples,
  readLinkParams,
} from "./shots.js";

const $ = (id) => document.getElementById(id);

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export class Studio {
  constructor(canvas, photos) {
    this.canvas = canvas;
    this.photos = photos;
    this.state = freshCover();
    this.past = [];
    this.future = [];
    this.selected = 0;
    this.drag = null;
    this.wheelTimer = null;
  }

  // --- state + history -----------------------------------------------------

  // Snapshot the CURRENT state for undo. Called BEFORE a mutation.
  // NOTE: this deliberately does NOT sync the chrome — syncChrome()
  // rewrites the controls from state, which would clobber the very
  // control value a change handler is about to read.
  commit() {
    this.pushPast(cloneState(this.state));
  }

  // Push a snapshot taken BEFORE a change onto the undo stack.
  pushPast(snap) {
    this.past.push(snap);
    if (this.past.length > 80) this.past.shift();
    this.future.length = 0;
  }

  snapshot() {
    return cloneState(this.state);
  }

  undo() {
    if (!this.past.length) return;
    this.future.push(cloneState(this.state));
    this.state = this.past.pop();
    this.clampSelection();
    this.render();
    this.syncChrome();
  }

  redo() {
    if (!this.future.length) return;
    this.past.push(cloneState(this.state));
    this.state = this.future.pop();
    this.clampSelection();
    this.render();
    this.syncChrome();
  }

  clampSelection() {
    const n = findLayout(this.state.layout).frames.length;
    if (this.selected >= n) this.selected = n - 1;
    if (this.selected < 0) this.selected = 0;
  }

  panel() {
    return this.state.panels[this.selected];
  }

  setShot(shotId) {
    this.commit();
    this.panel().shot = shotId;
    this.render();
  }

  // --- rendering -----------------------------------------------------------

  render() {
    renderCover(this.canvas, this.state, this.photos);
    this.outlineSelection();
  }

  outlineSelection() {
    if (document.body.classList.contains("shot-cover")) return;
    const ctx = this.canvas.getContext("2d");
    const rect = frameRects(this.state, this.canvas.width, this.canvas.height)[this.selected];
    if (!rect) return;
    ctx.save();
    ctx.strokeStyle = "#ffd76e";
    ctx.lineWidth = Math.max(3, this.canvas.width * 0.004);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffd76e";
    ctx.font = `700 ${Math.max(15, this.canvas.width * 0.018)}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`PANEL ${this.selected + 1}`, rect.x + 10, rect.y + 8);
    ctx.restore();
  }

  // --- chrome sync ---------------------------------------------------------

  syncChrome() {
    $("layoutSelect").value = this.state.layout;
    $("gradeSelect").value = this.state.grade;
    $("letteringSelect").value = this.state.lettering;
    $("titleInput").value = this.state.title;
    $("subtitleInput").value = this.state.subtitle;
    $("ribbonInput").value = this.state.ribbon;
    $("starsInput").value = String(this.state.stars);
    $("starsValue").textContent = `${this.state.stars} / 5`;
    const p = this.panel();
    $("zoomRange").value = String(p.zoom);
    $("oxRange").value = String(p.ox);
    $("oyRange").value = String(p.oy);
    $("zoomValue").textContent = `${p.zoom.toFixed(2)}×`;
    $("oxValue").textContent = p.ox.toFixed(2);
    $("oyValue").textContent = p.oy.toFixed(2);
    const shot = SAMPLES.find((s) => s.id === p.shot);
    $("panelLabel").textContent =
      `Panel ${this.selected + 1} of ${findLayout(this.state.layout).frames.length}` +
      ` — ${shot ? shot.label : p.shot ? "Your photo" : "Empty"}`;
    $("undoBtn").disabled = this.past.length === 0;
    $("redoBtn").disabled = this.future.length === 0;
    document.querySelectorAll("#sampleStrip button").forEach((b) => {
      b.classList.toggle("active", b.dataset.shot === p.shot);
    });
  }

  // --- picking + cropping --------------------------------------------------

  pickAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * this.canvas.width;
    const y = ((clientY - r.top) / r.height) * this.canvas.height;
    const rects = frameRects(this.state, this.canvas.width, this.canvas.height);
    for (let i = rects.length - 1; i >= 0; i--) {
      const f = rects[i];
      if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return i;
    }
    return -1;
  }

  bindCanvas() {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      const hit = this.pickAt(e.clientX, e.clientY);
      if (hit < 0) return;
      this.selected = hit;
      this.syncChrome();
      this.render();
      const startPanel = cloneState(this.panel());
      this.drag = { x: e.clientX, y: e.clientY, startPanel, moved: false, snapshot: this.snapshot() };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!this.drag) return;
      const r = el.getBoundingClientRect();
      const rects = frameRects(this.state, this.canvas.width, this.canvas.height);
      const f = rects[this.selected];
      const dx = (e.clientX - this.drag.x) / r.width;
      const dy = (e.clientY - this.drag.y) / r.height;
      if (Math.abs(dx) + Math.abs(dy) > 0.002) this.drag.moved = true;
      const p = this.panel();
      p.ox = clamp(this.drag.startPanel.ox + dx / (f.w / this.canvas.width), -1, 1);
      p.oy = clamp(this.drag.startPanel.oy + dy / (f.h / this.canvas.height), -1, 1);
      this.render();
      this.syncChrome();
    });
    el.addEventListener("pointerup", () => {
      if (this.drag && this.drag.moved) {
        this.pushPast(this.drag.snapshot);
        this.syncChrome();
      }
      this.drag = null;
    });
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const hit = this.pickAt(e.clientX, e.clientY);
      if (hit >= 0) this.selected = hit;
      if (!this.wheelBurst) {
        this.commit();
        this.wheelBurst = true;
      }
      const p = this.panel();
      p.zoom = clamp(p.zoom * Math.exp(-e.deltaY * 0.0012), 1, 4);
      this.render();
      this.syncChrome();
      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => { this.wheelBurst = false; }, 350);
    }, { passive: false });
  }

  bindKeys() {
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        this.redo();
        return;
      }
      if (mod) return;
      const step = e.shiftKey ? 0.01 : 0.03;
      const known = ["arrowleft", "arrowright", "arrowup", "arrowdown", "+", "=", "-", "_"];
      if (!known.includes(key)) return;
      e.preventDefault();
      this.commit(); // snapshot BEFORE the nudge, so undo restores it
      const p = this.panel();
      if (key === "arrowleft") p.ox = clamp(p.ox - step, -1, 1);
      else if (key === "arrowright") p.ox = clamp(p.ox + step, -1, 1);
      else if (key === "arrowup") p.oy = clamp(p.oy - step, -1, 1);
      else if (key === "arrowdown") p.oy = clamp(p.oy + step, -1, 1);
      else if (key === "+" || key === "=") p.zoom = clamp(p.zoom * 1.08, 1, 4);
      else if (key === "-" || key === "_") p.zoom = clamp(p.zoom / 1.08, 1, 4);
      this.render();
      this.syncChrome();
    });
  }

  // --- controls ------------------------------------------------------------

  fillSelect(el, items, current) {
    el.innerHTML = "";
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = `${item.label} — ${item.blurb}`;
      el.appendChild(opt);
    }
    el.value = current;
  }

  buildSamples() {
    const strip = $("sampleStrip");
    strip.innerHTML = "";
    for (const s of SAMPLES) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.shot = s.id;
      b.textContent = s.label;
      b.addEventListener("click", () => this.setShot(s.id));
      strip.appendChild(b);
    }
  }

  bindControls() {
    this.fillSelect($("layoutSelect"), LAYOUTS, this.state.layout);
    this.fillSelect($("gradeSelect"), GRADES, this.state.grade);
    this.fillSelect($("letteringSelect"), LETTERINGS, this.state.lettering);
    this.buildSamples();

    $("layoutSelect").addEventListener("change", (e) => {
      this.commit();
      this.state.layout = e.target.value;
      this.clampSelection();
      this.render();
      this.syncChrome();
    });
    $("gradeSelect").addEventListener("change", (e) => {
      this.commit();
      this.state.grade = e.target.value;
      this.render();
      this.syncChrome();
    });
    $("letteringSelect").addEventListener("change", (e) => {
      this.commit();
      this.state.lettering = e.target.value;
      this.render();
      this.syncChrome();
    });
    // Text fields: snapshot on focus (before any typing), so undo works.
    for (const id of ["titleInput", "subtitleInput", "ribbonInput"]) {
      $(id).addEventListener("focus", () => this.commit());
    }
    $("titleInput").addEventListener("input", (e) => {
      this.state.title = e.target.value.slice(0, MAX_TITLE).toUpperCase();
      this.render();
    });
    $("subtitleInput").addEventListener("input", (e) => {
      this.state.subtitle = e.target.value.toUpperCase();
      this.render();
    });
    $("ribbonInput").addEventListener("input", (e) => {
      this.state.ribbon = e.target.value;
      this.render();
    });
    $("starsInput").addEventListener("input", (e) => {
      if (!this.starsBurst) {
        this.commit();
        this.starsBurst = true;
      }
      this.state.stars = Number(e.target.value);
      this.render();
      this.syncChrome();
    });
    $("starsInput").addEventListener("change", () => { this.starsBurst = false; });

    const bindSlider = (id, key) => {
      $(id).addEventListener("input", (e) => {
        if (!this.sliderBurst) {
          this.commit(); // snapshot before the first move of this drag
          this.sliderBurst = true;
        }
        this.panel()[key] = Number(e.target.value);
        this.render();
        this.syncChrome();
      });
      $(id).addEventListener("change", () => { this.sliderBurst = false; });
    };
    bindSlider("zoomRange", "zoom");
    bindSlider("oxRange", "ox");
    bindSlider("oyRange", "oy");

    $("undoBtn").addEventListener("click", () => this.undo());
    $("redoBtn").addEventListener("click", () => this.redo());

    $("addPhotoBtn").addEventListener("click", () => $("addPhotoInput").click());
    $("addPhotoInput").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const id = await addUserPhoto(this.photos, file);
      if (id) this.setShot(id);
      e.target.value = "";
    });

    $("exportSquare").addEventListener("click", () => this.exportOne(EXPORT_SIZES[0]));
    $("exportPortrait").addEventListener("click", () => this.exportOne(EXPORT_SIZES[1]));
    $("exportWide").addEventListener("click", () => this.exportOne(EXPORT_SIZES[2]));
    $("exportAll").addEventListener("click", async () => {
      for (const size of EXPORT_SIZES) await this.exportOne(size);
    });
  }

  // --- export --------------------------------------------------------------

  exportName(size) {
    return `${slugify(this.state.title)}-${size.w}x${size.h}.png`;
  }

  async exportOne(size) {
    const off = document.createElement("canvas");
    off.width = size.w;
    off.height = size.h;
    renderCover(off, this.state, this.photos);
    const blob = await new Promise((res) => off.toBlob(res, "image/png"));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.exportName(size);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return this.exportName(size);
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// --- boot ------------------------------------------------------------------

export async function boot() {
  const canvas = $("coverCanvas");
  const params = readLinkParams();
  const photos = await loadSamples("");
  const studio = new Studio(canvas, photos);
  if (params.shot || params.photo || params.caption || params.layout || params.grade || params.lettering) {
    applyLinkParams(studio.state, params);
  }
  window.__studio = studio;

  if (params.shot === "cover") {
    document.body.classList.add("shot-cover");
    const fit = () => {
      canvas.width = Math.max(320, window.innerWidth);
      canvas.height = Math.max(320, window.innerHeight);
      studio.render();
    };
    window.addEventListener("resize", fit);
    fit();
    return studio;
  }

  studio.bindCanvas();
  studio.bindKeys();
  studio.bindControls();
  studio.syncChrome();
  studio.render();
  return studio;
}

boot();
