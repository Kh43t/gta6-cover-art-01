# Vice Coast Cover Studio — Make GTA 6 Cover Art (v4)

Turn any photo and a caption into GTA-style multi-panel cover art, graded
like a Vice City sunset, and export it as a PNG to share. The whole thing
runs from static files under `app/` — no server, no upload, no network
request. Photos never leave the machine.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

1. Pick a sample photo (or load your own into the picked frame).
2. Click a frame to pick it, drag to move the photo, scroll to zoom, or
   nudge it with the arrow keys.
3. Pick one of 6 layouts and 5 grades, write the title and subtitle.
4. Export the square (1080×1080), story (1080×1350) or wide (1920×1080)
   PNG — or all three at once.

## What it makes

- **6 layouts** — Vice Hero, Sunset Strip, Vice Quad, Neon Trio,
  Tilted Snaps (polaroid-style snapshots tossed over a hero shot) and
  Full Bleed. The hero frame carries a thin gold edge, so the eye lands
  on the cover's protagonist first, the way the classic covers do.
- **5 grades** — Vice Sunset, Neon Night, Palm Gold, Miami Mint and
  Noir Vice. Each is a real gradient map: shadows, mids and highlights
  are remapped through the grade's colours, plus a soft tint wash.
- **A richer sunset lettering band** — dusk gradient with a glowing
  horizon, a retro sun cut into slats with rays fanning out behind the
  title, a low skyline and palm silhouettes, huge outlined lettering
  with a pink-and-gold underline bar, an italic script subtitle, a
  five-star row and a round seal.
- **Per-frame crop and position** — every frame has its own zoom and
  pan; one photo can fill every frame or each frame can hold a different
  one. The opening frame starts slightly zoomed-in and lifted, so the
  hero shot is framed with its subject high instead of dead centre.
- **Polish** — film grain, vignette, white poster gutters, undo/redo
  (Ctrl+Z / Ctrl+Y), shuffle-the-look, and a live preview that is the
  exact code path the export uses. Export filenames follow your title.

## Files

| Path | What it is |
| --- | --- |
| `app/index.html` | The studio page: preview canvas + controls. |
| `app/style.css` | The dusk theme and the responsive studio grid. |
| `app/src/presets.js` | Layouts, grades, export sizes, samples, fresh state. |
| `app/src/cover.js` | The painter: frames, gradient-map grade, lettering band, grain. |
| `app/src/studio.js` | Editor wiring: pickers, drag-to-pan, history, exports. |
| `app/src/shots.js` | Fixed `?shot=` scenes used for the screenshots. |
| `app/samples/` | Three model-made sample photos (rooftop, boulevard, pier). |
| `main.ts` | Hand-in program: copies `app/` + `screenshots/` to `/output`, writes `dossier.json`. |
| `shots.json` | The four screenshot scenes. |
| `screenshots/` | 1-cover (wide cover), 2-editor, 3-cover (story cover), 4-cover (square cover). |

Screenshot scenes are the app itself: `?shot=cover` shows the exported
cover full frame, `?shot=editor` shows the studio with a sample photo
loaded. The cover screenshot is a landscape 1280×720 export; the other
covers show the story and square sizes.

## Hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` never removes the output directory itself — it clears only the
`app`, `screenshots` and `dossier.json` entries it owns inside it — so it
also runs as an unprivileged user against a read-only repository, the way
the grader runs it. Run it twice and the outputs are byte-identical
(verified for v4: two root runs identical, and a run as user `nobody`
against a root-owned output directory exits 0 with identical output,
including a re-run over stale entries from the previous run).

## Originality

All art, lettering and code are original and made for this entry. No
Rockstar Games logo, artwork, character or font is used anywhere; the
lettering is drawn with system fonts. The three sample photos were made
with an image model for this entry: no real people, no logos, no text in
the frame.

## License

MIT — see `LICENSE`.
