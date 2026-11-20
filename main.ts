// Vice Coast Cover Studio — hand-in program (v4, Node 22, stdlib only).
//
// Stages the entry for the grader: app/ and screenshots/ are copied from
// beside this file into the output directory, and /output/dossier.json is
// written with the vendored make.fun library (vendor/makefun-app.ts, byte
// for byte the kit's copy).
//
// The output directory itself is NEVER deleted. The grader runs this
// program as an unprivileged user against a read-only repository and a
// writable output directory whose parent cannot be written, so deleting
// the output directory itself would throw EACCES. Instead we remove only
// the three entries this program owns inside it — app, screenshots and
// dossier.json — and write them fresh. Removing a child needs write
// permission on the directory itself, which the grader grants.
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Make the output directory when it is missing, but never delete it.
mkdirSync(targetDir, { recursive: true });

// Clear only the entries this program owns inside the output directory, so
// a second run starts clean without touching the directory itself.
const ownedEntries = ['app', 'screenshots', 'dossier.json'];
for (const entry of ownedEntries) {
  const entryPath = join(targetDir, entry);
  if (existsSync(entryPath)) rmSync(entryPath, { recursive: true, force: true });
}

cpSync(join(rootDir, 'app'), join(targetDir, 'app'), { recursive: true });
mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
const shotsDir = join(rootDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(targetDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files in all, or a path under app/ over 1000 bytes).
writeFileSync(
  join(targetDir, 'dossier.json'),
  buildDossier(targetDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
