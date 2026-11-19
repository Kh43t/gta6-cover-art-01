// Vice Coast Cover Studio v2 — the hand-in program (Node 22, stdlib only).
//
// It carries the finished app to the grader: app/ and screenshots/ are copied
// from beside this file into the output directory, and dossier.json is written
// there with the vendored make.fun library. The program runs twice and both
// runs must produce identical bytes, so nothing here reads a clock, rolls
// dice, or touches the network — only copies plus one deterministic build.
//
// Why the output directory is emptied the way it is: the grader runs this
// program as uid 65534 against an /output it owns but whose parent it cannot
// write. Deleting /output itself would fail with EACCES and kill the whole
// grade (that is exactly what v1 did). So the directory itself is never
// removed — only the entries inside it are cleared, then it is created if
// it is missing. A stale app/, screenshots/ or dossier.json can never leak
// from one run into the next, and the run still exits 0 as nobody.
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The entry lives here; the grader's output directory is /output, or
// MAKEFUN_OUTPUT_DIR when set (local runs and the nobody test use that).
const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Gate caps from the competition (reference/gate.json): the text budget
// shapes the dossier; the rest refuse an entry the scorer would refuse, so
// they are checked up front instead of handing in junk.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

// The names main.ts itself manages inside the output directory. Anything
// else in there is left alone — it is not ours to delete.
const MANAGED = ['app', 'screenshots', 'dossier.json'];

// Clear only the entries this program manages, never the directory itself.
function emptyManagedEntries(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (MANAGED.includes(name)) {
      rmSync(join(dir, name), { recursive: true, force: true });
    }
  }
}

function copyIfPresent(from, to) {
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

function handIn() {
  emptyManagedEntries(outDir);
  copyIfPresent(join(here, 'app'), join(outDir, 'app'));
  copyIfPresent(join(here, 'screenshots'), join(outDir, 'screenshots'));
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
}

handIn();
