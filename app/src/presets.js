// Vice Coast Cover Studio — preset tables.
// Pure data: layouts, colour grades, lettering styles, export sizes.
// Nothing here touches the DOM; cover.js consumes these tables.

export const LAYOUTS = [
  {
    id: "hero-trio",
    label: "Hero + Trio",
    blurb: "One big hero shot over three small panels.",
    cells: 4,
    // Rects are fractions of the cover area above the title band.
    // [x, y, w, h] with origin at the top-left of the photo area.
    rects: [
      [0, 0, 1, 0.62],
      [0, 0.62, 0.34, 0.38],
      [0.33, 0.62, 0.34, 0.38],
      [0.66, 0.62, 0.34, 0.38],
    ],
    gap: 0.012,
    tilt: 0,
  },
  {
    id: "four-square",
    label: "Four Square",
    blurb: "A clean 2 by 2 grid.",
    cells: 4,
    rects: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
    gap: 0.012,
    tilt: 0,
  },
  {
    id: "nine-panel",
    label: "Nine Panel",
    blurb: "A 3 by 3 contact sheet.",
    cells: 9,
    rects: [
      [0, 0, 1 / 3, 1 / 3],
      [1 / 3, 0, 1 / 3, 1 / 3],
      [2 / 3, 0, 1 / 3, 1 / 3],
      [0, 1 / 3, 1 / 3, 1 / 3],
      [1 / 3, 1 / 3, 1 / 3, 1 / 3],
      [2 / 3, 1 / 3, 1 / 3, 1 / 3],
      [0, 2 / 3, 1 / 3, 1 / 3],
      [1 / 3, 2 / 3, 1 / 3, 1 / 3],
      [2 / 3, 2 / 3, 1 / 3, 1 / 3],
    ],
    gap: 0.01,
    tilt: 0,
  },
  {
    id: "tilted-snaps",
    label: "Tilted Snaps",
    blurb: "Three overlapping snapshots with white polaroid borders.",
    cells: 3,
    rects: [
      [0.02, 0.05, 0.42, 0.86],
      [0.3, 0.01, 0.42, 0.86],
      [0.56, 0.07, 0.42, 0.86],
    ],
    gap: 0,
    tilt: 1,
    // Degrees of rotation per cell, left to right.
    spins: [-4, 3, -2],
    border: 0.055,
  },
  {
    id: "full-bleed",
    label: "Full Bleed",
    blurb: "One photo, edge to edge.",
    cells: 1,
    rects: [[0, 0, 1, 1]],
    gap: 0,
    tilt: 0,
  },
  {
    id: "triptych",
    label: "Triptych",
    blurb: "Three tall columns.",
    cells: 3,
    rects: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
    ],
    gap: 0.012,
    tilt: 0,
  },
];

// A grade is a gradient map: luminance 0..1 walks through `stops`
// ([position, r, g, b]). `keep` is how much of the photo's own colour
// survives (0 = full gradient map, 1 = untouched photo).
export const GRADES = [
  {
    id: "vice-sunset",
    label: "Vice Sunset",
    blurb: "Magenta dusk over hot orange.",
    keep: 0.32,
    stops: [
      [0, 16, 4, 44],
      [0.28, 96, 20, 92],
      [0.55, 214, 58, 110],
      [0.78, 255, 140, 60],
      [1, 255, 226, 150],
    ],
  },
  {
    id: "neon-night",
    label: "Neon Night",
    blurb: "Cyan and violet after dark.",
    keep: 0.3,
    stops: [
      [0, 4, 6, 26],
      [0.3, 24, 30, 96],
      [0.55, 96, 44, 168],
      [0.8, 40, 214, 220],
      [1, 214, 246, 255],
    ],
  },
  {
    id: "palm-gold",
    label: "Palm Gold",
    blurb: "Warm late-afternoon gold.",
    keep: 0.38,
    stops: [
      [0, 26, 14, 4],
      [0.3, 96, 52, 14],
      [0.58, 196, 116, 34],
      [0.82, 246, 184, 84],
      [1, 255, 240, 196],
    ],
  },
  {
    id: "teal-heat",
    label: "Teal Heat",
    blurb: "Teal shadows, ember highlights.",
    keep: 0.34,
    stops: [
      [0, 4, 26, 30],
      [0.32, 8, 84, 96],
      [0.58, 28, 148, 132],
      [0.8, 232, 122, 54],
      [1, 255, 214, 150],
    ],
  },
  {
    id: "noir",
    label: "Noir",
    blurb: "Hard black and white with silver mids.",
    keep: 0.08,
    stops: [
      [0, 2, 2, 2],
      [0.25, 34, 34, 36],
      [0.5, 128, 128, 130],
      [0.75, 206, 206, 208],
      [1, 252, 252, 252],
    ],
  },
];

// Lettering styles for the big title on the sunset band.
// `font` is a canvas font string template; %SIZE% is replaced at draw time.
export const LETTERINGS = [
  {
    id: "block",
    label: "Vice Block",
    blurb: "Heavy upright capitals with a dark outline.",
    font: "900 %SIZE%px Impact, 'Arial Black', sans-serif",
    fill: "#fff6e8",
    outline: "#1a0518",
    outlineWidth: 0.09,
    skew: 0,
    tracking: 0.02,
  },
  {
    id: "slant",
    label: "Sunset Slant",
    blurb: "Leaning italics with a hot-pink drop shadow.",
    font: "italic 900 %SIZE%px Impact, 'Arial Black', sans-serif",
    fill: "#ffe9a8",
    outline: "#3d0a3a",
    outlineWidth: 0.07,
    skew: -0.12,
    tracking: 0.03,
    shadow: "#ff2e88",
  },
  {
    id: "condensed",
    label: "Noir Condensed",
    blurb: "Tall narrow capitals, white on black.",
    font: "800 %SIZE%px 'Arial Narrow', 'Helvetica Neue Condensed', sans-serif",
    fill: "#ffffff",
    outline: "#000000",
    outlineWidth: 0.05,
    skew: 0,
    tracking: 0.12,
  },
];

export const EXPORT_SIZES = [
  { id: "square", label: "Square 1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait 1080 × 1350", w: 1080, h: 1350 },
  { id: "wide", label: "Wide 1920 × 1080", w: 1920, h: 1080 },
];

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function findLettering(id) {
  return LETTERINGS.find((l) => l.id === id) || LETTERINGS[0];
}
