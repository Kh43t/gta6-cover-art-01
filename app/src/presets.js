// Sundown Racket — data layer.
// Everything the poster is built from: the demo cast, the colour grades,
// the title lettering, the export sizes and the default words on the cover.
// No rendering lives here; cover.js consumes these tables.

export const COMPETITION_ID = "gta6-cover-art-01";
export const STUDIO_NAME = "Sundown Racket Cover Studio";
export const DEFAULT_TITLE = "SUNDOWN RACKET";

// The 8-person demo cast. Photo files live in app/samples/ and were made
// with Pollinations (free, no key). `focal` is the face anchor used by the
// face-aware crop: 0 = top of the photo, 1 = bottom. Portraits keep their
// faces in frame because the crop is centred on this point, not on the
// middle of the image.
export const CAST_ROSTER = [
  { id: "marcus", file: "cast-1.jpg", name: "Marcus Vale",   role: "THE DRIVER",   focal: 0.30, hero: true  },
  { id: "lena",   file: "cast-2.jpg", name: "Lena Cross",    role: "THE FIXER",    focal: 0.28, hero: false },
  { id: "roy",    file: "cast-3.jpg", name: "Roy Delgado",   role: "THE CAPTAIN",  focal: 0.30, hero: false },
  { id: "eddie",  file: "cast-4.jpg", name: "Eddie Sparks",  role: "THE MECHANIC", focal: 0.32, hero: false },
  { id: "rosa",   file: "cast-5.jpg", name: "Rosa Vega",     role: "THE RIDER",    focal: 0.28, hero: false },
  { id: "vincent",file: "cast-6.jpg", name: "Vincent Gold",  role: "THE BOSS",     focal: 0.30, hero: false },
  { id: "nadia",  file: "cast-7.jpg", name: "Nadia Ray",     role: "THE LOOKOUT",  focal: 0.28, hero: false },
  { id: "tommy",  file: "cast-8.jpg", name: "Tommy Blade",   role: "THE ENFORCER", focal: 0.30, hero: false },
];

// The six faces that share the poster with the hero. The eighth cast
// member stays in the roster so the editor can swap anyone in.
export const POSTER_CAST_IDS = ["lena", "roy", "eddie", "rosa", "vincent", "nadia"];

export function castMember(id) {
  return CAST_ROSTER.find((m) => m.id === id) || CAST_ROSTER[0];
}

export function heroMember(state) {
  return castMember(state.heroId || "marcus");
}

export function posterCast(state) {
  const ids = state.castIds && state.castIds.length === 6 ? state.castIds : POSTER_CAST_IDS;
  return ids.map(castMember);
}

// Colour grades. Each grade is a pair of palettes: the sky the poster is
// painted on, and a three-stop luminance ramp the photos are pushed
// through (shadow -> mid -> highlight). `ink` is the colour of the small
// print; `accent` is the gold used by the seal, stars and tags.
export const POSTER_GRADES = [
  {
    id: "sundown", label: "Sundown Gold",
    sky: ["#2b1055", "#7597de"],
    skyLow: ["#ff9a3d", "#ff2e63"],
    ramp: ["#1c0b2e", "#b3475e", "#ffd166"],
    ink: "#fff3d6", accent: "#ffc93d", tag: "#ff2e63",
  },
  {
    id: "neon", label: "Neon Night",
    sky: ["#050510", "#123a6d"],
    skyLow: ["#00e5ff", "#b537f2"],
    ramp: ["#02020a", "#123a6d", "#7df9ff"],
    ink: "#d9fbff", accent: "#00e5ff", tag: "#b537f2",
  },
  {
    id: "palm", label: "Palm Gold",
    sky: ["#3d2200", "#8a5a00"],
    skyLow: ["#ffb347", "#ff7b00"],
    ramp: ["#241300", "#8a5a00", "#ffe29a"],
    ink: "#fff6dd", accent: "#ffb347", tag: "#c96f00",
  },
  {
    id: "teal", label: "Teal Heat",
    sky: ["#02202a", "#0b5563"],
    skyLow: ["#2dd4bf", "#ff6b35"],
    ramp: ["#01161d", "#0b5563", "#ffd166"],
    ink: "#e6fffa", accent: "#2dd4bf", tag: "#ff6b35",
  },
  {
    id: "noir", label: "Noir",
    sky: ["#000000", "#2b2b2b"],
    skyLow: ["#5a5a5a", "#e8e8e8"],
    ramp: ["#000000", "#555555", "#ffffff"],
    ink: "#f2f2f2", accent: "#e8e8e8", tag: "#111111",
  },
];

export function gradeById(id) {
  return POSTER_GRADES.find((g) => g.id === id) || POSTER_GRADES[0];
}

// Title lettering. Each style is a canvas font stack plus the chrome
// treatment the renderer applies: `chrome` paints the striped metal fill,
// `glow` adds a hot outline, `flat` is plain heavy capitals.
export const TITLE_FONTS = [
  { id: "chrome-block", label: "Chrome Block", stack: "900 {px}px 'Arial Black', Impact, sans-serif", treatment: "chrome", lean: 0 },
  { id: "sunset-slant", label: "Sunset Slant", stack: "italic 900 {px}px 'Arial Black', Impact, sans-serif", treatment: "glow", lean: -0.06 },
  { id: "noir-tall",    label: "Noir Tall",    stack: "900 {px}px 'Arial Narrow', Impact, sans-serif", treatment: "flat", lean: 0 },
];

export function fontById(id) {
  return TITLE_FONTS.find((f) => f.id === id) || TITLE_FONTS[0];
}

// The three export sizes. The poster ratio is the middle one; the other
// two re-flow the same composition (see cover.js `frameFor`).
export const EXPORT_SIZES = [
  { id: "square",   label: "Square",   w: 1080, h: 1080 },
  { id: "poster",   label: "Poster",   w: 1080, h: 1350 },
  { id: "wide",     label: "Wide",     w: 1920, h: 1080 },
];

export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[1];
}

// Default words printed on the poster. Every field is editable in step 2.
export const DEFAULT_WORDS = {
  title: DEFAULT_TITLE,
  fontId: "chrome-block",
  scriptLine: "a Sundown Pictures production",
  tagline: "EVERY CREW NEEDS A DRIVER",
  quote: "THE HOTTEST RIDE OF THE YEAR",
  quoteSource: "Golden Mile Gazette",
  billing:
    "SUNDOWN PICTURES presents MARCUS VALE LENA CROSS ROY DELGADO EDDIE SPARKS ROSA VEGA VINCENT GOLD NADIA RAY TOMMY BLADE  music by THE MIDNIGHT MOTORS  casting by GOLDEN MILE  written & directed by A. SUNDOWN",
  sealText: "BEST CAST",
  sealRing: "GOLDEN MILE  •  VOL. 1  •  ",
  releaseLine: "COMING SOON",
  editionTag: "VOL. 1",
  gradeId: "sundown",
};

// Fresh editor state. `crops` holds one face-aware crop per cast slot:
// zoom (1 = fit), dx / dy (-1..1 pan inside the frame).
export function freshState() {
  const crops = {};
  for (const m of CAST_ROSTER) crops[m.id] = { zoom: 1.12, dx: 0, dy: 0 };
  return {
    heroId: "marcus",
    castIds: [...POSTER_CAST_IDS],
    words: { ...DEFAULT_WORDS },
    crops,
    selectedId: "marcus",
    step: 1,
  };
}
