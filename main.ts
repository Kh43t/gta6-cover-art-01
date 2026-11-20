// Vice Coast Cover Studio — hand-in program (v3, Node 22, stdlib only).
//
// Copies app/ and screenshots/ from beside this file into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library (vendor/makefun-app.ts, byte for byte the kit's copy).
//
// The output directory itself is NEVER removed. The grader runs this program
// as an unprivileged user against a read-only repository and a writable
// output directory whose parent directory cannot be written, so deleting the
// output directory itself throws EACCES. Instead we clear only the three
// entries this program owns inside it — app, screenshots and dossier.json —
// and then write them fresh. Removing a child of the output directory only
// needs write permission on the directory itself, which the grader grants.
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory if it is missing, but never delete it.
mkdirSync(out, { recursive: true });

// Clear only what this program owns inside the output directory, so a
// second run starts clean without touching the directory itself.
for (const owned of ['app', 'screenshots', 'dossier.json']) {
  const target = join(out, owned);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files in all, or a path under app/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
