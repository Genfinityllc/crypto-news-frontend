// Graphic elements for the Interview Cover Studio's Elements tab (owner
// 2026-11-24, from four reference designs): bold marks, grid spheres, line
// work and small parts. Every one is an original drawing made here from
// paths, lines and circles, so it is a true vector: the studio keeps the
// drawing itself (studio.vector) and draws it again whenever the item is made
// larger, which keeps it sharp at any size. All are single-colour and take
// whatever colour the person picks.
//
// To add one: a line in GRAPHICS (its group, a name, 'fill' or 'line', the
// width it starts with on the cover, and a function returning { w, h, svg }
// for a box of w by h). Nothing else needs touching.
//
// Settings (owner 2026-11-25: "if i change the spacing of the lines to be
// closer more lines should appear to fill the overall size"). A drawing's
// function is given { d, t }:
//   d  how close its lines (or dots, bars, points) are: 1 as drawn, 2 twice
//      as many in the same box. Only drawings with a `density` label use it
//      (the label is the slider's name in the Edit panel).
//   t  line thickness, 1 as drawn. Every 'line' drawing uses it.
// The box keeps its size whatever the settings, so an item on the cover
// stays the size it is and simply shows more or fewer lines.

import { GENFINITY_MARK } from './genfinityMark';

const f = (n) => Number(n.toFixed(2));

// a small repeatable random number maker
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A bold X: two blunt bars crossed, like a plus sign turned (the owner's
// references have blunt ends, not points). The turned bar just fits the box.
const xMark = (cx, cy, size, t) => {
  const len = size * Math.SQRT2 - t;
  return [45, -45].map((a) => `<rect x="${f(cx - len / 2)}" y="${f(cy - t / 2)}" width="${f(len)}" height="${f(t)}" rx="${f(t * 0.07)}" transform="rotate(${a} ${cx} ${cy})"/>`).join('');
};

// a four-point star with curved sides; k: how thin the waist is
const star4 = (cx, cy, r, k = 0.2) => {
  const q = r * k;
  return `M${f(cx)} ${f(cy - r)}Q${f(cx + q)} ${f(cy - q)} ${f(cx + r)} ${f(cy)}Q${f(cx + q)} ${f(cy + q)} ${f(cx)} ${f(cy + r)}Q${f(cx - q)} ${f(cy + q)} ${f(cx - r)} ${f(cy)}Q${f(cx - q)} ${f(cy - q)} ${f(cx)} ${f(cy - r)}Z`;
};

// slanted lines inside a shape
function hatch(w, h, gap, t, id, shape) {
  let d = '';
  for (let x = -h; x < w + gap; x += gap) d += `M${f(x)} ${h}L${f(x + h)} 0`;
  return `<defs><clipPath id="${id}">${shape}</clipPath></defs><path d="${d}" fill="none" stroke-width="${t}" clip-path="url(#${id})"/>`;
}

// a wireframe sphere seen from a little above: lines of longitude and latitude
function globe({ R: box = 100, sx = 1, tilt = 22, meridians = 8, parallels = 7, sw = 2.2, sw0 = sw, half = false }) {
  // The box is the one the drawing has at its own line thickness (sw0); a
  // thicker line makes the sphere a little smaller, not the box larger.
  const R = box - Math.max(0, sw - sw0);
  const tr = (tilt * Math.PI) / 180;
  const W = box * 2 * sx + sw0 * 2;
  const H = (half ? box : box * 2) + sw0 * 2;
  const cx = W / 2;
  const cy = box + sw0;
  const pt = (lat, lon) => {
    const x = R * Math.cos(lat) * Math.sin(lon);
    const y = R * Math.sin(lat);
    const z = R * Math.cos(lat) * Math.cos(lon);
    return [cx + x * sx, cy - (y * Math.cos(tr) - z * Math.sin(tr))];
  };
  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('');
  let d = '';
  for (let i = 0; i < meridians; i += 1) {
    const lon = (Math.PI * i) / meridians;
    const pts = [];
    for (let k = 0; k <= 96; k += 1) {
      const a = (Math.PI * 2 * k) / 96;
      // a full great circle through both poles
      pts.push(pt(Math.asin(Math.sin(a)), Math.cos(a) >= 0 ? lon : lon + Math.PI));
    }
    d += `${line(pts)}Z`;
  }
  for (let j = 1; j <= parallels; j += 1) {
    const lat = -Math.PI / 2 + (Math.PI * j) / (parallels + 1);
    const pts = [];
    for (let k = 0; k < 96; k += 1) pts.push(pt(lat, (Math.PI * 2 * k) / 96));
    d += `${line(pts)}Z`;
  }
  const body = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(R * sx)}" ry="${R}" fill="none" stroke-width="${sw}"/><path d="${d}" fill="none" stroke-width="${sw}" stroke-linejoin="round"/>`;
  if (!half) return { w: W, h: H, svg: body };
  return { w: W, h: H, svg: `<defs><clipPath id="gh"><rect x="0" y="0" width="${f(W)}" height="${f(cy)}"/></clipPath></defs><g clip-path="url(#gh)">${body}</g><path d="M${sw} ${f(cy)}H${f(W - sw)}" fill="none" stroke-width="${sw}"/>` };
}

