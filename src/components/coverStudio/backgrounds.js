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
// Dark fields only: covers are never set on white or light backgrounds.
export const PALETTES = [
  { id: 'midnight', name: 'Midnight Navy', base: '#070c1a', a1: '#2f6bff', a2: '#8fb0ff' },
  { id: 'ocean', name: 'Ocean', base: '#050d18', a1: '#1f6fd1', a2: '#2bb8a6' },
  { id: 'royal', name: 'Royal Violet', base: '#0b0819', a1: '#6a4cf5', a2: '#b9a4ff' },
  { id: 'dusk', name: 'Dusk', base: '#0a0913', a1: '#5b4bd6', a2: '#d9577a' },
  { id: 'plum', name: 'Plum', base: '#110714', a1: '#8a3fb0', a2: '#e07ab0' },
  { id: 'teal', name: 'Deep Teal', base: '#051417', a1: '#16a394', a2: '#8ad8cd' },
  { id: 'forest', name: 'Forest', base: '#06110b', a1: '#2c9a66', a2: '#a3dcc0' },
  { id: 'oxblood', name: 'Oxblood', base: '#13070a', a1: '#b02a3c', a2: '#f09aa0' },
  { id: 'ember', name: 'Ember', base: '#0f0706', a1: '#c2412d', a2: '#e8a23a' },
  { id: 'amber', name: 'Amber Ink', base: '#0e0a05', a1: '#d6952a', a2: '#f6d48c' },
  { id: 'steel', name: 'Steel', base: '#090d13', a1: '#4a6a8a', a2: '#b8c7d6' },
  { id: 'graphite', name: 'Graphite', base: '#0b0c0f', a1: '#7d8798', a2: '#e3e8f0' },
  { id: 'cobalt', name: 'Cobalt', base: '#0a2278', a1: '#4f8bff', a2: '#dfe8ff' },
  { id: 'ink', name: 'Black and White', base: '#050505', a1: '#ffffff', a2: '#9aa0a8' },
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

// Base field. deep > 0 pushes it toward black so colour blooms have more room.
function fillBase(ctx, w, h, p, deep = 0) {
  const top = mix(p.base, '#000000', deep);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mix(top, '#ffffff', 0.03));
  g.addColorStop(1, mix(top, '#000000', 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// Off-screen layer in template units (1800x900), rendered at quality q so
// thumbnails stay cheap. Draw it back with ctx.drawImage(l.c, 0, 0, w, h).
function layer(q) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(COVER_W * q));
  c.height = Math.max(1, Math.round(COVER_H * q));
  const g = c.getContext('2d');
  g.scale(q, q);
  return { c, g };
}

// Fade a layer out from a centre point (keeps line work from fighting text).
function radialMask(g, w, h, cx, cy, r, inner = 1) {
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  m.addColorStop(0, `rgba(0,0,0,${inner})`);
  m.addColorStop(0.55, `rgba(0,0,0,${inner * 0.45})`);
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
}

const TAU = Math.PI * 2;

// ---------- templates ----------
// Each draw(ctx, w, h, p, k, rand, q) paints the full frame.
// p = palette, k = intensity (0..1.5), rand = seeded random, q = render scale.
// House rules: soft light, fine line work, grain. No hard colour blocks.
export const TEMPLATES = [
  {
    id: 'fields',
    name: 'Soft Fields',
    note: 'Blurred colour fields on a deep base',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p, 0.15);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, w * (0.06 + rand() * 0.22), h * (0.08 + rand() * 0.3), h * 1.2, p.a1, 0.85 * k);
      field(ctx, w * (0.72 + rand() * 0.24), h * (0.62 + rand() * 0.35), h * 1.05, mix(p.a1, p.a2, 0.5), 0.6 * k);
      field(ctx, w * (0.45 + rand() * 0.2), h * (rand() < 0.5 ? -0.12 : 1.12), h * 0.75, p.a2, 0.26 * k);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'corner',
    name: 'Corner Glow',
    note: 'One bloom of colour falling off into black',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p, 0.5);
      const corner = Math.floor(rand() * 4);
      const cx = corner % 2 ? w * 1.03 : -w * 0.03;
      const cy = corner < 2 ? h * 1.1 : -h * 0.1;
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, cy, h * 1.85, p.a1, 0.95 * k);
      field(ctx, cx, cy, h * 1.05, mix(p.a1, p.a2, 0.55), 0.7 * k);
      field(ctx, cx, cy, h * 0.45, p.a2, 0.5 * k);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'dual',
    name: 'Dual Glow',
    note: 'Two colours blooming from opposite corners',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p, 0.45);
      const flip = rand() < 0.5;
      const ax = flip ? w * 1.05 : -w * 0.05;
      const bx = flip ? -w * 0.05 : w * 1.05;
      ctx.globalCompositeOperation = 'screen';
      field(ctx, ax, h * 1.12, h * 1.5, p.a1, 0.9 * k);
      field(ctx, ax, h * 1.12, h * 0.7, mix(p.a1, p.a2, 0.4), 0.45 * k);
      field(ctx, bx, -h * 0.12, h * 1.3, mix(p.a2, p.a1, 0.25), 0.62 * k);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    note: 'One soft glow behind the centre, built for a hero logo',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p, 0.25);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, w * 0.5, h * 0.5, h * 0.66, p.a1, 0.6 * k, 1.75, 1);
      field(ctx, w * 0.5, h * 0.56, h * 0.32, p.a2, 0.24 * k, 1.9, 1);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'halo',
    name: 'Halo',
    note: 'A soft ring of light. Set the logo inside it',
    draw(ctx, w, h, p, k, rand, q) {
      fillBase(ctx, w, h, p, 0.4);
      const cx = w / 2;
      const cy = h / 2;
      const r0 = h * 0.16;
      const r1 = h * 0.66;
      const ring = (g, color, a) => {
        const gr = g.createRadialGradient(cx, cy, r0, cx, cy, r1);
        gr.addColorStop(0, rgba(color, 0));
        gr.addColorStop(0.34, rgba(color, a * 0.12));
        gr.addColorStop(0.5, rgba(color, a));
        gr.addColorStop(0.66, rgba(color, a * 0.28));
        gr.addColorStop(1, rgba(color, 0));
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      };
      ctx.globalCompositeOperation = 'screen';
      ring(ctx, p.a1, 0.8 * k);
      // second colour washes across one side of the ring
      const l = layer(q);
      ring(l.g, p.a2, 0.85 * k);
      l.g.globalCompositeOperation = 'destination-in';
      const ang = rand() * TAU;
      const m = l.g.createLinearGradient(cx - Math.cos(ang) * r1, cy - Math.sin(ang) * r1, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      m.addColorStop(0.35, 'rgba(0,0,0,0)');
      m.addColorStop(1, 'rgba(0,0,0,1)');
      l.g.fillStyle = m;
      l.g.fillRect(0, 0, w, h);
      ctx.drawImage(l.c, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'eclipse',
    name: 'Planet Rise',
    note: 'Light breaking over a wide curved horizon',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p, 0.5);
      // a very large disc, so only a gentle curve crosses the frame
      const cx = w * 0.5;
      const r = h * 2.4;
      const cy = h * 0.62 + r;
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, h * 0.62, h * 0.8, p.a1, 0.85 * k, 2.2, 0.7);
      field(ctx, cx, h * 0.62, h * 0.3, p.a2, 0.5 * k, 2.8, 0.45);
      ctx.globalCompositeOperation = 'source-over';
      const dg = ctx.createLinearGradient(0, h * 0.62, 0, h);
      dg.addColorStop(0, mix(p.base, '#000000', 0.62));
      dg.addColorStop(1, mix(p.base, '#000000', 0.85));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      // rim light: three passes stand in for a blur
      const lg = ctx.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0.05, rgba(p.a2, 0));
      lg.addColorStop(0.5, rgba(mix(p.a2, '#ffffff', 0.35), 1));
      lg.addColorStop(0.95, rgba(p.a2, 0));
      ctx.strokeStyle = lg;
      [[22, 0.06], [9, 0.15], [2.2, 0.9]].forEach(([lw, a]) => {
        ctx.globalAlpha = Math.min(1, a * k);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI * 1.35, Math.PI * 1.65);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'horizon',
    name: 'Horizon',
    note: 'A lit horizon line low in the frame',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p, 0.3);
      const y = h * 0.66;
      ctx.globalCompositeOperation = 'screen';
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, y);
      ctx.clip();
      field(ctx, w * 0.5, y, h * 0.52, p.a1, 0.8 * k, 2.6, 0.62);
      field(ctx, w * 0.5, y, h * 0.2, p.a2, 0.5 * k, 3.2, 0.4);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, y, 0, h);
      g.addColorStop(0, mix(p.base, p.a1, 0.18));
      g.addColorStop(1, mix(p.base, '#000000', 0.6));
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, h - y);
      const lg = ctx.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, rgba(p.a2, 0));
      lg.addColorStop(0.5, rgba(p.a2, Math.min(1, 0.95 * k)));
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
      ctx.fillStyle = mix(p.base, p.a1, 0.2);
      ctx.fillRect(0, 0, w, h);
      const flip = rand() < 0.5;
      field(ctx, flip ? w : 0, 0, h * 1.5, p.a1, 0.9 * k);
      field(ctx, flip ? 0 : w, h, h * 1.4, mix(p.a1, p.a2, 0.55), 0.72 * k);
      field(ctx, w * 0.5, h * 1.15, h * 0.95, mix(p.base, '#000000', 0.3), 0.9);
      field(ctx, flip ? w * 0.15 : w * 0.85, h * -0.1, h * 0.8, p.a2, 0.32 * k);
    },
  },
  {
    id: 'fluted',
    name: 'Fluted Glass',
    note: 'Colour seen through ribbed glass',
    draw(ctx, w, h, p, k, rand, q) {
      // the scene behind the glass
      const src = layer(q);
      fillBase(src.g, w, h, p, 0.2);
      src.g.globalCompositeOperation = 'screen';
      field(src.g, w * (0.12 + rand() * 0.2), h * (0.2 + rand() * 0.3), h * 1.05, p.a1, 0.95 * k);
      field(src.g, w * (0.68 + rand() * 0.2), h * (0.6 + rand() * 0.3), h * 0.95, mix(p.a1, p.a2, 0.55), 0.8 * k);
      field(src.g, w * (0.45 + rand() * 0.2), -h * 0.05, h * 0.6, p.a2, 0.42 * k);
      // each flute shows a squeezed, shifted slice of that scene
      const n = 30;
      const fw = w / n;
      const sw = fw * 3.4;
      for (let i = 0; i < n; i++) {
        const x = i * fw;
        const sx = Math.max(0, Math.min(w - sw, x + fw / 2 - sw / 2 + fw * 0.8));
        ctx.drawImage(src.c, sx * q, 0, sw * q, h * q, x, 0, fw + 0.7, h);
        const g = ctx.createLinearGradient(x, 0, x + fw, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.36)');
        g.addColorStop(0.2, 'rgba(0,0,0,0.08)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.055)');
        g.addColorStop(0.88, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, fw + 0.7, h);
      }
    },
  },
  {
    id: 'veils',
    name: 'Veils',
    note: 'Fine luminous ridges drifting across the frame',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p, 0.4);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, w * (0.3 + rand() * 0.4), h * 0.95, h * 0.95, p.a1, 0.34 * k);
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const baseY = h * (0.4 + t * 0.44);
        const amp = h * (0.08 - t * 0.02);
        const ph = rand() * TAU;
        const f = 0.55 + rand() * 0.5;
        const crest = (x) => {
          const u = x / w;
          return baseY + Math.sin(u * TAU * f + ph) * amp + Math.sin(u * TAU * f * 2.3 + ph * 1.7) * amp * 0.25;
        };
        const trace = () => {
          ctx.beginPath();
          ctx.moveTo(-10, crest(-10));
          for (let x = 0; x <= w + 10; x += 14) ctx.lineTo(x, crest(x));
        };
        const col = mix(p.a1, p.a2, t * 0.75);
        // light falls away quickly beneath each ridge, so no solid shapes form
        trace();
        ctx.lineTo(w + 10, baseY + amp + h * 0.24);
        ctx.lineTo(-10, baseY + amp + h * 0.24);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, baseY - amp * 1.3, 0, baseY + amp + h * 0.22);
        g.addColorStop(0, rgba(col, 0.3 * k));
        g.addColorStop(0.3, rgba(col, 0.09 * k));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fill();
        trace();
        const lg = ctx.createLinearGradient(0, 0, w, 0);
        const la = Math.min(1, 0.6 * k);
        lg.addColorStop(0, rgba(col, 0));
        lg.addColorStop(0.3 + rand() * 0.2, rgba(mix(col, '#ffffff', 0.35), la));
        lg.addColorStop(1, rgba(col, la * 0.15));
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'flow',
    name: 'Flow Lines',
    note: 'A ribbon of fine lines twisting across the frame',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p, 0.4);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, w * (0.35 + rand() * 0.3), h * 0.62, h * 0.9, p.a1, 0.34 * k, 1.6, 1);
      const n = 54;
      const ph = rand() * TAU;
      const ph2 = rand() * TAU;
      for (let j = 0; j < n; j++) {
        const t = j / (n - 1);
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 9) {
          const u = x / w;
          const yc = h * (0.56 + 0.12 * Math.sin(u * TAU * 0.6 + ph));
          // thickness swings through zero, which is what twists the ribbon
          const thick = h * 0.42 * Math.sin(u * TAU * 0.8 + ph2);
          const y = yc + (t - 0.5) * thick;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const col = mix(p.a1, p.a2, t);
        // the two edges of the ribbon carry more light than its middle
        const a = Math.min(1, (0.3 + 0.55 * Math.abs(2 * t - 1)) * 0.75 * k);
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, rgba(col, 0));
        g.addColorStop(0.15, rgba(col, a));
        g.addColorStop(0.85, rgba(col, a));
        g.addColorStop(1, rgba(col, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'topo',
    name: 'Topographic',
    note: 'Organic contour rings around a soft glow',
    draw(ctx, w, h, p, k, rand, q) {
      fillBase(ctx, w, h, p, 0.3);
      const cx = w * (0.6 + rand() * 0.22);
      const cy = h * (0.35 + rand() * 0.3);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, cy, h * 1.0, p.a1, 0.46 * k);
      ctx.globalCompositeOperation = 'source-over';
      const p1 = rand() * TAU;
      const p2 = rand() * TAU;
      const p3 = rand() * TAU;
      const l = layer(q);
      for (let i = 1; i <= 24; i++) {
        const r0 = h * 0.062 * i;
        l.g.beginPath();
        for (let th = 0; th <= TAU + 0.02; th += 0.025) {
          const r = r0 * (1 + 0.11 * Math.sin(3 * th + p1 + i * 0.13) + 0.07 * Math.sin(5 * th + p2 - i * 0.09) + 0.05 * Math.sin(2 * th + p3));
          const x = cx + Math.cos(th) * r;
          const y = cy + Math.sin(th) * r;
          if (th === 0) l.g.moveTo(x, y);
          else l.g.lineTo(x, y);
        }
        l.g.strokeStyle = rgba(i % 5 === 0 ? mix(p.a2, '#ffffff', 0.2) : p.a2, i % 5 === 0 ? 0.7 : 0.34);
        l.g.lineWidth = i % 5 === 0 ? 1.4 : 1;
        l.g.stroke();
      }
      radialMask(l.g, w, h, cx, cy, h * 1.5);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(l.c, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'guilloche',
    name: 'Guilloche',
    note: 'Banknote-style engraved rosette',
    draw(ctx, w, h, p, k, rand, q) {
      fillBase(ctx, w, h, p, 0.3);
      const right = rand() < 0.5;
      const cx = right ? w * 0.8 : w * 0.2;
      const cy = h * 0.5;
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, cy, h * 0.95, p.a1, 0.5 * k);
      ctx.globalCompositeOperation = 'source-over';
      const l = layer(q);
      const bands = [
        { R: h * 0.66, A: h * 0.075, n: 18, K: 10 },
        { R: h * 0.45, A: h * 0.06, n: 14, K: 9 },
        { R: h * 0.26, A: h * 0.045, n: 10, K: 8 },
        { R: h * 0.11, A: h * 0.03, n: 6, K: 6 },
      ];
      bands.forEach((b, bi) => {
        for (let kk = 0; kk < b.K; kk++) {
          const phase = (kk / b.K) * TAU;
          l.g.beginPath();
          for (let th = 0; th <= TAU + 0.01; th += 0.008) {
            const r = b.R + b.A * Math.sin(b.n * th + phase);
            const x = cx + Math.cos(th) * r;
            const y = cy + Math.sin(th) * r;
            if (th === 0) l.g.moveTo(x, y);
            else l.g.lineTo(x, y);
          }
          l.g.strokeStyle = rgba(bi % 2 ? mix(p.a2, p.a1, 0.35) : p.a2, 0.42);
          l.g.lineWidth = 0.9;
          l.g.stroke();
        }
      });
      radialMask(l.g, w, h, cx, cy, h * 1.25);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(l.c, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'rings',
    name: 'Orbit Rings',
    note: 'Concentric hairline rings from one corner',
    draw(ctx, w, h, p, k, rand) {
      fillBase(ctx, w, h, p, 0.3);
      const right = rand() < 0.5;
      const cx = right ? w * 0.86 : w * 0.14;
      const cy = h * 1.08;
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, cy, h * 1.15, p.a1, 0.6 * k);
      ctx.globalCompositeOperation = 'source-over';
      const step = h * 0.085;
      for (let i = 1; i <= 22; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, i * step, 0, TAU);
        ctx.strokeStyle = rgba(p.a2, (i % 4 === 0 ? 0.42 : 0.2) * Math.min(1.3, k) * Math.max(0.25, 1 - i / 26));
        ctx.lineWidth = i % 4 === 0 ? 1.5 : 1;
        ctx.stroke();
      }
      ctx.beginPath();
      const r = step * 8;
      ctx.arc(cx, cy, r, right ? Math.PI * 1.05 : Math.PI * 1.55, right ? Math.PI * 1.45 : Math.PI * 1.95);
      ctx.strokeStyle = rgba(p.a2, Math.min(1, 0.9 * k));
      ctx.lineWidth = 3;
      ctx.stroke();
    },
  },
  {
    id: 'grid',
    name: 'Fine Grid',
    note: 'Hairline grid fading into the field',
    draw(ctx, w, h, p, k, rand, q) {
      fillBase(ctx, w, h, p, 0.3);
      const cx = w * (0.62 + rand() * 0.25);
      const cy = h * (0.2 + rand() * 0.5);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, cy, h * 1.0, p.a1, 0.5 * k);
      ctx.globalCompositeOperation = 'source-over';
      const l = layer(q);
      const step = w / 30;
      for (let i = 0, x = 0; x <= w; x += step, i++) {
        l.g.fillStyle = rgba(p.a2, i % 5 === 0 ? 0.5 : 0.22);
        l.g.fillRect(Math.round(x), 0, 1, h);
      }
      for (let j = 0, y = 0; y <= h; y += step, j++) {
        l.g.fillStyle = rgba(p.a2, j % 5 === 0 ? 0.5 : 0.22);
        l.g.fillRect(0, Math.round(y), w, 1);
      }
      radialMask(l.g, w, h, cx, cy, h * 1.2);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(l.c, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'pinstripe',
    name: 'Pinstripe',
    note: 'Fine diagonal pinstripes catching the light',
    draw(ctx, w, h, p, k, rand, q) {
      fillBase(ctx, w, h, p, 0.3);
      const cx = w * (0.25 + rand() * 0.5);
      const cy = h * (0.3 + rand() * 0.4);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, cy, h * 1.1, p.a1, 0.5 * k);
      ctx.globalCompositeOperation = 'source-over';
      const l = layer(q);
      l.g.save();
      l.g.translate(w / 2, h / 2);
      l.g.rotate((-38 * Math.PI) / 180);
      const span = w * 1.4;
      for (let x = -span, i = 0; x <= span; x += 24, i++) {
        l.g.fillStyle = rgba(p.a2, i % 6 === 0 ? 0.5 : 0.26);
        l.g.fillRect(x, -span, 1.2, span * 2);
      }
      l.g.restore();
      radialMask(l.g, w, h, cx, cy, h * 1.25);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(l.c, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'ruled',
    name: 'Ruled',
    note: 'Ledger rules fading across a soft glow',
    draw(ctx, w, h, p, k, rand, q) {
      fillBase(ctx, w, h, p, 0.3);
      const right = rand() < 0.5;
      const cx = right ? w * 0.9 : w * 0.1;
      ctx.globalCompositeOperation = 'screen';
      field(ctx, cx, h * 0.95, h * 1.1, p.a1, 0.5 * k);
      ctx.globalCompositeOperation = 'source-over';
      const l = layer(q);
      const step = h / 22;
      for (let j = 1; j < 22; j++) {
        l.g.fillStyle = rgba(p.a2, j % 5 === 0 ? 0.52 : 0.24);
        l.g.fillRect(0, Math.round(j * step), w, 1);
      }
      l.g.fillStyle = rgba(p.a2, 0.6);
      l.g.fillRect(Math.round(right ? w * 0.925 : w * 0.075), 0, 1, h);
      radialMask(l.g, w, h, cx, h * 0.95, h * 1.9);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(l.c, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'frame',
    name: 'Editorial Frame',
    note: 'Inset hairline frame with corner ticks',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p, 0.3);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, w * 0.5, h * 1.2, h * 1.05, p.a1, 0.5 * k, 1.6, 1);
      ctx.globalCompositeOperation = 'source-over';
      const m = 54;
      ctx.strokeStyle = rgba(p.a2, 0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(m + 0.5, m + 0.5, w - m * 2 - 1, h - m * 2 - 1);
      ctx.fillStyle = rgba(p.a2, 0.9);
      const t = 16;
      [[m, m], [w - m, m], [m, h - m], [w - m, h - m]].forEach(([x, y]) => {
        ctx.fillRect(x - t / 2, y - 1, t, 2);
        ctx.fillRect(x - 1, y - t / 2, 2, t);
      });
    },
  },
  {
    id: 'solid',
    name: 'Solid',
    note: 'A single quiet field. Let the logo do the work',
    draw(ctx, w, h, p, k) {
      fillBase(ctx, w, h, p);
      ctx.globalCompositeOperation = 'screen';
      field(ctx, w * 0.5, h * -0.25, h * 1.1, p.a1, 0.2 * k, 1.8, 1);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

// ---------- grain + vignette ----------
// Monochrome speckle (light and dark flecks with random alpha) reads as film
// grain on both dark and light fields, and dithers away gradient banding.
//
// The grain is ONE field the full size of the canvas, never a repeated tile,
// and it comes from a long-period generator. (A small tile repeats visibly,
// and the simple layout generator above cycles after about 230,000 values,
// which is fewer than one tile needs, so it printed its own pattern.)
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Normally-distributed noise (sum of three uniforms is close enough).
function gaussianNoise(n, rand) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = (rand() + rand() + rand() - 1.5) * 2;
  return a;
}

// Separable binomial blur [1,4,6,4,1]/16 (about one pixel of softness).
function soften(src, w, h) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const m2 = row + (x > 1 ? x - 2 : 0);
      const m1 = row + (x > 0 ? x - 1 : 0);
      const p1 = row + (x < w - 1 ? x + 1 : w - 1);
      const p2 = row + (x < w - 2 ? x + 2 : w - 1);
      tmp[row + x] = (src[m2] + 4 * src[m1] + 6 * src[row + x] + 4 * src[p1] + src[p2]) / 16;
    }
  }
  for (let y = 0; y < h; y++) {
    const m2 = (y > 1 ? y - 2 : 0) * w;
    const m1 = (y > 0 ? y - 1 : 0) * w;
    const c0 = y * w;
    const p1 = (y < h - 1 ? y + 1 : h - 1) * w;
    const p2 = (y < h - 2 ? y + 2 : h - 1) * w;
    for (let x = 0; x < w; x++) {
      out[c0 + x] = (tmp[m2 + x] + 4 * tmp[m1 + x] + 6 * tmp[c0 + x] + 4 * tmp[p1 + x] + tmp[p2 + x]) / 16;
    }
  }
  return out;
}

// Scale to unit strength so blurring does not weaken the grain.
function unitStrength(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  const k = 1 / Math.sqrt(s / a.length || 1);
  for (let i = 0; i < a.length; i++) a[i] *= k;
  return a;
}

// Two kinds of grain, both ONE field the exact size of the surface they are
// drawn on, so the grain itself is never resized:
//  - fine: single-pixel flecks. The default. Fully random at 1:1.
//  - soft: flecks about two pixels across plus light clumps ("coarser grain").
// Fine grain only stays pattern-free while it is shown pixel for pixel.
// Resizing it produces a woven ripple (moire). That is why the editor draws
// its grain on a separate layer at the screen's own pixels, and the exported
// file gets its grain drawn at the cover's own pixels. See CoverStudio.
// Seeded so the grain holds still while you edit.
const grainFields = new Map();
export function grainField(w, h, seed, soft = false) {
  const key = `${w}x${h}_${seed}_${soft ? 's' : 'f'}`;
  const hit = grainFields.get(key);
  if (hit) return hit;
  const rand = mulberry32(seed * 7919 + 104729);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;

  if (!soft) {
    for (let i = 0; i < d.length; i += 4) {
      const v = rand() < 0.5 ? 0 : 255; // light fleck or dark fleck
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = (rand() * rand() * 255) | 0;
    }
  } else {
    const fine = unitStrength(soften(gaussianNoise(w * h, rand), w, h));
    const cw = Math.max(2, Math.ceil(w / 3));
    const ch = Math.max(2, Math.ceil(h / 3));
    const clump = unitStrength(soften(gaussianNoise(cw * ch, rand), cw, ch));
    const sx = (cw - 1) / Math.max(1, w - 1);
    const sy = (ch - 1) / Math.max(1, h - 1);
    for (let y = 0; y < h; y++) {
      const fy = y * sy;
      const y0 = Math.floor(fy);
      const y1 = Math.min(ch - 1, y0 + 1);
      const ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = x * sx;
        const x0 = Math.floor(fx);
        const x1 = Math.min(cw - 1, x0 + 1);
        const tx = fx - x0;
        // smooth (bilinear) read of the clump layer
        const top = clump[y0 * cw + x0] * (1 - tx) + clump[y0 * cw + x1] * tx;
        const bot = clump[y1 * cw + x0] * (1 - tx) + clump[y1 * cw + x1] * tx;
        const n = 0.97 * fine[y * w + x] + 0.2 * (top * (1 - ty) + bot * ty);
        const i = (y * w + x) * 4;
        const v = n > 0 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = Math.min(255, Math.abs(n) * 84);
      }
    }
  }
  g.putImageData(img, 0, 0);
  if (grainFields.size >= 8) grainFields.delete(grainFields.keys().next().value);
  grainFields.set(key, c);
  return c;
}

