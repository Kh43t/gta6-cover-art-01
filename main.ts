// Vice Coast Cover Studio — the entry program (Node 22, standard library only).
// It hands the app in: copies the app's static files and the screenshots this
// session took from beside this file into the output directory, then writes the
// dossier the judge reads with the vendored make.fun library. The grader runs
// this twice and both runs must write identical bytes, so there is no clock,
// no randomness and no network here — just copies and one deterministic build.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Where the entry lives, and where the grader wants the handed-in files.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier caps from the competition's gate (reference/gate.json): the
// text budget shapes the bytes; the rest refuse an entry the scorer would
// refuse, so the program checks them up front instead of handing in junk.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) return;
  cpSync(sourceDir, targetDir, { recursive: true });
}

function main() {
  // Start clean so a stale file from an earlier run can never leak in.
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  handIn(join(repoRoot, 'app'), join(outputDir, 'app'));
  handIn(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

  writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_LIMITS));
}

main();
