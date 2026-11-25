// Real paper for shapes (owner 2026-11-24 and 2026-11-25). The owner turned
// down drawn paper, so this is a photograph of crumpled paper, the one sheet
// the owner kept (see paper/SOURCES.md for where it comes from and its
// licence). The file holds only the paper's light and shadow: grey, with flat
// paper at level 173 of 255.
//
// How it is laid out (owner 2026-11-25: "just use the shape as a simple mask
// that uses a part of the full sized paper"): there is ONE page of paper, and
// it lies over the whole cover, fixed to the cover. A shape with
// `studio.paper` is a window onto that page: it shows the part of the page it
// sits over. So the paper is never stretched with a shape, never repeated and
// never mirrored (both were tried and turned down), a shape of any size is
// filled, and moving a shape shows another part of the page. Two paper shapes
// side by side show one unbroken sheet.
//
// The shape is filled with its own colour (or gradient) as always, and then
// the page is laid over it in two passes: its shadows darken the colour
// (multiply) and its catches of light brighten it by the same share
// (color-dodge). Both passes scale the colour, as light on a real sheet does,
// so the paper takes any colour, a dark one included, and switching it off
// leaves the plain shape. `studio.paper = { id, strength }`; a paper object is
// never changed in place. (Settings saved before 2026-11-25 also carry scale,
// ox and oy; they are not used any more.)
//
// The file is 2880 px across for a cover of 1920, so the photograph is drawn
// smaller than its own pixels and stays sharp.
import foldsUrl from './paper/paper-folds.jpg';
import foldsSmallUrl from './paper/paper-folds-small.jpg';

const LEVEL = 173; // flat paper in the file
const BOOST = 1.6; // the maps are made this much stronger than "100%", so the slider can go past it
const RATIO = 2 / 3; // the page's height over its width

// A new paper shape starts dark grey (owner 2026-11-25). The colour is the
// shape's own fill, so it is changed like any shape's colour.
export const PAPER_COLOR = '#48484b';
export const PAPER_COLORS = ['#48484b', '#2b2b2d', '#8d8d8f', '#c9c7c2', '#f1efea'];
export const PAPER_STRENGTH = { min: 0.2, max: BOOST, start: 1 };

export const newPaper = () => ({ id: 'folds', strength: PAPER_STRENGTH.start });

// ----- the two maps of the photograph: its shadows and its light -----
// Each is kept at full size and at a half and a quarter of it, so a page shown
// small is drawn from a map near its size and its grain does not flicker.
const halve = (src) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width / 2));
  c.height = Math.max(1, Math.round(src.height / 2));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
};

const sheets = new Map();
function sheetOf(small, ready) {
  const key = small ? 's' : 'l';
  let e = sheets.get(key);
  if (!e) {
    e = { done: false, failed: false, shade: [], light: [], waiting: [] };
    sheets.set(key, e);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const shade = document.createElement('canvas');
        shade.width = w;
        shade.height = h;
        const sg = shade.getContext('2d');
        sg.drawImage(img, 0, 0);
        const px = sg.getImageData(0, 0, w, h);
        const light = document.createElement('canvas');
        light.width = w;
        light.height = h;
        const lg = light.getContext('2d');
        const lp = lg.createImageData(w, h);
        const a = px.data;
        const b = lp.data;
        for (let i = 0; i < a.length; i += 4) {
          const v = a[i] / LEVEL; // 1 = flat paper
          // shadows: the colour times s. light: the colour divided by (1 - l),
          // which is the colour times 1 + BOOST * (v - 1).
          const s = v >= 1 ? 1 : Math.max(0, 1 - BOOST * (1 - v));
          const l = v <= 1 ? 0 : 1 - 1 / (1 + BOOST * (v - 1));
          a[i] = a[i + 1] = a[i + 2] = Math.round(s * 255);
          a[i + 3] = 255;
          b[i] = b[i + 1] = b[i + 2] = Math.round(l * 255);
          b[i + 3] = 255;
        }
        sg.putImageData(px, 0, 0);
        lg.putImageData(lp, 0, 0);
        e.shade = [shade];
        e.light = [light];
        if (!small) {
          e.shade.push(halve(shade));
          e.shade.push(halve(e.shade[1]));
          e.light.push(halve(light));
          e.light.push(halve(e.light[1]));
        }
        e.done = true;
      } catch (err) {
        e.failed = true;
      }
      e.waiting.splice(0).forEach((fn) => fn());
    };
    img.onerror = () => {
      e.failed = true;
      e.waiting.length = 0;
    };
    img.src = small ? foldsSmallUrl : foldsUrl;
  }
  if (e.done) return e;
  if (ready && !e.failed) e.waiting.push(ready);
  return null;
}

