import tateUrl from './hosts/tate.jpg';
import ryanUrl from './hosts/ryan.jpg';
import { isGrad, paintGrad } from './gradients';
import { adjustedPicture, cleanMap, mapPixels } from './imageAdjust';

// Building blocks for the Interview Cover Studio (1920x1080): masked guest
// photos, placeholder art, plain-background removal for logos, and the
// starting layouts. Pure canvas code, no fabric in here.

export const INTERVIEW_W = 1920;
export const INTERVIEW_H = 1080;

// A guest photo is painted at this size (the mask's own width, before the
// frame is scaled on the cover), so it stays sharp at any normal size.
export const PHOTO_BASE = 1000;

export const DEFAULT_PHOTO = {
  shape: 'circle', // circle | rect | polygon
  sides: 6,
  rounding: 0, // 0..1, corners of a rectangle or polygon
  aspect: 1, // width / height of a rectangle
  maskAngle: 0, // degrees; turns the mask, never the photo
  zoom: 1,
  panX: 0, // -1..1
  panY: 0,
  treatment: 'color', // color | bw | tint
  tintColor: '#8b6cf6',
  backdrop: '', // colour behind a cut-out photo ('' = none)
  // backdropGrad / ringGrad: a gradient (see gradients.js) used in place of the
  // plain colour when set
  ring: 0, // border width, in mask units
  ringColor: '#ffffff',
};

const rad = (deg) => (deg * Math.PI) / 180;

// Corner points of the mask, centred on 0,0, already turned by maskAngle.
function maskPoints(st) {
  const a = rad(st.maskAngle || 0);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let pts;
  if (st.shape === 'rect') {
    const w = PHOTO_BASE;
    const h = PHOTO_BASE / Math.max(0.3, st.aspect || 1);
    pts = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ];
  } else {
    const n = Math.max(3, Math.min(12, Math.round(st.sides || 6)));
    const R = PHOTO_BASE / 2;
    pts = [];
    for (let i = 0; i < n; i += 1) {
      const t = -Math.PI / 2 + (i * 2 * Math.PI) / n; // first point straight up
      pts.push([Math.cos(t) * R, Math.sin(t) * R]);
    }
  }
  return pts.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
}

// A closed outline through the points, with each corner rounded by `rounding`
// (0 = sharp, 1 = as round as the shorter neighbouring edge allows).
function roundedOutline(g, pts, rounding) {
  const n = pts.length;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  g.beginPath();
  g.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i += 1) {
    const prev = pts[(i + n - 1) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const e1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    const e2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const v1 = [(prev[0] - cur[0]) / e1, (prev[1] - cur[1]) / e1];
    const v2 = [(next[0] - cur[0]) / e2, (next[1] - cur[1]) / e2];
    const theta = Math.acos(Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1])));
    const r = Math.max(0, Math.min(1, rounding || 0)) * (Math.min(e1, e2) / 2) * Math.tan(theta / 2);
    const to = mid(cur, next);
    if (r > 0.5) g.arcTo(cur[0], cur[1], to[0], to[1], r);
    else g.lineTo(cur[0], cur[1]);
    g.lineTo(to[0], to[1]);
  }
  g.closePath();
}

function shrink(img, max) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.min(1, max / Math.max(iw, ih));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(iw * s));
  c.height = Math.max(1, Math.round(ih * s));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// Keep an uploaded photo at a sensible working size.
export const preparePhoto = (img) => shrink(img, 1800);

// The colours of a photo's gradient map (first = its blacks, last = its
// whites). The old one-colour Tint is the same thing with two colours, black
// and the tint, so covers saved with a tint still look as they did.
export function photoMap(st) {
  if (!st) return null;
  if (st.treatment === 'map') return cleanMap(st.mapColors) || ['#000000', '#ffffff'];
  if (st.treatment === 'tint') return cleanMap(['#000000', st.tintColor]) || ['#000000', '#ffffff'];
  return null;
}

