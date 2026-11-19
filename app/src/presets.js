// Vice Coast Cover Studio — presets: the layouts, colour grades, export sizes and
// lettering styles the cover engine offers. Everything here is plain data so the
// renderer (cover.js) stays free of hard-coded numbers. Fractions are relative to
// the cover's own width and height; the title band sits at the foot of every layout.

export const SIZES = {
  square: { label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  wide: { label: 'Landscape · 1920 × 1080', width: 1920, height: 1080 },
};

// A panel is one photo cell: x/y/w/h as fractions of the cover, an optional tilt
// in degrees, and a frame style. 'ink' is a white gutter with a black comic outline;
// 'polaroid' is a thick white snapshot border with a soft shadow.
export const LAYOUTS = {
  hero: {
    label: 'Hero + Trio',
    blurb: 'One big moment, three snapshots below.',
    titleBand: { y: 0.84, h: 0.16 },
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6, rot: 0, frame: 'ink' },
      { x: 0, y: 0.6, w: 1 / 3, h: 0.24, rot: 0, frame: 'ink' },
      { x: 1 / 3, y: 0.6, w: 1 / 3, h: 0.24, rot: 0, frame: 'ink' },
      { x: 2 / 3, y: 0.6, w: 1 / 3, h: 0.24, rot: 0, frame: 'ink' },
    ],
  },
  grid4: {
    label: 'Four Square',
    blurb: 'A clean 2 × 2 comic grid.',
    titleBand: { y: 0.84, h: 0.16 },
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.42, rot: 0, frame: 'ink' },
      { x: 0.5, y: 0, w: 0.5, h: 0.42, rot: 0, frame: 'ink' },
      { x: 0, y: 0.42, w: 0.5, h: 0.42, rot: 0, frame: 'ink' },
      { x: 0.5, y: 0.42, w: 0.5, h: 0.42, rot: 0, frame: 'ink' },
    ],
  },
  grid9: {
    label: 'Nine Panel',
    blurb: 'A dense 3 × 3 poster grid with a title cell.',
    titleBand: { y: 0.84, h: 0.16 },
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 0, y: 0.28, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 1 / 3, y: 0.28, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink', titleCell: true },
      { x: 2 / 3, y: 0.28, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 0, y: 0.56, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 1 / 3, y: 0.56, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
      { x: 2 / 3, y: 0.56, w: 1 / 3, h: 0.28, rot: 0, frame: 'ink' },
    ],
  },
  tilt: {
    label: 'Tilted Snaps',
    blurb: 'Overlapping snapshots tossed on a sunset.',
    titleBand: { y: 0.84, h: 0.16 },
    panels: [
      { x: 0.05, y: 0.04, w: 0.43, h: 0.52, rot: -6, frame: 'polaroid' },
      { x: 0.52, y: 0.02, w: 0.43, h: 0.52, rot: 5, frame: 'polaroid' },
      { x: 0.27, y: 0.4, w: 0.46, h: 0.4, rot: -2, frame: 'polaroid' },
    ],
  },
  bleed: {
    label: 'Full Bleed',
    blurb: 'One photo edge to edge, snapshot tucked in.',
    titleBand: { y: 0.84, h: 0.16 },
    panels: [
      { x: 0, y: 0, w: 1, h: 0.84, rot: 0, frame: 'none' },
      { x: 0.58, y: 0.5, w: 0.37, h: 0.3, rot: 4, frame: 'polaroid' },
    ],
  },
  triptych: {
    label: 'Triptych',
    blurb: 'Three tall panels side by side.',
    titleBand: { y: 0.84, h: 0.16 },
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 0.84, rot: 0, frame: 'ink' },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.84, rot: 0, frame: 'ink' },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.84, rot: 0, frame: 'ink' },
    ],
  },
};

// A grade is a gradient map: a pixel's luminance picks a colour along these stops,
// so shadows go deep violet and highlights go hot. Stops run dark to light.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    swatch: ['#1a0b2e', '#7b2d8b', '#e8447c', '#ff9a3d', '#ffe29a'],
    stops: ['#160a26', '#7b2d8b', '#e8447c', '#ff9a3d', '#ffe29a'],
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

// Lettering styles for the big title. 'sunset' fills the letters with the same
// dusk gradient the title band wears; 'neon' glows pink with a cyan edge.
export const TITLE_STYLES = {
  sunset: { label: 'Sunset fill', fill: 'sunset', glow: 'rgba(255, 94, 120, 0.55)' },
  white: { label: 'White block', fill: 'white', glow: 'rgba(0, 0, 0, 0.45)' },
  neon: { label: 'Neon pink', fill: 'neon', glow: 'rgba(0, 229, 255, 0.8)' },
};

export const MAX_PANELS = 9;
export const DEFAULT_TITLE = 'Sunset Heist';
export const DEFAULT_SUBTITLE = 'Vice Coast Stories';
export const DEFAULT_BADGE = 'VICE COAST';
