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

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json`. It never removes the output directory itself — it
only clears the names it owns inside it (`app`, `screenshots`,
`dossier.json`) — so it also runs as an unprivileged user against an
output directory owned by someone else.

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
- **Lettering** — three styles: Vice Block (heavy upright capitals),
  Sunset Slant (leaning italics with a hot-pink glow), Noir Condensed
  (tall narrow capitals).
- **Heat stars** — 0–5 sparkle stars at the top-right of the title band.

## The sunset title band

The bottom band is drawn, not an image: a dusk gradient sky, a slatted
low sun with rays, halftone dots, a city skyline with palm trees, and the
title on top. Grain and a vignette finish the whole cover.

## Crop and position

Click a panel to select it, then:

- **Drag** the photo inside the panel to move it.
- **Scroll** over a panel to zoom it.
- **Sliders** — zoom, move left/right, move up/down — for the selected panel.
- **Arrow keys** nudge the selected panel; `+` / `−` zoom it.
- **Undo / Redo** buttons (or Ctrl+Z / Ctrl+Y) step through every change.

Photos are cover-fit with a top anchor, so faces stay in frame when a
panel is taller than the photo.

## Photos

Three sample shots ship with the app: **Starter Pier**, **Boulevard**,
and **Rooftop** (a dusk rooftop shot). Tap one to place it in the selected
panel. **Add your own photo** loads an image from your machine as an
object URL — it is never uploaded anywhere.

## Export

One click per size, or **Export all three**:

- Square 1080 × 1080
- Portrait 1080 × 1350
- Wide 1920 × 1080

Exports are PNG files named after the title, for example
`vice-coast-1080x1080.png`.

## Files

```text
app/index.html        editor shell
app/style.css         editor chrome styling
app/src/presets.js    layouts, grades, lettering, export sizes
app/src/cover.js      canvas renderer (panels, grades, title band)
app/src/shots.js      sample shots, image loading, URL params
app/src/studio.js     state, history, controls, crop, export
app/samples/          pier.jpg, boulevard.jpg, rooftop.jpg
main.ts               hand-in script (copies app + screenshots, dossier)
serve.ts              dev server on port 8080
shots.json            screenshot manifest (4 shots)
screenshots/          1-cover.jpg, 2-editor.jpg, 3-cover.jpg, 4-cover.jpg
```

## Screenshot mode

`shots.json` lists four deep links. `?shot=cover` renders a bare cover
with no editor chrome (for cover screenshots); `?shot=editor` opens the
editor with the given photo, caption, layout, grade and lettering.