// Black and white, or a gradient map, without ctx.filter (Safari has none).
// Cached on the item so moving a slider does not redo it.
// The photo's own colour edits (st.adjust, see imageAdjust.js) come first, so
// the look is laid over the edited photo.
function treated(st) {
  if (!st.src) return null;
  const base = adjustedPicture(st.src, st.adjust);
  const map = photoMap(st);
  if (st.treatment !== 'bw' && !map) return base;
  const key = map ? `map|${map.join(',')}` : 'bw';
  if (st._proc && st._proc.key === key && st._proc.from === base) return st._proc.canvas;
  const c = shrink(base, 1800);
  const g = c.getContext('2d');
  let img;
  try {
    img = g.getImageData(0, 0, c.width, c.height);
  } catch (e) {
    return base;
  }
  mapPixels(img.data, map || ['#000000', '#ffffff']);
  g.putImageData(img, 0, 0);
  st._proc = { key, from: base, canvas: c };
  return c;
}

// The picture a guest frame shows: the photo inside its mask, with the chosen
// look, optional colour behind it and optional border.
export function paintPhoto(st) {
  const ring = Math.max(0, st.ring || 0);
  const pad = Math.ceil(ring / 2) + 2;
  const circle = st.shape !== 'rect' && st.shape !== 'polygon';
  let pts = null;
  let bw = PHOTO_BASE;
  let bh = PHOTO_BASE;
  let ox = 0;
  let oy = 0;
  if (!circle) {
    pts = maskPoints(st);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    bw = maxX - minX;
    bh = maxY - minY;
    ox = (minX + maxX) / 2;
    oy = (minY + maxY) / 2;
  }
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.ceil(bw + pad * 2));
  c.height = Math.max(4, Math.ceil(bh + pad * 2));
  const g = c.getContext('2d');
  const cx = c.width / 2;
  const cy = c.height / 2;
  const outline = (k = g) => {
    if (circle) {
      k.beginPath();
      k.arc(cx, cy, PHOTO_BASE / 2, 0, Math.PI * 2);
      k.closePath();
    } else {
      roundedOutline(k, pts.map(([x, y]) => [x - ox + cx, y - oy + cy]), st.rounding);
    }
  };

  g.save();
  outline();
  g.clip();
  if (isGrad(st.backdropGrad)) {
    // its dots are placed across the mask's own box (see photoGradBox)
    paintGrad(g, st.backdropGrad, cx - bw / 2, cy - bh / 2, bw, bh);
  } else if (st.backdrop) {
    g.fillStyle = st.backdrop;
    g.fillRect(0, 0, c.width, c.height);
  }
  const pic = treated(st);
  if (pic) {
    const iw = pic.naturalWidth || pic.width;
    const ih = pic.naturalHeight || pic.height;
    const scale = Math.max(bw / iw, bh / ih) * Math.max(0.3, st.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const x = cx - dw / 2 + (st.panX || 0) * (Math.abs(dw - bw) / 2);
    const y = cy - dh / 2 + (st.panY || 0) * (Math.abs(dh - bh) / 2);
    g.imageSmoothingQuality = 'high';
    g.drawImage(pic, x, y, dw, dh);
  } else {
    // empty slot: a plain card with a head-and-shoulders outline
    g.fillStyle = '#262b33';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#434b59';
    const m = Math.min(bw, bh);
    g.beginPath();
    g.arc(cx, cy - m * 0.1, m * 0.17, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy + m * 0.46, m * 0.33, m * 0.27, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  if (ring > 0 && isGrad(st.ringGrad)) {
    // the border is drawn on a sheet of its own and the gradient is poured
    // into it, so only the border takes the colours
    const m = document.createElement('canvas');
    m.width = c.width;
    m.height = c.height;
    const k = m.getContext('2d');
    outline(k);
    k.lineWidth = ring;
    k.lineJoin = 'round';
    k.strokeStyle = '#ffffff';
    k.stroke();
    k.globalCompositeOperation = 'source-in';
    paintGrad(k, st.ringGrad, 0, 0, m.width, m.height);
    g.drawImage(m, 0, 0);
  } else if (ring > 0) {
    outline();
    g.lineWidth = ring;
    g.lineJoin = 'round';
    g.strokeStyle = st.ringColor || '#ffffff';
    g.stroke();
  }
  return c;
}

// The box a photo's gradient dots are placed across, in the painted picture's
// own pixels measured from its centre (w, h: the picture's size).
//   'backdrop': the mask itself     'ring': the whole picture, border included
export function photoGradBox(st, w, h, which) {
  if (which === 'ring') return { x: -w / 2, y: -h / 2, w, h };
  const pad = Math.ceil(Math.max(0, st.ring || 0) / 2) + 2;
  return { x: -w / 2 + pad, y: -h / 2 + pad, w: Math.max(1, w - pad * 2), h: Math.max(1, h - pad * 2) };
}

// Stand-in for a logo that has not been chosen yet.
export function placeholderLogo(label) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 220;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 5;
  g.setLineDash([22, 16]);
  const r = 26;
  g.beginPath();
  g.moveTo(6 + r, 6);
  g.arcTo(c.width - 6, 6, c.width - 6, c.height - 6, r);
  g.arcTo(c.width - 6, c.height - 6, 6, c.height - 6, r);
  g.arcTo(6, c.height - 6, 6, 6, r);
  g.arcTo(6, 6, c.width - 6, 6, r);
  g.closePath();
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,0.78)';
  g.font = '600 54px Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label || 'LOGO', c.width / 2, c.height / 2 + 2);
  return c;
}

