// Vice Coast Cover Studio — shots and loading (v7).
// The sample photos that ship with the app, image loading, and the
// deep-link parameters (?shot=cover|editor&photo=…&caption=…&layout=…)
// that the screenshot manifest and shared links use.

export const SAMPLES = [
  { id: "pier", label: "Starter Pier", file: "samples/pier.jpg" },
  { id: "boulevard", label: "Boulevard", file: "samples/boulevard.jpg" },
  { id: "rooftop", label: "Rooftop", file: "samples/rooftop.jpg" },
];

// Load one image by URL. Resolves with the element even on error so the
// caller can paint a placeholder instead of hanging.
export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Load every sample shot into a Map<id, HTMLImageElement>.
// `base` is the URL prefix for the app folder ("" when served at root,
// "./" when opened from a sub-path); callers pass document-relative paths.
export async function loadSamples(base = "") {
  const photos = new Map();
  await Promise.all(
    SAMPLES.map(async (s) => {
      const img = await loadImage(base + s.file);
      if (img) photos.set(s.id, img);
    }),
  );
  return photos;
}

// A photo the user adds from their own machine: an object URL, never
// uploaded anywhere. Returns the new shot id, or null if it did not load.
export async function addUserPhoto(photos, file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  if (!img) {
    URL.revokeObjectURL(url);
    return null;
  }
  const id = `user-${photos.size + 1}-${Date.now() % 100000}`;
  photos.set(id, img);
  return id;
}

// Read the deep-link overrides from the current page URL.
// Recognised keys: shot (cover|editor), photo (sample id), caption,
// layout, grade, lettering. Unknown values are ignored by the caller.
export function readLinkParams() {
  const q = new URLSearchParams(window.location.search);
  const out = {};
  const shot = q.get("shot");
  if (shot === "cover" || shot === "editor") out.shot = shot;
  const photo = q.get("photo");
  if (photo) out.photo = photo;
  const caption = q.get("caption");
  if (caption) out.caption = caption;
  for (const key of ["layout", "grade", "lettering"]) {
    const v = q.get(key);
    if (v) out[key] = v;
  }
  return out;
}

// Apply link overrides onto a cover state object (mutates and returns it).
// A named photo fills every panel so screenshot links look complete.
export function applyLinkParams(state, params) {
  if (params.caption) state.title = params.caption.slice(0, 30);
  if (params.layout) state.layout = params.layout;
  if (params.grade) state.grade = params.grade;
  if (params.lettering) state.lettering = params.lettering;
  if (params.photo) {
    for (const p of state.panels) p.shot = params.photo;
  }
  return state;
}
