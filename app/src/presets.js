// Vice Coast Cover Studio — catalogue (v4).
//
// Every choice the studio offers lives here as plain data: the six cover
// arrangements, the five dusk grades, the three export sizes and the sample
// photos. The painter (cover.js) and the editor (studio.js) both read this
// one catalogue, so a layout or grade can never drift out of sync between
// the preview and the export.
//
// Shapes, in brief:
// - A layout is { name, note, band, frames }: `frames` are rectangles in
//   fractions of the cover, [x, y, w, h], plus an optional `tilt` in
//   degrees for the polaroid-style arrangements. `band` is the fraction of
//   the cover height the sunset lettering band takes at the bottom.
// - A grade is { name, note, stops, wash, warm }: `stops` is a gradient
//   map (position 0..1 -> [r, g, b]) that shadows, mids and highlights are
//   remapped through; `wash` is a soft colour veil over the whole cover;
//   `warm` nudges the red channel for golden-hour skin.
// - A size is { label, w, h } in export pixels.

export const LAYOUT_TABLE = {
  'vice-hero': {
    name: 'Vice Hero',
    note: 'One tall hero frame, three stacked moments beside it.',
    band: 0.26,
    frames: [
      { box: [0, 0, 0.64, 1], tilt: 0 },
      { box: [0.64, 0, 0.36, 0.34], tilt: 0 },
      { box: [0.64, 0.34, 0.36, 0.33], tilt: 0 },
      { box: [0.64, 0.67, 0.36, 0.33], tilt: 0 },
    ],
  },
  'sunset-strip': {
    name: 'Sunset Strip',
    note: 'A wide hero up top, three frames along the bottom.',
    band: 0.26,
    frames: [
      { box: [0, 0, 1, 0.6], tilt: 0 },
      { box: [0, 0.6, 0.34, 0.4], tilt: 0 },
      { box: [0.34, 0.6, 0.33, 0.4], tilt: 0 },
      { box: [0.67, 0.6, 0.33, 0.4], tilt: 0 },
    ],
  },
  'vice-quad': {
    name: 'Vice Quad',
    note: 'Four equal frames, the classic poster grid.',
    band: 0.24,
    frames: [
      { box: [0, 0, 0.5, 0.5], tilt: 0 },
      { box: [0.5, 0, 0.5, 0.5], tilt: 0 },
      { box: [0, 0.5, 0.5, 0.5], tilt: 0 },
      { box: [0.5, 0.5, 0.5, 0.5], tilt: 0 },
    ],
  },
  'neon-trio': {
    name: 'Neon Trio',
    note: 'Three tall strips, like a run of film stills.',
    band: 0.26,
    frames: [
      { box: [0, 0, 0.34, 1], tilt: 0 },
      { box: [0.34, 0, 0.33, 1], tilt: 0 },
      { box: [0.67, 0, 0.33, 1], tilt: 0 },
    ],
  },
  'tilted-snaps': {
    name: 'Tilted Snaps',
    note: 'A hero shot with two snapshots tossed on top, polaroid style.',
    band: 0.26,
    frames: [
      { box: [0, 0, 1, 1], tilt: 0 },
      { box: [0.58, 0.05, 0.36, 0.42], tilt: 6 },
      { box: [0.05, 0.53, 0.34, 0.4], tilt: -5 },
    ],
  },
  'full-bleed': {
    name: 'Full Bleed',
    note: 'One photo edge to edge; the lettering band does the talking.',
    band: 0.28,
    frames: [{ box: [0, 0, 1, 1], tilt: 0 }],
  },
};

export const LAYOUT_ORDER = [
  'vice-hero',
  'sunset-strip',
  'vice-quad',
  'neon-trio',
  'tilted-snaps',
  'full-bleed',
];

