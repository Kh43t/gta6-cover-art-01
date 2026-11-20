// Vice Coast Cover Studio — presets: the data behind the studio.
// Layouts, colour grades (gradient-map LUT stops), lettering styles,
// sample photos and export sizes. No drawing code lives here, only data.

// The three photos bundled with the app. pier + boulevard came with the
// kit starter; rooftop is a dusk rooftop shot made for this entry.
export const SAMPLES = [
  { id: 'pier', label: 'Pier at Dusk', file: 'samples/pier.jpg' },
  { id: 'boulevard', label: 'Boulevard', file: 'samples/boulevard.jpg' },
  { id: 'rooftop', label: 'Rooftop', file: 'samples/rooftop.jpg' },
];

// Every layout is a function of the canvas size returning one cell per
// panel: { x, y, w, h, rot } in pixels. rot is a tilt in radians (0 when
// the panel sits straight). The studio always keeps one panel-state entry
// per cell, in the same order.
export const LAYOUTS = [
  {
    id: 'hero-trio',
    name: 'Hero + Trio',
    hint: 'One big hero shot over three small panels',
    cells(w, h) {
      const gap = Math.round(w * 0.012);
      const heroH = Math.round(h * 0.60);
      const rowY = heroH + gap;
      const rowH = h - rowY;
      const colW = Math.round((w - gap * 2) / 3);
      return [
        { x: 0, y: 0, w, h: heroH, rot: 0 },
        { x: 0, y: rowY, w: colW, h: rowH, rot: 0 },
        { x: colW + gap, y: rowY, w: colW, h: rowH, rot: 0 },
        { x: (colW + gap) * 2, y: rowY, w: w - (colW + gap) * 2, h: rowH, rot: 0 },
      ];
    },
  },
  {
    id: 'four-square',
    name: 'Four Square',
    hint: 'A clean 2 x 2 grid',
    cells(w, h) {
      const gap = Math.round(w * 0.012);
      const cw = Math.round((w - gap) / 2);
      const ch = Math.round((h - gap) / 2);
      return [
        { x: 0, y: 0, w: cw, h: ch, rot: 0 },
        { x: cw + gap, y: 0, w: w - cw - gap, h: ch, rot: 0 },
        { x: 0, y: ch + gap, w: cw, h: h - ch - gap, rot: 0 },
        { x: cw + gap, y: ch + gap, w: w - cw - gap, h: h - ch - gap, rot: 0 },
      ];
    },
  },
  {
    id: 'nine-panel',
    name: 'Nine Panel',
    hint: 'A 3 x 3 contact sheet',
    cells(w, h) {
      const gap = Math.round(w * 0.01);
      const cw = Math.round((w - gap * 2) / 3);
      const ch = Math.round((h - gap * 2) / 3);
      const out = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          out.push({
            x: c * (cw + gap),
            y: r * (ch + gap),
            w: c === 2 ? w - c * (cw + gap) : cw,
            h: r === 2 ? h - r * (ch + gap) : ch,
            rot: 0,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'tilted-snaps',
    name: 'Tilted Snaps',
    hint: 'Three overlapping snapshots, tossed on the table',
    cells(w, h) {
      const cw = Math.round(w * 0.52);
      const ch = Math.round(h * 0.52);
      return [
        { x: Math.round(w * 0.05), y: Math.round(h * 0.06), w: cw, h: ch, rot: -0.07 },
        { x: Math.round(w * 0.43), y: Math.round(h * 0.10), w: cw, h: ch, rot: 0.06 },
        { x: Math.round(w * 0.24), y: Math.round(h * 0.42), w: cw, h: ch, rot: -0.03 },
      ];
    },
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    hint: 'One photo, edge to edge',
    cells(w, h) {
      return [{ x: 0, y: 0, w, h, rot: 0 }];
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    hint: 'Three tall columns',
    cells(w, h) {
      const gap = Math.round(w * 0.012);
      const cw = Math.round((w - gap * 2) / 3);
      return [
        { x: 0, y: 0, w: cw, h, rot: 0 },
        { x: cw + gap, y: 0, w: cw, h, rot: 0 },
        { x: (cw + gap) * 2, y: 0, w: w - (cw + gap) * 2, h, rot: 0 },
      ];
    },
  },
];

// A grade is a gradient map: the luminance of each pixel is remapped
// through these colour stops, so shadows, mids and highlights each take
// the grade's own hue. Stops are [position 0..1, hex colour].
export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    hint: 'Magenta dusk over hot orange',
    stops: [
      [0.0, '#160a24'],
      [0.25, '#4a1a52'],
      [0.5, '#b23a6e'],
      [0.75, '#ff7a3d'],
      [1.0, '#ffd98a'],
    ],
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    hint: 'Cyan and violet after dark',
    stops: [
      [0.0, '#050914'],
      [0.25, '#14224e'],
      [0.5, '#274b9e'],
      [0.75, '#22d3ee'],
      [1.0, '#f0abfc'],
    ],
  },
  {
    id: 'palm-gold',
    name: 'Palm Gold',
    hint: 'Warm late-afternoon gold',
    stops: [
      [0.0, '#1c1206'],
      [0.25, '#5a3a12'],
      [0.5, '#a8742a'],
      [0.75, '#e8b64c'],
      [1.0, '#fff3c4'],
    ],
  },
  {
    id: 'teal-heat',
    name: 'Teal Heat',
    hint: 'Teal shadows, ember highlights',
    stops: [
      [0.0, '#03161a'],
      [0.25, '#0b4a4a'],
      [0.5, '#12806a'],
      [0.75, '#f08a3c'],
      [1.0, '#ffe9b0'],
    ],
  },
  {
    id: 'noir',
    name: 'Noir',
    hint: 'Hard black and white, silver mids',
    stops: [
      [0.0, '#000000'],
      [0.3, '#2b2b2b'],
      [0.6, '#8a8a8a'],
      [0.85, '#d9d9d9'],
      [1.0, '#ffffff'],
    ],
  },
];

// Lettering styles for the title band. Each one is a different voice:
// blocky and loud, glowing neon, or tall and severe.
export const LETTERING = [
  {
    id: 'vice-block',
    name: 'Vice Block',
    hint: 'Heavy slab capitals, pink on dark',
    weight: 900,
    family: "'Arial Black', 'Helvetica Neue', sans-serif",
    tracking: 0.04,
    fill: '#fff3f8',
    stroke: '#ff2e88',
    strokeWidth: 0.16,
    shadow: 'rgba(255, 46, 136, 0.55)',
    upper: true,
  },
  {
    id: 'neon-script',
    name: 'Neon Script',
    hint: 'Glowing rounded letters, cyan on night',
    weight: 800,
    family: "'Trebuchet MS', 'Segoe UI', sans-serif",
    tracking: 0.08,
    fill: '#eafcff',
    stroke: '#19c8e8',
    strokeWidth: 0.1,
    shadow: 'rgba(25, 200, 232, 0.8)',
    upper: true,
  },
  {
    id: 'noir-condensed',
    name: 'Noir Condensed',
    hint: 'Tall narrow capitals, bone white',
    weight: 700,
    family: "'Impact', 'Haettenschweiler', 'Arial Narrow', sans-serif",
    tracking: 0.14,
    fill: '#f4efe4',
    stroke: '#111111',
    strokeWidth: 0.12,
    shadow: 'rgba(0, 0, 0, 0.65)',
    upper: true,
  },
];

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function findLettering(id) {
  return LETTERING.find((l) => l.id === id) ?? LETTERING[0];
}

export function findSample(id) {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
}
