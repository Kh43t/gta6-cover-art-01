// Vice Coast Cover Studio — local dev server.
//
// Serves the app/ folder over plain HTTP on port 8080 so the editor can be
// opened in a browser while building. No build step, no dependencies.
// Serves only files inside app/ and refuses path traversal.
//
// Usage:
//   node serve.ts            (or: bun serve.ts)
//   PORT=9000 node serve.ts
// Then open http://localhost:8080

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const root = resolve(fileURLToPath(new URL("./app", import.meta.url)));
const port = Number.parseInt(process.env.PORT || "8080", 10) || 8080;

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
  const file = resolve(join(root, rel));
  if (!file.startsWith(root + "/") && file !== root) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden\n");
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found\n");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Vice Coast Cover Studio dev server: http://localhost:${port}`);
});
