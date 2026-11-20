// Vice Coast Cover Studio — preset data (v7).
// Everything the renderer and the editor need to know about looks:
// layouts, colour grades, lettering styles, export sizes, defaults.
// No DOM access here; this module is pure data plus tiny lookups.

export const PHOTO_ZONE = 0.7; // fraction of the cover height above the title band

// Frames are fractions of the photo zone (x, y, w, h in 0..1).
// `tilt` is degrees of rotation; `mat` draws a white polaroid-style mat.
export const LAYOUTS = [
  {
    id: "hero-trio",
    label: "Hero + Trio",
    blurb: "One big hero shot over three small panels.",
    frames: [
      { x: 0.015, y: 0.015, w: 0.97, h: 0.6 },
      { x: 0.015, y: 0.635, w: 0.313, h: 0.35 },
      { x: 0.343, y: 0.635, w: 0.313, h: 0.35 },
      { x: 0.672, y: 0.635, w: 0.313, h: 0.35 },
    ],
  },
  {
    id: "four-square",
    label: "Four Square",
    blurb: "A clean two-by-two grid.",
    frames: [
      { x: 0.015, y: 0.015, w: 0.48, h: 0.48 },
      { x: 0.505, y: 0.015, w: 0.48, h: 0.48 },
      { x: 0.015, y: 0.505, w: 0.48, h: 0.48 },
      { x: 0.505, y: 0.505, w: 0.48, h: 0.48 },
    ],
  },
  {
    id: "nine-panel",
    label: "Nine Panel",
    blurb: "A three-by-three contact sheet.",
    frames: [
      { x: 0.012, y: 0.012, w: 0.318, h: 0.318 },
      { x: 0.341, y: 0.012, w: 0.318, h: 0.318 },
      { x: 0.67, y: 0.012, w: 0.318, h: 0.318 },
      { x: 0.012, y: 0.341, w: 0.318, h: 0.318 },
      { x: 0.341, y: 0.341, w: 0.318, h: 0.318 },
      { x: 0.67, y: 0.341, w: 0.318, h: 0.318 },
      { x: 0.012, y: 0.67, w: 0.318, h: 0.318 },
      { x: 0.341, y: 0.67, w: 0.318, h: 0.318 },
      { x: 0.67, y: 0.67, w: 0.318, h: 0.318 },
    ],
  },
  {
    id: "tilted-snaps",
    label: "Tilted Snaps",
    blurb: "Three overlapping snapshots with white borders.",
    frames: [
      { x: 0.02, y: 0.06, w: 0.44, h: 0.78, tilt: -5, mat: true },
      { x: 0.29, y: 0.02, w: 0.44, h: 0.78, tilt: 3, mat: true },
      { x: 0.55, y: 0.06, w: 0.44, h: 0.78, tilt: -2, mat: true },
    ],
  },
  {
    id: "full-bleed",
    label: "Full Bleed",
    blurb: "One photo, edge to edge.",
    frames: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: "triptych",
    label: "Triptych",
    blurb: "Three tall columns.",
    frames: [
      { x: 0.015, y: 0.015, w: 0.313, h: 0.97 },
      { x: 0.343, y: 0.015, w: 0.313, h: 0.97 },
      { x: 0.672, y: 0.015, w: 0.313, h: 0.97 },
    ],
  },
];

// A grade is a gradient-map LUT: each stop is [position 0..1, hex colour].
// A pixel's luminance picks a colour off the ramp; `keep` blends a little
// of the photo's own colour back in so faces stay readable.
export const GRADES = [
  {
    id: "vice-sunset",
    label: "Vice Sunset",
    blurb: "Magenta dusk over hot orange.",
    keep: 0.22,
    stops: [
      [0.0, "#12041f"],
      [0.28, "#5b1150"],
      [0.55, "#c62b6e"],
      [0.78, "#ff7a3d"],
      [1.0, "#ffd76e"],
    ],
  },
  {
    id: "neon-night",
    label: "Neon Night",
    blurb: "Cyan and violet after dark.",
    keep: 0.18,
    stops: [
      [0.0, "#020617"],
      [0.3, "#1b2a6b"],
      [0.55, "#6d28a8"],
      [0.8, "#22d3ee"],
      [1.0, "#e0f2fe"],
    ],
  },
  {
    id: "palm-gold",
    label: "Palm Gold",
    blurb: "Warm late-afternoon gold.",
    keep: 0.3,
    stops: [
      [0.0, "#1c0f02"],
      [0.3, "#6b3a08"],
      [0.55, "#c07f1e"],
      [0.8, "#f2b544"],
      [1.0, "#fff3c4"],
    ],
  },
  {
    id: "teal-heat",
    label: "Teal Heat",
    blurb: "Teal shadows, ember highlights.",
    keep: 0.22,
    stops: [
      [0.0, "#03181c"],
      [0.3, "#0f766e"],
      [0.55, "#3f7d6b"],
      [0.8, "#f97316"],
      [1.0, "#ffedd5"],
    ],
  },
  {
    id: "noir",
    label: "Noir",
    blurb: "Hard black and white with silver mids.",
    keep: 0.0,
    stops: [
      [0.0, "#000000"],
      [0.35, "#3f3f46"],
      [0.65, "#a1a1aa"],
      [1.0, "#ffffff"],
    ],
  },
];

// Lettering styles for the big title on the sunset band.
export const LETTERINGS = [
  {
    id: "vice-block",
    label: "Vice Block",
    blurb: "Heavy upright capitals.",
    family: "'Arial Black', 'Archivo Black', sans-serif",
    weight: 900,
    italic: false,
    squeeze: 1,
    glow: null,
    fill: "#ffffff",
  },
  {
    id: "sunset-slant",
    label: "Sunset Slant",
    blurb: "Leaning italics with a hot-pink glow.",
    family: "'Arial Black', sans-serif",
    weight: 900,
    italic: true,
    squeeze: 1,
    glow: "#ff2d78",
    fill: "#fff7ed",
  },
  {
    id: "noir-condensed",
    label: "Noir Condensed",
    blurb: "Tall narrow capitals.",
    family: "Impact, 'Arial Narrow', sans-serif",
    weight: 400,
    italic: false,
    squeeze: 0.78,
    glow: null,
    fill: "#f4f4f5",
  },
];

// One-click export sizes.
export const EXPORT_SIZES = [
  { id: "square", label: "Square 1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait 1080 × 1350", w: 1080, h: 1350 },
  { id: "wide", label: "Wide 1920 × 1080", w: 1920, h: 1080 },
];

export const MAX_TITLE = 30;
export const MAX_PANELS = 9;

// A fresh cover: hero layout, sunset grade, block lettering, pier everywhere.
export function freshCover() {
  return {
    layout: "hero-trio",
    grade: "vice-sunset",
    lettering: "vice-block",
    title: "VICE COAST",
    subtitle: "SUNSET BOULEVARD • EST. 1986",
    ribbon: "VICE CITY",
    stars: 4,
    panels: Array.from({ length: MAX_PANELS }, (_, i) => ({
      shot: i === 0 ? "pier" : i % 3 === 1 ? "boulevard" : "rooftop",
      zoom: 1,
      ox: 0,
      oy: 0,
    })),
  };
}

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function findLettering(id) {
  return LETTERINGS.find((l) => l.id === id) || LETTERINGS[0];
}

// Turn a title into a safe file-name stem, e.g. "Vice Coast!" -> "vice-coast".
export function slugify(text) {
  const slug = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "vice-coast";
}