// How many screen pixels one unit of this drawing surface covers just now.
function pixelsPerUnit(ctx) {
  try {
    const t = ctx.getTransform();
    return Math.hypot(t.a, t.b) || 1;
  } catch (e) {
    return 1;
  }
}

// The page over a cover of W by H: as wide as the cover (or as tall, for an
// upright one), centred, always covering it whole.
function pageOver(W, H) {
  const w = Math.max(W, H / RATIO);
  const h = w * RATIO;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

// Lay the page over what has just been filled. ctx: in the cover's own pixels
// (origin at its top left corner), already clipped to the shape. box: the
// part of the cover that needs drawing (the shape's bounds), or nothing for
// the whole cover.
function paintPage(ctx, m, W, H, box, amount) {
  if (!(W > 0 && H > 0) || amount <= 0) return;
  const pg = pageOver(W, H);
  const x0 = Math.max(pg.x, box ? box.x - 2 : pg.x);
  const y0 = Math.max(pg.y, box ? box.y - 2 : pg.y);
  const x1 = Math.min(pg.x + pg.w, box ? box.x + box.w + 2 : pg.x + pg.w);
  const y1 = Math.min(pg.y + pg.h, box ? box.y + box.h + 2 : pg.y + pg.h);
  if (!(x1 > x0 && y1 > y0)) return;
  // the smallest map that still has a pixel for every screen pixel
  const k = pixelsPerUnit(ctx);
  let lv = 0;
  while (lv < m.shade.length - 1 && m.shade[lv + 1].width >= pg.w * k) lv += 1;
  const was = ctx.globalAlpha;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = was * amount;
  [
    [m.shade[lv], 'multiply'],
    [m.light[lv], 'color-dodge'],
  ].forEach(([map, mode]) => {
    const fx = map.width / pg.w;
    const fy = map.height / pg.h;
    ctx.globalCompositeOperation = mode;
    ctx.drawImage(map, (x0 - pg.x) * fx, (y0 - pg.y) * fy, (x1 - x0) * fx, (y1 - y0) * fy, x0, y0, x1 - x0, y1 - y0);
  });
  ctx.restore();
}

// Lay the paper over a shape that has just been filled. ctx: in cover pixels,
// origin at the cover's top left corner, already clipped to the shape's
// outline. W, H: the cover's size. box: the shape's bounds on the cover.
// Returns false while the photograph is still loading (`ready` is then called
// once it has arrived, so the caller can draw again).
export function paintPaper(ctx, paper, W, H, box, ready) {
  const m = sheetOf(false, ready);
  if (!m) return false;
  const strength = paper && paper.strength != null ? paper.strength : 1;
  paintPage(ctx, m, W, H, box, Math.max(0, Math.min(1, strength / BOOST)));
  return true;
}

// For a tile: the page over a small picture of a cover, w by h (the caller
// has filled and clipped the shape). `again` is called when the photograph
// arrives.
export function paintPaperTile(g, w, h, again) {
  const m = sheetOf(true, again);
  if (m) paintPage(g, m, w, h, null, 1.15 / BOOST);
}