// how many of something there are at closeness d (never fewer than `least`)
const cnt = (base, d, least = 1) => Math.max(least, Math.round(base * d));

export const GRAPHIC_DENSITY = { min: 0.4, max: 3, start: 1 };
export const GRAPHIC_WEIGHT = { min: 0.3, max: 3, start: 1 };
const LINES = 'How close the lines are';
// the thickness of the slanted lines of a fill, kept under the gap between them
const hatchLine = (d, t) => f(Math.min((6.5 * t) / d, (0.86 * 15) / d / Math.SQRT2));
// a line's thickness, kept under a share of the distance to the next line
const thin = (sw, step, share = 0.78) => Math.min(sw, step * share);

export const GRAPHIC_GROUPS = [
  { id: 'marks', name: 'Marks' },
  { id: 'lines', name: 'Spheres and line work' },
  { id: 'parts', name: 'Line fills and small parts' },
];

// kind: 'fill' (solid shapes) or 'line' (drawn with a stroke).
// size: the width the piece starts with on the cover, in cover pixels.
export const GRAPHICS = [
  // ----- marks -----
  { group: 'marks', id: 'genfinity', name: 'Genfinity mark', kind: 'fill', size: 300, make: () => ({ w: GENFINITY_MARK.w, h: GENFINITY_MARK.h, svg: `<path d="${GENFINITY_MARK.d}"/>` }) },
  { group: 'marks', id: 'x-bold', name: 'Bold X', kind: 'fill', size: 220, make: () => ({ w: 200, h: 200, svg: xMark(100, 100, 200, 68) }) },
  { group: 'marks', id: 'x-pair', name: 'Bold X pair', kind: 'fill', size: 420, make: () => ({ w: 440, h: 200, svg: xMark(100, 100, 200, 68) + xMark(340, 100, 200, 68) }) },
  { group: 'marks', id: 'star', name: 'Four-point star', kind: 'fill', size: 200, make: () => ({ w: 200, h: 200, svg: `<path d="${star4(100, 100, 100, 0.2)}"/>` }) },
  { group: 'marks', id: 'star-outline', name: 'Star outline', kind: 'line', size: 200, make: ({ t }) => ({ w: 200, h: 200, svg: `<path d="${star4(100, 100, 100 - 4 * t, 0.2)}" fill="none" stroke-width="${f(4 * t)}" stroke-linejoin="round"/>` }) },
  { group: 'marks', id: 'star-column', name: 'Star column', kind: 'line', size: 110, make: ({ t }) => ({ w: 120, h: 510, svg: [0, 1, 2, 3].map((i) => `<path d="${star4(60, 60 + i * 130, 60 - 4 * t, 0.2)}" fill="none" stroke-width="${f(3.5 * t)}" stroke-linejoin="round"/>`).join('') }) },
  { group: 'marks', id: 'star-tile', name: 'Star tile', kind: 'fill', size: 220, make: () => ({ w: 200, h: 200, svg: `<path fill-rule="evenodd" d="M0 0H200V200H0ZM100 22A78 78 0 1 0 100 178A78 78 0 1 0 100 22Z"/><path d="${star4(100, 100, 74, 0.3)}"/>` }) },
  { group: 'marks', id: 'arrows', name: 'Arrow row', kind: 'fill', size: 300, make: () => ({ w: 430, h: 70, svg: [0, 1, 2, 3].map((i) => `<path d="M${i * 120} 0L${i * 120 + 70} 35L${i * 120} 70Z"/>`).join('') }) },
  { group: 'marks', id: 'arrow', name: 'Bold arrow', kind: 'fill', size: 200, make: () => ({ w: 200, h: 200, svg: '<path d="M60 0H200V140H152V82L34 200L0 166L118 48H60Z"/>' }) },
  { group: 'marks', id: 'asterisk', name: 'Asterisk', kind: 'fill', size: 200, make: () => ({ w: 200, h: 200, svg: [0, 60, 120].map((a) => `<rect x="78" y="0" width="44" height="200" rx="4" transform="rotate(${a} 100 100)"/>`).join('') }) },
  {
    group: 'marks',
    id: 'burst',
    name: 'Burst',
    kind: 'fill',
    size: 220,
    density: 'How many points',
    make: ({ d }) => {
      const n = cnt(16, d, 5) * 2;
      let path = '';
      for (let i = 0; i < n; i += 1) {
        const a = (Math.PI * 2 * i) / n;
        const r = i % 2 ? 72 : 100;
        path += `${i ? 'L' : 'M'}${f(100 + Math.sin(a) * r)} ${f(100 - Math.cos(a) * r)}`;
      }
      return { w: 200, h: 200, svg: `<path d="${path}Z"/>` };
    },
  },
  { group: 'marks', id: 'clover', name: 'Clover', kind: 'fill', size: 200, make: () => ({ w: 200, h: 200, svg: '<circle cx="62" cy="62" r="62"/><circle cx="138" cy="62" r="62"/><circle cx="62" cy="138" r="62"/><circle cx="138" cy="138" r="62"/>' }) },

  // ----- spheres and line work -----
  { group: 'lines', id: 'globe', name: 'Grid sphere', kind: 'line', size: 420, density: LINES, make: ({ d, t }) => globe({ R: 150, tilt: 24, meridians: cnt(8, d, 2), parallels: cnt(7, d), sw: 2.6 * t, sw0: 2.6 }) },
  { group: 'lines', id: 'globe-wide', name: 'Grid sphere, wide', kind: 'line', size: 520, density: LINES, make: ({ d, t }) => globe({ R: 110, sx: 1.42, tilt: 20, meridians: cnt(12, d, 2), parallels: cnt(11, d), sw: 1.8 * t, sw0: 1.8 }) },
  { group: 'lines', id: 'dome', name: 'Grid dome', kind: 'line', size: 520, density: LINES, make: ({ d, t }) => globe({ R: 170, tilt: 0.01, meridians: cnt(9, d, 2), parallels: cnt(9, d), sw: 2.6 * t, sw0: 2.6, half: true }) },
  { group: 'lines', id: 'ring-sphere', name: 'Ring sphere', kind: 'line', size: 400, density: LINES, make: ({ d, t }) => globe({ R: 130, tilt: 30, meridians: 0, parallels: cnt(13, d), sw: 2.2 * t, sw0: 2.2 }) },
  {
    group: 'lines',
    id: 'orbit',
    name: 'Orbit',
    kind: 'line',
    size: 460,
    density: 'How many rings',
    make: ({ d, t }) => {
      // rings fanned about the middle: two at 22 degrees each way, more fan wider (34 at most, so they stay in the box)
      const n = cnt(2, d);
      const half = n < 2 ? 0 : Math.min(34, 22 + 4 * (n - 2));
      let s = '';
      for (let i = 0; i < n; i += 1) s += `<ellipse cx="160" cy="100" rx="${f(158 - 1.6 * t)}" ry="46" fill="none" stroke-width="${f(2.6 * t)}" transform="rotate(${f(n < 2 ? 0 : half - (2 * half * i) / (n - 1))} 160 100)"/>`;
      return { w: 320, h: 200, svg: s };
    },
  },
  {
    group: 'lines',
    id: 'mesh',
    name: 'Diamond mesh',
    kind: 'line',
    size: 520,
    density: LINES,
    make: ({ d, t }) => {
      const n = cnt(7, d, 2);
      let path = '';
      for (let i = 0; i < n; i += 1) {
        const y = f(50 + (96 * i) / (n - 1));
        path += `M4 ${y}L200 ${f(y - 46)}L396 ${y}L200 ${f(y + 46)}Z`;
      }
      return { w: 400, h: 196, svg: `<path d="${path}" fill="none" stroke-width="${f(thin(2.2 * t, 96 / (n - 1), 0.6))}" stroke-linejoin="round"/>` };
    },
  },
  {
    group: 'lines',
    id: 'rings',
    name: 'Rings',
    kind: 'line',
    size: 300,
    density: LINES,
    make: ({ d, t }) => {
      // rings from the edge inwards, evenly apart; the middle is left a little open
      const n = cnt(5, d);
      const sw = thin(3 * t, 97 / (n - 0.38));
      const out = 98.5 - sw / 2;
      const step = out / (n - 0.38);
      let s = '';
      for (let i = 0; i < n; i += 1) s += `<circle cx="100" cy="100" r="${f(out - i * step)}" fill="none" stroke-width="${f(sw)}"/>`;
      return { w: 200, h: 200, svg: s };
    },
  },
  {
    group: 'lines',
    id: 'fan',
    name: 'Quarter fan',
    kind: 'line',
    size: 300,
    density: LINES,
    make: ({ d, t }) => {
      const n = cnt(6, d);
      const sw = thin(4 * t, 196 / (n - 0.235));
      const out = 198 - sw / 2;
      const step = out / (n - 0.235);
      let s = '';
      for (let i = 0; i < n; i += 1) {
        const r = f(out - i * step);
        s += `<path d="M${f(200 - r)} 200A${r} ${r} 0 0 1 200 ${f(200 - r)}" fill="none" stroke-width="${f(sw)}"/>`;
      }
      return { w: 200, h: 200, svg: s };
    },
  },
  {
    group: 'lines',
    id: 'waves',
    name: 'Wave lines',
    kind: 'line',
    size: 420,
    density: LINES,
    make: ({ d, t }) => {
      // more lines in the same height; each is a little finer the closer they are
      const n = cnt(4, d);
      const sw = thin((5 * t) / Math.max(1, Math.sqrt(d)), n < 2 ? 40 : 90 / (n - 1));
      const top = 17 + sw / 2;
      const bottom = 113 - sw / 2;
      let s = '';
      for (let k = 0; k < n; k += 1) {
        let path = `M0 ${f(n < 2 ? 65 : top + ((bottom - top) * k) / (n - 1))}`;
        for (let i = 0; i < 4; i += 1) path += 'q25 -32 50 0t50 0';
        s += `<path d="${path}" fill="none" stroke-width="${f(sw)}"/>`;
      }
      return { w: 400, h: 130, svg: s };
    },
  },
  {
    group: 'lines',
    id: 'zigzag',
    name: 'Zigzag',
    kind: 'line',
    size: 420,
    density: 'How close the points are',
    make: ({ d, t }) => {
      const n = cnt(10, d, 2);
      const sw = (7 * t) / Math.max(1, Math.sqrt(d));
      const x0 = Math.max(4, sw / 2 + 0.5);
      const tw = (408 - 2 * x0) / n;
      // room above and below for the sharp corners, which reach past the line itself
      const pad = Math.min(22, sw / 2 / Math.sin(Math.atan(tw / 2 / 52))) + 0.5;
      let path = `M${f(x0)} ${f(68 - pad)}`;
      for (let i = 0; i < n; i += 1) path += `L${f(x0 + i * tw + tw / 2)} ${f(pad)}L${f(x0 + (i + 1) * tw)} ${f(68 - pad)}`;
      return { w: 408, h: 68, svg: `<path d="${path}" fill="none" stroke-width="${f(sw)}" stroke-linejoin="miter" stroke-miterlimit="12"/>` };
    },
  },

  // ----- line fills and small parts -----
  // (closer lines are finer too, so a fill keeps its share of line and gap; and
// a line is never so thick that the gaps close)
  { group: 'parts', id: 'hatch-square', name: 'Square of lines', kind: 'line', size: 240, density: LINES, make: ({ d, t }) => ({ w: 200, h: 200, svg: hatch(200, 200, 15 / d, hatchLine(d, t), 'hs', '<rect width="200" height="200"/>') }) },
  { group: 'parts', id: 'hatch-circle', name: 'Circle of lines', kind: 'line', size: 240, density: LINES, make: ({ d, t }) => ({ w: 200, h: 200, svg: hatch(200, 200, 15 / d, hatchLine(d, t), 'hc', '<circle cx="100" cy="100" r="100"/>') }) },
  { group: 'parts', id: 'hatch-bar', name: 'Bar of lines', kind: 'line', size: 520, density: LINES, make: ({ d, t }) => ({ w: 520, h: 70, svg: hatch(520, 70, 15 / d, hatchLine(d, t), 'hb', '<rect width="520" height="70"/>') }) },
  {
    group: 'parts',
    id: 'dots',
    name: 'Dot grid',
    kind: 'fill',
    size: 220,
    density: 'How close the dots are',
    make: ({ d }) => {
      const n = cnt(6, d, 2);
      const r = Math.min(10, 35 / (n - 1));
      const m = Math.max(10, r + 1);
      const step = (200 - 2 * m) / (n - 1);
      let s = '';
      for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) s += `<circle cx="${f(m + x * step)}" cy="${f(m + y * step)}" r="${f(r)}"/>`;
      return { w: 200, h: 200, svg: s };
    },
  },
  {
    group: 'parts',
    id: 'checker',
    name: 'Checker strip',
    kind: 'fill',
    size: 480,
    density: 'How small the squares are',
    make: ({ d }) => {
      const rows = cnt(2, d);
      const cell = 80 / rows;
      const cols = Math.round(480 / cell);
      let path = '';
      for (let x = 0; x < cols; x += 1) for (let y = 0; y < rows; y += 1) if ((x + y) % 2 === 0) path += `M${f(x * cell)} ${f(y * cell)}h${f(cell)}v${f(cell)}h${f(-cell)}Z`;
      return { w: 480, h: 80, svg: `<path d="${path}"/>` };
    },
  },
  {
    group: 'parts',
    id: 'barcode',
    name: 'Barcode',
    kind: 'fill',
    size: 320,
    density: 'How close the bars are',
    make: ({ d }) => {
      const r = rng(4);
      let x = 0;
      let s = '';
      while (x < 392) {
        const bw = Math.min([3, 3, 6, 9, 12][Math.floor(r() * 5)] / d, 400 - x);
        s += `<rect x="${f(x)}" y="0" width="${f(bw)}" height="130"/>`;
        x += bw + [4, 6, 9][Math.floor(r() * 3)] / d;
      }
      return { w: 400, h: 130, svg: s };
    },
  },
  {
    group: 'parts',
    id: 'crop',
    name: 'Corner marks',
    kind: 'line',
    size: 420,
    make: ({ t }) => {
      const i = f(2.5 * t);
      return { w: 300, h: 200, svg: `<path d="M${i} 50V${i}H50M250 ${i}H${f(300 - i)}V50M${f(300 - i)} 150V${f(200 - i)}H250M50 ${f(200 - i)}H${i}V150" fill="none" stroke-width="${f(5 * t)}"/>` };
    },
  },
  {
    group: 'parts',
    id: 'pill',
    name: 'Pill outline',
    kind: 'line',
    size: 400,
    make: ({ t }) => {
      const i = 2.5 * t + 0.5;
      return { w: 400, h: 120, svg: `<rect x="${f(i)}" y="${f(i)}" width="${f(400 - 2 * i)}" height="${f(120 - 2 * i)}" rx="${f(60 - i)}" fill="none" stroke-width="${f(5 * t)}"/>` };
    },
  },
];

