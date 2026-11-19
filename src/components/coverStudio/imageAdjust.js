// Colour and contrast editing for any picture in the studio: an image dropped
// on the cover, a guest photo, a background image.
//
// An adjustment is plain data, kept next to the picture it belongs to:
//   { darken, contrast, hue, sat, light, bands: { red: [h, s, l], ... } }
//   darken    0..0.9   how much darker (0 = as it is)
//   contrast  -1..1
//   hue       -180..180 degrees, the whole picture
//   sat       -1..1    (-1 = grey)
//   light     -1..1
//   bands     one [hue, saturation, lightness] triple per colour family, each
//             -1..1, acting only on that family (the reds, the blues, ...)
//   blur      0..1    the whole picture out of focus
//   tilt      tilt shift: one area stays sharp, the rest goes out of focus.
//             { amount, shape: 'band' | 'circle', x, y, size, feather, angle }
//             x, y: the middle of the sharp area (0..1 across the picture);
//             size: how big it is; feather: how gradually it fades; angle:
//             the band's turn in degrees.
//   map       a gradient map: 2 to 5 colours, the first for the picture's
//             blacks, the last for its whites, the others evenly between.
//             Applied last, to the picture's brightness.
// Nothing set means no adjustment at all (null).
//
// Like a gradient, an adjustment is never changed in place: every edit makes a
// new one. History, drafts and the picture cache rely on that.
//
// Everything is done on pixels: Safari has no ctx.filter.

// The colour families, by where they sit on the colour wheel (degrees).
export const BANDS = [
  { id: 'red', label: 'Reds', hue: 0, chip: '#e5484d' },
  { id: 'orange', label: 'Oranges', hue: 30, chip: '#f08a3c' },
  { id: 'yellow', label: 'Yellows', hue: 60, chip: '#f2d13d' },
  { id: 'green', label: 'Greens', hue: 120, chip: '#46b85a' },
  { id: 'aqua', label: 'Aquas', hue: 180, chip: '#35c6c6' },
  { id: 'blue', label: 'Blues', hue: 240, chip: '#3d7bf0' },
  { id: 'purple', label: 'Purples', hue: 280, chip: '#8b5cf6' },
  { id: 'magenta', label: 'Magentas', hue: 320, chip: '#e25bd0' },
];

// How far a family's Hue slider can turn it: as far as its nearer neighbour
// and no farther, so two families can never cross over each other.
const TURN = BANDS.map((b, i) => {
  const prev = BANDS[(i + BANDS.length - 1) % BANDS.length].hue;
  const next = BANDS[(i + 1) % BANDS.length].hue;
  return Math.min((b.hue - prev + 360) % 360, (next - b.hue + 360) % 360);
});

// ---------- gradient map ----------
// Every pixel takes the colour its brightness points at on a ramp that runs
// from the first colour (blacks) to the last (whites).
export const MAP_MIN = 2;
export const MAP_MAX = 5;
const HEX = /^#[0-9a-fA-F]{6}$/;
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hexOf = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// A usable list of colours, or null.
export function cleanMap(colors) {
  if (!Array.isArray(colors)) return null;
  const list = colors.filter((c) => HEX.test(String(c || ''))).map((c) => c.toLowerCase()).slice(0, MAP_MAX);
  return list.length >= MAP_MIN ? list : null;
}