// Remove a plain, single-colour background from a logo (white card, black
// card, flat colour). Works inwards from the edges, so the same colour inside
// the mark is kept. Returns null when the edges are not one plain colour.
export function removePlainBackground(source, tolerance = 34) {
  const w = source.width;
  const h = source.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.drawImage(source, 0, 0);
  let img;
  try {
    img = g.getImageData(0, 0, w, h);
  } catch (e) {
    return null;
  }
  const d = img.data;
  const border = [];
  for (let x = 0; x < w; x += 1) {
    border.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y += 1) {
    border.push(y * w, y * w + w - 1);
  }
  let r = 0;
  let gg = 0;
  let b = 0;
  let n = 0;
  border.forEach((p) => {
    if (d[p * 4 + 3] > 200) {
      r += d[p * 4];
      gg += d[p * 4 + 1];
      b += d[p * 4 + 2];
      n += 1;
    }
  });
  if (n < border.length * 0.6) return null; // edges already see-through
  r /= n;
  gg /= n;
  b /= n;
  const dist = (p) => Math.hypot(d[p * 4] - r, d[p * 4 + 1] - gg, d[p * 4 + 2] - b);
  const near = border.filter((p) => d[p * 4 + 3] > 200 && dist(p) <= tolerance).length;
  if (near < n * 0.75) return null; // edges are not one colour
  const t0 = tolerance;
  const t1 = tolerance * 1.9;
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  border.forEach((p) => {
    if (!seen[p] && dist(p) <= t1) {
      seen[p] = 1;
      stack[top] = p;
      top += 1;
    }
  });
  while (top > 0) {
    top -= 1;
    const p = stack[top];
    const dp = dist(p);
    const keep = dp <= t0 ? 0 : (dp - t0) / (t1 - t0);
    const i = p * 4;
    if (keep > 0) {
      // edge pixel: take the background colour back out of it
      d[i] = Math.max(0, Math.min(255, (d[i] - (1 - keep) * r) / keep));
      d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] - (1 - keep) * gg) / keep));
      d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] - (1 - keep) * b) / keep));
    }
    d[i + 3] = Math.round(d[i + 3] * keep);
    if (dp > t0) continue; // do not travel through soft edge pixels
    const x = p % w;
    const y = (p - x) / w;
    const tryPush = (q) => {
      if (!seen[q] && dist(q) <= t1) {
        seen[q] = 1;
        stack[top] = q;
        top += 1;
      }
    };
    if (x > 0) tryPush(p - 1);
    if (x < w - 1) tryPush(p + 1);
    if (y > 0) tryPush(p - w);
    if (y < h - 1) tryPush(p + w);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// The microphone badge of the "Hosted by" group: a lime disc with a black
