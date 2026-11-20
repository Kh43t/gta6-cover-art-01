// Vice Coast Cover Studio — hand-in script (v7).
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json describing the entry.
//
// Usage:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//   node main.ts out
//
// Safety contract (this is what the nobody-user check verifies):
// - the output directory itself is NEVER removed; only the three names
//   this script owns inside it are cleared: app, screenshots, dossier.json
// - the output directory is created if it does not exist
// - it runs as an unprivileged user against a directory owned by root

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OWNED_NAMES = ["app", "screenshots", "dossier.json"];

function outputDir(): string {
  const fromArg = process.argv[2];
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  return resolve(ROOT, fromArg || fromEnv || "out");
}

function walk(dir: string, base: string, acc: { path: string; bytes: number }[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, base, acc);
    } else {
      acc.push({ path: full.slice(base.length + 1), bytes: st.size });
    }
  }
}

function main(): void {
  const out = outputDir();
  // Create the output directory if it is missing (never remove it).
  mkdirSync(out, { recursive: true });

  // Clear only the names this script owns inside the output directory.
  for (const name of OWNED_NAMES) {
    const target = join(out, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }

  // Copy the app and the screenshots in.
  cpSync(join(ROOT, "app"), join(out, "app"), { recursive: true });
  cpSync(join(ROOT, "screenshots"), join(out, "screenshots"), { recursive: true });

  // Describe what was handed in.
  const files: { path: string; bytes: number }[] = [];
  walk(join(out, "app"), out, files);
  walk(join(out, "screenshots"), out, files);
  files.sort((a, b) => (a.path < b.path ? -1 : 1));

  const dossier = {
    competition: "gta6-cover-art-01",
    entry: "Vice Coast Cover Studio",
    files,
    screenshots: files
      .filter((f) => f.path.startsWith("screenshots/"))
      .map((f) => f.path),
  };
  writeFileSync(join(out, "dossier.json"), JSON.stringify(dossier, null, 2) + "\n");

  const total = files.reduce((n, f) => n + f.bytes, 0);
  console.log(`hand-in ready: ${out}`);
  console.log(`  ${files.length} files, ${total} bytes`);
  console.log(`  dossier.json written`);
}

main();
