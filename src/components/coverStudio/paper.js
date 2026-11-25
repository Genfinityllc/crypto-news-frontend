// Real paper for shapes (owner 2026-11-24). The owner turned down drawn paper,
// so these are photographs of crumpled paper (see paper/SOURCES.md for where
// they come from and their licences). Each file holds only the paper's light
// and shadow: grey, with flat paper at level 173 of 255.
//
// A shape with `studio.paper = { id, strength, scale, ox, oy }` is filled with
// its own colour (or gradient) as always, and then the paper is laid over it
// in two passes: its shadows darken the colour (multiply) and its catches of
// light lighten it (screen). So the paper takes any colour, and switching it
// off leaves the plain shape. A paper object is never changed in place.
//
// The whole sheet spans SPAN cover pixels at scale 1, whatever the shape's
// size, so wrinkles are the same size on a small scrap and a large block. ox
// and oy say which part of the sheet the shape's top left corner lies on.
import foldsUrl from './paper/paper-folds.jpg';
import foldsSmallUrl from './paper/paper-folds-small.jpg';
import crumpleUrl from './paper/paper-crumple.jpg';
import crumpleSmallUrl from './paper/paper-crumple-small.jpg';

const LEVEL = 173; // flat paper in the files
const BOOST = 1.6; // the maps are made this much stronger than "100%", so the slider can go past it
const SPAN = 1920;

// shine: how much of the photograph's light is shown (its shadows show in full).
// (The files already have their contrast evened out, so both read alike.)
export const PAPERS = [
  { id: 'folds', name: 'Crumpled', url: foldsUrl, small: foldsSmallUrl, shine: 0.3 },
  { id: 'crumple', name: 'Dense crumple', url: crumpleUrl, small: crumpleSmallUrl, shine: 0.22 },
];
export const PAPER_STRENGTH = { min: 0.2, max: BOOST, start: 1 };
export const PAPER_SCALE = { min: 0.6, max: 2.4, start: 1 };

const findPaper = (id) => PAPERS.find((p) => p.id === id) || PAPERS[0];

// A new paper setting for a shape of w by h cover pixels, on a random part of the sheet.
export function newPaper(id, w = 400, h = 300) {
  return { id: findPaper(id).id, strength: PAPER_STRENGTH.start, scale: PAPER_SCALE.start, ox: Math.round(Math.random() * Math.max(0, SPAN - w)), oy: Math.round(Math.random() * Math.max(0, SPAN * 0.66 - h)) };
}

// ----- the two maps of a photograph: its shadows and its light -----
const sheets = new Map();
function sheetOf(def, small, ready) {
  const key = `${def.id}|${small ? 's' : 'l'}`;
  let e = sheets.get(key);
  if (!e) {
    e = { done: false, failed: false, shade: null, light: null, w: 0, h: 0, waiting: [] };
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
        const k = BOOST;
        for (let i = 0; i < a.length; i += 4) {
          const v = a[i] / LEVEL; // 1 = flat paper
          const s = Math.max(0, Math.min(1, 1 - k * (1 - v)));
          const l = Math.max(0, Math.min(1, k * (v - 1) * def.shine));
          a[i] = a[i + 1] = a[i + 2] = v >= 1 ? 255 : Math.round(s * 255);
          a[i + 3] = 255;
          b[i] = b[i + 1] = b[i + 2] = Math.round(l * 255);
          b[i + 3] = 255;
        }
        sg.putImageData(px, 0, 0);
        lg.putImageData(lp, 0, 0);
        Object.assign(e, { done: true, shade, light, w, h });
      } catch (err) {
        e.failed = true;
      }
      e.waiting.splice(0).forEach((fn) => fn());
    };
    img.onerror = () => {
      e.failed = true;
      e.waiting.length = 0;
    };
    img.src = small ? def.small : def.url;
  }
  if (e.done) return e;
  if (ready && !e.failed) e.waiting.push(ready);
  return null;
}

// Lay the paper over a shape that has just been filled. ctx: origin at the
// shape's centre, in cover pixels, already clipped to the shape's outline.
// Returns false while the photograph is still loading (`ready` is then called
// once it has arrived, so the caller can draw again).
export function paintPaper(ctx, paper, w, h, ready, small = false) {
  const def = findPaper(paper && paper.id);
  const m = sheetOf(def, small, ready);
  if (!m) return false;
  const ratio = m.h / m.w;
  const s = Math.max(paper.scale || 1, w / SPAN, h / (SPAN * ratio)); // the sheet always covers the shape
  const tw = SPAN * s;
  const th = tw * ratio;
  const x0 = Math.min(Math.max(0, (paper.ox || 0) * s), tw - w);
  const y0 = Math.min(Math.max(0, (paper.oy || 0) * s), th - h);
  const src = [(x0 / tw) * m.w, (y0 / th) * m.h, (w / tw) * m.w, (h / th) * m.h];
  const amount = Math.max(0, Math.min(1, (paper.strength == null ? 1 : paper.strength) / BOOST));
  const was = ctx.globalAlpha;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = was * amount;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(m.shade, ...src, -w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(m.light, ...src, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

// For a tile: the paper over a box that has just been filled (clipped by the
// caller). `again` is called when the small photograph arrives.
export function paintPaperTile(g, id, x, y, w, h, again) {
  g.save();
  g.translate(x + w / 2, y + h / 2);
  // on a tile the sheet is shown small, so a good part of it is in view
  paintPaper(g, { id, strength: 1.15, scale: 0.01, ox: 0, oy: 0 }, w, h, again, true);
  g.restore();
}
