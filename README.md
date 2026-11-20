# Vice Coast Cover Studio — Make GTA 6 Cover Art (v3)

An offline browser app that turns any photo and a caption into GTA-style
multi-panel cover art, with a Vice City sunset grade, and exports it as a PNG
to share. Everything runs from static files under `app/` — no server, no
upload, no network request. Photos never leave the machine.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

1. Pick a sample photo (or load your own into the selected panel).
2. Click a panel to select it, drag to move the photo, scroll to zoom.
3. Pick one of 6 layouts and 5 grades, write the title and subtitle.
4. Export the square (1080×1080), story (1080×1350) or wide (1920×1080)
   PNG — or all three at once.

## What it makes

- **6 layouts** — Vice Hero, Sunset Strip, Vice Quad, Neon Trio,
  Tilted Snaps (polaroid-style snapshots tossed over a hero shot) and
  Full Bleed.
- **5 grades** — Vice Sunset, Neon Night, Palm Gold, Miami Mint and
  Noir Vice, each a real gradient map (shadows, mids and highlights are
  remapped through the grade's colours) plus a soft tint wash.
- **A sunset title band** — dusk gradient, a sun disc with rays fanning
  out behind the title, huge outlined lettering, an italic script
  subtitle, a five-star row and a round seal.
- **Per-panel crop and position** — every panel has its own zoom and pan;
  one photo can fill every panel or each panel can hold a different one.
- **Polish** — film grain, vignette, white poster gutters, undo/redo
  (Ctrl+Z / Ctrl+Y), shuffle-the-look, and a live preview that is the
  exact code path the export uses.

## Files

| Path | What it is |
| --- | --- |
| `app/index.html` | The studio page: preview canvas + controls. |
| `app/style.css` | The dusk theme and the responsive studio grid. |
| `app/src/presets.js` | Layouts, grades, export sizes, samples, fresh state. |
| `app/src/cover.js` | The renderer: panels, gradient-map grade, title band, grain. |
| `app/src/studio.js` | Editor wiring: swatches, drag-to-pan, history, exports. |
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
the grader runs it. Run it twice and the outputs are byte-identical.

## Originality

All art, lettering and code are original and made for this entry. No
Rockstar Games logo, artwork, character or font is used anywhere; the
lettering is drawn with system fonts. The three sample photos were made
with an image model for this entry: no real people, no logos, no text in
the frame.

## License

MIT — see `LICENSE`.
