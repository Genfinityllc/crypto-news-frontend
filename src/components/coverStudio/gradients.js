// Free-form gradients for the Design Studio.
//
// A gradient is a handful of coloured dots placed anywhere inside a shape:
//   { pts: [{ x, y, c }] }   x, y: 0..1 across the shape's own box, c: '#rrggbb'
// Every point of the shape takes a blend of the dots' colours, weighted by how
// near each dot is, so moving a dot reshapes the whole fill. It is not a
// straight line from A to B unless the dots are put that way.
//
// A gradient object is never changed in place: every edit makes a new one.
// History, drafts and the painted-picture cache all rely on that.

export const GRAD_MIN = 2;
export const GRAD_MAX = 6;

// Where the dots start, by how many there are.
const SPOTS = {
  2: [[0.12, 0.5], [0.88, 0.5]],
  3: [[0.14, 0.22], [0.86, 0.3], [0.5, 0.86]],
  4: [[0.15, 0.2], [0.85, 0.2], [0.85, 0.8], [0.15, 0.8]],
  5: [[0.15, 0.2], [0.85, 0.2], [0.85, 0.8], [0.15, 0.8], [0.5, 0.5]],
  6: [[0.12, 0.2], [0.5, 0.14], [0.88, 0.2], [0.88, 0.8], [0.5, 0.86], [0.12, 0.8]],
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = (v, fallback = '#888888') => (HEX.test(String(v || '')) ? String(v).toLowerCase() : fallback);
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const count = (n) => Math.max(GRAD_MIN, Math.min(GRAD_MAX, Math.round(Number(n) || GRAD_MIN)));

const rgbOf = (h) => {
  const v = hex(h);
  return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
};
const hexOf = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// A lighter or darker version of a colour, for a second dot when only one
// colour is known.
export function shade(color, amount) {
  const [r, g, b] = rgbOf(color);
  const to = amount >= 0 ? 255 : 0;
  const k = Math.abs(amount);
  return hexOf(r + (to - r) * k, g + (to - g) * k, b + (to - b) * k);
}

// Is this a usable gradient?
export const isGrad = (g) => !!g && Array.isArray(g.pts) && g.pts.length >= GRAD_MIN;

// A new gradient from a list of colours (as many dots as asked for).
export function makeGrad(colors, n = 2) {
  const want = count(n);
  const list = (colors || []).filter((c) => HEX.test(String(c || ''))).map((c) => c.toLowerCase());
  if (!list.length) list.push('#8b6cf6');
  // one colour only: the second dot is a deeper or paler version of it
  if (list.length === 1) {
    const [r, g, b] = rgbOf(list[0]);
    list.push(shade(list[0], (r * 299 + g * 587 + b * 114) / 1000 > 140 ? -0.45 : 0.45));
  }
  const spots = SPOTS[want];
  return { pts: spots.map(([x, y], i) => ({ x, y, c: list[i % list.length] })) };
}

// The same gradient with more or fewer dots. Dots already placed stay where
// they are; new ones go to the free starting spot farthest from the others.
export function resizeGrad(grad, n, colors) {
  const want = count(n);
  if (!isGrad(grad)) return makeGrad(colors, want);
  let pts = grad.pts.map((p) => ({ ...p }));
  if (pts.length > want) pts = pts.slice(0, want);
  const pool = (colors || []).filter((c) => HEX.test(String(c || '')));
  while (pts.length < want) {
    let best = null;
    let bestD = -1;
    SPOTS[want].forEach(([x, y]) => {
      let d = Infinity;
      pts.forEach((p) => {
        d = Math.min(d, (p.x - x) ** 2 + (p.y - y) ** 2);
      });
      if (d > bestD) {
        bestD = d;
        best = [x, y];
      }
    });
    const used = pts.map((p) => p.c);
    const c = pool.find((col) => !used.includes(col.toLowerCase())) || shade(pts[pts.length - 1].c, pts.length % 2 ? 0.35 : -0.35);
    pts.push({ x: best[0], y: best[1], c: c.toLowerCase() });
  }
  return { pts };
}

export function moveDot(grad, i, x, y) {
  return { pts: grad.pts.map((p, k) => (k === i ? { ...p, x: clamp01(x), y: clamp01(y) } : p)) };
}

export function colourDot(grad, i, c) {
  return { pts: grad.pts.map((p, k) => (k === i ? { ...p, c: hex(c, p.c) } : p)) };
}

// A short text that changes whenever the gradient does (for change checks).
export const gradKey = (g) => (isGrad(g) ? g.pts.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.c}`).join(';') : '');

// A plain CSS stand-in for small previews in the side panel.
export const gradCss = (g) => (isGrad(g) ? `linear-gradient(90deg, ${g.pts.map((p) => p.c).join(', ')})` : 'none');

// ---------- painting ----------
// The blend is worked out on a small sheet (LONG pixels on the longer side)
// and stretched over the shape with smoothing; a gradient has no fine detail,
// so nothing is lost and dragging a dot stays instant.
const LONG = 112;
const toLinear = new Float32Array(256);
for (let i = 0; i < 256; i += 1) toLinear[i] = (i / 255) ** 2.2;
const sheets = new WeakMap(); // gradient -> Map(size -> canvas)

function sheetFor(grad, w, h) {
  const aspect = Math.max(0.05, Math.min(20, w / Math.max(1, h)));
  const gw = aspect >= 1 ? LONG : Math.max(6, Math.round(LONG * aspect));
  const gh = aspect >= 1 ? Math.max(6, Math.round(LONG / aspect)) : LONG;
  const key = `${gw}x${gh}`;
  let byKey = sheets.get(grad);
  if (!byKey) {
    byKey = new Map();
    sheets.set(grad, byKey);
  }
  if (byKey.has(key)) return byKey.get(key);

  const c = document.createElement('canvas');
  c.width = gw;
  c.height = gh;
  const g = c.getContext('2d');
  const img = g.createImageData(gw, gh);
  const d = img.data;
  // distances are measured on the real shape, not on a square, so a dot's
  // reach is the same in every direction
  const sx = aspect >= 1 ? aspect : 1;
  const sy = aspect >= 1 ? 1 : 1 / aspect;
  const pts = grad.pts.map((p) => {
    const [r, gg, b] = rgbOf(p.c);
    return { x: clamp01(p.x) * sx, y: clamp01(p.y) * sy, r: toLinear[r], g: toLinear[gg], b: toLinear[b] };
  });
  for (let j = 0; j < gh; j += 1) {
    const y = ((j + 0.5) / gh) * sy;
    for (let i = 0; i < gw; i += 1) {
      const x = ((i + 0.5) / gw) * sx;
      let r = 0;
      let gg = 0;
      let b = 0;
      let sum = 0;
      for (let k = 0; k < pts.length; k += 1) {
        const p = pts[k];
        const dist2 = (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y);
        // falls off with the cube of the distance: soft between dots, yet each
        // dot keeps its own colour around itself
        const wgt = 1 / (dist2 * Math.sqrt(dist2) + 1e-5);
        r += p.r * wgt;
        gg += p.g * wgt;
        b += p.b * wgt;
        sum += wgt;
      }
      const at = (j * gw + i) * 4;
      d[at] = Math.round(255 * (r / sum) ** (1 / 2.2));
      d[at + 1] = Math.round(255 * (gg / sum) ** (1 / 2.2));
      d[at + 2] = Math.round(255 * (b / sum) ** (1 / 2.2));
      d[at + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  byKey.set(key, c);
  return c;
}

// Fill the box x, y, w, h with the gradient. The caller clips to its shape.
export function paintGrad(ctx, grad, x, y, w, h) {
  if (!isGrad(grad) || w <= 0 || h <= 0) return;
  const sheet = sheetFor(grad, w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sheet, x, y, w, h);
  ctx.restore();
}
