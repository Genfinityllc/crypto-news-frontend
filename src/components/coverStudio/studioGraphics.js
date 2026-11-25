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
// The box keeps its size whatever those two are, so an item on the cover
// stays the size it is and simply shows more or fewer lines.
//   sx, sy  how much wider and taller than drawn (owner 2026-11-25: "if i
//      make it wider new barcode lines appear rather than scaling", then a
//      list of twelve more: "some will need added lines some will need their
//      lines to extend for instance pill will need to extend its line where
//      star column would need a repeated shape"). Only drawings with
//      `stretch: 'both'` use them. Their box grows and the drawing fills it
//      at the same size: a pattern gets more lines, dots or rows, a single
//      shape is repeated (stars, arrows), an outline is drawn longer (the
//      pill). Nothing is ever stretched like a picture. Where the drawing is
//      made of whole shapes the box moves in steps of one shape.

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
export const GRAPHIC_STRETCH = { min: 0.25, max: 6, start: 1 };
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
  {
    group: 'marks',
    id: 'star-column',
    name: 'Star column',
    kind: 'line',
    size: 110,
    stretch: 'both',
    make: ({ t, sx, sy }) => {
      // taller: more stars down the column; wider: more columns
      const cols = Math.max(1, Math.round((120 * sx - 120) / 130) + 1);
      const rows = Math.max(1, Math.round((510 * sy - 120) / 130) + 1);
      let s = '';
      for (let x = 0; x < cols; x += 1) for (let y = 0; y < rows; y += 1) s += `<path d="${star4(60 + x * 130, 60 + y * 130, 60 - 4 * t, 0.2)}" fill="none" stroke-width="${f(3.5 * t)}" stroke-linejoin="round"/>`;
      return { w: (cols - 1) * 130 + 120, h: (rows - 1) * 130 + 120, svg: s };
    },
  },
  { group: 'marks', id: 'star-tile', name: 'Star tile', kind: 'fill', size: 220, make: () => ({ w: 200, h: 200, svg: `<path fill-rule="evenodd" d="M0 0H200V200H0ZM100 22A78 78 0 1 0 100 178A78 78 0 1 0 100 22Z"/><path d="${star4(100, 100, 74, 0.3)}"/>` }) },
  {
    group: 'marks',
    id: 'arrows',
    name: 'Arrow row',
    kind: 'fill',
    size: 300,
    stretch: 'both',
    make: ({ sx, sy }) => {
      // wider: more arrows in the row; taller: more rows
      const cols = Math.max(1, Math.round((430 * sx - 70) / 120) + 1);
      const rows = Math.max(1, Math.round((70 * sy - 70) / 100) + 1);
      let s = '';
      for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) s += `<path d="M${x * 120} ${y * 100}L${x * 120 + 70} ${y * 100 + 35}L${x * 120} ${y * 100 + 70}Z"/>`;
      return { w: (cols - 1) * 120 + 70, h: (rows - 1) * 100 + 70, svg: s };
    },
  },
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
    stretch: 'both',
    make: ({ d, t, sx, sy }) => {
      const base = cnt(7, d, 2);
      const gap = 96 / (base - 1);
      // taller: more diamonds down, the same distance apart
      const n = Math.max(2, Math.round(base + (196 * sy - 196) / gap));
      const W = f(400 * sx);
      const H = f(196 + (n - base) * gap);
      // wider: the diamonds go on side by side, corner to corner, cut off at the edge
      // (a new one starts only once a good piece of it shows)
      let path = '';
      for (let j = 0; 4 + 392 * j < W - 30 || j === 0; j += 1) {
        const x = 392 * j;
        for (let i = 0; i < n; i += 1) {
          const y = f(50 + gap * i);
          path += `M${4 + x} ${y}L${200 + x} ${f(y - 46)}L${396 + x} ${y}L${200 + x} ${f(y + 46)}Z`;
        }
      }
      return { w: W, h: H, svg: `<defs><clipPath id="dm"><rect width="${W}" height="${H}"/></clipPath></defs><path d="${path}" fill="none" stroke-width="${f(thin(2.2 * t, gap, 0.6))}" stroke-linejoin="round" clip-path="url(#dm)"/>` };
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
    stretch: 'both',
    make: ({ d, t, sx, sy }) => {
      const base = cnt(6, d);
      const sw = thin(4 * t, 196 / (base - 0.235));
      const out = 198 - sw / 2;
      const step = out / (base - 0.235);
      // wider or taller: the fan goes on with more arcs, the same distance
      // apart, out to the longer side; the box cuts them off on the shorter
      const W = f(200 * sx);
      const H = f(200 * sy);
      const reach = Math.max(W, H) - 2 - sw / 2;
      let s = '';
      for (let r = out - (base - 1) * step; r <= reach + 0.01; r += step) {
        const q = f(r);
        s += `<path d="M${f(W - r)} ${H}A${q} ${q} 0 0 1 ${W} ${f(H - r)}" fill="none" stroke-width="${f(sw)}"/>`;
      }
      return { w: W, h: H, svg: `<defs><clipPath id="qf"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#qf)">${s}</g>` };
    },
  },
  {
    group: 'lines',
    id: 'waves',
    name: 'Wave lines',
    kind: 'line',
    size: 420,
    density: LINES,
    stretch: 'both',
    make: ({ d, t, sx, sy }) => {
      // closer: more lines in the same height, each a little finer
      const base = cnt(4, d);
      const sw = thin((5 * t) / Math.max(1, Math.sqrt(d)), base < 2 ? 40 : 90 / (base - 1));
      const top = 17 + sw / 2;
      const gap = base < 2 ? 30 : (113 - sw / 2 - top) / (base - 1);
      const turns = Math.max(1, Math.round(4 * sx)); // wider: more waves along each line
      const n = Math.max(1, Math.round(base + (130 * sy - 130) / gap)); // taller: more lines, the same distance apart
      let s = '';
      for (let k = 0; k < n; k += 1) {
        let path = `M0 ${f(base < 2 && n < 2 ? 65 : top + gap * k)}`;
        for (let i = 0; i < turns; i += 1) path += 'q25 -32 50 0t50 0';
        s += `<path d="${path}" fill="none" stroke-width="${f(sw)}"/>`;
      }
      return { w: turns * 100, h: f(130 + (n - base) * gap), svg: s };
    },
  },
  {
    group: 'lines',
    id: 'zigzag',
    name: 'Zigzag',
    kind: 'line',
    size: 420,
    density: 'How close the points are',
    stretch: 'both',
    make: ({ d, t, sx, sy }) => {
      const base = cnt(10, d, 2);
      const sw = (7 * t) / Math.max(1, Math.sqrt(d));
      const x0 = Math.max(4, sw / 2 + 0.5);
      const tw = (408 - 2 * x0) / base;
      const n = Math.max(2, Math.round(base * sx)); // wider: more points of the same size
      // room above and below for the sharp corners, which reach past the line itself
      const pad = Math.min(22, sw / 2 / Math.sin(Math.atan(tw / 2 / 52))) + 0.5;
      // taller: the same zigzag again underneath, half its height lower each time
      const rows = Math.max(1, Math.round((68 * sy - 68) / 34) + 1);
      let s = '';
      for (let r = 0; r < rows; r += 1) {
        const y = r * 34;
        let path = `M${f(x0)} ${f(y + 68 - pad)}`;
        for (let i = 0; i < n; i += 1) path += `L${f(x0 + i * tw + tw / 2)} ${f(y + pad)}L${f(x0 + (i + 1) * tw)} ${f(y + 68 - pad)}`;
        s += `<path d="${path}" fill="none" stroke-width="${f(sw)}" stroke-linejoin="miter" stroke-miterlimit="12"/>`;
      }
      return { w: f(2 * x0 + n * tw), h: 68 + (rows - 1) * 34, svg: s };
    },
  },

  // ----- line fills and small parts -----
  // (closer lines are finer too, so a fill keeps its share of line and gap; and