// The ramp's colour at t (0 = blacks, 1 = whites).
function mapAt(list, t) {
  const at = Math.max(0, Math.min(1, t)) * (list.length - 1);
  const i = Math.min(list.length - 2, Math.floor(at));
  const f = at - i;
  const a = rgbOf(list[i]);
  const b = rgbOf(list[i + 1]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// The same ramp with more or fewer colours: the ends stay, and the colours
// between are read off the ramp as it is, so the picture hardly changes until
// a new colour is picked.
export function resizeMap(colors, n) {
  const list = cleanMap(colors) || ['#000000', '#ffffff'];
  const want = Math.max(MAP_MIN, Math.min(MAP_MAX, Math.round(Number(n) || MAP_MIN)));
  if (want === list.length) return list;
  const out = [];
  for (let i = 0; i < want; i += 1) out.push(hexOf(...mapAt(list, i / (want - 1))));
  return out;
}

export const colourMap = (colors, i, c) => (cleanMap(colors) || []).map((v, k) => (k === i && HEX.test(String(c || '')) ? c.toLowerCase() : v));

// A CSS picture of the ramp, for the side panel.
export const mapCss = (colors) => {
  const list = cleanMap(colors);
  return list ? `linear-gradient(90deg, ${list.join(', ')})` : 'none';
};

// Change the pixels of an ImageData's data in place.
export function mapPixels(d, colors) {
  const list = cleanMap(colors);
  if (!list) return;
  const lr = new Uint8ClampedArray(256);
  const lg = new Uint8ClampedArray(256);
  const lb = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v += 1) {
    const c = mapAt(list, v / 255);
    lr[v] = Math.round(c[0]);
    lg[v] = Math.round(c[1]);
    lb[v] = Math.round(c[2]);
  }
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    d[i] = lr[l];
    d[i + 1] = lg[l];
    d[i + 2] = lb[l];
  }
}

const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
const round3 = (v) => Math.round(v * 1000) / 1000;

const cleanBand = (t) => {
  if (!Array.isArray(t)) return null;
  const out = [round3(num(t[0], -1, 1)), round3(num(t[1], -1, 1)), round3(num(t[2], -1, 1))];
  return out[0] || out[1] || out[2] ? out : null;
};

// ---------- tilt shift ----------
export const makeTilt = (shape) => ({ amount: 0.5, shape: shape === 'circle' ? 'circle' : 'band', x: 0.5, y: 0.5, size: 0.3, feather: 0.25, angle: 0 });

function cleanTilt(t) {
  if (!t || typeof t !== 'object') return null;
  const or = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    amount: round3(Math.max(0.02, Math.min(1, or(t.amount, 0.5)))),
    shape: t.shape === 'circle' ? 'circle' : 'band',
    x: round3(Math.max(0, Math.min(1, or(t.x, 0.5)))),
    y: round3(Math.max(0, Math.min(1, or(t.y, 0.5)))),
    size: round3(Math.max(0.02, Math.min(1, or(t.size, 0.3)))),
    feather: round3(Math.max(0.02, Math.min(1, or(t.feather, 0.25)))),
    angle: Math.round(Math.max(-90, Math.min(90, or(t.angle, 0)))),
  };
}

// The adjustment with some of its tilt shift changed (null switches it off).
export const setTilt = (a, patch) => cleanAdjust({ ...(a || {}), tilt: patch ? { ...((a && a.tilt) || makeTilt('band')), ...patch } : null });

// A tidy copy, or null when it changes nothing.
export function cleanAdjust(a) {
  if (!a || typeof a !== 'object') return null;
  const out = {
    darken: round3(num(a.darken, 0, 0.9)),
    contrast: round3(num(a.contrast, -1, 1)),
    hue: Math.round(num(a.hue, -180, 180)),
    sat: round3(num(a.sat, -1, 1)),
    light: round3(num(a.light, -1, 1)),
    blur: round3(num(a.blur, 0, 1)),
  };
  const bands = {};
  let any = false;
  BANDS.forEach((b) => {
    const t = cleanBand(a.bands && a.bands[b.id]);
    if (t) {
      bands[b.id] = t;
      any = true;
    }
  });
  if (any) out.bands = bands;
  const map = cleanMap(a.map);
  if (map) out.map = map;
  const tilt = cleanTilt(a.tilt);
  if (tilt) out.tilt = tilt;
  return out.darken || out.contrast || out.hue || out.sat || out.light || out.blur || any || map || tilt ? out : null;
}

export const isAdjusted = (a) => !!cleanAdjust(a);

