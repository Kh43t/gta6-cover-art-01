// Vice Coast Cover Studio v2 — the catalogue: export sizes, panel layouts,
// colour grades, lettering and one-click looks. All plain data, so the
// renderer (cover.js) never hard-codes a number. Every rectangle is a
// fraction of the cover's own width and height.
//
// One change from v1 that shapes everything else: the title band is now a
// full quarter of the cover (top 0.74, height 0.26) instead of a 16% strip.
// The top entries on the board all give their title that room — huge,
// legible lettering with a sunburst behind it — and a thin band clips the
// title at small sizes. The photo area above it is 0.74 tall.

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Landscape · 1920 × 1080', width: 1920, height: 1080 },
];

export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
}

// A cell is one photo slot: x/y/w/h as fractions of the cover, a tilt in
// degrees, and a frame. 'ink' is a white gutter with a black comic outline;
// 'snap' is a thick white snapshot border with a soft drop shadow;
// 'bare' has no frame at all. A cell flagged titleCell is painted over with
// the kicker instead of a photo.
export const LAYOUTS = [
  {
    id: 'hero',
    label: 'Hero + Trio',
    blurb: 'One big moment, three snapshots below.',
    band: { top: 0.74, height: 0.26 },
    cells: [
      { x: 0, y: 0, w: 1, h: 0.58, tilt: 0, frame: 'ink' },
      { x: 0, y: 0.58, w: 1 / 3, h: 0.16, tilt: 0, frame: 'ink' },
      { x: 1 / 3, y: 0.58, w: 1 / 3, h: 0.16, tilt: 0, frame: 'ink' },
      { x: 2 / 3, y: 0.58, w: 1 / 3, h: 0.16, tilt: 0, frame: 'ink' },
    ],
  },
  {
    id: 'grid4',
    label: 'Four Square',
    blurb: 'A clean 2 × 2 comic grid.',
    band: { top: 0.74, height: 0.26 },
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.37, tilt: 0, frame: 'ink' },
      { x: 0.5, y: 0, w: 0.5, h: 0.37, tilt: 0, frame: 'ink' },
      { x: 0, y: 0.37, w: 0.5, h: 0.37, tilt: 0, frame: 'ink' },
      { x: 0.5, y: 0.37, w: 0.5, h: 0.37, tilt: 0, frame: 'ink' },
    ],
  },
  {
    id: 'grid9',
    label: 'Nine Panel',
    blurb: 'A dense 3 × 3 poster grid with a title cell.',
    band: { top: 0.74, height: 0.26 },
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 0, y: 0.2467, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 1 / 3, y: 0.2467, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink', titleCell: true },
      { x: 2 / 3, y: 0.2467, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 0, y: 0.4934, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 1 / 3, y: 0.4934, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
      { x: 2 / 3, y: 0.4934, w: 1 / 3, h: 0.2467, tilt: 0, frame: 'ink' },
    ],
  },
  {
    id: 'tilt',
    label: 'Tilted Snaps',
    blurb: 'Overlapping snapshots tossed on a sunset.',
    band: { top: 0.74, height: 0.26 },
    cells: [
      { x: 0.05, y: 0.03, w: 0.43, h: 0.5, tilt: -6, frame: 'snap' },
      { x: 0.52, y: 0.02, w: 0.43, h: 0.5, tilt: 5, frame: 'snap' },
      { x: 0.27, y: 0.38, w: 0.46, h: 0.36, tilt: -2, frame: 'snap' },
    ],
  },
  {
    id: 'bleed',
    label: 'Full Bleed',
    blurb: 'One photo edge to edge, snapshot tucked in.',
    band: { top: 0.74, height: 0.26 },
    cells: [
      { x: 0, y: 0, w: 1, h: 0.74, tilt: 0, frame: 'bare' },
      { x: 0.58, y: 0.42, w: 0.37, h: 0.28, tilt: 4, frame: 'snap' },
    ],
  },
  {
    id: 'triptych',
    label: 'Triptych',
    blurb: 'Three tall panels side by side.',
    band: { top: 0.74, height: 0.26 },
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 0.74, tilt: 0, frame: 'ink' },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.74, tilt: 0, frame: 'ink' },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.74, tilt: 0, frame: 'ink' },
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// A grade is a gradient map: a pixel's luminance picks a colour along the
// stops, so shadows go deep violet and highlights go hot. The stops here
// are deliberately gentler than v1's — v1's map at 80% strength crushed
// every photo into magenta mush and ate faces. These keep skin and detail
// readable, and the default strength is 0.45, not 0.8.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    swatch: ['#241239', '#8a3a8c', '#e85a7e', '#ff9a4d', '#ffe9a8'],
    stops: ['#241239', '#8a3a8c', '#e85a7e', '#ff9a4d', '#ffe9a8'],
  },
  coral: {
    label: 'Coral Heat',
    swatch: ['#1d0f33', '#7a2d6b', '#e85a6e', '#ff8a5c', '#ffd9a0'],
    stops: ['#1d0f33', '#7a2d6b', '#e85a6e', '#ff8a5c', '#ffd9a0'],
  },
  neon: {
    label: 'Neon Night',
    swatch: ['#04122e', '#123a6b', '#0e9aa7', '#ff2e88', '#7df9ff'],
    stops: ['#030d24', '#123a6b', '#0e9aa7', '#ff2e88', '#8ef6ff'],
  },
  gold: {
    label: 'Palm Gold',
    swatch: ['#160f04', '#5c3a10', '#b57708', '#ffb703', '#fff3b0'],
    stops: ['#120c02', '#5c3a10', '#b57708', '#ffb703', '#fff3b0'],
  },
  teal: {
    label: 'Teal Heat',
    swatch: ['#02181b', '#0b3d3a', '#17807a', '#ff7b54', '#ffe8d6'],
    stops: ['#021415', '#0b3d3a', '#17807a', '#ff7b54', '#ffe8d6'],
  },
  noir: {
    label: 'Noir',
    swatch: ['#0a0a12', '#23232e', '#55556a', '#a8a8bd', '#f2f2f5'],
    stops: ['#08080f', '#23232e', '#55556a', '#a8a8bd', '#f2f2f5'],
  },
};

