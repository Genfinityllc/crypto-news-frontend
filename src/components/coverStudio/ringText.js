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
//   only     show the text and not the shape itself
// A ring is never changed in place: every edit makes a new one.

export const RING_DEFAULT = {
  text: '',
  side: 'out',
  flip: false,
  start: 0,
  gap: 12,
  size: 44,
  spacing: 60,
  family: 'Inter',
  weight: 700,
  italic: false,
  color: '#ffffff',
  only: false,
};

export const hasRing = (ring) => !!ring && typeof ring.text === 'string' && ring.text.trim().length > 0;

export const ringFont = (ring) => `${ring.italic ? 'italic ' : ''}${ring.weight || 400} ${Math.max(4, ring.size || 44)}px "${ring.family || 'Inter'}", sans-serif`;

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
  // how far the line the letters stand on is from the outline (outward is +)
  let off;
  if (out) off = flip ? gap + tall : gap;
  else off = flip ? -gap : -(gap + tall);
  // the letters stand on the outline moved out (or in) by that much; moving a
  // rounded rectangle outward rounds its corners by the same amount
  const pw = w + off * 2;
  const ph = h + off * 2;
  if (pw < 2 || ph < 2) {
    ctx.restore();
    return;
  }
  const path = outline(pw, ph, Math.max(0, Math.min(r, w / 2, h / 2) + off));
  const chars = Array.from(String(ring.text));
  const space = ((Number(ring.spacing) || 0) / 1000) * size;
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const full = widths.reduce((sum, v) => sum + v, 0) + space * Math.max(0, chars.length - 1);
  const mid = (Math.max(0, Math.min(1, Number(ring.start) || 0)) + (flip ? 0.5 : 0)) * path.total;
  let x = 0;
  chars.forEach((ch, i) => {
    const centre = x + widths[i] / 2;
    x += widths[i] + space;
    if (!ch.trim()) return;
    const s = flip ? mid + full / 2 - centre : mid - full / 2 + centre;
    const p = path.at(s);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a + (flip ? Math.PI : 0));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}