// The adjustment with some of the whole-picture values changed.
export const setAdjust = (a, patch) => cleanAdjust({ ...(a || {}), ...patch });

// One colour family: which = 0 hue, 1 saturation, 2 lightness.
export function setBand(a, id, which, value) {
  const bands = { ...((a && a.bands) || {}) };
  const t = [...(bands[id] || [0, 0, 0])];
  t[which] = value;
  bands[id] = t;
  return cleanAdjust({ ...(a || {}), bands });
}

export function clearBand(a, id) {
  const bands = { ...((a && a.bands) || {}) };
  delete bands[id];
  return cleanAdjust({ ...(a || {}), bands });
}

export const bandOf = (a, id) => (a && a.bands && a.bands[id]) || [0, 0, 0];

// A short text that changes whenever the adjustment does (for change checks).
export function adjustKey(a) {
  const c = cleanAdjust(a);
  if (!c) return '';
  const bands = c.bands ? BANDS.map((b) => (c.bands[b.id] ? `${b.id}:${c.bands[b.id].join(',')}` : '')).join(';') : '';
  const t = c.tilt;
  const tilt = t ? [t.amount, t.shape, t.x, t.y, t.size, t.feather, t.angle].join(',') : '';
  return [c.darken, c.contrast, c.hue, c.sat, c.light, bands, c.map ? c.map.join(',') : '', c.blur, tilt].join('|');
}

// ---------- the pixel pass ----------
const STEPS = 720; // the families' table, in half degrees

function bandTable(bands) {
  if (!bands) return null;
  const vals = BANDS.map((b) => bands[b.id] || null);
  if (!vals.some(Boolean)) return null;
  const th = new Float32Array(STEPS);
  const ts = new Float32Array(STEPS);
  const tl = new Float32Array(STEPS);
  const n = BANDS.length;
  for (let k = 0; k < STEPS; k += 1) {
    const deg = k / 2;
    // the two families this hue lies between
    let i = n - 1;
    for (let j = 0; j < n; j += 1) {
      if (BANDS[j].hue <= deg) i = j;
    }
    const j2 = (i + 1) % n;
    const from = BANDS[i].hue;
    const span = (BANDS[j2].hue - from + 360) % 360 || 360;
    let t = ((deg - from + 360) % 360) / span;
    t = t * t * (3 - 2 * t); // ease, so a family holds its own colour a little longer
    const a = vals[i];
    const b = vals[j2];
    th[k] = (a ? a[0] * TURN[i] : 0) * (1 - t) + (b ? b[0] * TURN[j2] : 0) * t;
    ts[k] = (a ? a[1] : 0) * (1 - t) + (b ? b[1] : 0) * t;
    tl[k] = (a ? a[2] : 0) * (1 - t) + (b ? b[2] : 0) * t;
  }
  return { th, ts, tl };
}

// Darken and contrast as one table per channel. Contrast is an S-curve around
// the picture's own average brightness (see applyContrast in backgrounds.js
// for why the average and not mid grey); below zero it flattens toward it.
function toneTable(c, mean) {
  if (!c.darken && !c.contrast) return null;
  const lut = new Uint8ClampedArray(256);
  const m = Math.min(0.7, Math.max(0.12, mean));
  const up = c.contrast > 0 ? 1 + c.contrast * 1.6 : 1;
  const flat = c.contrast < 0 ? 1 + c.contrast * 0.9 : 1;
  const keep = 1 - c.darken;
  for (let v = 0; v < 256; v += 1) {
    let x = v / 255;
    if (up !== 1) x = x < m ? m * Math.pow(x / m, up) : 1 - (1 - m) * Math.pow((1 - x) / (1 - m), up);
    if (flat !== 1) x = m + (x - m) * flat;
    lut[v] = Math.round(x * keep * 255);
  }
  return lut;
}

// Change the pixels of an ImageData's data in place.
export function adjustPixels(d, adjust) {
  const c = cleanAdjust(adjust);
  if (!c) return;
  tonePixels(d, c);
  if (c.map) mapPixels(d, c.map);
}

