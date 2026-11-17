// Fonts the person adds from their own computer.
//
// The files are read in the browser, registered with the FontFace API and kept
// in this browser's IndexedDB so they are still there next visit. They are
// never uploaded and never become part of the site, which is the point: the
// site only ships fonts whose licence allows public hosting, and everything
// else (commercial fonts the person has installed) is used from their machine.

const DB_NAME = 'cg_studio_fonts';
const STORE = 'files';

const WEIGHT_WORDS = [
  ['extralight', 200], ['ultralight', 200], ['extrabold', 800], ['ultrabold', 800],
  ['semibold', 600], ['demibold', 600], ['hairline', 100], ['thin', 100], ['light', 300],
  ['book', 450], ['regular', 400], ['normal', 400], ['medium', 500], ['demi', 600],
  ['bold', 700], ['heavy', 900], ['black', 900],
];

const STANDARD_NAMES = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

function decodeName(view, start, length, utf16) {
  let s = '';
  if (utf16) {
    for (let i = 0; i + 1 < length; i += 2) s += String.fromCharCode(view.getUint16(start + i));
  } else {
    for (let i = 0; i < length; i += 1) s += String.fromCharCode(view.getUint8(start + i));
  }
  return s.trim();
}

// Family, weight and italic straight from the font's own tables (TTF / OTF).
function parseSfnt(buffer) {
  const view = new DataView(buffer);
  let base = 0;
  let sig = view.getUint32(0);
  if (sig === 0x74746366) {
    // a collection: read the first font in it
    base = view.getUint32(12);
    sig = view.getUint32(base);
  }
  if (sig !== 0x00010000 && sig !== 0x4f54544f && sig !== 0x74727565) return null;
  const count = view.getUint16(base + 4);
  const tables = {};
  for (let i = 0; i < count; i += 1) {
    const o = base + 12 + i * 16;
    const tag = String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
    tables[tag] = view.getUint32(o + 8);
  }
  if (tables.name == null) return null;
  const n = tables.name;
  const records = view.getUint16(n + 2);
  const strings = n + view.getUint16(n + 4);
  const names = {};
  for (let i = 0; i < records; i += 1) {
    const r = n + 6 + i * 12;
    const platform = view.getUint16(r);
    const id = view.getUint16(r + 6);
    if (id !== 1 && id !== 2 && id !== 16 && id !== 17) continue;
    const text = decodeName(view, strings + view.getUint16(r + 10), view.getUint16(r + 8), platform === 0 || platform === 3);
    if (text && (names[id] == null || platform === 3)) names[id] = text;
  }
  let weight = 400;
  let italic = false;
  if (tables['OS/2'] != null) {
    weight = view.getUint16(tables['OS/2'] + 4) || 400;
    italic = (view.getUint16(tables['OS/2'] + 62) & 1) === 1;
  }
  const family = names[16] || names[1];
  if (!family) return null;
  const style = names[17] || names[2] || '';
  return { family, weight, italic: italic || /italic|oblique/i.test(style), styleName: style };
}

// Compressed web fonts (woff, woff2) cannot be read without unpacking them, so
// for those the file name is the guide: "Family-BoldItalic.woff2".
function parseFileName(fileName) {
  const stem = String(fileName).replace(/\.[a-z0-9]+$/i, '').replace(/\s+\d+$/, '');
  const [first, ...rest] = stem.split(/[-_]/);
  const styleRaw = rest.join(' ');
  const lower = styleRaw.toLowerCase().replace(/\s+/g, '');
  const hit = WEIGHT_WORDS.find(([w]) => lower.includes(w));
  const family = first.replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'My font';
  return { family, weight: hit ? hit[1] : 400, italic: /italic|oblique/i.test(styleRaw), styleName: styleRaw };
}

export function readFontMeta(buffer, fileName) {
  let meta = null;
  try {
    meta = parseSfnt(buffer);
  } catch (e) {
    meta = null;
  }
  if (!meta) meta = parseFileName(fileName);
  // CSS weights run 1 to 1000.
  meta.weight = Math.min(1000, Math.max(1, Math.round(meta.weight)));
  const label = String(meta.styleName || '')
    .replace(/italic|oblique/gi, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  meta.label = label && !/^regular$/i.test(label) ? label : STANDARD_NAMES[meta.weight] || (label || String(meta.weight));
  return meta;
}

function bufferToDataUrl(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:font/ttf;base64,${btoa(bin)}`;
}

// Register one file. Returns its details, or throws if the browser rejects it.
export async function registerFont(buffer, fileName) {
  const meta = readFontMeta(buffer, fileName);
  const desc = { weight: String(meta.weight), style: meta.italic ? 'italic' : 'normal' };
  let face;
  try {
    face = new FontFace(meta.family, buffer.slice(0), desc);
    await face.load();
  } catch (e) {
    // Some browsers refuse raw bytes under a strict policy; a data: URL is allowed.
    face = new FontFace(meta.family, `url(${bufferToDataUrl(buffer)})`, desc);
    await face.load();
  }
  document.fonts.add(face);
  return { ...meta, fileName, face };
}

// ---------- storage in this browser ----------
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no storage'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'fileName' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const out = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(out && out.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const storeFontFile = (fileName, buffer) => tx('readwrite', (s) => s.put({ fileName, buffer })).catch(() => null);
export const deleteFontFiles = (fileNames) =>
  tx('readwrite', (s) => {
    fileNames.forEach((n) => s.delete(n));
    return null;
  }).catch(() => null);
export const loadStoredFontFiles = () => tx('readonly', (s) => s.getAll()).then((rows) => rows || []).catch(() => []);

// Group registered files into picker entries: one per family, weights in order.
// Two files of one family can share a weight number (a "Book" and a "Regular"
// both marked 400, or the same file added twice); each style keeps its own
// slot so nothing is hidden.
export function buildFamilies(items) {
  const byFamily = new Map();
  items.forEach((it) => {
    if (!byFamily.has(it.family)) byFamily.set(it.family, []);
    byFamily.get(it.family).push(it);
  });
  const families = [];
  byFamily.forEach((list, family) => {
    const weights = [];
    const names = {};
    const italicWeights = [];
    const files = [];
    list
      .slice()
      .sort((a, b) => a.weight - b.weight)
      .forEach((it) => {
        files.push(it.fileName);
        if (it.italic) {
          if (!italicWeights.includes(it.weight)) italicWeights.push(it.weight);
          return;
        }
        if (!weights.includes(it.weight)) {
          weights.push(it.weight);
          names[it.weight] = it.label;
        }
      });
    // A family that only came with italics still needs weights to pick from.
    italicWeights.forEach((w) => {
      if (!weights.includes(w)) {
        weights.push(w);
        names[w] = (list.find((it) => it.weight === w) || {}).label || String(w);
      }
    });
    weights.sort((a, b) => a - b);
    const uprightWeights = list.filter((it) => !it.italic).map((it) => it.weight);
    families.push({ family, weights, names, italicWeights, italicOnly: weights.filter((w) => !uprightWeights.includes(w)), kind: 'Yours', files });
  });
  return families.sort((a, b) => a.family.localeCompare(b.family));
}
