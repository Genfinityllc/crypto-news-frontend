// Text that runs along the outline of a shape (a rectangle, a rounded
// rectangle, a pill, a circle), on its outside or its inside.
//
// It belongs to the shape: studio.ring on a shape item, drawn by the shape
// itself, so it moves, resizes, turns, copies, undoes and saves with it.
//   { text, side, flip, start, gap, size, spacing, family, weight, italic, color, only }
//   side     'out' | 'in'   outside or inside the outline
//   flip     false: the letters' tops point away from the shape's middle and
//            the words run clockwise (reads normally along the top).
//            true: tops point to the middle and the words run the other way
//            (reads normally along the bottom).
//   start    0..1 where the middle of the text sits, as a share of the way
//            round, clockwise from the middle of the top edge (from the
//            middle of the bottom edge when flipped, so 0 is always the
//            natural place to read it)
//   gap      distance between the outline and the letters, in cover pixels
//   size     letter size in cover pixels
//   spacing  letter spacing in thousandths of the size (as text items use)
//   leading  line spacing, as a share of the letter size
//   only     show the text and not the shape itself
// The text can have several lines (Enter): each is a ring of its own, one
// line's height farther from (or nearer to) the outline than the one before,
// in the order they are read.
//   marks    letters with a look of their own: { [place in the text]:
//            { size, family, weight, italic, color } }, any of them. A place
//            is the letter's index in `text` (as a text box counts it).
// A ring is never changed in place: every edit makes a new one.

export const RING_DEFAULT = {
  text: '',
  side: 'out',
  flip: false,
  start: 0,
  gap: 12,
  size: 44,
  spacing: 60,
  leading: 1.15,
  family: 'Inter',
  weight: 700,
  italic: false,
  color: '#ffffff',
  only: false,
};

export const hasRing = (ring) => !!ring && typeof ring.text === 'string' && ring.text.trim().length > 0;

export const ringFont = (ring) => `${ring.italic ? 'italic ' : ''}${ring.weight || 400} ${Math.max(4, ring.size || 44)}px "${ring.family || 'Inter'}", sans-serif`;

const LOOK = ['size', 'family', 'weight', 'italic', 'color'];

// The look of the letter at a place: the ring's own, with the letter's on top.
export function lookAt(ring, i) {
  const m = (ring.marks && ring.marks[i]) || null;
  const out = {};
  LOOK.forEach((k) => {
    out[k] = m && m[k] !== undefined ? m[k] : ring[k];
  });
  return out;
}

export const hasMarks = (ring) => !!ring && !!ring.marks && Object.keys(ring.marks).length > 0;

// The ring with a change made to it. range ([from, to) places in the text):
// only those letters take the change (and only a look can be changed that
// way). Without a range the whole ring changes; a new size then carries the
// letters with a size of their own along by the same factor.
export function styleRing(ring, patch, range) {
  if (!range) {
    const next = { ...ring, ...patch };
    if (patch.size && ring.size && hasMarks(ring) && patch.size !== ring.size) {
      const k = patch.size / ring.size;
      next.marks = {};
      Object.keys(ring.marks).forEach((i) => {
        next.marks[i] = { ...ring.marks[i] };
        if (next.marks[i].size) next.marks[i].size = Math.max(4, Math.round(next.marks[i].size * k * 10) / 10);
      });
    }
    return next;
  }
  const marks = { ...(ring.marks || {}) };
  const keys = LOOK.filter((k) => k in patch);
  const text = String(ring.text || '');
  for (let i = Math.max(0, range[0]); i < Math.min(text.length, range[1]); i += 1) {
    if (text[i] === '\n') continue;
    marks[i] = { ...(marks[i] || {}) };
    keys.forEach((k) => {
      marks[i][k] = patch[k];
    });
  }
  return { ...ring, marks };
}

// The ring with new words. Letters keep their own look where the words did
// not change; what is typed takes the look of the letter before it.
export function retextRing(ring, text) {
  const was = String(ring.text || '');
  const now = String(text == null ? '' : text);
  if (!hasMarks(ring) || was === now) return { ...ring, text: now };
  let head = 0;
  while (head < was.length && head < now.length && was[head] === now[head]) head += 1;
  let tail = 0;
  while (tail < was.length - head && tail < now.length - head && was[was.length - 1 - tail] === now[now.length - 1 - tail]) tail += 1;
  const shift = now.length - was.length;
  const marks = {};
  Object.keys(ring.marks).forEach((key) => {
    const i = Number(key);
    if (i < head) marks[i] = ring.marks[key];
    else if (i >= was.length - tail) marks[i + shift] = ring.marks[key];
  });
  // typed letters carry on in the look of the one before
  const before = head > 0 ? ring.marks[head - 1] : null;
  if (before) {
    for (let i = head; i < now.length - tail; i += 1) {
      if (now[i] !== '\n') marks[i] = before;
    }
  }
  const next = { ...ring, text: now };
  if (Object.keys(marks).length) next.marks = marks;
  else delete next.marks;
  return next;
}

// The ring made larger or smaller with its shape (letters and their distance
// from the outline; the spacing follows the letter size by itself).
export function scaleRing(ring, k) {
  if (!ring || !(k > 0) || k === 1) return ring;
  const fit = (v) => Math.round(v * k * 10) / 10;
  const next = { ...ring, size: Math.max(4, fit(ring.size || 44)), gap: fit(ring.gap || 0) };
  if (hasMarks(ring)) {
    next.marks = {};
    Object.keys(ring.marks).forEach((i) => {
      next.marks[i] = { ...ring.marks[i] };
      if (next.marks[i].size) next.marks[i].size = Math.max(4, fit(next.marks[i].size));
    });
  }
  return next;
}