function tonePixels(d, c) {
  const tab = bandTable(c.bands);
  const colourWork = !!tab || c.hue !== 0 || c.sat !== 0 || c.light !== 0;

  let mean = 0.5;
  if (c.contrast) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 17) {
      if (d[i + 3] > 20) {
        sum += d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
        n += 1;
      }
    }
    if (n) mean = sum / n / 255;
  }
  const lut = toneTable(c, mean);
  if (!colourWork && !lut) return;

  if (!colourWork) {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = lut[d[i]];
      d[i + 1] = lut[d[i + 1]];
      d[i + 2] = lut[d[i + 2]];
    }
    return;
  }

  const turn = c.hue;
  const satMul = 1 + c.sat; // -1 = grey, +1 = twice as strong
  const light = c.light;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
    const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
    const ch = mx - mn;
    let l = (mx + mn) / 2;
    let h = 0;
    let s = 0;
    if (ch > 0.00001) {
      const den = 1 - Math.abs(2 * l - 1);
      s = den > 0.00001 ? ch / den : 0;
      if (s > 1) s = 1;
      if (mx === r) h = ((g - b) / ch) * 60;
      else if (mx === g) h = ((b - r) / ch + 2) * 60;
      else h = ((r - g) / ch + 4) * 60;
      if (h < 0) h += 360;
    }

    // one family at a time: greys and near-greys have no family, so they are
    // left alone (their hue is only noise)
    if (tab && ch > 0.03) {
      let gate = 1;
      if (ch < 0.18) {
        gate = (ch - 0.03) / 0.15;
        gate = gate * gate * (3 - 2 * gate);
      }
      let k = (h * 2) | 0;
      if (k >= STEPS) k = STEPS - 1;
      h += tab.th[k] * gate;
      s *= 1 + tab.ts[k] * gate;
      const v = tab.tl[k] * gate;
      l = v >= 0 ? l + (1 - l) * v * 0.7 : l * (1 + v * 0.8);
    }

    // the whole picture
    h += turn;
    s *= satMul;
    if (light > 0) l += (1 - l) * light * 0.9;
    else if (light < 0) l *= 1 + light * 0.9;

    if (s > 1) s = 1;
    else if (s < 0) s = 0;
    if (l > 1) l = 1;
    else if (l < 0) l = 0;
    h %= 360;
    if (h < 0) h += 360;

    const c2 = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c2 * (1 - Math.abs((hp % 2) - 1));
    const m = l - c2 / 2;
    let r2;
    let g2;
    let b2;
    if (hp < 1) {
      r2 = c2;
      g2 = x;
      b2 = 0;
    } else if (hp < 2) {
      r2 = x;
      g2 = c2;
      b2 = 0;
    } else if (hp < 3) {
      r2 = 0;
      g2 = c2;
      b2 = x;
    } else if (hp < 4) {
      r2 = 0;
      g2 = x;
      b2 = c2;
    } else if (hp < 5) {
      r2 = x;
      g2 = 0;
      b2 = c2;
    } else {
      r2 = c2;
      g2 = 0;
      b2 = x;
    }
    const ro = Math.round((r2 + m) * 255);
    const go = Math.round((g2 + m) * 255);
    const bo = Math.round((b2 + m) * 255);
    if (lut) {
      d[i] = lut[ro < 0 ? 0 : ro > 255 ? 255 : ro];
      d[i + 1] = lut[go < 0 ? 0 : go > 255 ? 255 : go];
      d[i + 2] = lut[bo < 0 ? 0 : bo > 255 ? 255 : bo];
    } else {
      d[i] = ro;
      d[i + 1] = go;
      d[i + 2] = bo;
    }
  }
}

// ---------- out of focus ----------
// Safari has no ctx.filter, so the blur is worked out on pixels: three box
// blurs in a row, which is as good as a true soft blur. A blurred picture has
// no fine detail, so it is worked out small and stretched back.
const BLUR_LONG = 1100; // never worked out larger than this
const BLUR_REACH = 0.03; // the strongest blur, as a share of the longer side

