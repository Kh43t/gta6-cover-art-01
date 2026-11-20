// Vice Coast Cover Studio — entry hand-in script.
//
// Copies the app and the screenshots into the output directory and writes
// a dossier describing the entry. Safe to run as an unprivileged user
// (uid 65534) against an output directory it does not own: it NEVER
// removes the output directory itself — it only clears the three names it
// owns inside it (app, screenshots, dossier.json) — and it creates the
// output directory when it is missing.
//
// Usage:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//   node main.ts out            (same thing, positional form)

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OWNED = ["app", "screenshots", "dossier.json"];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  const fromArg = process.argv[2];
  const chosen = fromEnv || fromArg || "out";
  return resolve(repoRoot, chosen);
}

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function listFiles(dir: string, base: string): { path: string; bytes: number; sha256: string }[] {
  const out: { path: string; bytes: number; sha256: string }[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        out.push({
          path: full.slice(base.length + 1).split("/").join("/"),
          bytes: statSync(full).size,
          sha256: sha256(full),
        });
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function main(): void {
  const out = outputDir();
  // Create the output directory when it is missing; never delete it.
  mkdirSync(out, { recursive: true });
  // Clear only the names this entry owns inside the output directory.
  for (const name of OWNED) {
    rmSync(join(out, name), { recursive: true, force: true });
  }

  const appSrc = join(repoRoot, "app");
  const shotsSrc = join(repoRoot, "screenshots");
  if (!existsSync(appSrc)) throw new Error(`app/ not found in ${repoRoot}`);
  cpSync(appSrc, join(out, "app"), { recursive: true });
  if (existsSync(shotsSrc)) cpSync(shotsSrc, join(out, "screenshots"), { recursive: true });
  else mkdirSync(join(out, "screenshots"), { recursive: true });

  const files = [
    ...listFiles(join(out, "app"), out),
    ...listFiles(join(out, "screenshots"), out),
  ];

  const dossier = {
    name: "Vice Coast Cover Studio",
    competition: "gta6-cover-art-01",
    brief: "Make GTA 6 Cover Art",
    summary:
      "Offline single-page web app that makes GTA-style cover art: six layouts, five gradient-map colour grades, per-panel crop and position, a sunset title band with halftone, slatted low sun and skyline with palms, three lettering styles, badge ribbon, heat stars, grain and vignette, undo/redo, and one-click export at 1080x1080, 1080x1350 and 1920x1080. All art is drawn by the app on canvas; photos stay on the machine.",
    layouts: ["hero-trio", "four-square", "nine-panel", "tilted-snaps", "full-bleed", "triptych"],
    grades: ["vice-sunset", "neon-night", "palm-gold", "teal-heat", "noir"],
    letterings: ["block", "slant", "condensed"],
    exports: [
      { width: 1080, height: 1080 },
      { width: 1080, height: 1350 },
      { width: 1920, height: 1080 },
    ],
    samples: ["pier", "boulevard", "rooftop"],
    entrypoint: "app/index.html",
    files,
  };

  writeFileSync(join(out, "dossier.json"), JSON.stringify(dossier, null, 2) + "\n", "utf8");
  console.log(`Vice Coast Cover Studio -> ${out}`);
  console.log(`  ${files.length} files copied, dossier.json written`);
}

main();