// line-drawn studio microphone, redrawn from the owner's 58px reference so it
// stays sharp at cover size. Returned as a canvas, used like any logo source.
export function hostMicBadge(size = 512) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const u = size / 100; // drawn on a 100 x 100 grid
  g.fillStyle = '#d2ff00';
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#000000';
  g.lineWidth = 3.6 * u;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // the capsule
  const cw = 30 * u;
  const cx = size / 2;
  const top = 12 * u;
  const bottom = 62 * u;
  g.beginPath();
  g.moveTo(cx - cw / 2, top + cw / 2);
  g.arc(cx, top + cw / 2, cw / 2, Math.PI, 0);
  g.lineTo(cx + cw / 2, bottom - cw / 2);
  g.arc(cx, bottom - cw / 2, cw / 2, 0, Math.PI);
  g.closePath();
  g.stroke();
  // the grille
  g.lineWidth = 3.2 * u;
  [26, 33, 40, 47].forEach((y) => {
    g.beginPath();
    g.moveTo(cx - 8.5 * u, y * u);
    g.lineTo(cx + 8.5 * u, y * u);
    g.stroke();
  });
  // the cradle and the stem, which runs to the edge of the disc
  g.lineWidth = 3.6 * u;
  g.beginPath();
  g.arc(cx, 52 * u, 23 * u, 0.08 * Math.PI, 0.92 * Math.PI);
  g.stroke();
  g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(cx, 75 * u);
  g.lineTo(cx, 100 * u);
  g.stroke();
  return c;
}

// ------------------------------ starting layouts ------------------------------
// Positions are in cover pixels (1920x1080). Colours 'a1', 'a2' and 'base' are
// taken from the current background palette when the layout is applied.
// Every item becomes an ordinary object that can be moved, edited or removed.
// The headline starts aligned to the side the guests are on (owner's rule):
// guests in a right column, headline right-aligned against it; guests in a
// left column, headline left-aligned. Centred layouts stay centred.
const HEAD = 'Your Headline\nGoes Here';