function boxSizes(sigma) {
  const ideal = Math.sqrt((12 * sigma * sigma) / 3 + 1);
  let lo = Math.floor(ideal);
  if (lo % 2 === 0) lo -= 1;
  const hi = lo + 2;
  const m = Math.round((12 * sigma * sigma - 3 * lo * lo - 12 * lo - 9) / (-4 * lo - 4));
  return [0, 1, 2].map((i) => Math.max(0, ((i < m ? lo : hi) - 1) / 2));
}

// One box blur along a line of n pixels (step: how far apart they are in the
// array). Past the ends the edge pixel repeats, so borders do not darken.
function boxLine(src, dst, start, n, step, r) {
  const span = r + r + 1;
  for (let ch = 0; ch < 4; ch += 1) {
    const first = src[start + ch];
    const last = src[start + (n - 1) * step + ch];
    let sum = first * r;
    for (let i = 0; i < r; i += 1) sum += src[start + Math.min(n - 1, i) * step + ch];
    for (let i = 0; i < n; i += 1) {
      const add = i + r < n ? src[start + (i + r) * step + ch] : last;
      sum += add;
      dst[start + i * step + ch] = sum / span;
      const drop = i - r >= 0 ? src[start + (i - r) * step + ch] : first;
      sum -= drop;
    }
  }
}

function blurPixels(d, w, h, sigma) {
  // colours are weighted by how solid they are, so see-through edges do not
  // pull in the colour hidden under them
  let a = new Float32Array(d.length);
  let b = new Float32Array(d.length);
  for (let i = 0; i < d.length; i += 4) {
    const al = d[i + 3] / 255;
    a[i] = d[i] * al;
    a[i + 1] = d[i + 1] * al;
    a[i + 2] = d[i + 2] * al;
    a[i + 3] = d[i + 3];
  }
  boxSizes(sigma).forEach((r) => {
    if (r < 1) return;
    for (let y = 0; y < h; y += 1) boxLine(a, b, y * w * 4, w, 4, r);
    for (let x = 0; x < w; x += 1) boxLine(b, a, x * 4, h, w * 4, r);
  });
  for (let i = 0; i < d.length; i += 4) {
    const al = a[i + 3];
    if (al > 0.5) {
      const k = 255 / al;
      d[i] = a[i] * k;
      d[i + 1] = a[i + 1] * k;
      d[i + 2] = a[i + 2] * k;
    }
    d[i + 3] = al;
  }
  b = null;
  a = null;
}

// A blurred copy of a canvas, the same size. share: the blur as a share of
// the longer side. Returns null when it would change nothing.
function blurredCopy(src, share) {
  const w = src.width;
  const h = src.height;
  const long = Math.max(w, h);
  const sigma = share * long;
  if (sigma < 0.35) return null;
  const k = Math.min(1, BLUR_LONG / long, sigma > 5 ? 5 / sigma : 1);
  const sw = Math.max(8, Math.round(w * k));
  const sh = Math.max(8, Math.round(h * k));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const g = small.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, sw, sh);
  let img;
  try {
    img = g.getImageData(0, 0, sw, sh);
  } catch (e) {
    return null;
  }
  blurPixels(img.data, sw, sh, Math.max(0.6, sigma * (sw / w)));
  g.putImageData(img, 0, 0);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, 0, 0, w, h);
  return out;
}

