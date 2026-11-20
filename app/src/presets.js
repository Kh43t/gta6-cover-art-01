// Vice Coast Cover Studio — presets (v3).
// Pure data: the six cover layouts, the five sunset/neon grades and the three
// export sizes. Nothing here touches the DOM or the network, so the renderer
// (cover.js) and the editor (studio.js) can both import it and stay in sync.
// Panel rectangles are fractions of the cover: [x, y, w, h] with an optional
// tilt in degrees. A layout's `band` is the fraction of the cover height the
// sunset title band covers at the bottom (0 keeps the art full-bleed).

export const LAYOUTS = [
  {
    id: 'vice-hero',
    name: 'Vice Hero',
    blurb: 'One big hero panel, three stacked moments on the right.',
    band: 0.24,
    panels: [
      { rect: [0, 0, 0.62, 1], tilt: 0 },
      { rect: [0.62, 0, 0.38, 0.34], tilt: 0 },
      { rect: [0.62, 0.34, 0.38, 0.33], tilt: 0 },
      { rect: [0.62, 0.67, 0.38, 0.33], tilt: 0 },
    ],
  },
  {
    id: 'sunset-strip',
    name: 'Sunset Strip',
    blurb: 'Wide hero on top, three frames along the bottom.',
    band: 0.24,
    panels: [
      { rect: [0, 0, 1, 0.58], tilt: 0 },
      { rect: [0, 0.58, 0.34, 0.42], tilt: 0 },
      { rect: [0.34, 0.58, 0.33, 0.42], tilt: 0 },
      { rect: [0.67, 0.58, 0.33, 0.42], tilt: 0 },
    ],
  },
  {
    id: 'vice-quad',
    name: 'Vice Quad',
    blurb: 'Four equal frames, the classic poster grid.',
    band: 0.22,
    panels: [
      { rect: [0, 0, 0.5, 0.5], tilt: 0 },
      { rect: [0.5, 0, 0.5, 0.5], tilt: 0 },
      { rect: [0, 0.5, 0.5, 0.5], tilt: 0 },
      { rect: [0.5, 0.5, 0.5, 0.5], tilt: 0 },
    ],
  },
  {
    id: 'neon-trio',
    name: 'Neon Trio',
    blurb: 'Three tall strips, like a strip of film stills.',
    band: 0.24,
    panels: [
      { rect: [0, 0, 0.34, 1], tilt: 0 },
      { rect: [0.34, 0, 0.33, 1], tilt: 0 },
      { rect: [0.67, 0, 0.33, 1], tilt: 0 },
    ],
  },
  {
    id: 'tilted-snaps',
    name: 'Tilted Snaps',
    blurb: 'A hero shot with two snapshots tossed on top, polaroid style.',
    band: 0.24,
    panels: [
      { rect: [0, 0, 1, 1], tilt: 0 },
      { rect: [0.58, 0.06, 0.36, 0.42], tilt: 6 },
      { rect: [0.05, 0.52, 0.34, 0.4], tilt: -5 },
    ],
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    blurb: 'One photo edge to edge, title band doing all the talking.',
    band: 0.26,
    panels: [{ rect: [0, 0, 1, 1], tilt: 0 }],
  },
];

// A grade is a gradient map: shadows, mids and highlights are remapped through
// these stops (position 0..1 -> [r, g, b]), then a soft tint is washed over the
// whole cover. `warm` lifts the red channel a touch for golden-hour skin.
export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    blurb: 'Magenta shadows, orange gold highlights.',
    stops: [
      [0.0, 26, 8, 46],
      [0.25, 74, 22, 78],
      [0.5, 158, 62, 96],
      [0.75, 232, 128, 84],
      [1.0, 255, 214, 150],
    ],
    tint: { color: '#ff7a3c', alpha: 0.1 },
    warm: 1.06,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    blurb: 'Teal shadows, hot pink highlights.',
    stops: [
      [0.0, 4, 18, 34],
      [0.25, 16, 66, 92],
      [0.5, 96, 92, 140],
      [0.75, 214, 86, 158],
      [1.0, 255, 190, 220],
    ],
    tint: { color: '#22e6ff', alpha: 0.08 },
    warm: 0.98,
  },
  {
    id: 'palm-gold',
    name: 'Palm Gold',
    blurb: 'Honeyed golden hour, soft and warm.',
    stops: [
      [0.0, 30, 20, 10],
      [0.25, 96, 62, 30],
      [0.5, 178, 118, 58],
      [0.75, 238, 178, 108],
      [1.0, 255, 236, 190],
    ],
    tint: { color: '#ffc46b', alpha: 0.12 },
    warm: 1.1,
  },
  {
    id: 'miami-mint',
    name: 'Miami Mint',
    blurb: 'Pastel teal and bubblegum, soft contrast.',
    stops: [
      [0.0, 22, 44, 52],
      [0.25, 78, 128, 132],
      [0.5, 150, 178, 168],
      [0.75, 226, 178, 188],
      [1.0, 255, 232, 226],
    ],
    tint: { color: '#ff8fd0', alpha: 0.07 },
    warm: 1.0,
  },
  {
    id: 'noir-vice',
    name: 'Noir Vice',
    blurb: 'High-contrast black and white with a pink bleed.',
    stops: [
      [0.0, 6, 6, 10],
      [0.25, 48, 44, 56],
      [0.5, 118, 112, 126],
      [0.75, 196, 188, 198],
      [1.0, 248, 244, 250],
    ],
    tint: { color: '#ff4d8d', alpha: 0.1 },
    warm: 1.0,
  },
];

// The three post sizes the bounty asks for. `id` is used by the editor and by
// ?shot=cover&w=&h= scenes; the export buttons loop over this list.
export const EXPORT_SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'story', label: 'Story · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

// Sample photos shipped under app/samples/. All three were made with an image
// model for this entry: no real people, no logos, no text in the frame.
export const SAMPLES = [
  { id: 'rooftop', name: 'Rooftop Dusk', file: 'samples/rooftop.jpg' },
  { id: 'boulevard', name: 'Boulevard Queen', file: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier Pressure', file: 'samples/pier.jpg' },
];

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function findSize(id) {
  return EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
}

// A fresh editor state. `slots` holds one crop per panel: zoom (1 = cover-fit)
// and pan offsets in fractions of the panel. `photos` holds one image (or
// null) per panel slot; the editor keeps the same image in every slot when
// the user picks "one photo everywhere".
export function freshState() {
  return {
    layoutId: 'vice-hero',
    gradeId: 'vice-sunset',
    title: 'VICE COAST',
    subtitle: 'a vice city story',
    seal: 'EST. 2026',
    sizeId: 'square',
    grain: true,
    vignette: true,
    selected: 0,
    photos: [null, null, null, null],
    slots: [
      { zoom: 1, dx: 0, dy: 0 },
      { zoom: 1, dx: 0, dy: 0 },
      { zoom: 1, dx: 0, dy: 0 },
      { zoom: 1, dx: 0, dy: 0 },
    ],
  };
}