export const INTERVIEW_LAYOUTS = [
  {
    id: 'one',
    name: 'One guest',
    note: 'A single large round guest photo with the headline beside it.',
    items: [
      { t: 'logo', slot: 'ecosystem', x: 90, y: 80, w: 330, h: 90, caption: true },
      // The guest is on the right, so the words line up on their right edge
      // (1190), beside the photo.
      { t: 'pill', cx: 1045, cy: 318, size: 46 },
      { t: 'text', role: 'headline', text: HEAD, x: 90, y: 395, w: 1100, size: 128, weight: 800, align: 'right', lineHeight: 1.02 },
      { t: 'text', role: 'subhead', text: 'A supporting line that adds context', x: 90, y: 700, w: 1100, size: 48, weight: 400, align: 'right' },
      { t: 'guest', cx: 1500, cy: 470, size: 540, shape: 'circle', ring: 18, ringColor: 'a1', style: 'below', align: 'center' },
      { t: 'brought', anchor: 'right', x: 1190, cy: 960 },
    ],
  },
  {
    id: 'right2',
    name: 'Two guests, right column',
    note: 'Colour column on the right with two framed guests and label bars.',
    items: [
      { t: 'shape', name: 'Side panel', x: 1472, y: 0, w: 448, h: 1080, fill: 'a1' },
      { t: 'guest', cx: 1696, cy: 229, size: 352, shape: 'rect', aspect: 0.93, style: 'bar', align: 'right', barFill: '#141414' },
      { t: 'guest', cx: 1696, cy: 737, size: 352, shape: 'rect', aspect: 0.93, style: 'bar', align: 'right', barFill: '#141414' },
      { t: 'logo', slot: 'ecosystem', x: 80, y: 70, w: 300, h: 100, caption: true },
      { t: 'logo', slot: 'partner', cx: 700, cy: 228, w: 440, h: 110 },
      { t: 'pill', cx: 1190, cy: 228, size: 56 },
      { t: 'text', role: 'headline', text: HEAD, x: 160, y: 370, w: 1230, size: 158, weight: 800, align: 'right', lineHeight: 1.0 },
      { t: 'brought', anchor: 'right', x: 1390, cy: 905 },
    ],
  },
  {
    id: 'left2',
    name: 'Two guests, left column',
    note: 'Colour column on the left, headline and talking points on the right.',
    items: [
      { t: 'shape', name: 'Side panel', x: 0, y: 0, w: 464, h: 1080, fill: 'a1' },
      { t: 'guest', cx: 232, cy: 236, size: 336, shape: 'rect', aspect: 0.92, style: 'below', align: 'center' },
      { t: 'guest', cx: 232, cy: 716, size: 336, shape: 'rect', aspect: 0.92, style: 'below', align: 'center' },
      { t: 'logo', slot: 'partner', x: 560, y: 125, w: 520, h: 105 },
      { t: 'logo', slot: 'ecosystem', x: 1640, y: 100, w: 170, h: 150 },
      { t: 'text', role: 'headline', text: 'The Future\nof the Topic', x: 560, y: 300, w: 1270, size: 178, weight: 800, align: 'left', lineHeight: 1.0 },
      { t: 'text', role: 'subhead', text: 'Point one  •  Point two  •  Point three', x: 560, y: 725, w: 1270, size: 54, weight: 700, align: 'left' },
      { t: 'brought', anchor: 'left', x: 560, cy: 880, stacked: true },
    ],
  },
  {
    id: 'edge2',
    name: 'Two guests, right edge',
    note: 'Tall guest photos flush to the right edge with colour label bars.',
    // Two portrait photos, each with its bar, fill the full height: a guest
    // 376 wide is 427 tall (aspect 0.88) plus a bar of about 112.
    items: [
      { t: 'guest', cx: 1732, cy: 214, size: 376, shape: 'rect', aspect: 0.88, style: 'bar', align: 'right', barFill: 'a1' },
      { t: 'guest', cx: 1732, cy: 754, size: 376, shape: 'rect', aspect: 0.88, style: 'bar', align: 'right', barFill: 'a1' },
      { t: 'logo', slot: 'ecosystem', x: 80, y: 80, w: 330, h: 80, caption: true },
      { t: 'logo', slot: 'partner', cx: 790, cy: 265, w: 440, h: 95 },
      { t: 'pill', cx: 1260, cy: 265, size: 56 },
      { t: 'text', role: 'headline', text: 'Headline Here', x: 150, y: 395, w: 1320, size: 138, weight: 500, align: 'right', lineHeight: 1.0 },
      { t: 'text', role: 'subhead', text: 'Highlighted Words', x: 150, y: 565, w: 1320, size: 132, weight: 400, font: 'serif', italic: true, align: 'right', box: { color: 'a1', padX: 32, padY: 4, radius: 0 } },
      { t: 'brought', anchor: 'right', x: 1460, cy: 865 },
    ],
  },
  {
    id: 'right3',
    name: 'Three guests, circles',
    note: 'Colour column on the right with three round guest photos.',
    items: [
      { t: 'shape', name: 'Side panel', x: 1456, y: 0, w: 464, h: 1080, fill: 'a1' },
      { t: 'guest', cx: 1688, cy: 146, size: 248, shape: 'circle', style: 'below', align: 'center' },
      { t: 'guest', cx: 1688, cy: 488, size: 248, shape: 'circle', style: 'below', align: 'center' },
      { t: 'guest', cx: 1688, cy: 830, size: 248, shape: 'circle', style: 'below', align: 'center' },
      { t: 'logo', slot: 'ecosystem', x: 80, y: 80, w: 380, h: 110, caption: true },
      { t: 'logo', slot: 'partner', cx: 750, cy: 225, w: 300, h: 170 },
      { t: 'pill', cx: 1160, cy: 232, size: 54 },
      { t: 'text', role: 'headline', text: HEAD, x: 90, y: 365, w: 1290, size: 172, weight: 800, align: 'right', lineHeight: 1.0 },
      { t: 'text', role: 'subhead', text: 'Supporting line goes here', x: 360, y: 760, w: 990, size: 52, weight: 500, align: 'right', box: { color: 'a1', padX: 30, padY: 12, radius: 0 } },
      { t: 'brought', anchor: 'center', x: 1045, cy: 915 },
    ],
  },
  {
    id: 'bottom3',
    name: 'Three guests, bottom row',
    note: 'Centred title with three six-sided guest photos underneath.',
    items: [
      { t: 'logo', slot: 'partner', x: 60, y: 55, w: 150, h: 130 },
      { t: 'text', role: 'headline', text: 'Title', x: 260, y: 95, w: 1400, size: 300, weight: 600, align: 'center', lineHeight: 1.0 },
      { t: 'text', role: 'subhead', text: 'Interview subtitle', x: 260, y: 420, w: 1400, size: 104, weight: 400, align: 'center' },
      { t: 'guest', cx: 567, cy: 728, size: 264, shape: 'polygon', sides: 6, rounding: 0.3, ring: 34, ringColor: 'a1', style: 'below', align: 'center', upper: true },
      { t: 'guest', cx: 960, cy: 728, size: 264, shape: 'polygon', sides: 6, rounding: 0.3, ring: 34, ringColor: 'a1', style: 'below', align: 'center', upper: true },
      { t: 'guest', cx: 1353, cy: 728, size: 264, shape: 'polygon', sides: 6, rounding: 0.3, ring: 34, ringColor: 'a1', style: 'below', align: 'center', upper: true },
      { t: 'brought', anchor: 'center', x: 960, cy: 1020 },
    ],
  },
  {
    id: 'grid4',
    name: 'Four guests, grid',
    note: 'Two by two grid of guests on a colour block, title on the left.',
    items: [
      { t: 'shape', name: 'Edge strip', x: 0, y: 0, w: 100, h: 1080, fill: 'a1' },
      { t: 'shape', name: 'Guest panel', x: 1137, y: 0, w: 783, h: 1080, fill: 'a1' },
      { t: 'guest', cx: 1345, cy: 222, size: 352, shape: 'rect', aspect: 0.9, style: 'bar', align: 'right', barFill: '#141414' },
      { t: 'guest', cx: 1714, cy: 222, size: 352, shape: 'rect', aspect: 0.9, style: 'bar', align: 'right', barFill: '#141414' },
      { t: 'guest', cx: 1345, cy: 748, size: 352, shape: 'rect', aspect: 0.9, style: 'bar', align: 'right', barFill: '#141414' },
      { t: 'guest', cx: 1714, cy: 748, size: 352, shape: 'rect', aspect: 0.9, style: 'bar', align: 'right', barFill: '#141414' },
      { t: 'text', role: 'headline', text: 'Title', x: 110, y: 200, w: 1017, size: 290, weight: 600, align: 'center', lineHeight: 1.0 },
      { t: 'text', role: 'subhead', text: 'The subtitle for\nthis interview', x: 110, y: 520, w: 1017, size: 70, weight: 400, align: 'center', lineHeight: 1.15 },
      { t: 'pill', cx: 618, cy: 760, size: 58 },
      { t: 'brought', anchor: 'center', x: 618, cy: 925 },
    ],
  },
];

