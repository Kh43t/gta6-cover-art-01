# Vice Coast Cover Studio — Make GTA 6 Cover Art

An offline single-page web app that makes GTA-style cover art. No network
at runtime, no web fonts, no external images: every visual is drawn by the
app on canvas, and photos stay on the machine that opens them.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. To hand the entry in:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layouts

Six layouts, switched from the **Layout** menu:

- **Hero + Trio** — one big hero shot over three small panels.
- **Four Square** — a clean 2 × 2 grid.
- **Nine Panel** — a 3 × 3 contact sheet.
- **Tilted Snaps** — three overlapping snapshots with white polaroid borders.
- **Full Bleed** — one photo, edge to edge.
- **Triptych** — three tall columns.

Changing layout keeps the photos already placed and re-fits the panel list
to the new cell count.

## Colour grades

Five grades, switched from the **Colour grade** menu. Each grade is a
gradient-map LUT: every pixel's luminance is remapped through the grade's
colour stops, so shadows, mids and highlights each take the grade's hue,
while a little of the photo's own colour is kept so faces stay readable.

- **Vice Sunset** — magenta dusk over hot orange.
- **Neon Night** — cyan and violet after dark.
- **Palm Gold** — warm late-afternoon gold.
- **Teal Heat** — teal shadows, ember highlights.
- **Noir** — hard black and white with silver mids.

## Words

- **Title** — the big words on the sunset band (max 30 characters).
- **Subtitle** — a smaller line under the title.
- **Badge ribbon** — the angled ribbon in the top-left corner.
- **Heat stars** — 0–5 stars under the sun.
- **Lettering** — three styles: Vice Block (heavy slab capitals, pink on
  dark), Neon Script (glowing rounded letters, cyan on night), Noir
  Condensed (tall narrow capitals, bone white).

## The title band

Every cover ends with the same sunset band: a purple-to-orange gradient
with a halftone dot field, a city skyline with palms along its top edge,
and a low sun cut by horizontal slats with rays fanning behind it. Film
grain and a vignette finish the cover; both can be switched off.

## Working a panel

Click a panel to select it — the panel controls follow the selection.

- **Photo** — pick one of the three bundled samples (Pier at Dusk,
  Boulevard, Rooftop) or upload your own photo into the panel. Uploads
  use a local object URL; nothing is sent anywhere.
- **Drag** — drag the photo inside its panel to reposition it.
- **Scroll** — scroll over the canvas to zoom the selected panel (1×–4×).
- **Sliders** — Zoom, Move left/right, Move up/down for fine control.
- **Arrow keys** — nudge the selected panel (Shift for bigger steps).

**Undo / Redo** cover every change (layout, grade, words, panel moves,
uploads) — one undo step per edit, via the buttons or Ctrl+Z / Ctrl+Y.

## Export

One click per size, from the **Finish** section:

- Square 1080 × 1080
- Portrait 1080 × 1350
- Wide 1920 × 1080

Files are PNGs named after the title, e.g.
`vice-coast-1080x1080.png`. The title is slugged (lowercase, spaces to
dashes, accents stripped); an empty title falls back to
`vice-coast-cover`.

## Samples

- `app/samples/pier.jpg` — Pier at Dusk (kit starter sample).
- `app/samples/boulevard.jpg` — Boulevard (kit starter sample).
- `app/samples/rooftop.jpg` — Rooftop, a dusk rooftop shot made for this
  entry.

## Files

- `app/index.html` — the page and controls.
- `app/style.css` — the dark neon workbench styling.
- `app/src/studio.js` — state, history, picking, upload, export.
- `app/src/cover.js` — the canvas renderer (layouts, grade LUT, title
  band, sun, skyline, grain, vignette).
- `app/src/presets.js` — layouts, grades, lettering, samples, export sizes.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` /
  `?shot=editor`).
- `main.ts` — copies `app/` and `screenshots/` to the output dir and
  writes `dossier.json`.
- `serve.ts` — the local dev server (port 8080).
- `shots.json` — the four screenshot scenes.
- `screenshots/` — 1-cover, 2-editor, 3-cover, 4-cover.