// How opaque the grain layer is for a given slider amount (0..1).
export const grainOpacity = (amount) => Math.min(1, Math.max(0, amount || 0) * 0.55);

// Draw grain pixel for pixel onto a surface of exactly w x h.
export function drawGrain(ctx, w, h, amount, soft = false, seed = 1) {
  if (!amount || amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = grainOpacity(amount);
  ctx.drawImage(grainField(w, h, seed, soft), 0, 0);
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

// The reverse of the edge vignette: shade the middle of the frame and fade
// out toward the edges, so a logo or headline placed there stands out.
export function drawCenterVignette(ctx, w, h, amount) {
  if (!amount || amount <= 0) return;
  const a = Math.min(0.92, amount * 0.9);
  ctx.save();
  // an ellipse that follows the 2:1 frame
  ctx.translate(w / 2, h / 2);
  ctx.scale(1.75, 1);
  const r = h * 0.66;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(0.3, `rgba(0,0,0,${a * 0.82})`);
  g.addColorStop(0.6, `rgba(0,0,0,${a * 0.4})`);
  g.addColorStop(0.85, `rgba(0,0,0,${a * 0.1})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

// ---------- full background render ----------
// spec = {
//   kind: 'template' | 'image',
//   templateId, palette:{base,a1,a2}, intensity, seed, flip,
//   image (HTMLImageElement|canvas), dim (0..1), tint,
//   grain (0..1), grainCoarse, vignette (0..1), centerVignette (0..1)
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
    tpl.draw(ctx, COVER_W, COVER_H, p, k, rng(spec.seed || 1), s);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // A dark vignette muddies a light field, so it is much gentler there.
  const lightField = spec.kind !== 'image' && isLight((spec.palette || PALETTES[0]).base);
  drawVignette(ctx, w, h, (spec.vignette || 0) * (lightField ? 0.3 : 1));
  drawCenterVignette(ctx, w, h, spec.centerVignette || 0);
  if (!opts.skipGrain) {
    // Thumbnails are shown resized, so they always use the soft grain (fine
    // grain would ripple) and a lighter pass.
    const thumb = s < 0.5;
    drawGrain(ctx, w, h, (spec.grain || 0) * (thumb ? 0.6 : 1), spec.grainCoarse || thumb, 3);
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