// ------------------------------ our hosts ------------------------------
// The show's own people, offered in the Guests tab and in a guest's Photo
// panel. The photos are files in ./hosts, bundled with the site (so they are
// public, like everything in the bundle). Choosing one fills in the name and
// title lines and sets how the photo sits in its mask (zoom, panX, panY: the
// same numbers as the "Photo inside the mask" sliders). The first entry is
// the one a new "Hosted by" piece starts with.
// hostLabel: in a "Hosted by" piece these words replace "Hosted by" before
// the microphone, and no title is put under the name (owner 2026-11-18).
// To add a person: put a square photo in ./hosts, import it above, add a line.
export const HOSTS = [
  { id: 'tate', name: '@TateOnChain', title: 'Genfinity Host', hostLabel: 'Genfinity Host', src: tateUrl, zoom: 2.1, panX: 0, panY: 0.9 },
  { id: 'ryan', name: 'Ryan Solomon', title: 'Founder & CEO of Genfinity', src: ryanUrl },
];

// ------------------------------ ready-made pieces ------------------------------
// The Elements tab: groups of items added in one click. Each one is built from
// ordinary items (photo, text, logo, shape), so every part stays editable.
export const INTERVIEW_ELEMENTS = [
  { id: 'host', name: 'Hosted by', note: 'Round host photo with the Hosted by line, the microphone badge and a handle.' },
  { id: 'guest-circle', name: 'Guest, round', note: 'Round photo with the name and title under it.' },
  { id: 'guest-bar', name: 'Guest, label bar', note: 'Tall photo with the name and title on a bar.' },
  { id: 'guest-hex', name: 'Guest, six-sided', note: 'Six-sided photo with a colour border, name and title.' },
  { id: 'pill', name: 'Interview pill', note: 'The rounded Interview label.' },
  { id: 'highlight', name: 'Highlighted words', note: 'A line of text on a colour block.' },
  { id: 'brought', name: 'Brought to you by', note: 'The line with the Genfinity logo.' },
  { id: 'ecosystem', name: 'Ecosystem logo', note: 'A logo spot with the spaced ECOSYSTEM label under it.' },
];