// every font a ring uses, as [family, weight, italic]
export function ringFaces(ring) {
  if (!ring) return [];
  const seen = new Map();
  const add = (f) => seen.set(`${f.family}|${f.weight}|${f.italic ? 1 : 0}`, [f.family, f.weight, !!f.italic]);
  add(ring);
  Object.keys(ring.marks || {}).forEach((i) => add(lookAt(ring, Number(i))));
  return [...seen.values()];
}

// A rounded rectangle (w x h, corner radius r) centred on the origin, as a
// walk clockwise from the middle of its top edge.
function outline(w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  const q = (Math.PI * k) / 2;
  const hx = w / 2 - k;
  const hy = h / 2 - k;
  // each piece: its length, and where a distance d along it lies
  const line = (x0, y0, dx, dy, len) => ({ len, at: (d) => ({ x: x0 + dx * d, y: y0 + dy * d, a: Math.atan2(dy, dx) }) });
  const arc = (cx, cy, from) => ({
    len: q,
    at: (d) => {
      const t = from + (k > 0 ? d / k : 0);
      return { x: cx + Math.cos(t) * k, y: cy + Math.sin(t) * k, a: t + Math.PI / 2 };
    },
  });
  const parts = [
    line(0, -h / 2, 1, 0, hx),
    arc(hx, -hy, -Math.PI / 2),
    line(w / 2, -hy, 0, 1, hy * 2),
    arc(hx, hy, 0),
    line(hx, h / 2, -1, 0, hx * 2),
    arc(-hx, hy, Math.PI / 2),
    line(-w / 2, hy, 0, -1, hy * 2),
    arc(-hx, -hy, Math.PI),
    line(-hx, -h / 2, 1, 0, hx),
  ].filter((p) => p.len > 0.0001);
  const total = parts.reduce((sum, p) => sum + p.len, 0);
  return {
    total,
    at: (s) => {
      let d = ((s % total) + total) % total;
      for (let i = 0; i < parts.length; i += 1) {
        if (d <= parts[i].len) return parts[i].at(d);
        d -= parts[i].len;
      }
      return parts[parts.length - 1].at(parts[parts.length - 1].len);
    },
  };
}

// Draw the ring of a shape w x h with corner radius r, centred on the origin.
export function paintRing(ctx, ring, w, h, r) {
  if (!hasRing(ring) || w <= 0 || h <= 0) return;
  const size = Math.max(4, Number(ring.size) || 44);
  ctx.save();
  ctx.font = ringFont(ring);
  ctx.fillStyle = ring.color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText('H');
  const tall = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : size * 0.72; // height of a capital
  const gap = Number(ring.gap) || 0;
  const out = ring.side !== 'in';
  const flip = !!ring.flip;
  const lines = String(ring.text).replace(/\r/g, '').split('\n');
  const n = lines.length;
  const step = size * Math.max(0.6, Math.min(3, Number(ring.leading) || 1.15));
  const corner = Math.min(r, w / 2, h / 2);
  const marked = hasMarks(ring);
  // where each line begins in the whole text
  const lineStart = [];
  lines.reduce((sum, line) => {
    lineStart.push(sum);
    return sum + line.length + 1;
  }, 0);
  lines.forEach((text, i) => {
    if (!text.trim()) return;
    // How far the line the letters stand on is from the outline (outward is
    // +). The lines are stacked the way they are read: where the text reads
    // normally, the first line is the upper one on the cover.
    let off;
    if (out) off = flip ? gap + tall + i * step : gap + (n - 1 - i) * step;
    else off = flip ? -(gap + (n - 1 - i) * step) : -(gap + tall + i * step);
    // the letters stand on the outline moved out (or in) by that much; moving a
    // rounded rectangle outward rounds its corners by the same amount
    const pw = w + off * 2;
    const ph = h + off * 2;
    if (pw < 2 || ph < 2) return;
    const path = outline(pw, ph, Math.max(0, corner + off));
    // each letter with its own look (and its place in the whole text)
    const chars = [];
    let at = lineStart[i];
    Array.from(text).forEach((ch) => {
      const look = marked ? lookAt(ring, at) : null;
      const letter = { ch, look, size: look ? Math.max(4, Number(look.size) || size) : size };
      if (look) ctx.font = ringFont(look);
      letter.w = ctx.measureText(ch).width;
      chars.push(letter);
      at += ch.length;
    });
    const gapAfter = (L) => ((Number(ring.spacing) || 0) / 1000) * L.size;
    const full = chars.reduce((sum, L, k) => sum + L.w + (k < chars.length - 1 ? gapAfter(L) : 0), 0);
    const mid = (Math.max(0, Math.min(1, Number(ring.start) || 0)) + (flip ? 0.5 : 0)) * path.total;
    let x = 0;
    chars.forEach((L) => {
      const centre = x + L.w / 2;
      x += L.w + gapAfter(L);
      if (!L.ch.trim()) return;
      const s = flip ? mid + full / 2 - centre : mid - full / 2 + centre;
      const p = path.at(s);
      ctx.save();
      if (L.look) {
        ctx.font = ringFont(L.look);
        ctx.fillStyle = L.look.color || ring.color || '#ffffff';
      }
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a + (flip ? Math.PI : 0));
      ctx.fillText(L.ch, 0, 0);
      ctx.restore();
    });
    if (marked) {
      ctx.font = ringFont(ring);
      ctx.fillStyle = ring.color || '#ffffff';
    }
  });
  ctx.restore();
}
