// Library logos must be fully solid (owner 2026-11-25: "the Solana logo has
// some transparancy to it. I want the logos to be 100% solid with no
// transparency"). A few logo files are see-through INSIDE their shapes: the
// Solana wordmark's mark was only about 80% there, so whatever lay behind it
// showed through.
//
// solidAlpha() takes that out and leaves everything else alone:
//   - "inside" means every pixel around a pixel (4 px each way) is at least a
//     quarter there. Smooth edges and thin lines are never inside, so a logo
//     that is already solid, or made of fine lines, comes back untouched.
//   - a logo is changed only if a real share of its inside is see-through.
//   - then every inside pixel becomes fully solid, and the pixels of the edge
//     beside it are raised by the same share, so the edge stays as smooth as
//     it was. Colours are not touched.
//
// It works on plain pixel data (RGBA, straight alpha), so it has no need of a
// page. Returns true when the data was changed.

const DEEP = 4; // how far in a pixel must be to count as inside
const LOW = 64; // "at least a quarter there"
const NEAR = 6; // how far from the inside an edge pixel is still raised
const SOLID = 250; // this much or more is solid already
const SHARE = 0.01; // a logo is changed when this share of its inside is see-through

// the smallest (or largest) value within r pixels, along rows then columns
function spread(src, w, h, r, pickMin) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  // past the picture's edge: nothing to find for the largest, no limit for the
  // smallest (a logo trimmed to its own outline is still inside at its rim)
  const edge = pickMin ? 255 : 0;
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      let v = src[row + x];
      for (let k = 1; k <= r; k += 1) {
        const a = x - k >= 0 ? src[row + x - k] : edge;
        const b = x + k < w ? src[row + x + k] : edge;
        if (pickMin) {
          if (a < v) v = a;
          if (b < v) v = b;
        } else {
          if (a > v) v = a;
          if (b > v) v = b;
        }
      }
      tmp[row + x] = v;
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let v = tmp[y * w + x];
      for (let k = 1; k <= r; k += 1) {
        const a = y - k >= 0 ? tmp[(y - k) * w + x] : edge;
        const b = y + k < h ? tmp[(y + k) * w + x] : edge;
        if (pickMin) {
          if (a < v) v = a;
          if (b < v) v = b;
        } else {
          if (a > v) v = a;
          if (b > v) v = b;
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

export function solidAlpha(data, w, h) {
  const n = w * h;
  if (!(n > 0)) return false;
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) alpha[i] = data[i * 4 + 3];
  const least = spread(alpha, w, h, DEEP, true);
  // how much of the inside is see-through
  let inside = 0;
  let thin = 0;
  for (let i = 0; i < n; i += 1) {
    if (least[i] >= LOW) {
      inside += 1;
      if (alpha[i] < SOLID) thin += 1;
    }
  }
  if (!inside || thin < inside * SHARE) return false;
  // the level of the inside near each pixel (0 where there is none near)
  const body = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) body[i] = least[i] >= LOW ? alpha[i] : 0;
  const level = spread(body, w, h, NEAR, false);
  for (let i = 0; i < n; i += 1) {
    const a = alpha[i];
    if (!a || a >= 255) continue;
    if (least[i] >= LOW) data[i * 4 + 3] = 255;
    else if (level[i] > 0 && level[i] < 255) data[i * 4 + 3] = Math.min(255, Math.round((a * 255) / level[i]));
  }
  return true;
}

// The same for a canvas. Returns a NEW canvas when something was changed and
// the given one when nothing was (history, drafts and the saved-picture cache
// all hold on to a picture's canvas, so it is never changed in place).
export function solidCanvas(canvas) {
  try {
    const w = canvas.width;
    const h = canvas.height;
    const img = canvas.getContext('2d').getImageData(0, 0, w, h);
    if (!solidAlpha(img.data, w, h)) return canvas;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d').putImageData(img, 0, 0);
    return out;
  } catch (e) {
    return canvas; // a picture the page may not read: left as it is
  }
}