// a line is never so thick that the gaps close)
  { group: 'parts', id: 'hatch-square', name: 'Square of lines', kind: 'line', size: 240, density: LINES, stretch: 'both', make: ({ d, t, sx, sy }) => ({ w: f(200 * sx), h: f(200 * sy), svg: hatch(f(200 * sx), f(200 * sy), 15 / d, hatchLine(d, t), 'hs', `<rect width="${f(200 * sx)}" height="${f(200 * sy)}"/>`) }) },
  // (wider or taller, the circle becomes an oval with more lines in it)
  { group: 'parts', id: 'hatch-circle', name: 'Circle of lines', kind: 'line', size: 240, density: LINES, stretch: 'both', make: ({ d, t, sx, sy }) => ({ w: f(200 * sx), h: f(200 * sy), svg: hatch(f(200 * sx), f(200 * sy), 15 / d, hatchLine(d, t), 'hc', `<ellipse cx="${f(100 * sx)}" cy="${f(100 * sy)}" rx="${f(100 * sx)}" ry="${f(100 * sy)}"/>`) }) },
  { group: 'parts', id: 'hatch-bar', name: 'Bar of lines', kind: 'line', size: 520, density: LINES, stretch: 'both', make: ({ d, t, sx, sy }) => ({ w: f(520 * sx), h: f(70 * sy), svg: hatch(f(520 * sx), f(70 * sy), 15 / d, hatchLine(d, t), 'hb', `<rect width="${f(520 * sx)}" height="${f(70 * sy)}"/>`) }) },
  {
    group: 'parts',
    id: 'dots',
    name: 'Dot grid',
    kind: 'fill',
    size: 220,
    density: 'How close the dots are',
    stretch: 'both',
    make: ({ d, sx, sy }) => {
      const n = cnt(6, d, 2);
      const r = Math.min(10, 35 / (n - 1));
      const m = Math.max(10, r + 1);
      const step = (200 - 2 * m) / (n - 1);
      // wider or taller: more dots, the same distance apart
      const nx = Math.max(1, Math.round(1 + (200 * sx - 2 * m) / step));
      const ny = Math.max(1, Math.round(1 + (200 * sy - 2 * m) / step));
      let s = '';
      for (let y = 0; y < ny; y += 1) for (let x = 0; x < nx; x += 1) s += `<circle cx="${f(m + x * step)}" cy="${f(m + y * step)}" r="${f(r)}"/>`;
      return { w: f(2 * m + (nx - 1) * step), h: f(2 * m + (ny - 1) * step), svg: s };
    },
  },
  {
    group: 'parts',
    id: 'checker',
    name: 'Checker strip',
    kind: 'fill',
    size: 480,
    density: 'How small the squares are',
    stretch: 'both',
    make: ({ d, sx, sy }) => {
      const cell = 80 / cnt(2, d);
      // wider or taller: more squares of the same size
      const rows = Math.max(1, Math.round((80 * sy) / cell));
      const cols = Math.max(1, Math.round((480 * sx) / cell));
      let path = '';
      for (let x = 0; x < cols; x += 1) for (let y = 0; y < rows; y += 1) if ((x + y) % 2 === 0) path += `M${f(x * cell)} ${f(y * cell)}h${f(cell)}v${f(cell)}h${f(-cell)}Z`;
      return { w: f(cols * cell), h: f(rows * cell), svg: `<path d="${path}"/>` };
    },
  },
  {
    group: 'parts',
    id: 'barcode',
    name: 'Barcode',
    kind: 'fill',
    size: 320,
    density: 'How close the bars are',
    stretch: 'both',
    make: ({ d, sx, sy }) => {
      // wider: the same bars and then more of them; taller: longer bars
      const W = 400 * sx;
      const H = f(130 * sy);
      const r = rng(4);
      let x = 0;
      let s = '';
      while (x < W - 8 / d) {
        const bw = Math.min([3, 3, 6, 9, 12][Math.floor(r() * 5)] / d, W - x);
        s += `<rect x="${f(x)}" y="0" width="${f(bw)}" height="${H}"/>`;
        x += bw + [4, 6, 9][Math.floor(r() * 3)] / d;
      }
      return { w: f(W), h: H, svg: s };
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
    stretch: 'both',
    make: ({ t, sx, sy }) => {
      // wider: the straight sides run on; taller: a taller pill. The line keeps its thickness.
      const i = 2.5 * t + 0.5;
      const W = 400 * sx;
      const H = 120 * sy;
      return { w: f(W), h: f(H), svg: `<rect x="${f(i)}" y="${f(i)}" width="${f(W - 2 * i)}" height="${f(H - 2 * i)}" rx="${f(Math.min(W, H) / 2 - i)}" fill="none" stroke-width="${f(5 * t)}"/>` };
    },
  },
];

export const findGraphic = (id) => GRAPHICS.find((g) => g.id === id) || null;

// Which settings a drawing has: { density: the slider's name or '', weight: true for a line drawing, stretch: 'both', 'wide' or '' }.
export const graphicOptions = (id) => {
  const g = findGraphic(id);
  return { density: (g && g.density) || '', weight: !!g && g.kind === 'line', stretch: (g && g.stretch) || '' };
};
// (nothing set, or not a number: as drawn)
const within = (v, r) => (v == null || v === '' || !Number.isFinite(Number(v)) ? r.start : Math.max(r.min, Math.min(r.max, Number(v))));

// The whole drawing as an SVG file's text, in one colour. w and h are the
// drawing's own box (its proportions). opt: { density, weight, wide, tall } (see the top).
export function graphicSvg(id, color = '#ffffff', opt = null) {
  const g = findGraphic(id);
  if (!g) return null;
  const m = g.make({ d: within(opt && opt.density, GRAPHIC_DENSITY), t: within(opt && opt.weight, GRAPHIC_WEIGHT), sx: g.stretch ? within(opt && opt.wide, GRAPHIC_STRETCH) : 1, sy: g.stretch ? within(opt && opt.tall, GRAPHIC_STRETCH) : 1 });
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
