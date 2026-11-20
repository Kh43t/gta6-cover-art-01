[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kh43t/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kh43t/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Coast Cover Studio

An entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun.

Vice Coast Cover Studio is an offline single-page web app that makes
GTA-style cover art. It needs no network once loaded, no web fonts and no
external images: the sunset band, skyline, palms, halftone and grain are
all painted by the app on canvas, and any photo you add stays on the
machine that opens the page.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. To produce the hand-in bundle:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` there. It never removes the output directory itself:
inside it, it only clears the three names it owns (`app`, `screenshots`,
`dossier.json`). That is why it also works when run as an unprivileged
user against an output directory owned by someone else, and why running
it twice produces a byte-identical tree.

## Layouts

Six layouts, picked from the **Layout** menu. Switching layout keeps the
photos already placed and re-fits the panel list to the new cell count.

- **Hero + Trio** — one big hero shot over three small panels.
- **Four Square** — a clean 2 × 2 grid.
- **Nine Panel** — a 3 × 3 contact sheet.
- **Tilted Snaps** — three overlapping snapshots with white polaroid mats.
- **Full Bleed** — one photo, edge to edge.
- **Triptych** — three tall columns.

## Colour grades

Five grades, picked from the **Colour grade** menu. Each grade is a
gradient-map LUT: a pixel's luminance is remapped through the grade's
colour stops, so shadows, mid-tones and highlights each take the grade's
hue. A little of the photo's own colour is blended back in so faces stay
readable (none at all for Noir).

- **Vice Sunset** — magenta dusk over hot orange.
- **Neon Night** — cyan and violet after dark.
- **Palm Gold** — warm late-afternoon gold.
- **Teal Heat** — teal shadows, ember highlights.
- **Noir** — hard black and white with silver mids.

The title band's sky is tinted from the same grade, so the whole cover
shifts colour together.

## Words

- **Title** — the big words on the sunset band (max 30 characters).
- **Subtitle** — a smaller line under the title.
- **Badge ribbon** — the angled ribbon in the top-left corner.
- **Lettering** — three styles: Vice Block (heavy upright capitals),
  Sunset Slant (leaning italics with a hot-pink glow) and Noir Condensed
  (tall narrow capitals).
- **Heat stars** — 0–5 sparkle stars at the top-right of the title band.

## The sunset title band

The bottom band is drawn, not an image: a dusk gradient sky, a slatted
low sun with rays, halftone dots, a city skyline with lit windows and
palm-tree silhouettes, and the title on top. Grain and a vignette finish
the whole cover.

## Crop and position

Click a panel to select it (the gold dashed outline shows which), then:

- **Drag** the photo inside the panel to move it.
- **Scroll** over a panel to zoom it.
- **Sliders** — zoom, move left/right, move up/down — for the selected panel.
- **Arrow keys** nudge the selected panel; `+` / `−` zoom it
  (hold Shift for finer nudges).
- **Undo / Redo** buttons (or Ctrl+Z / Ctrl+Y) step through every change,
  including drags, zooms, slider moves, typing and layout switches.

Photos are cover-fit with a top anchor, so faces stay in frame when a
panel is taller than the photo.

## Photos

Three sample shots ship with the app: **Starter Pier**, **Boulevard**
and **Rooftop** (a dusk rooftop shot). Tap one to place it in the
selected panel. **Add your own photo** loads an image from your machine
as an object URL — it is never uploaded anywhere.

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
app/src/presets.js    layouts, grades, lettering, export sizes, defaults
app/src/cover.js      canvas renderer (panels, grades, title band)
app/src/shots.js      sample shots, image loading, link parameters
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