export const findGraphic = (id) => GRAPHICS.find((g) => g.id === id) || null;

// Which settings a drawing has: { density: the slider's name or '', weight: true for a line drawing }.
export const graphicOptions = (id) => {
  const g = findGraphic(id);
  return { density: (g && g.density) || '', weight: !!g && g.kind === 'line' };
};
// (nothing set, or not a number: as drawn)
const within = (v, r) => (v == null || v === '' || !Number.isFinite(Number(v)) ? r.start : Math.max(r.min, Math.min(r.max, Number(v))));

// The whole drawing as an SVG file's text, in one colour. w and h are the
// drawing's own box (its proportions). opt: { density, weight } (see the top).
export function graphicSvg(id, color = '#ffffff', opt = null) {
  const g = findGraphic(id);
  if (!g) return null;
  const m = g.make({ d: within(opt && opt.density, GRAPHIC_DENSITY), t: within(opt && opt.weight, GRAPHIC_WEIGHT) });
  const paint = g.kind === 'fill' ? `fill="${color}"` : `stroke="${color}" fill="none"`;
  return { w: m.w, h: m.h, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(m.w)} ${f(m.h)}" width="${f(m.w)}" height="${f(m.h)}"><g ${paint}>${m.svg}</g></svg>` };
}

// ----- pictures of the drawings, for tiles and layout thumbnails -----
// An <img> of a drawing in a colour, made once and kept. Returns the image
// when it is ready to draw, else null (and calls `ready` once it is).
const pictures = new Map();
export function graphicImage(id, color, ready) {
  const key = `${id}|${color}`;
  let entry = pictures.get(key);
  if (!entry) {
    const made = graphicSvg(id, color);
    if (!made) return null;
    entry = { img: new Image(), done: false, waiting: [] };
    pictures.set(key, entry);
    entry.img.onload = () => {
      entry.done = true;
      entry.waiting.splice(0).forEach((fn) => fn());
    };
    entry.img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(made.svg)}`;
  }
  if (entry.done) return entry.img;
  if (ready) entry.waiting.push(ready);
  return null;
}

// A drawing on its tile in the Elements tab.
export function drawGraphicThumb(canvas, id, color) {
  const paint = () => {
    const g = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0d0d10';
    g.fillRect(0, 0, w, h);
    const img = graphicImage(id, color, paint);
    const box = graphicSvg(id, color);
    if (!img || !box) return;
    const k = Math.min((w - 56) / box.w, (h - 44) / box.h);
    g.drawImage(img, (w - box.w * k) / 2, (h - box.h * k) / 2, box.w * k, box.h * k);
  };
  paint();
}
