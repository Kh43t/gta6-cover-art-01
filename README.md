[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kh43t/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kh43t/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Sundown Racket Cover Studio

An entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun.

Sundown Racket Cover Studio is an offline single-page web app that makes
GTA-style movie-poster cover art — built around people, not places. The
cover is a poster: one huge hero close-up with the giant striped-chrome
title overlapping the face, six cast portraits each with a slanted role
tag, five stars plus a review quote, a VOL. 1 badge, a gold BEST CAST
seal, a billing block, a barcode and a COMING SOON line.

It needs no network once loaded and no web fonts: the sky, grain and
vignette are painted by the app on canvas, the eight demo-cast portraits
ship with the app, and any photo you add stays on the machine that opens
the page.

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
it twice produces a byte-identical tree. The dossier is fully
deterministic — no timestamps, no absolute paths. One subtlety the
builder guards: `cp` preserves the source files' modes, so a copy from a
read-only repo leaves read-only files behind — `main.ts` normalises the
copied tree to normal writable modes (and again before clearing it), so
a second run against the same output directory still succeeds.

## The guided 3-step flow

The editor walks you through three steps, left to right across the top:

1. **ADD PHOTOS** — the 8-person demo cast. Click a cast member to
   select them, make them the hero, put them on the poster or take them
   off it, or swap in your own photo (loaded as an object URL, never
   uploaded). The poster always shows the hero plus six *different*
   faces — no photo is ever repeated across the cover.
2. **CAPTION** — every word on the poster: movie title + title font,
   script line, tagline ribbon, review quote + source, billing block,
   seal text + seal ring, release line, edition tag, and the selected
   cast member's name + role tag.
3. **EXPORT PNG** — one gold **EXPORT ALL 3 PNGS** button, or a single
   size: Square 1080 × 1080, Poster 1080 × 1350, Wide 1920 × 1080.
   Files are named after the title, for example
   `sundown-racket-1080x1350.png`.

## The demo cast

| Face | Name | Role tag |
| --- | --- | --- |
| Hero | Marcus Vale | THE DRIVER |
| Cast | Lena Cross | THE FIXER |
| Cast | Roy Delgado | THE CAPTAIN |
| Cast | Eddie Sparks | THE MECHANIC |
| Cast | Rosa Vega | THE RIDER |
| Cast | Vincent Gold | THE BOSS |
| Cast | Nadia Ray | THE LOOKOUT |
| Bench | Tommy Blade | THE ENFORCER |

The eight portraits were generated with Pollinations (free, no key) and
ship in `app/samples/` as `cast-1.jpg` … `cast-8.jpg`. Tommy Blade sits
on the bench by default — swap anyone in from step 1.

## Face-aware crops

Click a cast member to select them, then:

- **Drag** the poster to move the selected face inside its frame.
- **Scroll** over the poster to zoom the selected face.
- **Sliders** — zoom, move left/right, move up/down.
- **Arrow keys** nudge the selected face; `+` / `−` zoom it
  (hold Shift for finer nudges).
- **Undo / Redo** buttons (or Ctrl+Z / Ctrl+Y) step through every
  change, including drags, zooms, slider moves, typing and cast swaps.

Crops are anchored on the face: each portrait has a focal point, and the
crop pins that point to the same fraction of the frame, so faces stay in
frame when a frame is taller than the photo.

## Colour grades

Five grades, picked in step 2. Each grade is a three-stop luminance ramp
the photos are pushed through, plus a sky palette the poster is painted
on — so the whole cover shifts colour together. A little of each photo's
own colour is blended back in so faces stay readable (none at all for
Noir).

- **Sundown Gold** — magenta dusk over hot orange.
- **Neon Night** — cyan and violet after dark.
- **Palm Gold** — warm late-afternoon gold.
- **Teal Heat** — teal shadows, ember highlights.
- **Noir** — hard black and white with silver mids.

## Lettering

Three title styles, picked in step 2:

- **Chrome Block** — heavy upright capitals with a striped metal fill.
- **Sunset Slant** — leaning italics with a hot-pink glow.
- **Noir Tall** — tall narrow capitals.

## Files

```text
app/index.html        editor shell (3-step flow)
app/style.css         editor chrome styling
app/src/presets.js    cast roster, grades, lettering, sizes, defaults
app/src/cover.js      canvas poster renderer (hero, cast, title, seal)
app/src/shots.js      photo loading + ?shot= deep links
app/src/studio.js     state, history, steps, crop, export
app/samples/          cast-1.jpg … cast-8.jpg (demo cast portraits)
main.ts               hand-in script (copies app + screenshots, dossier)
serve.ts              dev server on port 8080
shots.json            screenshot manifest (4 shots)
screenshots/          1-cover.jpg, 2-editor.jpg, 3-cover.jpg, 4-cover.jpg
```

## Screenshot mode

`shots.json` lists four deep links. `?shot=cover` renders a bare cover
with no editor chrome (for cover screenshots); `?shot=editor` opens the
editor at the given step, hero, cast, title, grade and font. `?size=`
picks the preview size (`square`, `poster` or `wide`) so a cover shot
renders at exactly the manifest's dimensions.