export const GRADE_TABLE = {
  'vice-sunset': {
    name: 'Vice Sunset',
    note: 'Magenta shadows, orange-gold highlights.',
    stops: [
      [0.0, 24, 7, 44],
      [0.25, 72, 20, 76],
      [0.5, 156, 60, 94],
      [0.75, 230, 126, 82],
      [1.0, 255, 212, 148],
    ],
    wash: { colour: '#ff7a3c', strength: 0.1 },
    warm: 1.06,
  },
  'neon-night': {
    name: 'Neon Night',
    note: 'Teal shadows, hot-pink highlights.',
    stops: [
      [0.0, 5, 17, 33],
      [0.25, 15, 64, 90],
      [0.5, 94, 90, 138],
      [0.75, 212, 84, 156],
      [1.0, 255, 188, 218],
    ],
    wash: { colour: '#22e6ff', strength: 0.08 },
    warm: 0.98,
  },
  'palm-gold': {
    name: 'Palm Gold',
    note: 'Honeyed golden hour, soft and warm.',
    stops: [
      [0.0, 29, 19, 9],
      [0.25, 94, 60, 29],
      [0.5, 176, 116, 56],
      [0.75, 236, 176, 106],
      [1.0, 255, 234, 188],
    ],
    wash: { colour: '#ffc46b', strength: 0.12 },
    warm: 1.1,
  },
  'miami-mint': {
    name: 'Miami Mint',
    note: 'Pastel teal and bubblegum, gentle contrast.',
    stops: [
      [0.0, 21, 43, 51],
      [0.25, 76, 126, 130],
      [0.5, 148, 176, 166],
      [0.75, 224, 176, 186],
      [1.0, 255, 230, 224],
    ],
    wash: { colour: '#ff8fd0', strength: 0.07 },
    warm: 1.0,
  },
  'noir-vice': {
    name: 'Noir Vice',
    note: 'High-contrast black and white with a pink bleed.',
    stops: [
      [0.0, 5, 5, 9],
      [0.25, 46, 42, 54],
      [0.5, 116, 110, 124],
      [0.75, 194, 186, 196],
      [1.0, 247, 243, 249],
    ],
    wash: { colour: '#ff4d8d', strength: 0.1 },
    warm: 1.0,
  },
};

export const GRADE_ORDER = [
  'vice-sunset',
  'neon-night',
  'palm-gold',
  'miami-mint',
  'noir-vice',
];

// The three post sizes the bounty asks for. `key` is what the editor and
// the ?shot= scenes use; the export buttons walk this list in order.
export const SIZE_TABLE = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  story: { label: 'Story · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

export const SIZE_ORDER = ['square', 'story', 'wide'];

// Sample photos shipped under app/samples/. All three were made with an
// image model for this entry: no real people, no logos, no text in frame.
export const SAMPLE_LIST = [
  { key: 'rooftop', name: 'Rooftop Dusk', file: 'samples/rooftop.jpg' },
  { key: 'boulevard', name: 'Boulevard Queen', file: 'samples/boulevard.jpg' },
  { key: 'pier', name: 'Pier Pressure', file: 'samples/pier.jpg' },
];

export function layoutById(id) {
  return LAYOUT_TABLE[id] ?? LAYOUT_TABLE['vice-hero'];
}

export function gradeById(id) {
  return GRADE_TABLE[id] ?? GRADE_TABLE['vice-sunset'];
}

export function sizeById(id) {
  return SIZE_TABLE[id] ?? SIZE_TABLE.square;
}

// A fresh cover state. `crops` holds one crop per frame: zoom (1 means the
// plain cover fit) and pan offsets as fractions of the frame. The opening
// frame starts a touch zoomed-in and lifted, so the hero shot lands with
// its subject high in the frame instead of dead centre — the stronger
// first-cover framing. `images` holds one loaded image (or null) per frame.
export function makeCoverState() {
  const crops = [];
  for (let i = 0; i < 4; i += 1) {
    crops.push({ zoom: i === 0 ? 1.06 : 1, dx: 0, dy: i === 0 ? -0.03 : 0 });
  }
  return {
    layout: 'vice-hero',
    grade: 'vice-sunset',
    title: 'VICE COAST',
    subtitle: 'a vice city story',
    seal: 'EST. 2026',
    size: 'square',
    grain: true,
    vignette: true,
    picked: 0,
    images: [null, null, null, null],
    crops,
  };
}
