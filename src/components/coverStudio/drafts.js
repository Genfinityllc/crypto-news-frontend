// Drafts: covers kept as working files that can be opened and edited again.
//
// Everything is stored in this browser's IndexedDB (like the person's own
// fonts): nothing is uploaded, no account is needed, and a draft made here is
// not visible on another computer or in another browser.
//
// Two stores:
//   meta  one small row per draft (name, dates, thumbnail) for the list
//   data  the cover itself, by the same id. The row `working:<profile>` is
//         the cover that is open right now, kept so a refresh or a closed tab
//         does not lose it.
//
// A cover is stored as plain data plus its pictures (photos, logos, an image
// background). Pictures are kept as encoded bytes, never as blob: URLs,
// because the live site's Content-Security-Policy does not allow those.

const DB_NAME = 'cg_studio_drafts';
const META = 'meta';
const DATA = 'data';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no storage for drafts.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Storage could not be opened.'));
  });
}

// run(stores) may return a request; its result is what the promise gives back.
function tx(names, mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(names, mode);
        const stores = {};
        names.forEach((n) => {
          stores[n] = t.objectStore(n);
        });
        const out = run(stores);
        t.oncomplete = () => {
          db.close();
          resolve(out && 'result' in out ? out.result : undefined);
        };
        const fail = () => {
          db.close();
          reject(t.error || new Error('Storage failed.'));
        };
        t.onerror = fail;
        t.onabort = fail;
      })
  );
}