// A small schematic of a ready-made piece for its tile.
export function drawElementThumb(canvas, id, pal) {
  const g = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0d0d10';
  g.fillRect(0, 0, w, h);
  const cx = w / 2;
  const white = 'rgba(255,255,255,0.9)';
  const grey = '#8b93a1';
  const bar = (x, y, bw, bh, fill = white) => {
    g.fillStyle = fill;
    g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
  };
  const round = (x, y, bw, bh, r, fill) => {
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(x - bw / 2, y - bh / 2, bw, bh, r);
    g.fill();
  };
  if (id === 'host') {
    bar(cx - 14, 26, 62, 9);
    g.fillStyle = '#d2ff00';
    g.beginPath();
    g.arc(cx + 34, 26, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = grey;
    g.beginPath();
    g.arc(cx, 82, 34, 0, Math.PI * 2);
    g.fill();
    bar(cx, 132, 70, 7);
  } else if (id === 'guest-circle') {
    g.fillStyle = grey;
    g.beginPath();
    g.arc(cx, 62, 42, 0, Math.PI * 2);
    g.fill();
    bar(cx, 120, 84, 9);
    bar(cx, 135, 56, 5);
  } else if (id === 'guest-bar') {
    bar(cx, 62, 84, 96, grey);
    bar(cx, 126, 84, 32, '#141414');
    bar(cx + 6, 121, 62, 8);
    bar(cx + 16, 133, 42, 4);
  } else if (id === 'guest-hex') {
    g.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * 42, 62 + Math.sin(a) * 42);
    }
    g.closePath();
    g.fillStyle = grey;
    g.fill();
    g.lineWidth = 6;
    g.lineJoin = 'round';
    g.strokeStyle = pal.a1;
    g.stroke();
    bar(cx, 122, 84, 9);
    bar(cx, 137, 56, 5);
  } else if (id === 'pill') {
    round(cx, h / 2, 150, 46, 23, pal.a1);
    bar(cx, h / 2, 96, 12);
  } else if (id === 'highlight') {
    bar(cx, h / 2, 190, 44, pal.a1);
    bar(cx, h / 2, 150, 14);
  } else if (id === 'brought') {
    bar(cx - 52, h / 2, 84, 8);
    bar(cx + 48, h / 2, 96, 14);
  } else if (id === 'ecosystem') {
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.strokeRect(cx - 62, 44, 124, 46);
    g.setLineDash([]);
    for (let i = 0; i < 9; i += 1) bar(cx - 60 + i * 15, 110, 5, 6);
  }
}

