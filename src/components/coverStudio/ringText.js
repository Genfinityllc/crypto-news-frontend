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
//   fit      'auto' (the usual): a line that fills most of its ring is spread
//            evenly all the way round, so the ring closes with no gap, and a
//            long line is shared evenly between its rings. 'centre': every
//            line keeps its typed spacing and sits centred on its place.
//   only     show the text and not the shape itself
// The text can have several lines (Enter): each is a ring of its own, one
// line's height farther from (or nearer to) the outline than the one before,
// in the order they are read. A line too long to go once round carries on
// along the next ring, word by word, so it never runs over its own beginning.
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
  fit: 'auto',
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

// A line that fills at least this share of its ring is spread all the way round.
const CLOSE_FROM = 0.6;
// A typed line up to this many times too long for its ring is made smaller to fit it.
const OVER = 1.45;

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
  const step = size * Math.max(0.6, Math.min(3, Number(ring.leading) || 1.15));
  const corner = Math.min(r, w / 2, h / 2);
  const marked = hasMarks(ring);
  const gapAfter = (L) => ((Number(ring.spacing) || 0) / 1000) * L.size;

  // every typed line as letters, each with its own look and width
  let at = 0;
  const typed = lines.map((text) => {
    const letters = [];
    Array.from(text).forEach((ch) => {
      const look = marked ? lookAt(ring, at) : null;
      const L = { ch, look, size: look ? Math.max(4, Number(look.size) || size) : size };
      if (look) ctx.font = ringFont(look);
      L.w = ctx.measureText(ch).width;
      letters.push(L);
      at += ch.length;
    });
    at += 1; // the line break
    return letters;
  });
  if (marked) ctx.font = ringFont(ring);
  const spaceW = ctx.measureText(' ').width;
  const widthOf = (letters) => letters.reduce((sum, L, k) => sum + L.w + (k < letters.length - 1 ? gapAfter(L) : 0), 0);

  // The path ring number i of n stands on. Its distance from the outline
  // (outward is +) stacks the rings the way they are read: where the text
  // reads normally, the first one is the upper one on the cover. The letters
  // stand on the outline moved out (or in) by that much; moving a rounded
  // rectangle outward rounds its corners by the same amount.
  const pathOf = (i, n) => {
    let off;
    if (out) off = flip ? gap + tall + i * step : gap + (n - 1 - i) * step;
    else off = flip ? -(gap + (n - 1 - i) * step) : -(gap + tall + i * step);
    const pw = w + off * 2;
    const ph = h + off * 2;
    if (pw < 2 || ph < 2) return null;
    return outline(pw, ph, Math.max(0, corner + off));
  };
  const auto = ring.fit !== 'centre';
  // How much text fits once round. Typed spacing leaves a little air where the
  // end meets the start; a ring that will be closed (see below) is filled right up.
  const roomOf = (path) => (path ? Math.max(size, auto ? path.total : path.total - size * 0.45) : Infinity);

  // Words that do not fit once round carry on along the next ring (owner
  // 2026-11-19: a long line used to run over its own beginning). A typed
  // line break always starts a new ring.
  // share: how full a ring may get (1 = all of it), one for every typed line
  // or one for all. The result also says how many rings each typed line took.
  const wrap = (n, share = 1) => {
    const rings = [];
    const counts = [];
    typed.forEach((letters, j) => {
      const fill = Array.isArray(share) ? share[j] : share;
      const before = rings.length;
      // A typed line that is only somewhat too long for its ring stays on that
      // one ring: closing the ring draws its letters that much smaller (the
      // same words on an inner, shorter ring come out a little smaller
      // instead of splitting in two). Only a much longer line is shared out.
      if (auto) {
        let end = letters.length;
        while (end > 0 && !letters[end - 1].ch.trim()) end -= 1;
        const whole = letters.slice(0, end);
        const here = pathOf(rings.length, n);
        if (whole.length && here && widthOf(whole) <= here.total * OVER) {
          rings.push(whole);
          counts.push(1);
          return;
        }
      }
      // words, with the spaces before each
      const words = [];
      let cur = null;
      letters.forEach((L) => {
        const blank = !L.ch.trim();
        if (!cur || (blank && cur.word.length)) {
          cur = { space: [], word: [] };
          words.push(cur);
        }
        if (blank) cur.space.push(L);
        else cur.word.push(L);
      });
      let line = [];
      words.forEach((wd) => {
        if (!wd.word.length) return; // spaces at the end of a line
        const room = roomOf(pathOf(rings.length, n)) * fill;
        const joined = line.concat(wd.space, wd.word);
        if (line.length && widthOf(joined) > room) {
          rings.push(line);
          line = wd.word.slice();
        } else line = line.length ? joined : wd.word.slice();
      });
      rings.push(line);
      counts.push(rings.length - before);
    });
    rings.counts = counts;
    return rings;
  };
  // How many rings there are decides how large each one is, and that decides
  // how many are needed. So: the smallest number of rings that holds it all.
  let n = typed.length;
  let rings = wrap(n);
  for (let tries = 0; tries < 80 && rings.length > n; tries += 1) {
    n += 1;
    rings = wrap(n);
  }
  // One ring more can make the outer rings large enough to take everything
  // and leave the last one empty. If the text nearly fits without that extra
  // ring, it is drawn a touch tighter instead; otherwise each ring is filled a
  // little less, so all of them are used.
  const snug = (list) => Math.min(...list.map((letters, i) => (letters.length ? roomOf(pathOf(i, list.length)) / Math.max(1, widthOf(letters)) : 1)));
  if (rings.length < n && snug(rings) < 0.88) {
    let lo = 0.3;
    let hi = 1;
    let best = null;
    for (let k = 0; k < 12; k += 1) {
      const mid = (lo + hi) / 2;
      const trial = wrap(n, mid);
      if (trial.length < n) hi = mid;
      else {
        if (trial.length === n) best = trial;
        lo = mid;
      }
    }
    if (best) rings = best;
  }
  n = rings.length;

  // No odd gaps (owner 2026-11-19). First share the words evenly: a typed
  // line that needs several rings fills each as little as still fits it into
  // that many, so there is no full ring followed by a short leftover.
  if (auto && rings.length > typed.length) {
    const counts = rings.counts;
    const shares = typed.map(() => 1);
    typed.forEach((unused, j) => {
      if (counts[j] < 2) return; // it has a ring to itself
      let lo = 0.3; // too little room: it would need another ring
      let hi = 1; // enough room
      for (let k = 0; k < 10; k += 1) {
        const mid = (lo + hi) / 2;
        shares[j] = mid;
        const trial = wrap(n, shares);
        if (trial.length === n && trial.counts[j] === counts[j]) hi = mid;
        else lo = mid;
      }
      shares[j] = hi;
    });
    const even = wrap(n, shares);
    if (even.length === n) rings = even;
  }

  // rings that share one typed line always close: it is running text
  const shared = [];
  (rings.counts || []).forEach((count) => {
    for (let k = 0; k < count; k += 1) shared.push(count > 1);
  });

  rings.forEach((letters, i) => {
    if (!letters.length) return;
    const path = pathOf(i, n);
    if (!path) return;
    const full = widthOf(letters);
    const mid = (Math.max(0, Math.min(1, Number(ring.start) || 0)) + (flip ? 0.5 : 0)) * path.total;
    // Then close the ring: a line that fills most of it (or shares its typed
    // line with other rings) is spread evenly all the way round, the gap
    // between its last and first letter the same as between any two. A
    // shorter line stays as typed, centred on its place.
    const closed = auto && letters.length > 1 && (shared[i] || full / path.total >= CLOSE_FROM);
    // with the way back to its first letter: a word space, since the last
    // word and the first are two words
    const whole = full + gapAfter(letters[letters.length - 1]) + (closed ? spaceW + (size * (Number(ring.spacing) || 0)) / 1000 : 0);
    // closing: more air between the letters when it is short of the ring,
    // smaller letters when it is too long for it
    const extra = closed && whole < path.total ? (path.total - whole) / letters.length : 0;
    const shrink = closed && whole > path.total ? path.total / whole : 1;
    const span = closed ? path.total : full;
    // a line left as typed that is still too long (one very long word) is drawn tighter
    const tight = closed ? shrink : Math.min(1, roomOf(path) / Math.max(1, full));
    let x = 0;
    letters.forEach((L) => {
      const centre = (x + L.w / 2) * tight;
      x += L.w + gapAfter(L) + extra;
      if (!L.ch.trim()) return;
      const s = flip ? mid + (closed ? span : span * tight) / 2 - centre : mid - (closed ? span : span * tight) / 2 + centre;
      const p = path.at(s);
      ctx.save();
      if (L.look) {
        ctx.font = ringFont(L.look);
        ctx.fillStyle = L.look.color || ring.color || '#ffffff';
      }
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a + (flip ? Math.PI : 0));
      if (shrink < 1) ctx.scale(shrink, shrink);
      ctx.fillText(L.ch, 0, 0);
      ctx.restore();
    });
  });
  ctx.restore();
}