export const newDraftId = () => `d-${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;

// Drafts of one editor (profile: 'cover' or 'interview'), newest first.
export const listDrafts = (profile) =>
  tx([META], 'readonly', (s) => s[META].getAll()).then((rows) =>
    (rows || []).filter((r) => r.profile === profile).sort((a, b) => (b.updated || 0) - (a.updated || 0))
  );

export const putDraft = (meta, cover) =>
  tx([META, DATA], 'readwrite', (s) => {
    s[META].put(meta);
    s[DATA].put({ id: meta.id, cover });
    return null;
  });

export const renameDraft = (meta) => tx([META], 'readwrite', (s) => s[META].put(meta));

export const getDraftCover = (id) => tx([DATA], 'readonly', (s) => s[DATA].get(id)).then((row) => (row ? row.cover : null));

export const deleteDraft = (id) =>
  tx([META, DATA], 'readwrite', (s) => {
    s[META].delete(id);
    s[DATA].delete(id);
    return null;
  });

const workingId = (profile) => `working:${profile}`;
// state: { cover, draft: { id, name } | null, dirty }
export const putWorking = (profile, state) => tx([DATA], 'readwrite', (s) => s[DATA].put({ id: workingId(profile), ...state }));
export const getWorking = (profile) => tx([DATA], 'readonly', (s) => s[DATA].get(workingId(profile))).then((row) => row || null);
export const clearWorking = (profile) => tx([DATA], 'readwrite', (s) => s[DATA].delete(workingId(profile)));

// ---------- pictures ----------
// A picture already encoded (or just decoded) keeps its bytes here, so saving
// again never encodes it a second time. That also means a photo stored as a
// JPEG is not compressed again on every save.
const encoded = new WeakMap();

const isPicture = (v) =>
  (typeof HTMLCanvasElement !== 'undefined' && v instanceof HTMLCanvasElement) ||
  (typeof HTMLImageElement !== 'undefined' && v instanceof HTMLImageElement) ||
  (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap);

// -> { type, buf } or null when the picture cannot be read back (it is then
// left out of the draft).
async function encodePicture(src) {
  if (encoded.has(src)) return encoded.get(src);
  let c = src;
  if (!(src instanceof HTMLCanvasElement)) {
    c = document.createElement('canvas');
    c.width = src.naturalWidth || src.width;
    c.height = src.naturalHeight || src.height;
    c.getContext('2d').drawImage(src, 0, 0);
  }
  if (!c.width || !c.height) return null;
  // A picture with no see-through parts is stored as a JPEG (much smaller);
  // logos and cut-out photos keep their transparency as PNG.
  let opaque = true;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 250) {
        opaque = false;
        break;
      }
    }
  } catch (e) {
    return null;
  }
  const type = opaque && c.width * c.height > 200000 ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve) => {
    try {
      c.toBlob(resolve, type, 0.93);
    } catch (e) {
      resolve(null);
    }
  });
  if (!blob) return null;
  const rec = { type: blob.type || type, buf: await blob.arrayBuffer() };
  encoded.set(src, rec);
  return rec;
}

function decodePicture(rec) {
  return new Promise((resolve) => {
    if (!rec || !rec.buf) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        encoded.set(c, rec);
        resolve(c);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(new Blob([rec.buf], { type: rec.type || 'image/png' }));
  });
}

// ---------- a cover as plain data ----------
// Anything in an item's settings is stored as it is, except:
//   a picture            -> { __pic: n }   (n: its place in the pictures list)
//   another item         -> { __item: n }  (n: its place on the cover)
//   working copies       -> left out (keys starting with "_", and "mono",
//                           which is rebuilt from the picture)
function pack(value, ctx) {
  if (value == null || typeof value !== 'object') return typeof value === 'function' ? undefined : value;
  if (isPicture(value)) {
    let n = ctx.pics.indexOf(value);
    if (n < 0) n = ctx.pics.push(value) - 1;
    return { __pic: n };
  }
  const at = ctx.items.indexOf(value);
  if (at >= 0) return { __item: at };
  if (Array.isArray(value)) return value.map((v) => pack(v, ctx));
  // only plain data from here on (never a DOM node or an editor object)
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return undefined;
  const out = {};
  Object.keys(value).forEach((k) => {
    if (k.charAt(0) === '_' || k === 'mono') return;
    const v = pack(value[k], ctx);
    if (v !== undefined) out[k] = v;
  });
  return out;
}

function unpack(value, pics) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => unpack(v, pics));
  if (typeof value.__pic === 'number') return pics[value.__pic] || null;
  if (typeof value.__item === 'number') return value; // joined up once every item exists
  const out = {};
  Object.keys(value).forEach((k) => {
    out[k] = unpack(value[k], pics);
  });
  return out;
}

// Replace every { __item: n } with the item itself.
export function linkItems(value, items) {
  if (value == null || typeof value !== 'object' || isPicture(value)) return;
  Object.keys(value).forEach((k) => {
    const v = value[k];
    if (v && typeof v === 'object' && typeof v.__item === 'number') value[k] = items[v.__item] || null;
    else if (v && typeof v === 'object' && !isPicture(v) && items.indexOf(v) < 0) linkItems(v, items);
  });
}

// items: the editor's items in stacking order; rows: for each one
// { kind, props, studio } (studio is the live settings object).
// bg: the background settings (its `image`, if any, is a picture).
export async function packCover({ profile, width, height, items, rows, bg, extras }) {
  const ctx = { pics: [], items };
  const objects = rows.map((r) => ({ kind: r.kind, props: pack(r.props, ctx), studio: pack(r.studio, ctx) }));
  const background = pack(bg, ctx);
  const pictures = await Promise.all(ctx.pics.map(encodePicture));
  return { v: 1, profile, width, height, objects, background, extras: pack(extras || {}, ctx), pictures };
}

// -> { objects: [{ kind, props, studio }], background, extras } with pictures
// back as canvases. Items still point at each other by number: call linkItems
// on each studio once the items are built.
export async function unpackCover(cover) {
  const pics = await Promise.all((cover.pictures || []).map(decodePicture));
  return {
    objects: (cover.objects || []).map((o) => ({ kind: o.kind, props: unpack(o.props, pics), studio: unpack(o.studio, pics) })),
    background: unpack(cover.background, pics),
    extras: unpack(cover.extras || {}, pics),
  };
}

// A small JPEG of the finished cover for the drafts list.
export function makeThumb(dataUrl, width = 400) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve('');
      return;
    }
    const img = new Image();
    img.onerror = () => resolve('');
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = Math.max(1, Math.round((width * img.naturalHeight) / img.naturalWidth));
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, c.width, c.height);
      try {
        resolve(c.toDataURL('image/jpeg', 0.8));
      } catch (e) {
        resolve('');
      }
    };
    img.src = dataUrl;
  });
}
