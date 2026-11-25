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
function globe({ R = 100, sx = 1, tilt = 22, meridians = 8, parallels = 7, sw = 2.2, half = false }) {
  const tr = (tilt * Math.PI) / 180;
  const W = R * 2 * sx + sw * 2;
  const H = (half ? R : R * 2) + sw * 2;
  const cx = W / 2;
  const cy = R + sw;
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

export const GRAPHIC_GROUPS = [
  { id: 'marks', name: 'Marks' },
  { id: 'lines', name: 'Spheres and line work' },
  { id: 'parts', name: 'Line fills and small parts' },
];

// kind: 'fill' (solid shapes) or 'line' (drawn with a stroke).
// size: the width the piece starts with on the cover, in cover pixels.
export const GRAPHICS = [
  // ----- marks -----
  { group: 'marks', id: 'x-bold', name: 'Bold X', kind: 'fill', size: 220, make: () => ({ w: 200, h: 200, svg: xMark(100, 100, 200, 68) }) },
  { group: 'marks', id: 'x-pair', name: 'Bold X pair', kind: 'fill', size: 420, make: () => ({ w: 440, h: 200, svg: xMark(100, 100, 200, 68) + xMark(340, 100, 200, 68) }) },
  { group: 'marks', id: 'star', name: 'Four-point star', kind: 'fill', size: 200, make: () => ({ w: 200, h: 200, svg: `<path d="${star4(100, 100, 100, 0.2)}"/>` }) },
  { group: 'marks', id: 'star-outline', name: 'Star outline', kind: 'line', size: 200, make: () => ({ w: 200, h: 200, svg: `<path d="${star4(100, 100, 96, 0.2)}" fill="none" stroke-width="4" stroke-linejoin="round"/>` }) },
  { group: 'marks', id: 'star-column', name: 'Star column', kind: 'line', size: 110, make: () => ({ w: 120, h: 510, svg: [0, 1, 2, 3].map((i) => `<path d="${star4(60, 60 + i * 130, 56, 0.2)}" fill="none" stroke-width="3.5" stroke-linejoin="round"/>`).join('') }) },
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
    make: () => {
      let d = '';
      for (let i = 0; i < 32; i += 1) {
        const a = (Math.PI * 2 * i) / 32;
        const r = i % 2 ? 72 : 100;
        d += `${i ? 'L' : 'M'}${f(100 + Math.sin(a) * r)} ${f(100 - Math.cos(a) * r)}`;
      }
      return { w: 200, h: 200, svg: `<path d="${d}Z"/>` };
    },
  },
  { group: 'marks', id: 'clover', name: 'Clover', kind: 'fill', size: 200, make: () => ({ w: 200, h: 200, svg: '<circle cx="62" cy="62" r="62"/><circle cx="138" cy="62" r="62"/><circle cx="62" cy="138" r="62"/><circle cx="138" cy="138" r="62"/>' }) },

  // ----- spheres and line work -----
  { group: 'lines', id: 'globe', name: 'Grid sphere', kind: 'line', size: 420, make: () => globe({ R: 150, tilt: 24, meridians: 8, parallels: 7, sw: 2.6 }) },
  { group: 'lines', id: 'globe-wide', name: 'Grid sphere, wide', kind: 'line', size: 520, make: () => globe({ R: 110, sx: 1.42, tilt: 20, meridians: 12, parallels: 11, sw: 1.8 }) },
  { group: 'lines', id: 'dome', name: 'Grid dome', kind: 'line', size: 520, make: () => globe({ R: 170, tilt: 0.01, meridians: 9, parallels: 9, sw: 2.6, half: true }) },
  { group: 'lines', id: 'ring-sphere', name: 'Ring sphere', kind: 'line', size: 400, make: () => globe({ R: 130, tilt: 30, meridians: 0, parallels: 13, sw: 2.2 }) },
  { group: 'lines', id: 'orbit', name: 'Orbit', kind: 'line', size: 460, make: () => ({ w: 320, h: 200, svg: [22, -22].map((a) => `<ellipse cx="160" cy="100" rx="154" ry="46" fill="none" stroke-width="2.6" transform="rotate(${a} 160 100)"/>`).join('') }) },
  {
    group: 'lines',
    id: 'mesh',
    name: 'Diamond mesh',
    kind: 'line',
    size: 520,
    make: () => {
      let d = '';
      for (let i = 0; i < 7; i += 1) {
        const y = 50 + i * 16;
        d += `M4 ${y}L200 ${y - 46}L396 ${y}L200 ${y + 46}Z`;
      }
      return { w: 400, h: 196, svg: `<path d="${d}" fill="none" stroke-width="2.2" stroke-linejoin="round"/>` };
    },
  },
  { group: 'lines', id: 'rings', name: 'Rings', kind: 'line', size: 300, make: () => ({ w: 200, h: 200, svg: [97, 76, 55, 34, 13].map((r) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke-width="3"/>`).join('') }) },
  { group: 'lines', id: 'fan', name: 'Quarter fan', kind: 'line', size: 300, make: () => ({ w: 200, h: 200, svg: [196, 162, 128, 94, 60, 26].map((r) => `<path d="M${200 - r} 200A${r} ${r} 0 0 1 200 ${200 - r}" fill="none" stroke-width="4"/>`).join('') }) },
  {
    group: 'lines',
    id: 'waves',
    name: 'Wave lines',
    kind: 'line',
    size: 420,
    make: () => {
      let s = '';
      for (let k = 0; k < 4; k += 1) {
        let d = `M0 ${20 + k * 30}`;
        for (let i = 0; i < 4; i += 1) d += 'q25 -32 50 0t50 0';
        s += `<path d="${d}" fill="none" stroke-width="5"/>`;
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
    make: () => {
      let d = 'M4 60';
      for (let i = 0; i < 10; i += 1) d += `L${4 + i * 40 + 20} 8L${4 + (i + 1) * 40} 60`;
      return { w: 408, h: 68, svg: `<path d="${d}" fill="none" stroke-width="7" stroke-linejoin="miter"/>` };
    },
  },

  // ----- line fills and small parts -----
  { group: 'parts', id: 'hatch-square', name: 'Square of lines', kind: 'line', size: 240, make: () => ({ w: 200, h: 200, svg: hatch(200, 200, 15, 6.5, 'hs', '<rect width="200" height="200"/>') }) },
  { group: 'parts', id: 'hatch-circle', name: 'Circle of lines', kind: 'line', size: 240, make: () => ({ w: 200, h: 200, svg: hatch(200, 200, 15, 6.5, 'hc', '<circle cx="100" cy="100" r="100"/>') }) },
  { group: 'parts', id: 'hatch-bar', name: 'Bar of lines', kind: 'line', size: 520, make: () => ({ w: 520, h: 70, svg: hatch(520, 70, 15, 6.5, 'hb', '<rect width="520" height="70"/>') }) },
  {
    group: 'parts',
    id: 'dots',
    name: 'Dot grid',
    kind: 'fill',
    size: 220,
    make: () => {
      let s = '';
      for (let y = 0; y < 6; y += 1) for (let x = 0; x < 6; x += 1) s += `<circle cx="${10 + x * 36}" cy="${10 + y * 36}" r="7"/>`;
      return { w: 200, h: 200, svg: s };
    },
  },
  {
    group: 'parts',
    id: 'checker',
    name: 'Checker strip',
    kind: 'fill',
    size: 480,
    make: () => {
      let d = '';
      for (let x = 0; x < 12; x += 1) for (let y = 0; y < 2; y += 1) if ((x + y) % 2 === 0) d += `M${x * 40} ${y * 40}h40v40h-40Z`;
      return { w: 480, h: 80, svg: `<path d="${d}"/>` };
    },
  },
  {
    group: 'parts',
    id: 'barcode',
    name: 'Barcode',
    kind: 'fill',
    size: 320,
    make: () => {
      const r = rng(4);
      let x = 0;
      let s = '';
      let last = 0;
      while (x < 392) {
        const bw = [3, 3, 6, 9, 12][Math.floor(r() * 5)];
        s += `<rect x="${x}" y="0" width="${bw}" height="130"/>`;
        last = x + bw;
        x += bw + [4, 6, 9][Math.floor(r() * 3)];
      }
      return { w: last, h: 130, svg: s };
    },
  },
  { group: 'parts', id: 'crop', name: 'Corner marks', kind: 'line', size: 420, make: () => ({ w: 300, h: 200, svg: '<path d="M2.5 50V2.5H50M250 2.5H297.5V50M297.5 150V197.5H250M50 197.5H2.5V150" fill="none" stroke-width="5"/>' }) },
  { group: 'parts', id: 'pill', name: 'Pill outline', kind: 'line', size: 400, make: () => ({ w: 400, h: 120, svg: '<rect x="3" y="3" width="394" height="114" rx="57" fill="none" stroke-width="5"/>' }) },
];

export const findGraphic = (id) => GRAPHICS.find((g) => g.id === id) || null;

// The whole drawing as an SVG file's text, in one colour. w and h are the
// drawing's own box (its proportions).
export function graphicSvg(id, color = '#ffffff') {
  const g = findGraphic(id);
  if (!g) return null;
  const m = g.make();
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
