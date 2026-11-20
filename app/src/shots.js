// Vice Coast Cover Studio — sample shots + small helpers.
// The three bundled photos live in app/samples/ and ship with the entry.
// Anything the user uploads stays in memory on their own machine.

export const SAMPLE_SHOTS = [
  { id: "pier", label: "Starter Pier", file: "samples/pier.jpg", hint: "Golden-hour pier walk" },
  { id: "boulevard", label: "Boulevard", file: "samples/boulevard.jpg", hint: "Neon boulevard at dusk" },
  { id: "rooftop", label: "Rooftop", file: "samples/rooftop.jpg", hint: "Dusk rooftop over the city" },
];

export function shotById(id) {
  return SAMPLE_SHOTS.find((s) => s.id === id) || null;
}

// Load one image element from a URL. Resolves with the element, or null
// on failure (a missing sample never breaks the editor).
export function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function loadSamples(base) {
  const photos = new Map();
  for (const shot of SAMPLE_SHOTS) {
    const img = await loadImage(base + shot.file);
    if (img) photos.set(shot.id, img);
  }
  return photos;
}

// Turn a title into a safe filename stem: "Vice Coast!" -> "vice-coast".
export function slugify(text) {
  const slug = String(text || "vice-coast")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "vice-coast";
}

// Screenshot / deep-link mode: ?shot=cover|editor&photo=rooftop
// &caption=Rooftop%20Royale&layout=nine-panel&grade=neon-night
// &lettering=condensed&subtitle=...&ribbon=...&stars=4
export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  const out = {};
  for (const key of ["shot", "photo", "caption", "layout", "grade", "lettering", "subtitle", "ribbon"]) {
    const v = q.get(key);
    if (v) out[key] = v;
  }
  const stars = Number.parseInt(q.get("stars") || "", 10);
  if (Number.isFinite(stars)) out.stars = stars;
  return out;
}
