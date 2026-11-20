// Sundown Racket — hand-in builder.
// Copies app/ and screenshots/ into the output directory and writes a
// deterministic dossier.json there. Run with:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Rules this script never breaks (the v1 lesson):
// - It NEVER removes the output directory itself. Inside it, it only
//   clears the three names it owns: app, screenshots, dossier.json.
//   That is why it works when run as an unprivileged user against an
//   output directory owned by someone else.
// - The dossier is fully deterministic: no timestamps, no absolute
//   paths, files listed in sorted order with sha256 + size. Running it
//   twice produces a byte-identical tree.
// - It reads nothing outside this repo, and writes nothing outside the
//   output directory.

import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(fileURLToPath(new URL(".", import.meta.url)));
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || join(REPO, "out"));
const OWNED = ["app", "screenshots", "dossier.json"];

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function listFiles(dir, base) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) found.push(...(await listFiles(full, rel)));
    else if (entry.isFile()) found.push(rel);
  }
  return found.sort();
}

// Make a tree normally writable (best effort). Node's cp preserves the
// source files' modes, so a copy from a read-only repo leaves read-only
// files behind — and the NEXT run's rm would then fail with EACCES when
// it tries to clear them. Normalising modes here (and again before
// clearing, below) is what makes a second run against the same output
// directory succeed.
async function writableTree(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await writableTree(full);
    try { await chmod(full, entry.isDirectory() ? 0o755 : 0o644); } catch {}
  }
  try { await chmod(dir, 0o755); } catch {}
}

async function main() {
  // Create the output directory if it is missing. Never remove it.
  await mkdir(OUT, { recursive: true });

  // Clear only the three names this script owns, inside the output dir.
  // Each owned tree is made writable first: a previous run may have
  // copied read-only modes from a read-only repo, and rm cannot clear
  // a read-only directory.
  for (const name of OWNED) {
    await writableTree(join(OUT, name));
    await rm(join(OUT, name), { recursive: true, force: true });
  }

  // Copy the hand-in trees, then normalise their modes so the next run
  // (and the grader) can clear them again.
  await cp(join(REPO, "app"), join(OUT, "app"), { recursive: true });
  await cp(join(REPO, "screenshots"), join(OUT, "screenshots"), { recursive: true });
  await writableTree(join(OUT, "app"));
  await writableTree(join(OUT, "screenshots"));

  // Deterministic dossier: sorted relative paths, sha256, sizes.
  const appFiles = await listFiles(join(OUT, "app"), "app");
  const shotFiles = await listFiles(join(OUT, "screenshots"), "screenshots");
  const files = [];
  for (const rel of [...appFiles, ...shotFiles]) {
    const buf = await readFile(join(OUT, rel));
    files.push({ path: rel, sha256: sha256(buf), bytes: buf.length });
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifest = JSON.parse(await readFile(join(REPO, "shots.json"), "utf8"));
  const dossier = {
    competition: "gta6-cover-art-01",
    entry: "sundown-racket-cover-studio",
    title: "Sundown Racket Cover Studio",
    description:
      "People-first movie-poster cover maker: hero close-up with the giant striped-chrome title overlapping the face, six cast portraits with slanted role tags, five stars plus review quote, BEST CAST seal, billing block, barcode and COMING SOON line. Guided 3-step flow (add photos, caption, export) with an 8-person demo cast, face-aware crops and one EXPORT ALL 3 PNGS button.",
    files,
    screenshots: manifest.map((shot) => ({ name: shot.name, w: shot.w, h: shot.h })),
    exports: [
      { label: "Square", w: 1080, h: 1080 },
      { label: "Poster", w: 1080, h: 1350 },
      { label: "Wide", w: 1920, h: 1080 },
    ],
    cast: [
      { name: "Marcus Vale", role: "THE DRIVER" },
      { name: "Lena Cross", role: "THE FIXER" },
      { name: "Roy Delgado", role: "THE CAPTAIN" },
      { name: "Eddie Sparks", role: "THE MECHANIC" },
      { name: "Rosa Vega", role: "THE RIDER" },
      { name: "Vincent Gold", role: "THE BOSS" },
      { name: "Nadia Ray", role: "THE LOOKOUT" },
      { name: "Tommy Blade", role: "THE ENFORCER" },
    ],
  };

  const text = JSON.stringify(dossier, null, 2) + "\n";
  await writeFile(join(OUT, "dossier.json"), text, "utf8");

  const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);
  console.log(`hand-in written to ${OUT}`);
  console.log(`${files.length} files, ${totalBytes} bytes, ${manifest.length} screenshots`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
