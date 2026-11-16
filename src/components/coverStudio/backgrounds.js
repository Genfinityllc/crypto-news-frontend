// Procedural backgrounds for the Design Studio.
//
// Every template here is drawn with gradients, lines and compositing only, so
// it is instant, free, and fully recolourable. Nothing is AI generated.
// Only gradients and paths are used (no ctx.filter) so Safari renders the same.

export const COVER_W = 1800;
export const COVER_H = 900;

// ---------- colour helpers ----------
export function hexToRgb(hex) {
  let h = String(hex || '#000000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

export function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = (x, y) => Math.round(x + (y - x) * t);
  const to = (v) => v.toString(16).padStart(2, '0');
  return `#${to(c(a.r, b.r))}${to(c(a.g, b.g))}${to(c(a.b, b.b))}`;
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const isLight = (hex) => luminance(hex) > 0.55;

// Small seeded PRNG so "Shuffle" gives a new but repeatable arrangement.
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ---------- palettes ----------
// base = field colour, a1 = primary accent, a2 = secondary accent.
export const PALETTES = [
  { id: 'midnight', name: 'Midnight Navy', base: '#0a1020', a1: '#2f6bff', a2: '#8fb0ff' },
  { id: 'graphite', name: 'Graphite', base: '#0d0e11', a1: '#7d8798', a2: '#e3e8f0' },
  { id: 'royal', name: 'Royal Violet', base: '#0e0a1f', a1: '#6a4cf5', a2: '#b9a4ff' },
  { id: 'teal', name: 'Deep Teal', base: '#06171b', a1: '#16a394', a2: '#8ad8cd' },
  { id: 'oxblood', name: 'Oxblood', base: '#15080b', a1: '#b02a3c', a2: '#f09aa0' },
  { id: 'forest', name: 'Forest', base: '#07130d', a1: '#2c9a66', a2: '#a3dcc0' },
  { id: 'amber', name: 'Amber Ink', base: '#100b05', a1: '#d6952a', a2: '#f6d48c' },
  { id: 'cobalt', name: 'Cobalt', base: '#0b2a8f', a1: '#4f8bff', a2: '#dfe8ff' },
  { id: 'slate', name: 'Slate Blue', base: '#1a2333', a1: '#5a8bea', a2: '#cbd8f1' },
  { id: 'ink', name: 'Black and White', base: '#050505', a1: '#ffffff', a2: '#9aa0a8' },
  { id: 'paper', name: 'Cool White', base: '#f2f4f7', a1: '#1e4fd6', a2: '#0f172a' },
  { id: 'fog', name: 'Fog Grey', base: '#e6eaef', a1: '#334155', a2: '#64748b' },
];

// ---------- drawing primitives ----------
// Soft colour field with a gaussian-like falloff (no blur filter needed).
function field(ctx, x, y, r, color, alpha, sx = 1, sy = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.25, rgba(color, alpha * 0.78));
  g.addColorStop(0.5, rgba(color, alpha * 0.42));
  g.addColorStop(0.75, rgba(color, alpha * 0.14));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function fillBase(ctx, w, h, p) {
  // A barely-there vertical shift keeps flat fields from looking dead.
  const light = isLight(p.base);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mix(p.base, light ? '#ffffff' : '#ffffff', light ? 0.35 : 0.035));
  g.addColorStop(1, mix(p.base, '#000000', light ? 0.05 : 0.28));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Line colour that reads on either a dark or a light field.
const lineColor = (p) => (isLight(p.base) ? mix(p.base, p.a2, 0.9) : p.a2);

// ---------- templates ----------
// Each draw(ctx, w, h, p, k, rand) paints the full frame.
// p = palette, k = intensity (0..1.5), rand = seeded random.
export const TEMPLATES = [
  {
    id: 'fields',
    name: 'Soft Fields',
    note: 'Blurred colour fields on a deep base',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      const x1 = w * (0.08 + rand() * 0.22);
      const y1 = h * (0.1 + rand() * 0.3);
      const x2 = w * (0.7 + rand() * 0.25);
      const y2 = h * (0.6 + rand() * 0.35);
      field(ctx, x1, y1, h * 1.05, p.a1, 0.62 * k);
      field(ctx, x2, y2, h * 0.95, mix(p.a1, p.a2, 0.45), 0.42 * k);
      field(ctx, w * (0.45 + rand() * 0.2), h * (rand() < 0.5 ? -0.1 : 1.1), h * 0.7, p.a2, 0.16 * k);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    note: 'One soft glow behind the centre, built for a hero logo',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, w * 0.5, h * 0.5, h * 0.62, p.a1, 0.5 * k, 1.75, 1);
      field(ctx, w * 0.5, h * 0.56, h * 0.3, p.a2, 0.2 * k, 1.9, 1);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'horizon',
    name: 'Horizon',
    note: 'A lit horizon line low in the frame',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      const y = h * 0.66;
      const light = isLight(p.base);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      // glow rising off the horizon, clipped to the sky
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, y);
      ctx.clip();
      field(ctx, w * 0.5, y, h * 0.5, p.a1, 0.7 * k, 2.6, 0.62);
      field(ctx, w * 0.5, y, h * 0.2, p.a2, 0.45 * k, 3.2, 0.4);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      // ground
      const g = ctx.createLinearGradient(0, y, 0, h);
      g.addColorStop(0, mix(p.base, p.a1, light ? 0.1 : 0.16));
      g.addColorStop(1, mix(p.base, '#000000', light ? 0.04 : 0.45));
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, h - y);
      // the line itself, fading at both ends
      const lg = ctx.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, rgba(p.a2, 0));
      lg.addColorStop(0.5, rgba(p.a2, Math.min(1, 0.9 * k)));
      lg.addColorStop(1, rgba(p.a2, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(0, y - 1, w, 2);
    },
  },
  {
    id: 'mesh',
    name: 'Mesh Gradient',
    note: 'Full-bleed colour blend, corner to corner',
    draw(ctx, w, h, p, k, rand) {
      const light = isLight(p.base);
      ctx.fillStyle = mix(p.base, p.a1, light ? 0.1 : 0.22);
      ctx.fillRect(0, 0, w, h);
      const flip = rand() < 0.5;
      field(ctx, flip ? w : 0, 0, h * 1.5, p.a1, 0.85 * k);
      field(ctx, flip ? 0 : w, h, h * 1.4, mix(p.a1, p.a2, 0.55), 0.7 * k);
      field(ctx, w * 0.5, h * 1.15, h * 0.9, p.base, 0.85);
      field(ctx, flip ? w * 0.15 : w * 0.85, h * -0.1, h * 0.8, p.a2, 0.3 * k);
    },
  },
  {
    id: 'beams',
    name: 'Light Beams',
    note: 'Soft diagonal bands of light',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      ctx.save();
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      ctx.translate(w / 2, h / 2);
      ctx.rotate((-28 * Math.PI) / 180);
      const span = w * 1.6;
      const beams = [
        { x: -0.42 + rand() * 0.08, wd: 0.2, c: p.a1, a: 0.5 },
        { x: -0.08 + rand() * 0.08, wd: 0.1, c: p.a2, a: 0.22 },
        { x: 0.16 + rand() * 0.08, wd: 0.26, c: mix(p.a1, p.a2, 0.4), a: 0.36 },
        { x: 0.48 + rand() * 0.06, wd: 0.08, c: p.a1, a: 0.3 },
      ];
      beams.forEach((b) => {
        const x0 = b.x * w;
        const bw = b.wd * w;
        const g = ctx.createLinearGradient(x0, 0, x0 + bw, 0);
        g.addColorStop(0, rgba(b.c, 0));
        g.addColorStop(0.5, rgba(b.c, b.a * k));
        g.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x0, -span, bw, span * 2);
      });
      ctx.restore();
    },
  },
  {
    id: 'split',
    name: 'Diagonal Split',
    note: 'Two-tone diagonal with a hairline rule',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const top = w * 0.66;
      const bot = w * 0.46;
      ctx.beginPath();
      ctx.moveTo(top, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(bot, h);
      ctx.closePath();
      const g = ctx.createLinearGradient(bot, h, w, 0);
      g.addColorStop(0, rgba(mix(p.a1, p.base, light ? 0.2 : 0.55), Math.min(1, 0.95 * k)));
      g.addColorStop(1, rgba(p.a1, Math.min(1, 0.95 * k)));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(top, 0);
      ctx.lineTo(bot, h);
      ctx.strokeStyle = rgba(p.a2, 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();
    },
  },
  {
    id: 'panel',
    name: 'Side Panel',
    note: 'A colour panel for the logo, open field for the headline',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const pw = w * 0.36;
      const g = ctx.createLinearGradient(0, 0, pw * 0.4, h);
      g.addColorStop(0, rgba(p.a1, Math.min(1, 0.96 * k)));
      g.addColorStop(1, rgba(mix(p.a1, light ? '#000000' : p.base, 0.5), Math.min(1, 0.96 * k)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, pw, h);
      ctx.fillStyle = rgba(p.a2, 0.8);
      ctx.fillRect(pw, 0, 2, h);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, w * 0.95, h * 0.1, h * 0.8, p.a1, 0.18 * k);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'blocks',
    name: 'Colour Blocks',
    note: 'Flat Swiss-style blocks, no gradients',
    draw(ctx, w, h, p, k, rand) {
      ctx.fillStyle = p.base;
      ctx.fillRect(0, 0, w, h);
      const a = Math.min(1, 0.95 * k);
      const right = rand() < 0.5;
      const bw = w * 0.24;
      ctx.fillStyle = rgba(p.a1, a);
      ctx.fillRect(right ? w - bw : 0, 0, bw, h);
      ctx.fillStyle = rgba(p.a2, a);
      const s = h * 0.2;
      ctx.fillRect(right ? w - bw - s : bw, h - s, s, s);
      ctx.fillStyle = rgba(mix(p.a1, p.base, 0.6), a);
      ctx.fillRect(right ? w - bw - s : bw, h - s * 2, s, s);
    },
  },
  {
    id: 'grid',
    name: 'Fine Grid',
    note: 'Hairline grid fading into the field',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const cx = w * (0.62 + rand() * 0.25);
      const cy = h * (0.2 + rand() * 0.5);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, cx, cy, h * 0.95, p.a1, 0.38 * k);
      ctx.globalCompositeOperation = 'source-over';
      // grid on its own layer so it can be masked with a radial fade
      const layer = document.createElement('canvas');
      layer.width = w;
      layer.height = h;
      const lc = layer.getContext('2d');
      const step = w / 30;
      const col = lineColor(p);
      for (let i = 0, x = 0; x <= w; x += step, i++) {
        lc.fillStyle = rgba(col, i % 5 === 0 ? 0.34 : 0.15);
        lc.fillRect(Math.round(x), 0, 1, h);
      }
      for (let j = 0, y = 0; y <= h; y += step, j++) {
        lc.fillStyle = rgba(col, j % 5 === 0 ? 0.34 : 0.15);
        lc.fillRect(0, Math.round(y), w, 1);
      }
      lc.globalCompositeOperation = 'destination-in';
      const m = lc.createRadialGradient(cx, cy, 0, cx, cy, h * 1.15);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(0.55, 'rgba(0,0,0,0.45)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = m;
      lc.fillRect(0, 0, w, h);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(layer, 0, 0);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'rings',
    name: 'Orbit Rings',
    note: 'Concentric hairline rings from one corner',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const right = rand() < 0.5;
      const cx = right ? w * 0.86 : w * 0.14;
      const cy = h * 1.08;
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, cx, cy, h * 1.1, p.a1, 0.5 * k);
      ctx.globalCompositeOperation = 'source-over';
      const col = lineColor(p);
      const step = h * 0.085;
      for (let i = 1; i <= 22; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, i * step, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(col, (i % 4 === 0 ? 0.42 : 0.2) * Math.min(1.3, k) * Math.max(0.25, 1 - i / 26));
        ctx.lineWidth = i % 4 === 0 ? 1.5 : 1;
        ctx.stroke();
      }
      // one accent arc
      ctx.beginPath();
      const r = step * 8;
      ctx.arc(cx, cy, r, right ? Math.PI * 1.05 : Math.PI * 1.55, right ? Math.PI * 1.45 : Math.PI * 1.95);
      ctx.strokeStyle = rgba(p.a2, Math.min(1, 0.9 * k));
      ctx.lineWidth = 3;
      ctx.stroke();
    },
  },
  {
    id: 'arcs',
    name: 'Arc Sweep',
    note: 'Large overlapping discs, cropped by the frame',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const right = rand() < 0.5;
      const sx = (v) => (right ? w - v : v);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      const discs = [
        { x: sx(w * 0.08), y: h * 0.95, r: h * 0.78, c: p.a1, a: 0.5 },
        { x: sx(w * 0.3), y: h * 1.1, r: h * 0.62, c: mix(p.a1, p.a2, 0.5), a: 0.36 },
        { x: sx(w * -0.02), y: h * 0.28, r: h * 0.46, c: p.a2, a: 0.2 },
      ];
      discs.forEach((d) => {
        const g = ctx.createLinearGradient(d.x - d.r, d.y - d.r, d.x + d.r, d.y + d.r);
        g.addColorStop(0, rgba(d.c, d.a * k));
        g.addColorStop(1, rgba(d.c, d.a * k * 0.35));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'columns',
    name: 'Columns',
    note: 'Fine vertical columns rising from the base',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const n = 44;
      const gap = 6;
      const cw = w / n;
      let v = 0.28 + rand() * 0.15;
      for (let i = 0; i < n; i++) {
        // smooth random walk so heights read as a skyline, not noise
        v = Math.max(0.1, Math.min(0.58, v + (rand() - 0.5) * 0.12));
        const ch = h * v;
        const x = i * cw + gap / 2;
        const g = ctx.createLinearGradient(0, h - ch, 0, h);
        const c = i % 7 === 3 ? p.a2 : p.a1;
        g.addColorStop(0, rgba(c, (light ? 0.4 : 0.3) * k));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, h - ch, cw - gap, ch);
        ctx.fillStyle = rgba(c, Math.min(1, 0.6 * k));
        ctx.fillRect(x, h - ch, cw - gap, 2);
      }
    },
  },
  {
    id: 'contours',
    name: 'Contour Lines',
    note: 'Flowing hairlines across the lower frame',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, w * 0.75, h * 0.9, h * 0.9, p.a1, 0.34 * k);
      ctx.globalCompositeOperation = 'source-over';
      const col = lineColor(p);
      const ph = rand() * Math.PI * 2;
      const lines = 18;
      for (let i = 0; i < lines; i++) {
        const t = i / (lines - 1);
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 12) {
          const u = x / w;
          const y =
            h * (0.5 + t * 0.52) +
            Math.sin(u * Math.PI * 2 * 0.9 + ph + t * 1.4) * h * (0.07 + t * 0.05) +
            Math.sin(u * Math.PI * 2 * 2.1 + ph * 1.7 - t * 2) * h * 0.022;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const accent = i === 6;
        ctx.strokeStyle = accent ? rgba(p.a2, Math.min(1, 0.85 * k)) : rgba(col, (0.1 + t * 0.16) * Math.min(1.3, k));
        ctx.lineWidth = accent ? 2 : 1;
        ctx.stroke();
      }
    },
  },
  {
    id: 'ledger',
    name: 'Ledger',
    note: 'Ruled lines with a single colour band',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      const col = lineColor(p);
      const step = h / 20;
      for (let j = 1; j < 20; j++) {
        ctx.fillStyle = rgba(col, (j % 5 === 0 ? 0.24 : 0.09) * Math.min(1.3, k));
        ctx.fillRect(0, Math.round(j * step), w, 1);
      }
      const row = 11 + Math.floor(rand() * 4);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const right = rand() < 0.5;
      g.addColorStop(right ? 0 : 1, rgba(p.a1, 0));
      g.addColorStop(right ? 1 : 0, rgba(p.a1, Math.min(1, (light ? 0.75 : 0.7) * k)));
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.round(row * step) + 1, w, Math.round(step * 2) - 1);
      // margin rule
      ctx.fillStyle = rgba(p.a2, 0.55);
      ctx.fillRect(Math.round(w * 0.075), 0, 1, h);
    },
  },
  {
    id: 'frame',
    name: 'Editorial Frame',
    note: 'Inset hairline frame with an accent bar',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, w * 0.5, h * 1.2, h * 1.0, p.a1, 0.36 * k, 1.6, 1);
      ctx.globalCompositeOperation = 'source-over';
      const m = 54;
      const col = lineColor(p);
      ctx.strokeStyle = rgba(col, 0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(m + 0.5, m + 0.5, w - m * 2 - 1, h - m * 2 - 1);
      // corner ticks
      ctx.fillStyle = rgba(col, 0.9);
      const t = 16;
      [[m, m], [w - m, m], [m, h - m], [w - m, h - m]].forEach(([x, y]) => {
        ctx.fillRect(x - t / 2, y - 1, t, 2);
        ctx.fillRect(x - 1, y - t / 2, 2, t);
      });
      ctx.fillStyle = rgba(p.a1, Math.min(1, k));
      ctx.fillRect(m, m - 4, 150, 8);
    },
  },
  {
    id: 'solid',
    name: 'Solid',
    note: 'A single quiet field. Let the logo do the work',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      const light = isLight(p.base);
      ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
      field(ctx, w * 0.5, h * -0.25, h * 1.1, p.a1, 0.16 * k, 1.8, 1);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

// ---------- grain + vignette ----------
// Monochrome speckle (light and dark flecks with random alpha) reads as film
// grain on both dark and light fields, and dithers away gradient banding.
const grainTiles = {};
function grainTile(size, seed) {
  const key = `${size}_${seed}`;
  if (grainTiles[key]) return grainTiles[key];
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const rand = rng(seed + 7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() < 0.5 ? 0 : 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = Math.floor(rand() * rand() * 255);
  }
  g.putImageData(img, 0, 0);
  grainTiles[key] = c;
  return c;
}

// amount 0..1, coarse = larger softer grain
export function drawGrain(ctx, w, h, amount, coarse = false, seed = 1) {
  if (!amount || amount <= 0) return;
  const tile = grainTile(512, seed);
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount * 0.55);
  if (coarse) {
    ctx.scale(1.8, 1.8);
    ctx.imageSmoothingEnabled = true;
  }
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawVignette(ctx, w, h, amount) {
  if (!amount || amount <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.56);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, amount * 0.85)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ---------- full background render ----------
// spec = {
//   kind: 'template' | 'image',
//   templateId, palette:{base,a1,a2}, intensity, seed, flip,
//   image (HTMLImageElement|canvas), dim (0..1), tint,
//   grain (0..1), grainCoarse, vignette (0..1)
// }
export function renderBackground(canvas, spec, opts = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);

  // Templates are authored at 1800x900; scale so thumbnails match exactly.
  const s = w / COVER_W;
  ctx.save();
  ctx.scale(s, s);
  if (spec.flip) {
    ctx.translate(COVER_W, 0);
    ctx.scale(-1, 1);
  }

  if (spec.kind === 'image' && spec.image) {
    const img = spec.image;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(COVER_W / iw, COVER_H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (COVER_W - dw) / 2, (COVER_H - dh) / 2, dw, dh);
    if (spec.dim > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.9, spec.dim)})`;
      ctx.fillRect(0, 0, COVER_W, COVER_H);
    }
  } else {
    const tpl = getTemplate(spec.templateId);
    const p = spec.palette || PALETTES[0];
    const k = spec.intensity == null ? 1 : spec.intensity;
    tpl.draw(ctx, COVER_W, COVER_H, p, k, rng(spec.seed || 1));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // A dark vignette muddies a light field, so it is much gentler there.
  const lightField = spec.kind !== 'image' && isLight((spec.palette || PALETTES[0]).base);
  drawVignette(ctx, w, h, (spec.vignette || 0) * (lightField ? 0.3 : 1));
  if (!opts.skipGrain) {
    // Grain is authored for full size; thumbnails get a lighter pass.
    drawGrain(ctx, w, h, (spec.grain || 0) * (s < 0.5 ? 0.6 : 1), spec.grainCoarse, 3);
  }
  return canvas;
}

// Dominant accent colours from a logo (for "match the logo" palettes).
export function extractLogoColors(source) {
  try {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(source, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data;
    const buckets = {};
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const r = d[i];
      const gr = d[i + 1];
      const b = d[i + 2];
      const mx = Math.max(r, gr, b);
      const mn = Math.min(r, gr, b);
      if (mx - mn < 40 || mx < 60) continue; // skip greys and near-black
      const key = `${r >> 5}_${gr >> 5}_${b >> 5}`;
      const e = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
      e.n++;
      e.r += r;
      e.g += gr;
      e.b += b;
    }
    const to = (v) => Math.round(v).toString(16).padStart(2, '0');
    return Object.values(buckets)
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map((e) => `#${to(e.r / e.n)}${to(e.g / e.n)}${to(e.b / e.n)}`);
  } catch (e) {
    return [];
  }
}