// Lettering for the big title. 'sunset' fills letters with the dusk
// gradient; 'poster' is white with a hard pink drop shadow, the look the
// board's top covers use; 'neon' glows pink with a cyan edge; 'gold'
// is a warm metallic fill.
export const LETTERING = {
  sunset: { label: 'Sunset fill', fill: 'sunset', glow: 'rgba(255, 94, 120, 0.55)' },
  poster: { label: 'Poster white', fill: 'poster', glow: 'rgba(255, 46, 136, 0.9)' },
  neon: { label: 'Neon pink', fill: 'neon', glow: 'rgba(0, 229, 255, 0.8)' },
  gold: { label: 'Palm gold', fill: 'gold', glow: 'rgba(255, 183, 3, 0.6)' },
};

// One-click looks: a layout + grade + lettering that already work together,
// so a new user gets a finished cover in one tap.
export const LOOKS = [
  { id: 'golden-hour', label: 'Golden Hour', layout: 'hero', grade: 'sunset', lettering: 'sunset' },
  { id: 'coral-bay', label: 'Coral Bay', layout: 'grid4', grade: 'coral', lettering: 'poster' },
  { id: 'neon-tide', label: 'Neon Tide', layout: 'tilt', grade: 'neon', lettering: 'neon' },
  { id: 'palm-noir', label: 'Palm Noir', layout: 'triptych', grade: 'noir', lettering: 'gold' },
];

export const MAX_CELLS = 9;
export const DEFAULT_TITLE = 'Sunset Heist';
export const DEFAULT_TAGLINE = 'Vice Coast Stories';
export const DEFAULT_KICKER = 'VICE COAST';
export const DEFAULT_GRADE_STRENGTH = 0.45;
export const DEFAULT_TITLE_SCALE = 1;