// Keep a layer only away from the sharp area: nothing up to `from` (pixels
// from the middle of the area), all of it from `to` on, eased between.
function fadeIn(layer, t, from, to) {
  const w = layer.width;
  const h = layer.height;
  const g = layer.getContext('2d');
  const px = t.x * w;
  const py = t.y * h;
  const reach = Math.hypot(w, h);
  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1].map((u) => ({ d: from + (to - from) * u, a: u * u * (3 - 2 * u) }));
  const paint = (a) => `rgba(0,0,0,${a.toFixed(3)})`;
  let grad;
  if (t.shape === 'circle') {
    grad = g.createRadialGradient(px, py, 0, px, py, reach);
    grad.addColorStop(0, paint(0));
    steps.forEach((s) => grad.addColorStop(Math.min(1, s.d / reach), paint(s.a)));
    grad.addColorStop(1, paint(1));
  } else {
    const rad = (t.angle * Math.PI) / 180;
    const nx = -Math.sin(rad);
    const ny = Math.cos(rad);
    grad = g.createLinearGradient(px - nx * reach, py - ny * reach, px + nx * reach, py + ny * reach);
    grad.addColorStop(0, paint(1));
    steps
      .slice()
      .reverse()
      .forEach((s) => grad.addColorStop(Math.max(0, 0.5 - s.d / (2 * reach)), paint(s.a)));
    steps.forEach((s) => grad.addColorStop(Math.min(1, 0.5 + s.d / (2 * reach)), paint(s.a)));
    grad.addColorStop(1, paint(1));
  }
  g.save();
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.restore();
}

// Blur and tilt shift, drawn into the canvas itself.
function soften(canvas, c) {
  const g = canvas.getContext('2d');
  if (c.blur > 0) {
    const all = blurredCopy(canvas, c.blur * BLUR_REACH);
    if (all) {
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(all, 0, 0);
    }
  }
  const t = c.tilt;
  if (!t) return;
  // two strengths, the lighter one nearer the sharp area, so the picture
  // slides out of focus instead of jumping
  const ref = t.shape === 'circle' ? Math.min(canvas.width, canvas.height) : canvas.height;
  const half = (t.size * ref) / 2;
  const fade = t.feather * ref;
  const near = blurredCopy(canvas, t.amount * BLUR_REACH * 0.45);
  const far = blurredCopy(canvas, t.amount * BLUR_REACH);
  if (near) {
    fadeIn(near, t, half, half + fade * 0.6);
    g.drawImage(near, 0, 0);
  }
  if (far) {
    fadeIn(far, t, half + fade * 0.35, half + fade);
    g.drawImage(far, 0, 0);
  }
}

// ---------- a picture with its adjustment applied ----------
// While a slider is being dragged the work is done on a small copy (quick),
// and once it rests the picture is done properly. The editor switches this.
const QUICK = 560; // longer side while dragging
const FULL = 2400; // longer side once it rests
let quick = false;
export const setAdjustQuick = (on) => {
  quick = !!on;
};

const done = new WeakMap(); // picture -> { key, full, canvas }

// The adjusted picture. It may be smaller than the original (same shape), so
// callers must draw it at the size they want, not at its own.
// Returns the picture itself when there is nothing to do or it cannot be read.
export function adjustedPicture(source, adjust) {
  if (!source) return source;
  const clean = cleanAdjust(adjust);
  const key = adjustKey(clean);
  if (!key) return source;
  const hit = done.get(source);
  if (hit && hit.key === key && (hit.full || quick)) return hit.canvas;
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  if (!sw || !sh) return source;
  const k = Math.min(1, (quick ? QUICK : FULL) / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k));
  c.height = Math.max(1, Math.round(sh * k));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(source, 0, 0, c.width, c.height);
  let img;
  try {
    img = g.getImageData(0, 0, c.width, c.height);
  } catch (e) {
    return source; // a picture from another site without permission cannot be read
  }
  // colours first, then focus, then the gradient map over the result
  const soft = clean.blur > 0 || !!clean.tilt;
  tonePixels(img.data, clean);
  if (!soft && clean.map) mapPixels(img.data, clean.map);
  g.putImageData(img, 0, 0);
  if (soft) {
    soften(c, clean);
    if (clean.map) {
      img = g.getImageData(0, 0, c.width, c.height);
      mapPixels(img.data, clean.map);
      g.putImageData(img, 0, 0);
    }
  }
  done.set(source, { key, full: !quick, canvas: c });
  return c;
}
