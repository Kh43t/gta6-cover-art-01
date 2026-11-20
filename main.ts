// Vice Coast Cover Studio — hand-in for gta6-cover-art-01 (Node 22,
// standard library only). The app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its
// ES modules, no library and no network request). This program copies
// app/ and screenshots/ beside it into the output dir and writes
// dossier.json, the summary the judge reads, with the vendored make.fun
// library.
//
// It never removes the output directory itself: it clears only the three
// things it owns inside it (app, screenshots, dossier.json), so running
// as an unprivileged user against a root-owned output dir still works,
// and it creates the output dir when it is missing.
//
// Serve the app locally with `node serve.ts`, then open
// http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output dir when it is missing, and clear only the entries
// this program owns — never the directory itself.
mkdirSync(out, { recursive: true });
for (const owned of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(out, owned), { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more
// than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
// 48 MiB of app files, in all, or a path under app/ over 1000 bytes).
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
console.log(`handed in to ${out}`);