// A small schematic of a layout for its picker tile.
export function drawLayoutThumb(canvas, layout, pal) {
  const g = canvas.getContext('2d');
  const s = canvas.width / INTERVIEW_W;
  const col = (v, fallback) => (v === 'a1' ? pal.a1 : v === 'a2' ? pal.a2 : v === 'base' ? pal.base : v || fallback);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = pal.base || '#000000';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.scale(s, s);
  layout.items.forEach((it) => {
    if (it.t === 'shape') {
      g.fillStyle = col(it.fill, pal.a1);
      g.fillRect(it.x, it.y, it.w, it.h);
    } else if (it.t === 'guest') {
      const w = it.size;
      const h = it.shape === 'rect' ? it.size / (it.aspect || 1) : it.size;
      g.fillStyle = '#9aa3b2';
      if (it.shape === 'rect') g.fillRect(it.cx - w / 2, it.cy - h / 2, w, h);
      else {
        g.beginPath();
        g.arc(it.cx, it.cy, w / 2, 0, Math.PI * 2);
        g.fill();
      }
      if (it.style === 'bar') {
        g.fillStyle = col(it.barFill, '#141414');
        g.fillRect(it.cx - w / 2, it.cy + h / 2, w, w * 0.27);
      }
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(it.cx - w * 0.36, it.cy + h / 2 + w * 0.09, w * 0.72, w * 0.07);
    } else if (it.t === 'text') {
      const lines = String(it.text).split('\n');
      const lh = it.size * 1.02;
      g.fillStyle = it.box ? col(it.box.color, pal.a1) : 'rgba(255,255,255,0.92)';
      lines.forEach((ln, i) => {
        const lw = Math.min(it.w, ln.length * it.size * 0.56);
        const x = it.align === 'center' ? it.x + (it.w - lw) / 2 : it.align === 'right' ? it.x + it.w - lw : it.x;
        g.fillRect(x, it.y + i * lh + it.size * 0.16, lw, it.size * 0.7);
      });
    } else if (it.t === 'pill') {
      g.fillStyle = pal.a1;
      const w = it.size * 6.4;
      const h = it.size * 1.7;
      g.fillRect(it.cx - w / 2, it.cy - h / 2, w, h);
    } else if (it.t === 'logo') {
      const x = it.cx != null ? it.cx - it.w / 2 : it.x;
      const y = it.cy != null ? it.cy - it.h / 2 : it.y;
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 8;
      g.strokeRect(x, y, it.w, it.h);
    } else if (it.t === 'brought') {
      const w = 560;
      const x = it.anchor === 'center' ? it.x - w / 2 : it.anchor === 'right' ? it.x - w : it.x;
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(x, it.cy - 14, it.stacked ? 300 : w, 28);
    }
  });
}
