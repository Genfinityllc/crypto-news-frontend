// Simple line patterns for the studio: a layer of interest over a background
// or a panel.
//
// A pattern is a shape item (a StudioRect) with settings in studio.pattern:
//   { type, size, ratio, weight, plus, lines, gap, round, offX, offY }
//   type    'plus'  fine lines with a plus where they cross
//           'grid'  a plain grid of squares (or rectangles)
//           'tiles' rounded tiles with a thin ground between them
//   size    the side of one square, in cover pixels
//   ratio   -1..1: below zero the squares become tall rectangles, above zero
//           wide ones (up to four to one)
//   weight  thickness of the lines (plus, grid)
//   plus    length of one plus, tip to tip (plus)
//   lines   0..1 how strong the lines between the pluses are (plus)
//   gap     the ground between two tiles (tiles)
//   round   0..1 how round the tiles' corners are (tiles)
//   offX, offY  0..1 slide the pattern by a share of one square
// Its colour is the shape's own fill, and its strength the shape's opacity.
//
// One square is drawn once on a small sheet and repeated, so a cover full of
// tiny squares costs the same as one large one. Sizes are whole pixels, so
// the repeats meet without seams. Only paths and fills (no ctx.filter).

export const PATTERNS = [
  {
    id: 'plus',
    name: 'Plus grid',
    note: 'Fine lines with a plus where they cross',
    make: () => ({ type: 'plus', size: 150, ratio: 0, weight: 2, plus: 22, lines: 0.35, offX: 0, offY: 0 }),
    opacity: 0.22,
  },
  {
    id: 'grid',
    name: 'Squares',
    note: 'A plain grid. Any size, or rectangles either way',
    make: () => ({ type: 'grid', size: 40, ratio: 0, weight: 2, offX: 0, offY: 0 }),
    opacity: 0.14,
  },
  {
    id: 'tiles',
    name: 'Rounded tiles',
    note: 'Rounded squares side by side',
    make: () => ({ type: 'tiles', size: 72, ratio: 0, gap: 3, round: 0.4, offX: 0, offY: 0 }),
    opacity: 0.22,
  },
];

export const patternDef = (type) => PATTERNS.find((p) => p.id === type) || PATTERNS[0];

const whole = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const share = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

// The width and height of one square.
export function patternCell(pat) {
  const size = whole(pat.size, 6, 800);
  const r = share(pat.ratio, -1, 1);
  return {
    cw: Math.max(4, Math.round(size * (r > 0 ? 1 + r * 3 : 1))),
    ch: Math.max(4, Math.round(size * (r < 0 ? 1 - r * 3 : 1))),
  };
}

const keyOf = (pat, color) => [pat.type, pat.size, pat.ratio, pat.weight, pat.plus, pat.lines, pat.gap, pat.round, color].join('|');

function roundedRect(g, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.lineTo(x + w - k, y);
  g.arcTo(x + w, y, x + w, y + k, k);
  g.lineTo(x + w, y + h - k);
  g.arcTo(x + w, y + h, x + w - k, y + h, k);
  g.lineTo(x + k, y + h);
  g.arcTo(x, y + h, x, y + h - k, k);
  g.lineTo(x, y + k);
  g.arcTo(x, y, x + k, y, k);
  g.closePath();
}

// One square of the pattern. Lines run along its left and top edges, and
// whatever sits on a crossing is drawn at all four corners so it joins up
// with its neighbours.
function makeTile(pat, color) {
  const { cw, ch } = patternCell(pat);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = color;
  if (pat.type === 'tiles') {
    const gap = whole(pat.gap, 1, Math.floor(Math.min(cw, ch) / 2));
    const half = gap / 2;
    g.fillRect(0, 0, cw, ch);
    // the tile itself is cut out, leaving the ground around it
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000000';
    roundedRect(g, half, half, cw - gap, ch - gap, (share(pat.round, 0, 1) * Math.min(cw - gap, ch - gap)) / 2);
    g.fill();
    return c;
  }
  const t = whole(pat.weight, 1, 40);
  if (pat.type === 'plus') {
    const arm = Math.max(t, whole(pat.plus, 2, 400)) / 2;
    const soft = share(pat.lines, 0, 1);
    if (soft > 0) {
      g.globalAlpha = soft;
      g.fillRect(0, 0, t, ch);
      g.fillRect(0, 0, cw, t);
      g.globalAlpha = 1;
    }
    // a plus centred on each corner (the line's middle is t / 2 in)
    [0, cw].forEach((x) => {
      [0, ch].forEach((y) => {
        g.clearRect(x + t / 2 - arm, y, arm * 2, t);
        g.clearRect(x, y + t / 2 - arm, t, arm * 2);
        g.fillRect(x + t / 2 - arm, y, arm * 2, t);
        g.fillRect(x, y + t / 2 - arm, t, arm * 2);
      });
    });
    // the far edges belong to the next square: only the part of a plus that
    // reaches back into this one is kept (already inside the sheet)
    return c;
  }
  // grid
  g.fillRect(0, 0, t, ch);
  g.fillRect(0, 0, cw, t);
  return c;
}

const tiles = new WeakMap(); // item -> { key, canvas }

// Fill the box (w x h, centred on the origin) with the pattern. The caller
// clips to its shape. holder: the item, for keeping its square between draws.
export function paintPattern(ctx, holder, pat, color, w, h) {
  if (!pat || w <= 0 || h <= 0) return;
  const key = keyOf(pat, color);
  let hit = tiles.get(holder);
  if (!hit || hit.key !== key) {
    hit = { key, canvas: makeTile(pat, color) };
    tiles.set(holder, hit);
  }
  const { cw, ch } = patternCell(pat);
  const lineMid = pat.type === 'tiles' ? 0 : whole(pat.weight, 1, 40) / 2;
  // a crossing sits on the middle of the box, then slides by the offsets
  const ox = Math.round(share(pat.offX, 0, 1) * cw - lineMid);
  const oy = Math.round(share(pat.offY, 0, 1) * ch - lineMid);
  const fill = ctx.createPattern(hit.canvas, 'repeat');
  if (!fill) return;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.fillStyle = fill;
  ctx.fillRect(-w / 2 - ox, -h / 2 - oy, w, h);
  ctx.restore();
}

// A small picture of a pattern for the side panel.
export function drawPatternThumb(canvas, type) {
  const def = patternDef(type);
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#0d0d0d';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const pat = { ...def.make() };
  // shown smaller than life so a few squares fit
  const k = type === 'plus' ? 0.36 : 0.5;
  pat.size = Math.round(pat.size * k);
  if (pat.plus) pat.plus = Math.max(6, Math.round(pat.plus * 0.6));
  if (pat.weight) pat.weight = 1;
  if (pat.gap) pat.gap = 2;
  g.save();
  g.translate(canvas.width / 2, canvas.height / 2);
  g.globalAlpha = type === 'plus' ? 0.75 : 0.5;
  paintPattern(g, canvas, pat, '#ffffff', canvas.width, canvas.height);
  g.restore();
}
