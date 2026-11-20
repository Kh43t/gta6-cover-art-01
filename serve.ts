// Vice Coast Cover Studio — dev server (v7).
// Serves the entry locally for development. No build step, no network
// at runtime beyond localhost.
//
// Usage:
//   node serve.ts            (listens on http://localhost:8080)
//   PORT=9000 node serve.ts

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);

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

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  // The editor lives under /app/; send the bare root there so the
  // page's relative asset paths (style.css, src/…) resolve.
  if (rel === "/") {
    res.writeHead(302, { location: "/app/" });
    res.end();
    return;
  }
  if (rel === "/app" || rel === "/app/") rel = "/app/index.html";
  const full = resolve(join(ROOT, normalize(rel)));
  // Stay inside the repo: reject anything that escapes the root.
  if (!full.startsWith(ROOT + "/") && full !== ROOT) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden\n");
    return;
  }
  if (!existsSync(full) || !statSync(full).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found\n");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(full)] || "application/octet-stream" });
  createReadStream(full).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Vice Coast Cover Studio at http://localhost:${PORT}`);
});
