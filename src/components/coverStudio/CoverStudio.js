import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { Canvas, FabricImage, Textbox, Shadow, Rect, ActiveSelection, util } from 'fabric';
import {
  COVER_W,
  COVER_H,
  PALETTES,
  DEFAULT_PALETTE,
  TEMPLATES,
  renderBackground,
  drawGrain,
  grainField,
  grainOpacity,
  extractLogoColors,
  isLight,
} from './backgrounds';
import './studioFonts';
import { buildFamilies, deleteFontFiles, loadStoredFontFiles, readFontMeta, registerFont, storeFontFile } from './userFonts';
import watermarkUrl from './genfinity-watermark.png';
import wordmarkUrl from './genfinity-wordmark-white.png';
import {
  INTERVIEW_W,
  INTERVIEW_H,
  PHOTO_BASE,
  DEFAULT_PHOTO,
  INTERVIEW_LAYOUTS,
  paintPhoto,
  preparePhoto,
  placeholderLogo,
  hostMicBadge,
  HOSTS,
  INTERVIEW_ELEMENTS,
  drawElementThumb,
  removePlainBackground,
  drawLayoutThumb,
} from './interviewKit';
import { cutOutPerson } from './photoCutout';

// ---------------------------------------------------------------------------
// Design Studio: compose a cover by hand.
// Background (flat template, AI backdrop, or image) + any number of logos +
// text, all draggable and scalable, exported at exactly 1800x900.
// The canvas the user edits IS the export surface, so what you see is what
// you download.
// ---------------------------------------------------------------------------

const SAFE = 90; // safe margin used for snapping and align buttons

const FONTS = [
  { family: 'Inter', weights: [400, 500, 600, 700, 800], kind: 'Sans' },
  { family: 'Manrope', weights: [400, 600, 800], kind: 'Sans' },
  { family: 'Libre Franklin', weights: [400, 600, 800], kind: 'Sans' },
  { family: 'IBM Plex Sans', weights: [400, 500, 600, 700], kind: 'Sans' },
  { family: 'Space Grotesk', weights: [400, 500, 700], kind: 'Sans' },
  { family: 'Archivo', weights: [400, 600, 800], kind: 'Sans' },
  { family: 'Geist Sans', label: 'Geist', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], kind: 'Sans' },
  { family: 'Plus Jakarta Sans', weights: [200, 300, 400, 500, 600, 700, 800], kind: 'Sans', italic: true },
  { family: 'DM Sans', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], kind: 'Sans', italic: true },
  { family: 'Montserrat', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], kind: 'Sans', italic: true },
  { family: 'CMG Sans', weights: [100, 400, 700], kind: 'Sans', italic: true },
  { family: 'Barlow Condensed', weights: [500, 600, 700], kind: 'Condensed' },
  { family: 'Bebas Neue', weights: [400], kind: 'Condensed' },
  // italicFirst: choosing this font from the list starts it in italic (owner 2026-11-18)
  { family: 'Instrument Serif', weights: [400], kind: 'Serif', italic: true, italicFirst: true },
  { family: 'CMG Sans Wide', weights: [800], kind: 'Display' },
  { family: 'CMG Sans Wide Outline', weights: [800], kind: 'Display' },
  { family: 'CMG Sans Outline', weights: [700], kind: 'Display' },
  { family: 'IBM Plex Mono', weights: [400, 500, 600], kind: 'Mono' },
  { family: 'Geist Mono', weights: [400, 500, 700], kind: 'Mono' },
];
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

// A font can come from the built-in list or from files the person added.
const findFont = (family, extra) => FONTS.find((f) => f.family === family) || (extra || []).find((f) => f.family === family) || FONTS[0];
const hasItalic = (def, weight) => (def.italicWeights ? def.italicWeights.includes(Number(weight)) : !!def.italic);
const weightLabel = (def, w) => (def.names && def.names[w]) || WEIGHT_NAMES[w] || w;

// Canvas text is measured the moment it is drawn, so the font file must be in
// memory first or the text box wraps with fallback metrics.
async function ensureFont(family, weight, italic = false) {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.race([
      document.fonts.load(`${italic ? 'italic ' : ''}${weight} 64px "${family}"`),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) {
    /* fall back to whatever is available */
  }
}

// Local files are read as data: URLs. The live site's Content-Security-Policy
// allows data: images but not blob: images.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}

// data: URL to Blob without fetch() (the CSP forbids fetching data: URLs).
function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function loadImage(url, cors = true) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });
}

// Separate cache entry from any plain <img> of the same URL, so the browser
// never reuses a response that was fetched without CORS for the canvas.
const corsUrl = (url) => (/^(data|blob):/.test(url) ? url : `${url}${url.includes('?') ? '&' : '?'}studio=1`);

// Downscale huge logo files and trim their transparent margins, so the
// selection box hugs the visible mark and centring/snapping is true.
function prepareLogo(img) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.min(1, 1400 / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * s));
  const h = Math.max(1, Math.round(ih * s));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  let data;
  try {
    data = g.getImageData(0, 0, w, h).data;
  } catch (e) {
    return c; // tainted (should not happen with CORS); use untrimmed
  }
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return c;
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  if (tw === w && th === h) return c;
  const t = document.createElement('canvas');
  t.width = tw;
  t.height = th;
  t.getContext('2d').drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
  return t;
}

// ---------- SVG files stay vectors ----------
// A picture on the cover is drawn from a canvas (`studio.source`), so an SVG
// has to be turned into pixels at some size. To keep it sharp at any size the
// file itself is kept (`studio.vector`) and drawn again, larger, whenever the
// item is scaled up past the pixels it has (see sharpenVectors).

// Where the visible part of a canvas is (same threshold as prepareLogo's trim).
function alphaBox(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  let data;
  try {
    data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  } catch (e) {
    return null;
  }
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Read an SVG file's text. Returns { inner, fw, fh }: the drawing as markup
// that fills a box of fw by fh, or null when the text is not a readable SVG
// (the file is then handled like any other image).
function readSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  const size = (v) => {
    const t = String(v == null ? '' : v).trim();
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0 && !/%$/.test(t) ? n : 0;
  };
  const vb = String(root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const hasBox = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  let fw = size(root.getAttribute('width'));
  let fh = size(root.getAttribute('height'));
  if (!hasBox) {
    // no size given: browsers draw such a file in a 300 by 150 box
    fw = fw || 300;
    fh = fh || 150;
    root.setAttribute('viewBox', `0 0 ${fw} ${fh}`); // so the drawing scales with its box
  } else if (!fw || !fh) {
    if (fw) fh = (fw * vb[3]) / vb[2];
    else if (fh) fw = (fh * vb[2]) / vb[3];
    else {
      fw = vb[2];
      fh = vb[3];
    }
  }
  root.setAttribute('x', '0');
  root.setAttribute('y', '0');
  root.setAttribute('width', String(fw));
  root.setAttribute('height', String(fh));
  return { inner: new XMLSerializer().serializeToString(root), fw, fh };
}

// Draw part of a vector (crop: fractions of the whole drawing) so that its
// longer side is `longSide` pixels. The file is wrapped in an outer SVG whose
// view is the wanted part, so the browser draws it fresh at that size.
async function rasterVector(vec, crop, longSide) {
  const cw = crop.w * vec.fw;
  const ch = crop.h * vec.fh;
  const k = longSide / Math.max(cw, ch);
  const w = Math.max(1, Math.round(cw * k));
  const h = Math.max(1, Math.round(ch * k));
  const view = [crop.x * vec.fw, crop.y * vec.fh, cw, ch].map((n) => Number(n.toFixed(5))).join(' ');
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${view}" preserveAspectRatio="none">${vec.inner}</svg>`;
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`, false);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

const VECTOR_START = 1400; // pixels on the longer side when a vector first comes in
const VECTOR_MAX = 4096; // and the most it is ever drawn at

// A logo or image file as something to draw from: { img, vector }. For an SVG,
// img is its visible part already drawn (margins trimmed) and vector is what
// sharpenVectors needs to draw it again; for anything else vector is null.
async function loadLogoFile(file) {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '')) {
    try {
      const vec = readSvg(await file.text());
      if (vec) {
        const whole = { x: 0, y: 0, w: 1, h: 1 };
        const full = await rasterVector(vec, whole, VECTOR_START);
        const box = alphaBox(full);
        const crop = box ? { x: box.x / full.width, y: box.y / full.height, w: box.w / full.width, h: box.h / full.height } : whole;
        const img = box ? await rasterVector(vec, crop, VECTOR_START) : full;
        return { img, vector: { ...vec, crop } };
      }
    } catch (e) {
      // fall through: treat it like any other image
    }
  }
  const img = await loadImage(await readFileAsDataUrl(file), false);
  return { img, vector: null };
}

// Recolour a logo to one solid colour while keeping its exact shape.
function tintedCanvas(source, mode, color) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const g = c.getContext('2d');
  g.drawImage(source, 0, 0);
  if (mode !== 'original') {
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = mode === 'white' ? '#ffffff' : mode === 'black' ? '#000000' : color || '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

// Seals are full-colour discs, so recolouring one flat would give a blank
// circle. This keeps the artwork: light areas become solid, dark areas become
// see-through, which reads as a one-colour emblem that can then be tinted.
function monoEmblem(source) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const g = c.getContext('2d');
  g.drawImage(source, 0, 0);
  let img;
  try {
    img = g.getImageData(0, 0, c.width, c.height);
  } catch (e) {
    return source;
  }
  const d = img.data;
  // stretch between the seal's own dark and light tones so every seal has contrast
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 40) {
      hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
      n++;
    }
  }
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= n * 0.08) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= n * 0.08) {
      hi = v;
      break;
    }
  }
  if (hi - lo < 40) {
    lo = 0;
    hi = 255;
  }
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let t = Math.min(1, Math.max(0, (lum - lo) / (hi - lo)));
    t = t * t * (3 - 2 * t);
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = Math.round(d[i + 3] * t);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// The picture an item should show for its current colour setting.
const paintItem = (st) => tintedCanvas(st.tint === 'original' ? st.source : st.mono || st.source, st.tint, st.tintColor);

// Redraw a guest frame after any of its settings change.
function repaintPhoto(o) {
  const el = paintPhoto(o.studio);
  o.setElement(el);
  o.set({ width: el.width, height: el.height, dirty: true });
  o.setCoords();
}

const softShadow = () => new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 34, offsetX: 0, offsetY: 14 });

const normHex = (v, fallback = '#ffffff') => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? v : fallback);

const DEFAULT_BG = {
  kind: 'template',
  templateId: 'fields',
  paletteId: DEFAULT_PALETTE.id,
  palette: { base: DEFAULT_PALETTE.base, a1: DEFAULT_PALETTE.a1, a2: DEFAULT_PALETTE.a2 },
  intensity: 1,
  seed: 1,
  flip: false,
  grain: 0.4,
  grainCoarse: false,
  grainOnTop: false,
  vignette: 0.25,
  centerVignette: 0,
  contrast: 0,
  dim: 0,
  zoom: 1,
  shiftX: 0,
  shiftY: 0,
  image: null,
  imageLabel: '',
};

// ----- small template thumbnail (re-renders with the current palette) -----
function TemplateThumb({ templateId, palette, seed, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    renderBackground(
      ref.current,
      { kind: 'template', templateId, palette, intensity: 1, seed, grain: 0.25, vignette: 0.15 },
      wide ? { designW: INTERVIEW_W, designH: INTERVIEW_H } : {}
    );
  }, [templateId, palette, seed, wide]);
  return <canvas ref={ref} width={240} height={wide ? 135 : 120} />;
}

// ----- schematic of a ready-made piece for its tile -----
function ElementThumb({ id, palette }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) drawElementThumb(ref.current, id, palette);
  }, [id, palette]);
  return <canvas ref={ref} width={240} height={150} />;
}

// ----- schematic of an interview layout for its picker tile -----
function LayoutThumb({ layout, palette }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) drawLayoutThumb(ref.current, layout, palette);
  }, [layout, palette]);
  return <canvas ref={ref} width={320} height={180} />;
}

// Text can carry a filled box behind it (a pill, a highlight bar). fabric only
// draws a tight background, so the box is painted here with its own padding
// and corner radius. The override lives on the one object; caching is off for
// it because the box extends past the text's own bounds.
function applyTextBox(o) {
  const box = o.studio && o.studio.box;
  if (!box || !box.on) {
    if (o.__boxed) {
      delete o._renderBackground;
      o.__boxed = false;
      o.objectCaching = true;
      o.dirty = true;
    }
    return;
  }
  o.__boxed = true;
  o.objectCaching = false;
  o._renderBackground = function renderBox(ctx) {
    const b = this.studio && this.studio.box;
    const n = this._textLines ? this._textLines.length : 0;
    if (!b || !b.on || !n) return;
    let minOff = Infinity;
    let maxRight = -Infinity;
    for (let i = 0; i < n; i += 1) {
      const off = this._getLineLeftOffset(i);
      minOff = Math.min(minOff, off);
      maxRight = Math.max(maxRight, off + this.getLineWidth(i));
    }
    const x = -this.width / 2 + minOff - b.padX;
    const y = -this.height / 2 - b.padY;
    const w = maxRight - minOff + b.padX * 2;
    const h = this.height + b.padY * 2;
    const r = Math.max(0, Math.min(b.radius || 0, h / 2, w / 2));
    ctx.save();
    ctx.fillStyle = b.color || '#000000';
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
}

// A copy of an item's settings for undo (nested bits copied too).
// The interview studio's "Most used" logos, in the owner's order: Hedera,
// HashPack, Solana, XDC, Canton. Where the library has both a full wordmark
// and a mark, the wordmark comes first. Symbols are the logo library's own.
const MOST_USED_LOGOS = ['HEDERA_FULL', 'HBAR', 'HASHPACK', 'HASHPACKMARK', 'SOLANA_FULL', 'SOL', 'XDC', 'CANTON', 'CANTONSIMPLE'];

// Size of a guest's name, title and a logo's caption as a share of the photo's
// (or logo's) width. These are the sizes the starting layouts show.
const ATTACH_REL = { name: 0.105, title: 0.06, caption: 0.046, hostlabel: 0.225, hostmic: 0.356 };
// The two lines under a "Hosted by" photo: larger than a guest's, allowed to
// run a little wider than the round photo, and set a little lower.
// Letter spacing a main title starts with (owner 2026-11-18); the person can
// change it with the Letter spacing slider.
const HEADLINE_SPACING = -55;
const HOST_LINE = { name: { rel: 0.16, rel0: 0.16, wide: 1.4, dy: 0.08 }, title: { rel: 0.09, rel0: 0.09, wide: 1.4, dy: 0.08 } };

const snapStudio = (st) => (st ? { ...st, attach: st.attach ? { ...st.attach } : undefined, box: st.box ? { ...st.box } : undefined } : null);
const photoSig = (st) => [st.shape, st.sides, st.rounding, st.aspect, st.maskAngle, st.zoom, st.panX, st.panY, st.treatment, st.tintColor, st.backdrop, st.ring, st.ringColor].join('|');

export default function CoverStudio({
  apiBase,
  networks = [],
  companies = [],
  styles = [],
  seals = [],
  currentUser,
  incoming,
  active = true,
  onSaved,
  profile = 'cover', // 'cover' = article covers (1800x900), 'interview' = interview covers (1920x1080)
}) {
  const isInterview = profile === 'interview';
  const W = isInterview ? INTERVIEW_W : COVER_W;
  const H = isInterview ? INTERVIEW_H : COVER_H;
  const design = useMemo(() => ({ designW: W, designH: H }), [W, H]);
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const fabricRef = useRef(null);
  // What you see while editing is three stacked layers, so the grain is never
  // resized (resized grain ripples):
  //   1. bgCanvasRef   the background, 1800x900, scaled by CSS (no grain in it)
  //   2. grainViewRef  the grain, drawn at the screen's own pixels
  //   3. the fabric canvas (transparent) with logos, text and the watermark
  // The downloaded file is composed separately at 1800x900 with its grain
  // drawn at the cover's own pixels (exportBgRef).
  const bgCanvasRef = useRef(null);
  const grainViewRef = useRef(null);
  const shapeGrainViewRef = useRef(null);
  const shapeGrainScratchRef = useRef(null);
  const shapeGrainTopRef = useRef(null);
  const shapeGrainDueRef = useRef(false);
  const paintShapeGrainRef = useRef(null);
  const grainTimer = useRef(null);
  const exportBgRef = useRef(null);
  const bgObjRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const overlayObjRef = useRef(null);
  const wmImgRef = useRef(null);
  const displayScaleRef = useRef(0.5);
  const historyRef = useRef({ stack: [], index: -1 });
  const commitTimer = useRef(null);
  const bgRef = useRef(DEFAULT_BG);
  const fileInputRef = useRef(null);
  const logoFileRef = useRef(null);
  const guestFileRef = useRef(null);
  const guestTargetRef = useRef(null); // the guest frame a chosen photo should go into
  const logoTargetRef = useRef(null); // the logo a chosen file should replace
  const wordmarkRef = useRef(null);
  const layoutAttachedRef = useRef(null);
  const layoutAllRef = useRef(null);
  const sharpenRef = useRef(null);
  const sharpenTimer = useRef(null);
  const sharpeningRef = useRef(new WeakSet());
  const liveBarsRef = useRef(null);
  const [logoMode, setLogoMode] = useState('logo'); // interview: 'logo' | 'ecosystem'
  const [swapQuery, setSwapQuery] = useState(''); // search in the Edit tab's logo picker
  const fontFileRef = useRef(null);
  const userFontItemsRef = useRef([]); // every font file registered in this browser
  const userFontsRef = useRef([]);
  const fontPreviewRef = useRef(null);
  // what the person has typed, uploaded and chosen so far, kept when the layout changes
  const carryRef = useRef({ texts: {}, logos: {}, guests: [] });
  const lastLayoutRef = useRef(null);
  const [userFonts, setUserFonts] = useState([]); // the same, grouped by family
  const [fontDrop, setFontDrop] = useState(false);
  // New items are arranged for you until you move something by hand.
  const autoLayoutRef = useRef({ on: !isInterview, id: 'center' });
  const prevTabRef = useRef(isInterview ? 'layouts' : 'background');
  const applyLayoutRef = useRef(null);

  const [bg, setBgState] = useState(DEFAULT_BG);
  const [bgNote, setBgNote] = useState('');
  const [ringAll, setRingAll] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [dropBox, setDropBox] = useState(null);
  const dropKeyRef = useRef('');
  // Watermark on or off is the owner's call on every cover, so the choice is
  // remembered between visits (this browser only).
  const [watermark, setWatermark] = useState(() => {
    if (isInterview) return false; // interview covers carry a "Brought to you by" line instead
    try {
      return localStorage.getItem('cg_studio_watermark') !== 'off';
    } catch (e) {
      return true;
    }
  });
  const chooseWatermark = (on) => {
    setWatermark(on);
    try {
      localStorage.setItem('cg_studio_watermark', on ? 'on' : 'off');
    } catch (e) {
      /* storage unavailable: the choice still applies to this cover */
    }
  };
  const [showGuides, setShowGuides] = useState(false);
  const [snap, setSnap] = useState(true);
  const snapRef = useRef(true);
  const [guides, setGuides] = useState({ v: null, h: null });
  const [, setTick] = useState(0);
  const [leftTab, setLeftTab] = useState(isInterview ? 'layouts' : 'background');
  const [bgTab, setBgTab] = useState('templates');
  const [logoQuery, setLogoQuery] = useState('');
  const [addingLogo, setAddingLogo] = useState('');
  const [aiStyle, setAiStyle] = useState('');
  const [aiSpace, setAiSpace] = useState('center');
  const [aiUseColors, setAiUseColors] = useState(true); // owner 2026-11-16: on unless they untick it
  const [aiBusy, setAiBusy] = useState(false);
  const [recentBackdrops, setRecentBackdrops] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_studio_backdrops') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);
  const [objectCount, setObjectCount] = useState(0);

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  const bump = useCallback(() => {
    setTick((t) => t + 1);
    const c = fabricRef.current;
    if (c) setObjectCount(c.getObjects().length);
  }, []);

  const setBg = useCallback((patch) => {
    setBgState((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      bgRef.current = next;
      return next;
    });
  }, []);

  // ---------- object chrome (handles sized for the on-screen scale) ----------
  const styleObject = useCallback((o) => {
    const s = 1 / (displayScaleRef.current || 0.5);
    o.set({
      cornerSize: 12 * s,
      touchCornerSize: 30 * s,
      borderScaleFactor: 1.5 * s,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#00d4ff',
      borderColor: '#00d4ff',
      cornerStyle: 'circle',
      transparentCorners: false,
      snapAngle: 45,
      snapThreshold: 4,
    });
    if (o.controls && o.controls.mtr) o.controls.mtr.offsetY = -34 * s;
  }, []);

  // ---------- history (undo / redo) ----------
  const capture = (o) => {
    const p = {
      left: o.left,
      top: o.top,
      scaleX: o.scaleX,
      scaleY: o.scaleY,
      angle: o.angle,
      opacity: o.opacity,
      shadowOn: !!o.shadow,
    };
    // While several items are selected together, each one's own numbers are
    // relative to the selection. History must store where it really is on the
    // cover, or Undo puts it somewhere else.
    if (o.group) {
      const d = util.qrDecompose(o.calcTransformMatrix());
      Object.assign(p, { left: d.translateX, top: d.translateY, scaleX: d.scaleX, scaleY: d.scaleY, angle: d.angle });
    }
    if (o.studio && o.studio.kind === 'text') {
      Object.assign(p, {
        text: o.text,
        fontFamily: o.fontFamily,
        fontWeight: o.fontWeight,
        fontStyle: o.fontStyle,
        fontSize: o.fontSize,
        fill: o.fill,
        charSpacing: o.charSpacing,
        lineHeight: o.lineHeight,
        textAlign: o.textAlign,
        width: o.width,
      });
    } else if (o.studio) {
      Object.assign(p, { tint: o.studio.tint, tintColor: o.studio.tintColor });
    }
    if (o.studio && o.studio.kind === 'shape') Object.assign(p, { width: o.width, height: o.height, rx: o.rx, ry: o.ry, fill: o.fill });
    p.st = snapStudio(o.studio);
    return p;
  };

  const commit = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    const h = historyRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(c.getObjects().map((o) => ({ o, p: capture(o) })));
    if (h.stack.length > 80) h.stack.shift();
    h.index = h.stack.length - 1;
    if (sharpenRef.current) sharpenRef.current();
  }, []);

  const commitSoon = useCallback(() => {
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(commit, 450);
  }, [commit]);

  const restore = useCallback(
    (index) => {
      const c = fabricRef.current;
      const h = historyRef.current;
      if (!c || index < 0 || index >= h.stack.length) return;
      h.index = index;
      c.discardActiveObject();
      c.remove(...c.getObjects());
      h.stack[index].forEach(({ o, p }) => {
        // eslint-disable-next-line no-unused-vars
        const { shadowOn, tint, tintColor, st, ...props } = p;
        o.set(props);
        o.set('shadow', shadowOn ? softShadow() : null);
        if (st && o.studio) {
          const was = o.studio;
          o.studio = snapStudio(st);
          if (st.kind === 'logo' && (was.tint !== st.tint || was.tintColor !== st.tintColor || was.source !== st.source)) {
            const el = paintItem(o.studio);
            o.setElement(el);
            o.set({ width: el.width, height: el.height });
          }
          if (st.kind === 'photo' && (photoSig(was) !== photoSig(st) || was.src !== st.src)) repaintPhoto(o);
          if (st.kind === 'text') applyTextBox(o);
        }
        o.setCoords();
        c.add(o);
      });
      c.requestRenderAll();
      bump();
      if (sharpenRef.current) sharpenRef.current();
    },
    [bump]
  );

  const undo = useCallback(() => {
    clearTimeout(commitTimer.current);
    restore(historyRef.current.index - 1);
  }, [restore]);
  const redo = useCallback(() => restore(historyRef.current.index + 1), [restore]);

  // ---------- canvas lifecycle ----------
  useEffect(() => {
    const host = hostRef.current;
    historyRef.current = { stack: [], index: -1 };
    const el = document.createElement('canvas');
    host.appendChild(el);
    const c = new Canvas(el, {
      width: W,
      height: H,
      preserveObjectStacking: true,
      enableRetinaScaling: false,
      selectionColor: 'rgba(0,212,255,0.08)',
      selectionBorderColor: '#00d4ff',
      uniformScaling: true,
      // Hold Shift while dragging a corner to scale from the centre.
      centeredKey: 'shiftKey',
      // Fabric's defaults put distortion on Shift (free-ratio scaling and
      // skew). Logos and text must never be stretched, so both are off.
      uniScaleKey: null,
      altActionKey: null,
    });
    fabricRef.current = c;

    const bgC = bgCanvasRef.current; // the visible background layer
    const exC = document.createElement('canvas'); // background for the exported file
    exC.width = W;
    exC.height = H;
    exportBgRef.current = exC;
    const ovC = document.createElement('canvas');
    ovC.width = W;
    ovC.height = H;
    overlayCanvasRef.current = ovC;

    const fixed = { originX: 'left', originY: 'top', left: 0, top: 0, selectable: false, evented: false, objectCaching: false };
    bgObjRef.current = new FabricImage(exC, fixed); // attached only while exporting
    overlayObjRef.current = new FabricImage(ovC, fixed);
    c.overlayImage = overlayObjRef.current;

    const onSel = () => {
      // several items selected together get the same easy-to-grab handles
      const picked = c.getActiveObject();
      if (picked && !picked.studio) {
        styleObject(picked);
        picked.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
      }
      bump();
    };
    c.on('selection:created', onSel);
    c.on('selection:updated', onSel);
    c.on('after:render', () => shapeGrainSoonRef.current());
    c.on('selection:cleared', () => {
      // items moved together as a group have their own positions again now
      if (layoutAllRef.current) layoutAllRef.current();
      if (sharpenRef.current) sharpenRef.current();
      setLeftTab((t) => (t === 'edit' ? prevTabRef.current : t));
      bump();
    });
    // Clicking something on the cover opens its controls beside the canvas.
    c.on('mouse:down', (e) => {
      const hit = e.target;
      if (hit && hit.studio && hit.studio.attach && hit.studio.attach.role === 'bar' && c.getObjects().includes(hit.studio.attach.to)) {
        c.setActiveObject(hit.studio.attach.to);
        c.requestRenderAll();
      }
      if (e.target) {
        setLeftTab((t) => {
          if (t !== 'edit') prevTabRef.current = t;
          return 'edit';
        });
      }
    });
    c.on('text:changed', onSel);
    c.on('text:editing:exited', (e) => {
      const t = e && e.target;
      if (t && t.studio && t.studio.attach && layoutAttachedRef.current) layoutAttachedRef.current(t.studio.attach.to);
      commit();
    });

    c.on('object:modified', (e) => {
      const o = e.target;
      // Corner-dragging a text box scales it; fold that into the font size so
      // the size shown in the inspector is always the real one.
      if (o && o.studio && o.studio.kind === 'text' && (o.scaleX !== 1 || o.scaleY !== 1)) {
        o.set({
          fontSize: Math.max(8, Math.round(o.fontSize * o.scaleY)),
          width: o.width * o.scaleX,
          scaleX: 1,
          scaleY: 1,
        });
        o.setCoords();
      }
      // A shape keeps its true width and height (and its corner rounding)
      // instead of a stretch factor.
      if (o && o.studio && o.studio.kind === 'shape' && (o.scaleX !== 1 || o.scaleY !== 1)) {
        const w = Math.max(4, o.width * o.scaleX);
        const h = Math.max(4, o.height * o.scaleY);
        const r = ((o.studio.round || 0) * Math.min(w, h)) / 2;
        o.set({ width: w, height: h, rx: r, ry: r, scaleX: 1, scaleY: 1 });
        o.setCoords();
      }
      // names, titles, label bars and captions follow the thing they belong to
      if (o && o.studio && layoutAttachedRef.current) layoutAttachedRef.current(o.studio.attach ? o.studio.attach.to : o);
      autoLayoutRef.current.on = false;
      commit();
      bump();
    });
    const follow = (e) => {
      const o = e.target;
      if (!o) return;
      if (o.studio && !o.studio.attach && layoutAttachedRef.current) layoutAttachedRef.current(o);
      else if (!o.studio && typeof o.getObjects === 'function' && liveBarsRef.current) liveBarsRef.current(o);
    };
    c.on('object:scaling', follow);

    // Snap to the centre lines and the safe margins while dragging.
    c.on('object:moving', (e) => {
      const o = e.target;
      if (!o) return;
      // Snapping can be switched off, or bypassed for one drag by holding
      // Option/Alt (or Cmd), for placing something freely near a guide.
      const ev = e.e;
      if (!snapRef.current || (ev && (ev.altKey || ev.metaKey))) {
        setGuides((g) => (g.v === null && g.h === null ? g : { v: null, h: null }));
        return;
      }
      // fabric has already moved the object to the pointer but only refreshes
      // its cached corners AFTER this handler. Measuring without refreshing
      // them reads the PREVIOUS step's position, which made the object stutter
      // and lurch near every guide. Refresh first.
      o.setCoords();
      const T = 6 / (displayScaleRef.current || 0.5);
      const br = o.getBoundingRect();
      const pick = (cands) => {
        let best = null;
        cands.forEach(([d, line]) => {
          if (Math.abs(d) < T && (!best || Math.abs(d) < Math.abs(best[0]))) best = [d, line];
        });
        return best;
      };
      const sx = pick([
        [W / 2 - (br.left + br.width / 2), W / 2],
        [SAFE - br.left, SAFE],
        [W - SAFE - (br.left + br.width), W - SAFE],
      ]);
      const sy = pick([
        [H / 2 - (br.top + br.height / 2), H / 2],
        [SAFE - br.top, SAFE],
        [H - SAFE - (br.top + br.height), H - SAFE],
      ]);
      if (sx) o.set('left', o.left + sx[0]);
      if (sy) o.set('top', o.top + sy[0]);
      setGuides((g) => {
        const v = sx ? sx[1] : null;
        const h = sy ? sy[1] : null;
        return g.v === v && g.h === h ? g : { v, h };
      });
    });
    c.on('object:moving', follow);
    c.on('mouse:up', () => setGuides((g) => (g.v === null && g.h === null ? g : { v: null, h: null })));

    // Fit the 1800x900 canvas to the available width (CSS only: the backing
    // store stays 1800x900 so the export never changes).
    const fit = () => {
      const w = Math.floor(stageRef.current ? stageRef.current.clientWidth : 0);
      if (!w) return;
      displayScaleRef.current = w / W;
      c.setDimensions({ width: `${w}px`, height: `${Math.round((w * H) / W)}px` }, { cssOnly: true });
      c.getObjects().forEach((o) => {
        styleObject(o);
        o.setCoords();
      });
      c.calcOffset();
      c.requestRenderAll();
      // rebuild the grain for the new on-screen size once resizing settles
      clearTimeout(grainTimer.current);
      grainTimer.current = setTimeout(syncGrainView, 140);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(stageRef.current);
    fit();
    const onWinResize = () => {
      clearTimeout(grainTimer.current);
      grainTimer.current = setTimeout(syncGrainView, 140);
    };
    window.addEventListener('resize', onWinResize);

    loadImage(watermarkUrl, false)
      .then((img) => {
        wmImgRef.current = img;
        drawOverlay();
      })
      .catch(() => {});

    ensureFont('Inter', 700);
    ensureFont('Inter', 400);
    if (isInterview) {
      // the interview pieces are built in these, so have them ready
      ensureInterviewFonts();
      loadImage(wordmarkUrl, false)
        .then((img) => {
          wordmarkRef.current = img;
        })
        .catch(() => {});
    }

    renderBackground(bgC, bgRef.current, { skipGrain: true, ...design });
    drawOverlay();
    syncGrainView();
    c.requestRenderAll();
    commit();

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
      clearTimeout(commitTimer.current);
      clearTimeout(grainTimer.current);
      fabricRef.current = null;
      c.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
      // fabric wraps the canvas in a container div; clear whatever is left
      while (host.firstChild) host.removeChild(host.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- grain on a single shape ----------
  // A shape (a side panel, a band) can carry its own grain. It is drawn only
  // where the shape is actually seen: the shape's outline, minus everything
  // stacked above it, so guests, bars and text on the panel stay clean. Like
  // the background grain it is never resized: on screen it lives in its own
  // layer at the screen's pixels, in the file it is drawn at the cover's.
  const paintShapeGrain = (ctx, w, h) => {
    const c = fabricRef.current;
    if (!c) return false;
    const objs = c.getObjects();
    const grainy = objs.filter((o) => o.studio && o.studio.kind === 'shape' && o.studio.grain > 0 && o.visible !== false);
    if (!grainy.length) return false;
    let m = shapeGrainScratchRef.current;
    if (!m) {
      m = document.createElement('canvas');
      shapeGrainScratchRef.current = m;
    }
    if (m.width !== w || m.height !== h) {
      m.width = w;
      m.height = h;
    }
    const mg = m.getContext('2d');
    // what lies above the shape is drawn on a sheet of its own and then cut
    // out of the shape (fabric sets its own blend mode on every item it draws,
    // so the cut cannot be made while drawing them)
    let top = shapeGrainTopRef.current;
    if (!top) {
      top = document.createElement('canvas');
      shapeGrainTopRef.current = top;
    }
    if (top.width !== w || top.height !== h) {
      top.width = w;
      top.height = h;
    }
    const tg = top.getContext('2d');
    const k = w / W;
    const field = grainField(w, h, 5, !!bgRef.current.grainCoarse);
    // items selected together are positioned relative to their selection
    const draw = (g2, o) => {
      if (!o.group) {
        o.render(g2);
        return;
      }
      g2.save();
      g2.transform(...o.group.calcTransformMatrix());
      o.render(g2);
      g2.restore();
    };
    grainy.forEach((sh) => {
      mg.setTransform(1, 0, 0, 1, 0, 0);
      mg.globalCompositeOperation = 'source-over';
      mg.globalAlpha = 1;
      mg.clearRect(0, 0, w, h);
      mg.setTransform(k, 0, 0, k, 0, 0);
      draw(mg, sh);
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.clearRect(0, 0, w, h);
      tg.setTransform(k, 0, 0, k, 0, 0);
      objs.slice(objs.indexOf(sh) + 1).forEach((o) => draw(tg, o));
      mg.setTransform(1, 0, 0, 1, 0, 0);
      mg.globalCompositeOperation = 'destination-out';
      mg.drawImage(top, 0, 0);
      mg.globalCompositeOperation = 'source-in';
      mg.globalAlpha = grainOpacity(sh.studio.grain);
      mg.drawImage(field, 0, 0);
      mg.globalAlpha = 1;
      mg.globalCompositeOperation = 'source-over';
      ctx.drawImage(m, 0, 0);
    });
    return true;
  };
  paintShapeGrainRef.current = paintShapeGrain;

  const syncShapeGrain = useCallback(() => {
    const gv = shapeGrainViewRef.current;
    const stage = stageRef.current;
    if (!gv || !stage) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(stage.clientWidth * dpr);
    const h = Math.round(stage.clientHeight * dpr);
    if (w < 2 || h < 2) return; // hidden tab
    if (gv.width !== w || gv.height !== h) {
      gv.width = w;
      gv.height = h;
      gv.style.width = `${w / dpr}px`;
      gv.style.height = `${h / dpr}px`;
    }
    const ctx = gv.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const any = paintShapeGrainRef.current ? paintShapeGrainRef.current(ctx, w, h) : false;
    gv.style.display = any ? 'block' : 'none';
  }, []);
  // redrawn after the cover itself has been drawn, at most once per frame
  const shapeGrainSoon = useCallback(() => {
    if (shapeGrainDueRef.current) return;
    shapeGrainDueRef.current = true;
    requestAnimationFrame(() => {
      shapeGrainDueRef.current = false;
      syncShapeGrain();
    });
  }, [syncShapeGrain]);
  const shapeGrainSoonRef = useRef(shapeGrainSoon);
  shapeGrainSoonRef.current = shapeGrainSoon;

  // ---------- overlay: watermark (plus top grain in the exported file) ----------
  const watermarkRef = useRef(true);
  const drawOverlay = useCallback((forExport = false) => {
    const ov = overlayCanvasRef.current;
    const c = fabricRef.current;
    if (!ov || !c) return;
    const g = ov.getContext('2d');
    g.clearRect(0, 0, W, H);
    const b = bgRef.current;
    const wm = wmImgRef.current;
    // grain on single shapes, in the file (on screen it has its own layer)
    if (forExport && paintShapeGrainRef.current) paintShapeGrainRef.current(g, W, H);
    if (watermarkRef.current && wm) {
      // Same locked placement as the server watermark: centred, 5px low.
      const ww = wm.naturalWidth;
      const wh = wm.naturalHeight;
      g.drawImage(wm, Math.round((W - ww) / 2), H - wh + 5);
    }
    // "Grain over logos and text too": while editing that is the grain layer
    // sitting above the canvas; in the file it is drawn here, over everything.
    if (forExport && b.grainOnTop) drawGrain(g, W, H, b.grain, b.grainCoarse, 3);
    if (overlayObjRef.current) overlayObjRef.current.dirty = true;
    if (!forExport) c.requestRenderAll();
  }, []);

  // ---------- the on-screen grain layer ----------
  // One grain field at exactly the screen's pixel size, shown 1:1. Strength is
  // plain CSS opacity, so the Grain slider never has to redraw anything.
  const syncGrainView = useCallback(() => {
    const gv = grainViewRef.current;
    const stage = stageRef.current;
    if (!gv || !stage) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(stage.clientWidth * dpr);
    const h = Math.round(stage.clientHeight * dpr);
    if (w < 2 || h < 2) return; // hidden tab
    // Size the layer in whole pixels (not 100%), so one grain pixel is exactly
    // one screen pixel even when the stage has a fractional width.
    gv.style.width = `${w / dpr}px`;
    gv.style.height = `${h / dpr}px`;
    const soft = !!bgRef.current.grainCoarse;
    const key = `${w}x${h}_${soft}`;
    if (gv.dataset.key === key) return;
    gv.width = w;
    gv.height = h;
    gv.getContext('2d').drawImage(grainField(w, h, 3, soft), 0, 0);
    gv.dataset.key = key;
  }, []);

  useEffect(() => {
    watermarkRef.current = watermark;
    drawOverlay();
  }, [watermark, drawOverlay]);

  // ---------- background re-render ----------
  useEffect(() => {
    const c = fabricRef.current;
    if (!c || !bgCanvasRef.current) return undefined;
    const id = requestAnimationFrame(() => {
      renderBackground(bgCanvasRef.current, bg, { skipGrain: true, ...design });
      syncGrainView();
    });
    return () => cancelAnimationFrame(id);
  }, [bg, syncGrainView, design]);

  // ---------- incoming cover from the Generate tab ----------
  useEffect(() => {
    if (!incoming || !incoming.url) return;
    let cancelled = false;
    loadImage(corsUrl(incoming.url))
      .then((img) => {
        if (cancelled) return;
        setBg({ kind: 'image', image: img, imageLabel: 'Generated cover', dim: 0, contrast: 0, vignette: 0, centerVignette: 0, grain: 0 });
        setBgTab('image');
        setLeftTab('background');
        if (incoming.hadWatermark) {
          setWatermark(false);
          toast.info('That cover already has the watermark on it, so the Studio watermark is switched off.');
        }
      })
      .catch(() => toast.error('Could not load that cover into the Studio.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming && incoming.nonce]);

  // ---------- adding things ----------
  const backgroundIsLight = () => {
    const b = bgRef.current;
    return b.kind === 'template' && isLight(b.palette.base);
  };

  const fitLogo = (o, maxW, maxH) => {
    const aspect = o.width / o.height;
    // Wide wordmarks get less height than compact marks so they feel equal.
    const optical = aspect > 1 ? Math.pow(aspect, -0.4) : 1;
    const h = Math.min(maxH * optical, maxW / aspect);
    const s = h / o.height;
    o.set({ scaleX: s, scaleY: s });
  };

  const addLogoFromImage = useCallback(
    (img, meta) => {
      const c = fabricRef.current;
      if (!c) return;
      if (isInterview && !meta.seal) {
        // a selected placeholder is filled instead of adding another logo
        const picked = c.getActiveObjects();
        const target = picked.length === 1 ? picked[0] : null;
        if (target && target.studio && target.studio.kind === 'logo' && target.studio.placeholder) {
          replaceLogo(target, img, meta);
          return;
        }
      }
      // an SVG arrives already drawn and trimmed, with its vector to keep it sharp
      const source = meta.vector ? img : prepareLogo(img);
      const isSeal = !!meta.seal;
      const existing = c.getObjects().filter((o) => o.studio && o.studio.kind === 'logo' && !o.studio.seal).length;
      const studio = {
        kind: 'logo',
        seal: isSeal,
        symbol: isSeal ? '' : meta.symbol || '',
        name: meta.name || meta.symbol || 'Logo',
        // a seal starts as a faded one-colour emblem; a logo starts as itself
        tint: isSeal ? 'white' : 'original',
        tintColor: '#ffffff',
        source,
        vector: meta.vector || undefined,
        mono: isSeal ? monoEmblem(source) : undefined,
        colors: isSeal ? [] : extractLogoColors(source),
      };
      const o = new FabricImage(paintItem(studio), {
        originX: 'center',
        originY: 'center',
        left: isSeal ? W / 2 : W / 2 + existing * 46,
        top: isSeal ? H / 2 : H / 2 + existing * 46,
        opacity: isSeal ? 0.22 : 1,
        objectCaching: false,
      });
      o.studio = studio;
      o.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
      styleObject(o);
      c.add(o);
      if (isSeal) {
        // large, behind the logos and text, and left out of the auto layouts
        const sc = 760 / o.height;
        o.set({ scaleX: sc, scaleY: sc });
        o.setCoords();
        c.sendObjectToBack(o);
      } else if (isInterview && meta.slot === 'ecosystem') {
        // top left, with the small spaced "ECOSYSTEM" label under it
        const sc = Math.min(320 / o.width, 100 / o.height);
        o.set({ scaleX: sc, scaleY: sc });
        o.set({ left: 80 + (o.width * sc) / 2, top: 70 + (o.height * sc) / 2 });
        o.studio.slot = 'ecosystem';
        o.studio.anchor = 'lt';
        o.setCoords();
        makeAttachedText(o, 'caption', 'ECOSYSTEM');
        layoutAttached(o);
      } else if (isInterview) {
        fitLogo(o, 520, 200);
      } else {
        fitLogo(o, 640, 320);
        if (autoLayoutRef.current.on && applyLayoutRef.current) applyLayoutRef.current(autoLayoutRef.current.id, true);
      }
      c.setActiveObject(o);
      c.requestRenderAll();
      commit();
      bump();
    },
    [bump, commit, styleObject]
  );

  const addLogo = useCallback(
    async (entry) => {
      if (addingLogo) return;
      setAddingLogo(entry.symbol);
      try {
        const img = await loadImage(corsUrl(`${apiBase}/api/cover-generator/logo-preview/${encodeURIComponent(entry.symbol)}`));
        addLogoFromImage(img, { ...entry, slot: logoMode === 'ecosystem' ? 'ecosystem' : undefined });
      } catch (e) {
        toast.error(`No logo file found for ${entry.name || entry.symbol}. Upload it in the logo manager first.`);
      } finally {
        setAddingLogo('');
      }
    },
    [addLogoFromImage, addingLogo, apiBase, logoMode]
  );

  const addSeal = useCallback(
    async (seal) => {
      if (addingLogo) return;
      setAddingLogo(`seal:${seal.slug}`);
      try {
        const img = await loadImage(corsUrl(seal.imageUrl));
        addLogoFromImage(img, { seal: true, name: seal.name });
        prevTabRef.current = 'seals';
        setLeftTab('edit'); // straight to its opacity, colour and size
      } catch (e) {
        toast.error(`Could not load the ${seal.name} seal.`);
      } finally {
        setAddingLogo('');
      }
    },
    [addLogoFromImage, addingLogo]
  );

  const onLogoFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    loadLogoFile(file)
      .then(({ img, vector }) => {
        const meta = { symbol: '', name: file.name.replace(/\.[^.]+$/, ''), vector };
        const target = logoTargetRef.current;
        logoTargetRef.current = null;
        const c = fabricRef.current;
        if (target && c && c.getObjects().includes(target)) replaceLogo(target, img, meta);
        else addLogoFromImage(img, { ...meta, slot: logoMode === 'ecosystem' ? 'ecosystem' : undefined });
      })
      .catch(() => toast.error('Could not read that image.'));
  };

  const TEXT_PRESETS = {
    headline: { text: 'Your headline goes here', fontSize: 92, fontWeight: 700, width: 1180, charSpacing: HEADLINE_SPACING, lineHeight: 1.06, opacity: 1 },
    subhead: { text: 'A supporting line that adds context to the story', fontSize: 40, fontWeight: 400, width: 1000, charSpacing: 0, lineHeight: 1.25, opacity: 0.86 },
    label: { text: 'MARKET UPDATE', fontSize: 26, fontWeight: 600, width: 520, charSpacing: 180, lineHeight: 1.1, opacity: 1 },
  };

  const addText = useCallback(
    async (role) => {
      const c = fabricRef.current;
      if (!c) return;
      const p = TEXT_PRESETS[role];
      await ensureFont('Inter', p.fontWeight);
      const dark = backgroundIsLight();
      const fill = role === 'label' && bgRef.current.kind === 'template' ? bgRef.current.palette[dark ? 'a1' : 'a2'] : dark ? '#0f172a' : '#ffffff';
      const y = { headline: H / 2, subhead: H / 2 + 150, label: H / 2 - 150 }[role];
      const o = new Textbox(p.text, {
        originX: 'center',
        originY: 'center',
        left: W / 2,
        top: y,
        width: p.width,
        fontFamily: 'Inter',
        fontWeight: p.fontWeight,
        fontSize: p.fontSize,
        fill,
        charSpacing: p.charSpacing,
        lineHeight: p.lineHeight,
        opacity: p.opacity,
        textAlign: 'center',
        editable: true,
      });
      o.studio = { kind: 'text', role };
      o.setControlsVisibility({ mt: false, mb: false });
      styleObject(o);
      c.add(o);
      if (autoLayoutRef.current.on && applyLayoutRef.current) applyLayoutRef.current(autoLayoutRef.current.id, true);
      c.setActiveObject(o);
      c.requestRenderAll();
      commit();
      bump();
      prevTabRef.current = 'text';
      setLeftTab('edit');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bump, commit, styleObject]
  );

  // ---------- interview pieces ----------
  const paletteColor = (v, fallback) => {
    const pal = bgRef.current.palette;
    return v === 'a1' ? pal.a1 : v === 'a2' ? pal.a2 : v === 'base' ? pal.base : v || fallback;
  };
  // Names are set in a wide bold face: the person's own Pilat Wide when they
  // have added it, otherwise the built-in wide cut.
  // Guest names start in CMG Sans Bold and titles in CMG Sans Regular (the
  // owner's choice); either can be changed per line afterwards.
  const nameFontChoice = () => ['CMG Sans', 700];
  const ensureInterviewFonts = () => {
    const [nf, nw] = nameFontChoice();
    return Promise.all([
      ensureFont('Montserrat', 800),
      ensureFont('Montserrat', 700),
      ensureFont('Montserrat', 600),
      ensureFont('Montserrat', 500),
      ensureFont('Montserrat', 400),
      ensureFont('Instrument Serif', 400, true),
      ensureFont(nf, nw),
      ensureFont('CMG Sans', 400),
    ]);
  };

  const kidsOf = (frame) => {
    const c = fabricRef.current;
    return c ? c.getObjects().filter((o) => o.studio && o.studio.attach && o.studio.attach.to === frame) : [];
  };

  // Anything the person did to an attached text by hand since the last layout
  // (dragged it, resized it) is kept as its own offset and size.
  // For a picture (the host's microphone badge) "size" is its width on the
  // cover; for text it is the font size.
  const takeHandEdits = (t, frame, fw, picture = false) => {
    const a = t.studio.attach;
    if (a.lastLeft == null) return;
    const base = a.lastFw || fw;
    const grew = fw / base; // how much the parent has grown since the last layout
    const size = picture ? t.getScaledWidth() : t.fontSize * (t.scaleY || 1);
    // Where this text would be if it had simply travelled (and grown) with its
    // parent, as it does when the whole guest is selected and moved or scaled.
    const rode =
      Math.abs(t.left - (frame.left + (a.lastLeft - a.lastFrameLeft) * grew)) < 1 &&
      Math.abs(t.top - (frame.top + (a.lastTop - a.lastFrameTop) * grew)) < 1;
    // Untouched: only the parent moved or changed size.
    const stayed =
      Math.abs(t.left - a.lastLeft) < 0.01 &&
      Math.abs(t.top - a.lastTop) < 0.01 &&
      (picture ? Math.abs(size - a.lastSize) < 0.01 : Math.abs((t.scaleY || 1) - 1) < 0.001);
    if (!rode && !stayed) {
      a.dx += (t.left - a.lastLeft) / base;
      a.dy += (t.top - a.lastTop) / base;
    }
    const together = rode && !stayed;
    if (Math.abs(size - a.lastSize * (together ? grew : 1)) > 0.5) {
      a.rel = size / (together ? fw : base);
      // Sized by hand: from now on this line is whatever the person made it,
      // until it is typed again in the name fields (see setGuestTextOf).
      if (a.role === 'name' || a.role === 'title') a.free = true;
    }
  };
  const noteLayout = (t, frame, fw, picture = false) => {
    const a = t.studio.attach;
    a.lastLeft = t.left;
    a.lastTop = t.top;
    a.lastSize = picture ? t.getScaledWidth() : t.fontSize;
    a.lastFw = fw;
    a.lastFrameLeft = frame.left;
    a.lastFrameTop = frame.top;
  };

  // Place a guest's name, title and label bar under its photo (or a caption
  // under a logo). The name is the larger line; neither line is ever wider
  // than the mask: the type is scaled down to fit before it is allowed to wrap.
  const layoutAttached = (frame) => {
    const c = fabricRef.current;
    if (!c || !frame || frame.group || !frame.studio) return;
    const kids = kidsOf(frame).filter((k) => !k.group);
    if (!kids.length) return;
    const fw = frame.getScaledWidth();
    const fh = frame.getScaledHeight();
    const cx = frame.left;
    const bottom = frame.top + fh / 2;
    const role = (r) => kids.find((k) => k.studio.attach.role === r);

    const cap = role('caption');
    if (cap) {
      takeHandEdits(cap, frame, fw);
      const a = cap.studio.attach;
      const size = Math.max(6, a.rel * fw);
      // left / centre / right against the logo's edges (a.align, see setCaption)
      const side = a.align === 'left' || a.align === 'right' ? a.align : 'center';
      cap.set({ scaleX: 1, scaleY: 1, angle: 0, fontSize: size, charSpacing: 0, width: 6000, textAlign: side });
      cap.initDimensions();
      const n = String(cap.text || '').length;
      const w0 = cap.getLineWidth(0);
      // Letter spacing: the person's own figure once they have set one
      // (a.track, see setCaption); until then the letters are spread so the
      // word is exactly as wide as the logo.
      const fit = n > 1 ? Math.max(0, Math.min(8000, ((fw - w0) * 1000) / ((n - 1) * size))) : 0;
      const spacing = a.track != null ? a.track : fit;
      cap.set({ charSpacing: spacing });
      cap.initDimensions();
      // never let a widely spaced word wrap
      cap.set({ width: Math.max(fw, cap.getLineWidth(0)) + size * 2 });
      cap.initDimensions();
      // the text box is a little wider than the word, so for left and right
      // the box edge (where the letters start or end) is put on the logo's edge
      const lean = side === 'left' ? (cap.width - fw) / 2 : side === 'right' ? -(cap.width - fw) / 2 : 0;
      cap.set({ left: cx + lean + a.dx * fw, top: bottom + fw * 0.075 + cap.height / 2 + a.dy * fw });
      cap.setCoords();
      noteLayout(cap, frame, fw);
    }

    // "Hosted by" and the microphone badge: one line above the host's photo,
    // the words first and the badge after them, centred on the photo.
    const hl = role('hostlabel');
    const hm = role('hostmic');
    if (hl || hm) {
      let lw = 0;
      let mw = 0;
      if (hl) {
        takeHandEdits(hl, frame, fw);
        hl.set({ scaleX: 1, scaleY: 1, angle: 0, fontSize: Math.max(8, hl.studio.attach.rel * fw), width: 6000, textAlign: 'left' });
        hl.initDimensions();
        for (let i = 0; i < hl._textLines.length; i += 1) lw = Math.max(lw, hl.getLineWidth(i));
        lw += 2;
        hl.set({ width: lw });
        hl.initDimensions();
      }
      if (hm) {
        takeHandEdits(hm, frame, fw, true);
        mw = Math.max(6, hm.studio.attach.rel * fw);
        hm.set({ scaleX: mw / hm.width, scaleY: mw / hm.width, angle: 0 });
      }
      const gap = hl && hm ? fw * 0.04 : 0;
      const x0 = cx - (lw + gap + mw) / 2;
      const yc = frame.top - fh / 2 - fw * 0.31;
      if (hl) {
        const a = hl.studio.attach;
        hl.set({ left: x0 + lw / 2 + a.dx * fw, top: yc + a.dy * fw });
        hl.setCoords();
        noteLayout(hl, frame, fw);
      }
      if (hm) {
        const a = hm.studio.attach;
        hm.set({ left: x0 + lw + gap + mw / 2 + a.dx * fw, top: yc + a.dy * fw });
        hm.setCoords();
        noteLayout(hm, frame, fw, true);
      }
    }

    const bar = role('bar');
    const texts = [role('name'), role('title')].filter(Boolean);
    if (!texts.length && !bar) return;
    const align = frame.studio.textAlign || 'center';
    const padX = bar ? fw * 0.06 : 0;
    const padY = bar ? fw * 0.05 : fw * 0.045;
    const tw = Math.max(30, fw - padX * 2);
    let y = bottom + padY;
    let nameSize = null;
    texts.forEach((t) => {
      takeHandEdits(t, frame, fw);
      const a = t.studio.attach;
      const want = Math.max(8, a.rel * fw);
      t.set({ scaleX: 1, scaleY: 1, angle: 0, fontSize: want, width: 6000, textAlign: align });
      t.initDimensions();
      let widest = 1;
      for (let i = 0; i < t._textLines.length; i += 1) widest = Math.max(widest, t.getLineWidth(i));
      let size = want;
      // a host's handle may run a little wider than the round photo above it
      const room = tw * (a.wide || 1);
      let boxW = room;
      if (a.free) {
        // sized by hand: keep it, even if it is wider than the photo
        boxW = Math.max(room, widest + 2);
      } else {
        // The layout's size is the largest a line gets. A longer line is made
        // smaller until it fits the width; it wraps only below 45%.
        if (widest > room) size = Math.max(want * 0.45, (want * room) / widest) * 0.995;
        if (a.role === 'title' && nameSize) size = Math.min(size, nameSize * 0.82);
      }
      t.set({ fontSize: size, width: boxW });
      t.initDimensions();
      if (a.role === 'name') nameSize = size;
      // a line wider than the photo still starts (or ends) on the chosen side
      const lean = align === 'left' ? (boxW - room) / 2 : align === 'right' ? -(boxW - room) / 2 : 0;
      t.set({ left: cx + lean + a.dx * fw, top: y + t.height / 2 + a.dy * fw });
      t.setCoords();
      noteLayout(t, frame, fw);
      // an empty line takes no room, so a guest with no title gets a shorter plate
      if (String(t.text || '').trim()) y += t.height + fw * 0.012;
    });
    if (bar) {
      const hgt = Math.max(fw * 0.14, y - fw * 0.012 - bottom + padY);
      bar.set({ width: fw, height: hgt, rx: 0, ry: 0, scaleX: 1, scaleY: 1, angle: 0, left: cx, top: bottom + hgt / 2 - 0.5 });
      bar.setCoords();
      bar.studio.attach.lastFw = fw;
      bar.studio.attach.lastH = hgt;
    }
  };
  layoutAttachedRef.current = layoutAttached;
  // While several items are moved or scaled together, keep each guest's label
  // bar under its photo (the bar itself is never part of a selection).
  liveBarsRef.current = (selection) => {
    selection.getObjects().forEach((frame) => {
      if (!frame.studio || frame.studio.kind !== 'photo') return;
      const bar = kidsOf(frame).find((k) => k.studio.attach.role === 'bar');
      if (!bar) return;
      const a = bar.studio.attach;
      const centre = frame.getCenterPoint();
      const sc = frame.getObjectScaling();
      const fw = frame.width * sc.x;
      const fh = frame.height * sc.y;
      const hgt = (a.lastH || bar.height) * (fw / (a.lastFw || fw));
      bar.set({ width: fw, height: hgt, left: centre.x, top: centre.y + fh / 2 + hgt / 2 - 0.5 });
      bar.setCoords();
    });
  };
  layoutAllRef.current = () => {
    const c = fabricRef.current;
    if (!c) return;
    c.getObjects()
      .filter((o) => o.studio && !o.studio.attach && (o.studio.kind === 'photo' || o.studio.kind === 'logo'))
      .forEach(layoutAttached);
    c.requestRenderAll();
  };

  // seed = the placeholder the line started with; a line that still reads as
  // its seed has not been typed yet.
  const makeAttachedText = (frame, role, text, seed = text) => {
    const c = fabricRef.current;
    const [nf, nw] = nameFontChoice();
    const isName = role === 'name';
    const t = new Textbox(text, {
      originX: 'center',
      originY: 'center',
      left: frame.left,
      top: frame.top,
      width: 400,
      fontFamily: isName ? nf : role === 'title' ? 'CMG Sans' : 'Montserrat',
      fontWeight: isName ? nw : role === 'caption' ? 600 : 400,
      fontSize: 30,
      fill: '#ffffff',
      lineHeight: 1.08,
      textAlign: 'center',
      editable: true,
    });
    t.studio = { kind: 'text', role: `guest-${role}`, seed, attach: { to: frame, role, rel: ATTACH_REL[role] || ATTACH_REL.title, dx: 0, dy: 0 } };
    t.setControlsVisibility({ mt: false, mb: false });
    styleObject(t);
    c.add(t);
    return t;
  };

  const makeBar = (frame, fill) => {
    const c = fabricRef.current;
    const r = new Rect({ originX: 'center', originY: 'center', left: frame.left, top: frame.top, width: 100, height: 40, fill, strokeWidth: 0, objectCaching: false });
    r.studio = { kind: 'shape', name: 'Label bar', round: 0, attach: { to: frame, role: 'bar' } };
    r.set({ selectable: false, hoverCursor: 'pointer' }); // clicking it selects the guest it belongs to
    styleObject(r);
    c.insertAt(c.getObjects().indexOf(frame) + 1, r);
    return r;
  };

  const makePhoto = (opt = {}) => {
    const c = fabricRef.current;
    const studio = {
      kind: 'photo',
      name: 'Guest',
      ...DEFAULT_PHOTO,
      shape: opt.shape || 'circle',
      sides: opt.sides || 6,
      rounding: opt.rounding || 0,
      aspect: opt.aspect || 1,
      ring: opt.ring || 0,
      ringColor: paletteColor(opt.ringColor, '#ffffff'),
      tintColor: bgRef.current.palette.a1,
      src: opt.src || null,
      zoom: opt.zoom || DEFAULT_PHOTO.zoom,
      panX: opt.panX || 0,
      panY: opt.panY || 0,
      textStyle: opt.style || 'below', // below | bar | none
      textAlign: opt.align || 'center',
      barFill: paletteColor(opt.barFill, '#141414'),
    };
    const o = new FabricImage(paintPhoto(studio), { originX: 'center', originY: 'center', left: opt.cx == null ? W / 2 : opt.cx, top: opt.cy == null ? H / 2 : opt.cy, objectCaching: false });
    o.studio = studio;
    const sc = (opt.size || 360) / PHOTO_BASE;
    o.set({ scaleX: sc, scaleY: sc });
    o.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
    styleObject(o);
    c.add(o);
    if (studio.textStyle === 'bar') makeBar(o, studio.barFill);
    if (studio.textStyle !== 'none') {
      makeAttachedText(o, 'name', opt.upper ? 'GUEST NAME' : 'Guest Name');
      makeAttachedText(o, 'title', opt.upper ? 'TITLE AT COMPANY' : 'Title at Company');
    }
    layoutAttached(o);
    return o;
  };

  const makeShape = (opt = {}) => {
    const c = fabricRef.current;
    const w = opt.w || 420;
    const h = opt.h || 240;
    const round = opt.round || 0;
    const r = new Rect({
      originX: 'center',
      originY: 'center',
      left: (opt.x == null ? W / 2 - w / 2 : opt.x) + w / 2,
      top: (opt.y == null ? H / 2 - h / 2 : opt.y) + h / 2,
      width: w,
      height: h,
      rx: (round * Math.min(w, h)) / 2,
      ry: (round * Math.min(w, h)) / 2,
      fill: paletteColor(opt.fill, bgRef.current.palette.a1),
      strokeWidth: 0,
      objectCaching: false,
    });
    r.studio = { kind: 'shape', name: opt.name || 'Shape', round };
    styleObject(r);
    c.add(r);
    return r;
  };

  // opt: text, size, weight, font ('serif'), italic, align, fill, box,
  // and either x / y / w (top-left of the text block) or cx / cy (its centre).
  const makeText = (opt = {}) => {
    const c = fabricRef.current;
    const w = opt.w || 700;
    const t = new Textbox(opt.text || 'Text', {
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      width: w,
      fontFamily: opt.font === 'serif' ? 'Instrument Serif' : opt.family || 'Montserrat',
      fontWeight: opt.weight || 700,
      fontStyle: opt.italic ? 'italic' : 'normal',
      fontSize: opt.size || 60,
      fill: opt.fill || '#ffffff',
      charSpacing: opt.spacing != null ? opt.spacing : opt.role === 'headline' ? HEADLINE_SPACING : 0,
      lineHeight: opt.lineHeight || 1.1,
      textAlign: opt.align || 'left',
      editable: true,
    });
    t.studio = { kind: 'text', role: opt.role || 'text', seed: opt.seed == null ? opt.text : opt.seed };
    if (opt.box) {
      t.studio.box = { on: true, color: paletteColor(opt.box.color, bgRef.current.palette.a1), padX: opt.box.padX || 0, padY: opt.box.padY || 0, radius: opt.box.radius || 0 };
      applyTextBox(t);
    }
    t.initDimensions();
    // Text carried over from another layout goes into the room this layout's
    // own placeholder takes: the largest size, up to the layout's, at which it
    // fits that width and height. It sits in the middle of that room.
    let room = null;
    if (opt.fitTo != null && opt.fitTo !== t.text) {
      const mine = t.text;
      t.set('text', opt.fitTo);
      t.initDimensions();
      room = t.height;
      t.set('text', mine);
      const fits = (size) => {
        t.set({ fontSize: size, width: w });
        t.initDimensions();
        return t.height <= room * 1.01 && t.width <= w + 1; // a word wider than the box widens it
      };
      let hi = opt.size || 60;
      if (!fits(hi)) {
        let lo = 10;
        for (let i = 0; i < 12; i += 1) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid;
          else hi = mid;
        }
        t.set({ fontSize: Math.floor(lo), width: w });
        t.initDimensions();
      }
    }
    t.set({ left: opt.cx == null ? (opt.x || 0) + w / 2 : opt.cx, top: opt.cy == null ? (opt.y || 0) + (room == null ? t.height : room) / 2 : opt.cy });
    t.setControlsVisibility({ mt: false, mb: false });
    styleObject(t);
    c.add(t);
    return t;
  };

  const makePill = (opt = {}) => {
    const size = opt.size || 54;
    const text = opt.text || 'Interview';
    return makeText({ text, seed: 'Interview', cx: opt.cx, cy: opt.cy, w: Math.max(size * 8, text.length * size * 0.72), size, weight: 700, align: 'center', role: 'pill', box: { color: 'a1', padX: size * 0.8, padY: size * 0.3, radius: 999 } });
  };

  const logoObject = (studio) => {
    const o = new FabricImage(paintItem(studio), { originX: 'center', originY: 'center', left: W / 2, top: H / 2, objectCaching: false });
    o.studio = studio;
    o.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
    styleObject(o);
    return o;
  };

  // An empty, clearly marked spot for a logo, sized to the box it should fill.
  const makeLogoSlot = (opt = {}) => {
    const c = fabricRef.current;
    const eco = opt.slot === 'ecosystem';
    const source = placeholderLogo(eco ? 'NETWORK LOGO' : 'COMPANY LOGO');
    const o = logoObject({
      kind: 'logo',
      seal: false,
      symbol: '',
      name: eco ? 'Ecosystem logo' : 'Company logo',
      tint: 'original',
      tintColor: '#ffffff',
      source,
      colors: [],
      placeholder: true,
      slot: opt.slot,
      slotBox: { w: opt.w, h: opt.h },
      anchor: opt.cx == null ? 'lt' : 'c',
    });
    const sc = Math.min(opt.w / source.width, opt.h / source.height);
    o.set({ scaleX: sc, scaleY: sc });
    o.set({ left: opt.cx == null ? opt.x + (source.width * sc) / 2 : opt.cx, top: opt.cy == null ? opt.y + (source.height * sc) / 2 : opt.cy });
    c.add(o);
    if (opt.caption) makeAttachedText(o, 'caption', 'ECOSYSTEM');
    layoutAttached(o);
    return o;
  };

  // "Brought to you by" plus the Genfinity wordmark: two ordinary items placed
  // side by side (or stacked), so each can still be moved or restyled.
  const makeBrought = (opt = {}) => {
    const c = fabricRef.current;
    const size = opt.size || 34;
    const t = makeText({ text: opt.text || 'Brought to you by', seed: 'Brought to you by', x: 0, y: 0, w: 3000, size, weight: 500, align: 'left', role: 'brought' });
    const tw = t.getLineWidth(0) + 6;
    t.set({ width: tw });
    t.initDimensions();
    let lw = 0;
    let logo = null;
    if (wordmarkRef.current) {
      const source = prepareLogo(wordmarkRef.current);
      logo = logoObject({ kind: 'logo', seal: false, symbol: '', name: 'Genfinity', tint: 'original', tintColor: '#ffffff', source, colors: [] });
      const sc = (size * 0.98) / source.height;
      logo.set({ scaleX: sc, scaleY: sc });
      lw = source.width * sc;
      c.add(logo);
    }
    const cy = opt.cy == null ? H - 120 : opt.cy;
    const x = opt.x == null ? W / 2 : opt.x;
    if (opt.stacked) {
      t.set({ left: x + tw / 2, top: cy });
      if (logo) logo.set({ left: x + lw / 2, top: cy + size * 1.75 });
    } else {
      const gap = size * 0.62;
      const total = tw + (logo ? gap + lw : 0);
      const x0 = opt.anchor === 'right' ? x - total : opt.anchor === 'left' ? x : x - total / 2;
      t.set({ left: x0 + tw / 2, top: cy });
      if (logo) logo.set({ left: x0 + tw + gap + lw / 2, top: cy + size * 0.03 });
    }
    t.setCoords();
    if (logo) logo.setCoords();
    // the words and the logo stay separate items but are sized as one piece
    const setId = `set-${Date.now().toString(36)}-${Math.round(Math.random() * 1e6).toString(36)}`;
    t.studio.set = setId;
    if (logo) logo.studio.set = setId;
    return [t, logo];
  };

  const finishAdd = (o, tab) => {
    const c = fabricRef.current;
    if (o) c.setActiveObject(o);
    c.requestRenderAll();
    commit();
    bump();
    if (tab) {
      prevTabRef.current = tab;
      setLeftTab('edit');
    }
  };

  // ---------- changing layout keeps the person's work ----------
  // A line's text if it has been typed, or undefined while it is still the
  // placeholder. Names shown in capitals by a layout keep their typed form.
  const typed = (t) => {
    if (!t) return undefined;
    const st = t.studio;
    const text = st.raw != null && t.text === String(st.raw).toUpperCase() ? st.raw : t.text;
    return st.seed != null && text === st.seed ? undefined : text;
  };
  const readingOrder = (p, q) => (Math.abs(p.top - q.top) > 60 ? p.top - q.top : p.left - q.left);

  // Collect what is on the cover now. Anything the next layout has no place
  // for (a third guest, a subtitle) stays here and returns with a layout
  // that does have one.
  const harvest = () => {
    const c = fabricRef.current;
    const prev = carryRef.current;
    const objs = c.getObjects();
    const texts = { ...prev.texts };
    ['headline', 'subhead', 'pill', 'brought'].forEach((role) => {
      const t = objs.find((o) => o.studio && o.studio.tpl && o.studio.kind === 'text' && o.studio.role === role);
      if (t) texts[role] = typed(t);
    });
    const logos = { ...prev.logos };
    ['ecosystem', 'partner'].forEach((slot) => {
      const o = objs.find((x) => x.studio && x.studio.kind === 'logo' && x.studio.slot === slot);
      if (!o) return;
      if (o.studio.placeholder) logos[slot] = undefined;
      else {
        const { slot: s0, slotBox, anchor, placeholder, attach, tpl, ...look } = o.studio;
        logos[slot] = look;
      }
      const cap = guestText(o, 'caption');
      if (slot === 'ecosystem' && cap) texts.caption = typed(cap);
    });
    const now = objs
      .filter((o) => o.studio && o.studio.kind === 'photo' && !o.studio.host)
      .sort(readingOrder)
      .map((o) => {
        const st = o.studio;
        const line = (r) => {
          const t = guestText(o, r);
          return t ? typed(t) : st.kept && st.kept[r] ? st.kept[r].text : undefined;
        };
        return { src: st.src, srcOrig: st.srcOrig, zoom: st.zoom, panX: st.panX, panY: st.panY, treatment: st.treatment, tintColor: st.tintColor, backdrop: st.backdrop, name: line('name'), title: line('title') };
      });
    // grain put on a layout's colour panel goes with it to the next panel
    const panels = objs.filter((o) => o.studio && o.studio.tpl && o.studio.kind === 'shape' && !o.studio.attach);
    const grain = panels.length ? Math.max(...panels.map((o) => o.studio.grain || 0)) : prev.grain || 0;
    carryRef.current = { texts, logos, guests: now.concat(prev.guests.slice(now.length)), grain };
  };

  const fillGuest = (o, g, upper) => {
    if (!g) return;
    const st = o.studio;
    if (g.src) Object.assign(st, { src: g.src, srcOrig: g.srcOrig || null, zoom: g.zoom, panX: g.panX, panY: g.panY, treatment: g.treatment, backdrop: g.backdrop });
    if (g.src && g.treatment === 'tint') st.tintColor = g.tintColor;
    repaintPhoto(o);
    [['name', g.name], ['title', g.title]].forEach(([r, v]) => {
      const t = guestText(o, r);
      if (v == null || !t) return;
      t.set('text', upper ? String(v).toUpperCase() : v);
      t.studio.raw = upper ? v : undefined;
    });
    layoutAttached(o);
  };

  const fillLogo = (o, look, caption) => {
    const st = o.studio;
    if (look) {
      const box = st.slotBox;
      const leftEdge = o.left - o.getScaledWidth() / 2;
      const topEdge = o.top - o.getScaledHeight() / 2;
      Object.assign(st, look, { placeholder: false });
      const el = paintItem(st);
      o.setElement(el);
      const sc = Math.min(box.w / el.width, box.h / el.height);
      o.set({ width: el.width, height: el.height, scaleX: sc, scaleY: sc });
      if (st.anchor === 'lt') o.set({ left: leftEdge + (el.width * sc) / 2, top: topEdge + (el.height * sc) / 2 });
      o.setCoords();
    }
    const cap = guestText(o, 'caption');
    if (cap && caption != null) cap.set('text', caption);
    layoutAttached(o);
  };

  // fresh = start the layout again with empty placeholders
  const applyInterviewLayout = async (layout, fresh = false) => {
    const c = fabricRef.current;
    if (!c) return;
    await ensureInterviewFonts();
    c.discardActiveObject();
    if (fresh) carryRef.current = { texts: {}, logos: {}, guests: [], grain: 0 };
    else harvest();
    const carry = carryRef.current;
    const moved = !!(Object.values(carry.texts).some((v) => v != null) || Object.values(carry.logos).some(Boolean) || carry.guests.some((g) => g.src || g.name != null || g.title != null));
    // Everything a layout made is rebuilt. Extra items the person added
    // themselves (text, shapes, logos) stay exactly where they are. Guests
    // always move into the new layout's guest places.
    const all = c.getObjects();
    // (a "Hosted by" host is something the person added: it stays put)
    const builtBy = (o) => o.studio && (o.studio.tpl || (o.studio.kind === 'photo' && !o.studio.host));
    const mine = fresh ? [] : all.filter((o) => o.studio && !builtBy(o) && !(o.studio.attach && builtBy(o.studio.attach.to)));
    c.remove(...all.filter((o) => !mine.includes(o)));
    const had = new Set(c.getObjects());
    let g = 0;
    layout.items.forEach((it) => {
      if (it.t === 'shape') {
        const sh = makeShape(it);
        if (carry.grain > 0) sh.studio.grain = carry.grain;
      } else if (it.t === 'guest') {
        fillGuest(makePhoto(it), carry.guests[g], !!it.upper);
        g += 1;
      } else if (it.t === 'logo') fillLogo(makeLogoSlot(it), carry.logos[it.slot], it.caption ? carry.texts.caption : null);
      else if (it.t === 'pill') makePill({ ...it, text: carry.texts.pill });
      else if (it.t === 'text') makeText({ ...it, text: carry.texts[it.role] == null ? it.text : carry.texts[it.role], seed: it.text, fitTo: it.text });
      else if (it.t === 'brought') makeBrought({ ...it, text: carry.texts.brought });
    });
    c.getObjects().forEach((o) => {
      if (!had.has(o) && o.studio) o.studio.tpl = true;
    });
    mine.forEach((o) => c.bringObjectToFront(o));
    lastLayoutRef.current = layout;
    c.requestRenderAll();
    commit();
    bump();
    toast.success(
      moved
        ? 'Layout changed. What you typed, your photos and your logos moved into it. Undo goes back.'
        : 'Layout added. Click any part to change it. Undo brings back what was there before.'
    );
  };

  // who: one of our own people (HOSTS); their photo framing, name and title
  const addGuest = async (shape, src, who) => {
    const c = fabricRef.current;
    if (!c) return;
    await ensureInterviewFonts();
    const n = c.getObjects().filter((o) => o.studio && o.studio.kind === 'photo').length;
    const o = makePhoto({ shape, aspect: shape === 'rect' ? 0.9 : 1, src: src || null, size: 360, cx: W / 2 + (n % 5) * 44, cy: H / 2 - 40 + (n % 5) * 30, ...(who && src ? personFraming(who) : {}) });
    if (who) fillPersonWords(o, who);
    finishAdd(o, 'guests');
  };

  const personFraming = (who) => ({ zoom: who.zoom || 1, panX: who.panX || 0, panY: who.panY || 0 });

  // Put a person's name and title on a guest or host. The lines count as
  // typed (their placeholder stays as the seed), so a change of layout
  // carries them along.
  const fillPersonWords = (frame, who) => {
    if (!who || frame.studio.textStyle === 'none') return;
    // In a "Hosted by" piece the line before the microphone carries the
    // person's own words when they have some, and then no title goes under
    // the name. Words typed there by hand are left alone.
    const ownLabel = frame.studio.host && who.hostLabel;
    if (frame.studio.host) {
      const label = guestText(frame, 'hostlabel');
      const ours = ['Hosted by', ...HOSTS.map((h) => h.hostLabel).filter(Boolean)];
      if (label && ours.includes(label.text)) label.set('text', who.hostLabel || 'Hosted by');
      const old = guestText(frame, 'title');
      if (ownLabel && old) fabricRef.current.remove(old);
    }
    [['name', who.name, frame.studio.host ? '@HostName' : 'Guest Name'], ['title', ownLabel ? '' : who.title, frame.studio.host ? 'Title' : 'Title at Company']].forEach(([r, v, seed]) => {
      if (!v) return;
      let t = guestText(frame, r);
      if (!t) {
        t = makeAttachedText(frame, r, v, seed);
        if (frame.studio.host) {
          Object.assign(t.studio.attach, HOST_LINE[r]);
          if (r === 'name') t.set({ fontWeight: 400 });
        }
        return;
      }
      const upper = t.studio.seed && t.studio.seed === String(t.studio.seed).toUpperCase() && /[A-Z]/.test(t.studio.seed);
      t.set('text', upper ? v.toUpperCase() : v);
      t.studio.raw = upper ? v : undefined;
      t.studio.attach.rel = t.studio.attach.rel0 || ATTACH_REL[r] || t.studio.attach.rel;
      t.studio.attach.free = false;
    });
    layoutAttached(frame);
  };

  // "Hosted by": a round host photo with the words and the microphone badge
  // above it and a handle under it. Four separate items (photo, words, badge,
  // handle) that can each be moved, restyled or deleted, and that travel and
  // resize with the photo like a guest's name and title do.
  // It starts as one of our own people (the first of HOSTS unless another is
  // asked for): their photo, framed as set in HOSTS, with their name as the
  // handle and their title under it.
  const addHost = async (tab = 'guests', who = HOSTS[0]) => {
    const c = fabricRef.current;
    if (!c) return;
    await ensureInterviewFonts();
    let src = null;
    try {
      if (who) src = preparePhoto(await loadImage(who.src, false));
    } catch (e) {
      src = null; // the photo did not load: start with the empty placeholder
    }
    const o = makePhoto({ shape: 'circle', size: 300, cx: W / 2, cy: H / 2, style: 'none', src, ...(who && src ? personFraming(who) : {}) });
    Object.assign(o.studio, { host: true, name: (who && who.name) || 'Host', textStyle: 'below', textAlign: 'center' });
    const handle = makeAttachedText(o, 'name', (who && who.name) || '@HostName', '@HostName');
    handle.set({ fontWeight: 400 });
    Object.assign(handle.studio.attach, HOST_LINE.name);
    // a person with their own words for the line above (hostLabel) gets no
    // title under the name: those words say it already
    if (who && who.title && !who.hostLabel) Object.assign(makeAttachedText(o, 'title', who.title, 'Title').studio.attach, HOST_LINE.title);
    const label = makeAttachedText(o, 'hostlabel', (who && who.hostLabel) || 'Hosted by', 'Hosted by');
    label.set({ fontFamily: 'CMG Sans', fontWeight: 400 });
    const mic = logoObject({
      kind: 'logo',
      seal: false,
      symbol: '',
      name: 'Host microphone',
      tint: 'original',
      tintColor: '#ffffff',
      source: hostMicBadge(),
      colors: [],
      attach: { to: o, role: 'hostmic', rel: ATTACH_REL.hostmic, dx: 0, dy: 0 },
    });
    c.add(mic);
    layoutAttached(o);
    finishAdd(o, tab);
  };

  // One of our own hosts (HOSTS): as a "Hosted by" piece, as an ordinary
  // guest, or into a guest that is already on the cover.
  const putHost = async (host, as, target) => {
    if (as === 'host') {
      await addHost('guests', host);
      return;
    }
    try {
      const img = await loadImage(host.src, false);
      if (as === 'into') {
        const c = fabricRef.current;
        if (target && c && c.getObjects().includes(target)) placeGuestPhoto(target, img, host);
      } else await addGuest('circle', preparePhoto(img), host);
    } catch (e) {
      toast.error('Could not load that photo.');
    }
  };

  // ---------- the Elements tab: ready-made pieces ----------
  const addElement = async (id) => {
    const c = fabricRef.current;
    if (!c) return;
    await ensureInterviewFonts();
    const at = { cx: W / 2, cy: H / 2 };
    let o = null;
    if (id === 'host') {
      addHost('elements');
      return;
    }
    if (id === 'guest-circle') o = makePhoto({ ...at, shape: 'circle', size: 360, style: 'below', align: 'center' });
    if (id === 'guest-bar') o = makePhoto({ ...at, shape: 'rect', aspect: 0.9, size: 360, style: 'bar', align: 'right', barFill: '#141414' });
    if (id === 'guest-hex') o = makePhoto({ ...at, shape: 'polygon', sides: 6, rounding: 0.3, ring: 34, ringColor: 'a1', size: 300, style: 'below', align: 'center' });
    if (id === 'pill') o = makePill(at);
    if (id === 'highlight') o = makeText({ ...at, text: 'Highlighted words', w: 1100, size: 70, weight: 700, align: 'center', role: 'highlight', box: { color: 'a1', padX: 30, padY: 10, radius: 0 } });
    if (id === 'brought') [o] = makeBrought({ anchor: 'center', x: W / 2, cy: H / 2 });
    if (id === 'ecosystem') o = makeLogoSlot({ slot: 'ecosystem', ...at, w: 300, h: 100, caption: true });
    finishAdd(o, 'elements');
  };

  const pickGuestPhoto = (target) => {
    guestTargetRef.current = target || null;
    if (guestFileRef.current) guestFileRef.current.click();
  };

  const onGuestFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    const target = guestTargetRef.current;
    guestTargetRef.current = null;
    if (!file) return;
    readFileAsDataUrl(file)
      .then((url) => loadImage(url, false))
      .then((img) => {
        const c = fabricRef.current;
        if (target && c && c.getObjects().includes(target)) placeGuestPhoto(target, img);
        else addGuest('circle', preparePhoto(img));
      })
      .catch(() => toast.error('Could not read that image.'));
  };

  // Put a picture into a guest's mask, keeping the guest's place and style.
  // who: one of our own people (HOSTS), when the picture is theirs.
  const placeGuestPhoto = (target, img, who) => {
    Object.assign(target.studio, { src: preparePhoto(img), srcOrig: null, zoom: 1, panX: 0, panY: 0, ...(who ? personFraming(who) : {}) });
    repaintPhoto(target);
    if (who) fillPersonWords(target, who);
    layoutAttached(target);
    finishAdd(target);
  };

  // ---------- erase the background of a guest photo ----------
  // Runs in this browser (see photoCutout.js). The untouched photo is kept in
  // studio.srcOrig so the background can be brought back.
  const cutOutPhoto = async () => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'photo' || !o.studio.src || cutting) return;
    setCutting(true);
    const note = toast.info('Removing the background. The first time takes a little longer while the tool loads.', { autoClose: false });
    // let the message appear before the work starts; the work itself holds the page for a moment
    await new Promise((r) => setTimeout(r, 60));
    try {
      const original = o.studio.srcOrig || o.studio.src;
      const cut = await cutOutPerson(original);
      if (!c.getObjects().includes(o)) return;
      if (!cut) {
        toast.info('No person was found in this photo, so nothing was removed.');
        return;
      }
      o.studio.srcOrig = original;
      o.studio.src = cut;
      repaintPhoto(o);
      layoutAttached(o);
      c.requestRenderAll();
      commit();
      bump();
      toast.success('Background removed. "Bring the background back" or Undo restores it.');
    } catch (e) {
      toast.error('The background could not be removed in this browser.');
    } finally {
      toast.dismiss(note);
      setCutting(false);
    }
  };

  // ---------- drop an image from the computer onto the cover ----------
  // On a guest: it becomes that guest's photo. On an empty logo spot: it fills
  // it. Anywhere else: it is added as an image at that point.
  const dropTargetAt = (e) => {
    const c = fabricRef.current;
    const stage = stageRef.current;
    if (!c || !stage) return null;
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const objs = c.getObjects();
    for (let i = objs.length - 1; i >= 0; i -= 1) {
      const o = objs[i];
      if (!o.studio || o.visible === false) continue;
      const owner = o.studio.attach ? o.studio.attach.to : o;
      const k = owner.studio && owner.studio.kind;
      if (k !== 'photo' && !(k === 'logo' && owner.studio.placeholder)) continue;
      const b = o.getBoundingRect();
      if (x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height) return { owner, x, y };
    }
    return { owner: null, x, y };
  };
  const hasFiles = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []).includes('Files');
  const onStageDragOver = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const t = dropTargetAt(e);
    if (!t) return;
    const c = fabricRef.current;
    const key = t.owner ? `o${c.getObjects().indexOf(t.owner)}` : 'cover';
    if (dropKeyRef.current === key) return;
    dropKeyRef.current = key;
    if (!t.owner) {
      setDropBox({ left: 0, top: 0, width: 100, height: 100, label: 'Drop to add this image to the cover' });
      return;
    }
    const b = t.owner.getBoundingRect();
    setDropBox({
      left: (b.left / W) * 100,
      top: (b.top / H) * 100,
      width: (b.width / W) * 100,
      height: (b.height / H) * 100,
      label: t.owner.studio.kind === 'photo' ? 'Drop for this guest' : 'Drop for this logo',
    });
  };
  const endDrop = () => {
    dropKeyRef.current = '';
    setDropBox(null);
  };
  const onStageDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    endDrop();
  };
  const onStageDrop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const t = dropTargetAt(e);
    endDrop();
    const file = Array.from(e.dataTransfer.files || []).find((f) => /^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type));
    if (!file) {
      toast.info('Drop a PNG, JPG, WebP or SVG image.');
      return;
    }
    loadLogoFile(file)
      .then(({ img, vector }) => {
        const c = fabricRef.current;
        if (!c || !t) return;
        const meta = { symbol: '', name: file.name.replace(/\.[^.]+$/, ''), vector };
        if (t.owner && c.getObjects().includes(t.owner)) {
          if (t.owner.studio.kind === 'photo') placeGuestPhoto(t.owner, img);
          else replaceLogo(t.owner, img, meta);
          return;
        }
        c.discardActiveObject(); // so a selected placeholder is not filled by mistake
        addLogoFromImage(img, meta);
        const o = c.getActiveObject();
        if (o && o.studio && o.studio.kind === 'logo') {
          o.set({ left: Math.min(W - 20, Math.max(20, t.x)), top: Math.min(H - 20, Math.max(20, t.y)) });
          o.setCoords();
          c.requestRenderAll();
          commitSoon();
          // open its Edit panel, where "Remove the background" is
          if (leftTab !== 'edit') prevTabRef.current = leftTab;
          setLeftTab('edit');
        }
      })
      .catch(() => toast.error('Could not read that image.'));
  };

  const setPhoto = (patch) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'photo') return;
    Object.assign(o.studio, patch);
    repaintPhoto(o);
    layoutAttached(o);
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  // The border, for the selected guest or (with the tick box) every guest.
  const setRing = (patch, all = ringAll) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'photo') return;
    const targets = all ? c.getObjects().filter((g) => g.studio && g.studio.kind === 'photo') : [o];
    targets.forEach((g) => {
      Object.assign(g.studio, patch);
      repaintPhoto(g);
      layoutAttached(g);
    });
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  // Size a guest (or a logo with its label) as one piece: the photo, the name,
  // the title and the label bar all change together.
  const resizeWhole = (frame, width) => {
    const c = fabricRef.current;
    if (!c || !frame) return;
    const sc = Math.max(0.02, width / frame.width);
    frame.set({ scaleX: sc, scaleY: sc });
    frame.setCoords();
    layoutAttached(frame);
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const resizeAllGuests = (width) => {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.getObjects()
      .filter((o) => o.studio && o.studio.kind === 'photo' && !o.studio.host)
      .forEach((frame) => {
        const sc = Math.max(0.02, width / frame.width);
        frame.set({ scaleX: sc, scaleY: sc });
        frame.setCoords();
        layoutAttached(frame);
      });
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  // Every guest by the same amount, measured from one of them: guests that
  // were given different sizes keep their difference. The selection stays.
  const scaleAllGuests = (ref, width) => {
    const c = fabricRef.current;
    if (!c || !ref) return;
    const k = width / Math.max(1, ref.getScaledWidth());
    c.getObjects()
      .filter((o) => o.studio && o.studio.kind === 'photo' && !o.studio.host)
      .forEach((frame) => {
        frame.set({ scaleX: Math.max(0.02, frame.scaleX * k), scaleY: Math.max(0.02, frame.scaleY * k) });
        frame.setCoords();
        layoutAttached(frame);
      });
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const selectWhole = (frame) => {
    const c = fabricRef.current;
    if (!c || !frame) return;
    c.setActiveObject(frame);
    c.requestRenderAll();
    bump();
  };

  // ---------- size a whole piece from the toolbar ----------
  // The pieces behind a selection: a guest's name counts as its guest, the
  // host's microphone as its host, and "Brought to you by" as its two items.
  const piecesOf = (picked) => {
    const c = fabricRef.current;
    const out = new Set();
    picked.forEach((o) => {
      if (!o.studio) return;
      const root = o.studio.attach ? o.studio.attach.to : o;
      if (!root || !root.studio) return;
      if (root.studio.set) c.getObjects().filter((x) => x.studio && x.studio.set === root.studio.set).forEach((x) => out.add(x));
      else out.add(root);
    });
    return [...out];
  };
  const spanOf = (items) => {
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    items.forEach((o) => {
      const q = o.getBoundingRect();
      l = Math.min(l, q.left);
      t = Math.min(t, q.top);
      r = Math.max(r, q.left + q.width);
      b = Math.max(b, q.top + q.height);
    });
    return { l, t, r, b, w: r - l };
  };
  // Make the selected pieces `width` wide in total, growing or shrinking
  // everything about their common centre. Attached parts follow their parent.
  const scalePieces = (width) => {
    const c = fabricRef.current;
    if (!c) return;
    const picked = c.getActiveObjects().slice();
    if (!picked.length) return;
    const multi = picked.length > 1;
    const tabWas = leftTab;
    if (multi) c.discardActiveObject(); // work in cover positions
    const roots = piecesOf(picked);
    const span = roots.length ? spanOf(roots) : null;
    if (span && span.w > 1) {
      const f = Math.min(20, Math.max(0.05, width / span.w));
      const mx = (span.l + span.r) / 2;
      const my = (span.t + span.b) / 2;
      roots.forEach((o) => {
        o.set({ left: mx + (o.left - mx) * f, top: my + (o.top - my) * f });
        const k = o.studio.kind;
        if (k === 'text') {
          o.set({ fontSize: Math.max(6, o.fontSize * f), width: o.width * f });
          const box = o.studio.box;
          if (box) {
            box.padX *= f;
            box.padY *= f;
            if (box.radius < 500) box.radius *= f;
          }
          o.initDimensions();
          o.dirty = true;
        } else if (k === 'shape') {
          const w = Math.max(4, o.width * f);
          const h = Math.max(4, o.height * f);
          const r = ((o.studio.round || 0) * Math.min(w, h)) / 2;
          o.set({ width: w, height: h, rx: r, ry: r });
        } else {
          o.set({ scaleX: o.scaleX * f, scaleY: o.scaleY * f });
        }
        o.setCoords();
        layoutAttached(o);
      });
    }
    if (multi) {
      const still = picked.filter((o) => c.getObjects().includes(o));
      if (still.length > 1) c.setActiveObject(new ActiveSelection(still, { canvas: c }));
      else if (still.length === 1) c.setActiveObject(still[0]);
      setLeftTab(tabWas);
    }
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  // ---------- line up or space out the selected items ----------
  // A guest (or a logo with its label) counts as one piece: its name, title
  // and bar travel with it, and its outline for lining up includes them.
  // mode: left | hcenter | right | top | middle | bottom | hspace | vspace
  const alignSelected = (mode) => {
    const c = fabricRef.current;
    if (!c) return;
    const picked = c.getActiveObjects().slice();
    if (picked.length < 2) return;
    const tabWas = leftTab;
    c.discardActiveObject(); // every item is back at its own place on the cover
    const units = [];
    picked.forEach((o) => {
      if (!o.studio) return;
      const parent = o.studio.attach ? o.studio.attach.to : null;
      if (parent && picked.includes(parent)) return; // travels with its guest
      const members = parent ? [o] : [o, ...kidsOf(o)];
      let l = Infinity;
      let t = Infinity;
      let r = -Infinity;
      let b = -Infinity;
      members.forEach((m) => {
        const q = m.getBoundingRect();
        l = Math.min(l, q.left);
        t = Math.min(t, q.top);
        r = Math.max(r, q.left + q.width);
        b = Math.max(b, q.top + q.height);
      });
      units.push({ o, parent, l, t, r, b });
    });
    const horizontal = mode === 'left' || mode === 'hcenter' || mode === 'right' || mode === 'hspace';
    const enough = units.length >= (mode === 'hspace' || mode === 'vspace' ? 3 : 2);
    if (enough) {
      const L = Math.min(...units.map((u) => u.l));
      const R = Math.max(...units.map((u) => u.r));
      const T = Math.min(...units.map((u) => u.t));
      const B = Math.max(...units.map((u) => u.b));
      const move = (u, dx, dy) => {
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
        u.o.set({ left: u.o.left + dx, top: u.o.top + dy });
        u.o.setCoords();
        layoutAttached(u.parent || u.o);
      };
      if (mode === 'hspace' || mode === 'vspace') {
        // the outer two stay put; the gaps between neighbours become equal
        const lo = horizontal ? 'l' : 't';
        const hi = horizontal ? 'r' : 'b';
        const row = units.slice().sort((p, q) => p[lo] - q[lo]);
        const filled = row.reduce((sum, u) => sum + (u[hi] - u[lo]), 0);
        const gap = ((horizontal ? R - L : B - T) - filled) / (row.length - 1);
        let at = horizontal ? L : T;
        row.forEach((u) => {
          const d = at - u[lo];
          at += u[hi] - u[lo] + gap;
          move(u, horizontal ? d : 0, horizontal ? 0 : d);
        });
      } else {
        units.forEach((u) => {
          if (mode === 'left') move(u, L - u.l, 0);
          else if (mode === 'right') move(u, R - u.r, 0);
          else if (mode === 'hcenter') move(u, (L + R) / 2 - (u.l + u.r) / 2, 0);
          else if (mode === 'top') move(u, 0, T - u.t);
          else if (mode === 'bottom') move(u, 0, B - u.b);
          else if (mode === 'middle') move(u, 0, (T + B) / 2 - (u.t + u.b) / 2);
        });
      }
    }
    // select the same items again
    const still = picked.filter((o) => c.getObjects().includes(o));
    if (still.length > 1) c.setActiveObject(new ActiveSelection(still, { canvas: c }));
    else if (still.length === 1) c.setActiveObject(still[0]);
    setLeftTab(tabWas);
    c.requestRenderAll();
    if (enough) commit();
    bump();
  };

  const guestText = (frame, role) => kidsOf(frame).find((k) => k.studio.attach.role === role) || null;

  // Typing a name or title in a field (the name strip above the cover, or the
  // Edit panel) always follows the layout's rules: the line goes back to the
  // layout's size, which is its largest, and is made smaller only as far as
  // needed to fit the width of the plate. Sizes set by hand on the cover are
  // kept until the line is typed here again.
  const setGuestTextOf = (o, role, value) => {
    const c = fabricRef.current;
    if (!c || !o) return;
    let t = guestText(o, role);
    if (!t && value) {
      t = makeAttachedText(o, role, value);
      // a host's lines sit lower and larger than a guest's
      if (o.studio.host && HOST_LINE[role]) Object.assign(t.studio.attach, HOST_LINE[role]);
    }
    if (t) {
      // settle anything dragged since the last layout before the reset
      layoutAttached(o);
      t.set('text', value);
      t.studio.attach.rel = t.studio.attach.rel0 || ATTACH_REL[role] || t.studio.attach.rel;
      t.studio.attach.free = false;
    }
    layoutAttached(o);
    c.requestRenderAll();
    commitSoon();
    bump();
  };
  const setGuestText = (role, value) => setGuestTextOf(active1(), role, value);

  const setGuestStyle = (patch) => setGuestStyleOf(active1(), patch);
  const setGuestStyleOf = (o, patch) => {
    const c = fabricRef.current;
    if (!c || !o || !o.studio || o.studio.kind !== 'photo') return;
    Object.assign(o.studio, patch);
    const st = o.studio;
    const bar = guestText(o, 'bar');
    if (st.textStyle === 'bar' && !bar) makeBar(o, st.barFill);
    if (st.textStyle !== 'bar' && bar) c.remove(bar);
    if (st.textStyle === 'bar' && bar) bar.set('fill', st.barFill);
    if (st.textStyle === 'none') {
      // Keep what was typed (and how it was styled) so that switching back to
      // "Under photo" or "Label bar" brings the same name and title back.
      const kept = { ...(st.kept || {}) };
      ['name', 'title'].forEach((r) => {
        const t = guestText(o, r);
        if (!t) return;
        const a = t.studio.attach;
        kept[r] = {
          text: t.text,
          look: { fontFamily: t.fontFamily, fontWeight: t.fontWeight, fontStyle: t.fontStyle, fill: t.fill, charSpacing: t.charSpacing, lineHeight: t.lineHeight },
          attach: { rel: a.rel, free: !!a.free, dx: a.dx, dy: a.dy },
        };
        c.remove(t);
      });
      st.kept = kept;
    } else {
      [['name', 'Guest Name'], ['title', 'Title at Company']].forEach(([r, fallback]) => {
        if (guestText(o, r)) return;
        const k = st.kept && st.kept[r];
        const t = makeAttachedText(o, r, k ? k.text : fallback, fallback);
        if (k) {
          t.set(k.look);
          Object.assign(t.studio.attach, k.attach);
        }
      });
      st.kept = undefined;
    }
    layoutAttached(o);
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const addShapePreset = (kind) => {
    const presets = {
      rect: { w: 520, h: 300, round: 0, name: 'Rectangle' },
      rounded: { w: 520, h: 300, round: 0.25, name: 'Rounded rectangle' },
      pill: { w: 440, h: 110, round: 1, name: 'Pill' },
      circle: { w: 300, h: 300, round: 1, name: 'Circle' },
      panelRight: { x: W - 460, y: 0, w: 460, h: H, round: 0, name: 'Side panel' },
      panelLeft: { x: 0, y: 0, w: 460, h: H, round: 0, name: 'Side panel' },
      bar: { x: 0, y: H - 150, w: W, h: 150, round: 0, name: 'Bottom band' },
    };
    const o = makeShape(presets[kind]);
    const c = fabricRef.current;
    if (kind === 'panelRight' || kind === 'panelLeft' || kind === 'bar') c.sendObjectToBack(o);
    finishAdd(o, 'shapes');
  };

  const setShape = (patch) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'shape') return;
    if (patch.round != null) o.studio.round = patch.round;
    if (patch.grain != null) o.studio.grain = patch.grain;
    if (patch.width != null) o.set('width', patch.width);
    if (patch.height != null) o.set('height', patch.height);
    if (patch.fill) {
      o.set('fill', patch.fill);
      if (o.studio.attach && o.studio.attach.to && o.studio.attach.to.studio) o.studio.attach.to.studio.barFill = patch.fill;
    }
    const r = ((o.studio.round || 0) * Math.min(o.width, o.height)) / 2;
    o.set({ rx: r, ry: r });
    o.setCoords();
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const addInterviewText = async (kind) => {
    const c = fabricRef.current;
    if (!c) return;
    await ensureInterviewFonts();
    let o = null;
    if (kind === 'pill') o = makePill({ cx: W / 2, cy: H / 2 - 220 });
    if (kind === 'highlight') o = makeText({ text: 'Highlighted words', cx: W / 2, cy: H / 2 + 160, w: 1100, size: 70, weight: 700, align: 'center', role: 'highlight', box: { color: 'a1', padX: 30, padY: 10, radius: 0 } });
    if (kind === 'brought') [o] = makeBrought({ anchor: 'center', x: W / 2, cy: H - 110 });
    finishAdd(o, 'text');
  };

  const setTextBox = (patch) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'text') return;
    const size = o.fontSize || 40;
    o.studio.box = { on: false, color: bgRef.current.palette.a1, padX: Math.round(size * 0.5), padY: Math.round(size * 0.18), radius: 0, ...(o.studio.box || {}), ...patch };
    applyTextBox(o);
    o.dirty = true;
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const detachText = () => {
    const o = active1();
    if (!o || !o.studio || !o.studio.attach) return;
    delete o.studio.attach;
    o.set({ selectable: true });
    commit();
    bump();
  };

  // Keep SVG pictures sharp. After any change, each one that is now shown
  // larger than the pixels it was drawn at is drawn again from its file, at
  // twice the size it is shown (the cover's own pixels are what is exported).
  // The item keeps its exact place and size; nothing is added to the history.
  const sharpenVectors = async () => {
    const c = fabricRef.current;
    if (!c) return;
    const busy = sharpeningRef.current;
    const due = c.getObjects().filter((o) => o.studio && o.studio.kind === 'logo' && o.studio.vector && !o.group && !busy.has(o));
    await Promise.all(
      due.map(async (o) => {
        const st = o.studio;
        const from = st.source;
        const shown = Math.max(o.getScaledWidth(), o.getScaledHeight());
        const have = Math.max(from.width, from.height);
        const want = Math.min(VECTOR_MAX, Math.ceil(shown * 2));
        if (shown * 1.25 <= have || want <= have) return;
        busy.add(o);
        try {
          const next = await rasterVector(st.vector, st.vector.crop, want);
          // only if nothing else changed the picture or the item meanwhile
          if (!c.getObjects().includes(o) || o.studio !== st || st.source !== from || o.group) return;
          if (c._currentTransform && c._currentTransform.target === o) return; // being dragged right now: the next change tries again
          const wasW = o.getScaledWidth();
          const wasH = o.getScaledHeight();
          st.source = next;
          st.mono = undefined;
          const el = paintItem(st);
          o.setElement(el);
          o.set({ width: el.width, height: el.height, scaleX: (wasW / el.width) * Math.sign(o.scaleX || 1), scaleY: (wasH / el.height) * Math.sign(o.scaleY || 1) });
          o.setCoords();
          c.requestRenderAll();
          bump();
        } catch (e) {
          // the file could not be drawn again: the picture stays as it is
        } finally {
          busy.delete(o);
        }
      })
    );
  };
  sharpenRef.current = () => {
    clearTimeout(sharpenTimer.current);
    sharpenTimer.current = setTimeout(sharpenVectors, 120);
  };

  // Put a new picture into an existing logo, keeping its place on the cover.
  const replaceLogo = (o, img, meta = {}) => {
    const c = fabricRef.current;
    const st = o.studio;
    const oldW = o.getScaledWidth();
    const oldH = o.getScaledHeight();
    const box = st.placeholder && st.slotBox ? st.slotBox : { w: oldW, h: oldH };
    const leftEdge = o.left - oldW / 2;
    const topEdge = o.top - oldH / 2;
    const source = meta.vector ? img : prepareLogo(img);
    Object.assign(st, { source, vector: meta.vector || undefined, vectorOrig: undefined, sourceOrig: undefined, mono: undefined, name: meta.name || meta.symbol || 'Logo', symbol: meta.symbol || '', placeholder: false, tint: 'original', colors: extractLogoColors(source) });
    const el = paintItem(st);
    o.setElement(el);
    const sc = Math.min(box.w / el.width, box.h / el.height);
    o.set({ width: el.width, height: el.height, scaleX: sc, scaleY: sc });
    if (st.anchor === 'lt') o.set({ left: leftEdge + (el.width * sc) / 2, top: topEdge + (el.height * sc) / 2 });
    o.setCoords();
    layoutAttached(o);
    c.setActiveObject(o);
    c.requestRenderAll();
    commit();
    bump();
  };

  // Swap the selected logo (or fill a placeholder) with one from the library.
  const swapLogoFromLibrary = async (entry) => {
    const c = fabricRef.current;
    const target = active1();
    if (!c || !target || !target.studio || target.studio.kind !== 'logo' || addingLogo) return;
    setAddingLogo(`swap:${entry.symbol}`);
    try {
      const img = await loadImage(corsUrl(`${apiBase}/api/cover-generator/logo-preview/${encodeURIComponent(entry.symbol)}`));
      if (c.getObjects().includes(target)) replaceLogo(target, img, entry);
    } catch (e) {
      toast.error(`No logo file found for ${entry.name || entry.symbol}. Upload it in the logo manager first.`);
    } finally {
      setAddingLogo('');
    }
  };

  const pickReplaceLogo = (target) => {
    logoTargetRef.current = target || null;
    if (logoFileRef.current) logoFileRef.current.click();
  };

  const removeLogoBackground = () => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'logo') return;
    const cut = removePlainBackground(o.studio.source);
    if (!cut) {
      toast.info('This logo does not have a plain single-colour background to remove.');
      return;
    }
    const source = prepareLogo(cut); // also trims the empty margin that is left
    showLogoSource(o, source, o.studio.sourceOrig || o.studio.source);
    toast.success('Background removed. "Bring the background back" or Undo restores it.');
  };

  // Swap the picture inside a logo or a dropped image, keeping its place.
  // orig: the picture as it was before a background was removed (or null).
  const showLogoSource = (o, source, orig) => {
    const c = fabricRef.current;
    // With its background removed the picture is no longer the file's own
    // drawing, so it stops being redrawn from the vector; bringing the
    // background back makes it a vector again.
    if (orig) {
      o.studio.vectorOrig = o.studio.vector || o.studio.vectorOrig;
      o.studio.vector = undefined;
    } else {
      o.studio.vector = o.studio.vectorOrig;
      o.studio.vectorOrig = undefined;
    }
    o.studio.source = source;
    o.studio.sourceOrig = orig || undefined;
    o.studio.mono = undefined; // a one-colour version made from the old picture no longer fits
    o.studio.colors = extractLogoColors(source);
    const el = paintItem(o.studio);
    o.setElement(el);
    o.set({ width: el.width, height: el.height });
    o.setCoords();
    layoutAttached(o);
    c.requestRenderAll();
    commit();
    bump();
  };

  // The same people cut-out that guest photos have, for any image on the
  // cover (a picture dragged in, or a file added in the Logos tab). The
  // picture keeps its size and place: only the background becomes clear.
  const cutOutLogoPerson = async () => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'logo' || !o.studio.source || cutting) return;
    setCutting(true);
    const note = toast.info('Removing the background. The first time takes a little longer while the tool loads.', { autoClose: false });
    await new Promise((r) => setTimeout(r, 60));
    try {
      const original = o.studio.sourceOrig || o.studio.source;
      const cut = await cutOutPerson(original);
      if (!c.getObjects().includes(o)) return;
      if (!cut) {
        toast.info('No person was found in this image, so nothing was removed. For a logo on a flat colour, use "Remove plain background".');
        return;
      }
      showLogoSource(o, cut, original);
      toast.success('Background removed. "Bring the background back" or Undo restores it.');
    } catch (e) {
      toast.error('The background could not be removed in this browser.');
    } finally {
      toast.dismiss(note);
      setCutting(false);
    }
  };

  const restoreLogoBackground = () => {
    const o = active1();
    if (!o || !o.studio || o.studio.kind !== 'logo' || !o.studio.sourceOrig) return;
    showLogoSource(o, o.studio.sourceOrig, null);
  };

  const toggleCaption = (on) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o) return;
    const cap = guestText(o, 'caption');
    if (on && !cap) makeAttachedText(o, 'caption', 'ECOSYSTEM');
    if (!on && cap) c.remove(cap);
    layoutAttached(o);
    c.requestRenderAll();
    commit();
    bump();
  };

  // The small label under a logo: its size, its letter spacing and which edge
  // of the logo it lines up with (align: left, center or right).
  // spacing: null spreads the letters to the logo's width again.
  const setCaption = (frame, patch) => {
    const c = fabricRef.current;
    const cap = frame ? guestText(frame, 'caption') : null;
    if (!c || !cap) return;
    const a = cap.studio.attach;
    if (patch.size != null) a.rel = patch.size / Math.max(1, frame.getScaledWidth());
    if ('spacing' in patch) a.track = patch.spacing;
    if (patch.align) a.align = patch.align;
    layoutAttached(frame);
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  // ---------- selection actions ----------
  const active1 = () => {
    const c = fabricRef.current;
    if (!c) return null;
    const list = c.getActiveObjects();
    return list.length === 1 ? list[0] : null;
  };

  const change = (props) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o) return;
    o.set(props);
    o.setCoords();
    if (o.studio) layoutAttached(o.studio.attach ? o.studio.attach.to : o);
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const removeSelected = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    const list = c.getActiveObjects();
    if (!list.length) return;
    c.discardActiveObject();
    // a guest or logo takes its name, title, label bar and caption with it
    list.slice().forEach((o) => {
      if (o.studio && !o.studio.attach) {
        c.getObjects().forEach((k) => {
          if (k.studio && k.studio.attach && k.studio.attach.to === o && !list.includes(k)) list.push(k);
        });
      }
    });
    c.remove(...list);
    c.requestRenderAll();
    commit();
    bump();
  }, [bump, commit]);

  const cloneItem = async (o) => {
    const cl = await o.clone();
    cl.studio = snapStudio(o.studio);
    cl.set({ left: o.left + 40, top: o.top + 40, originX: 'center', originY: 'center' });
    const k = o.studio.kind;
    if (k === 'logo' || k === 'photo') cl.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
    else if (k === 'text') cl.setControlsVisibility({ mt: false, mb: false });
    if (k === 'photo' || k === 'shape') cl.set({ objectCaching: false });
    if (k === 'photo') repaintPhoto(cl);
    if (k === 'text') applyTextBox(cl);
    if (o.selectable === false) cl.set({ selectable: false, hoverCursor: 'pointer' });
    styleObject(cl);
    return cl;
  };

  const duplicate = useCallback(async () => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio) return;
    const cl = await cloneItem(o);
    delete cl.studio.set;
    // a copied name or caption becomes a free text block
    if (cl.studio.attach) {
      delete cl.studio.attach;
      cl.set({ selectable: true });
    }
    c.add(cl);
    // a copied guest or logo brings copies of its name, title, bar and caption
    const kids = c.getObjects().filter((k) => k.studio && k.studio.attach && k.studio.attach.to === o);
    for (const k of kids) {
      const kc = await cloneItem(k);
      kc.studio.attach = { ...k.studio.attach, to: cl };
      c.add(kc);
    }
    if (kids.length) layoutAttached(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
    commit();
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, commit, styleObject]);

  const reorder = (o, how) => {
    const c = fabricRef.current;
    if (!c || !o) return;
    if (how === 'front') {
      c.bringObjectToFront(o);
      // keep a guest's label bar, name and title in front of its photo
      c.getObjects()
        .filter((k) => k.studio && k.studio.attach && k.studio.attach.to === o)
        .forEach((k) => c.bringObjectToFront(k));
    }
    if (how === 'back') c.sendObjectToBack(o);
    if (how === 'up') c.bringObjectForward(o);
    if (how === 'down') c.sendObjectBackwards(o);
    c.requestRenderAll();
    commit();
    bump();
  };

  const alignTo = (where) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o) return;
    const br = o.getBoundingRect();
    const d = { x: 0, y: 0 };
    if (where === 'left') d.x = SAFE - br.left;
    if (where === 'hcenter') d.x = W / 2 - (br.left + br.width / 2);
    if (where === 'right') d.x = W - SAFE - (br.left + br.width);
    if (where === 'top') d.y = SAFE - br.top;
    if (where === 'vcenter') d.y = H / 2 - (br.top + br.height / 2);
    if (where === 'bottom') d.y = H - SAFE - (br.top + br.height);
    o.set({ left: o.left + d.x, top: o.top + d.y });
    o.setCoords();
    if (o.studio) layoutAttached(o.studio.attach ? o.studio.attach.to : o);
    c.requestRenderAll();
    commit();
    bump();
  };

  const setTint = (mode, color) => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o || !o.studio || o.studio.kind !== 'logo') return;
    o.studio.tint = mode;
    if (color) o.studio.tintColor = color;
    o.setElement(paintItem(o.studio));
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  // Italic is kept only where the chosen weight really has one; the browser
  // would otherwise fake it by slanting the upright letters.
  const resolveFont = (family, weight, italic) => {
    const def = findFont(family, userFontsRef.current);
    const w = def.weights.includes(Number(weight)) ? Number(weight) : def.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
    const forced = !!def.italicOnly && def.italicOnly.includes(w);
    const it = forced || (hasItalic(def, w) && !!italic);
    return { fontFamily: def.family, fontWeight: w, fontStyle: it ? 'italic' : 'normal' };
  };
  const setFont = async (family, weight, italic) => {
    const o = active1();
    if (!o) return;
    const f = resolveFont(family, weight, italic === undefined ? o.fontStyle === 'italic' : italic);
    await ensureFont(f.fontFamily, f.fontWeight, f.fontStyle === 'italic');
    change(f);
  };

  // Hovering a font in the picker shows it on the selected text straight
  // away, without choosing it: nothing is saved to the history, and the text
  // goes back to its real font when the pointer leaves or the list closes.
  const showFont = (o, f) => {
    const c = fabricRef.current;
    o.set(f);
    o.setCoords();
    if (o.studio) layoutAttached(o.studio.attach ? o.studio.attach.to : o);
    if (c) c.requestRenderAll();
  };
  const previewFont = async (family) => {
    let p = fontPreviewRef.current;
    if (family == null) {
      if (p) {
        fontPreviewRef.current = null;
        showFont(p.o, p.orig);
      }
      return;
    }
    const o = active1();
    if (!o || !o.studio || o.studio.kind !== 'text') return;
    if (!p || p.o !== o) {
      if (p) showFont(p.o, p.orig);
      p = { o, orig: { fontFamily: o.fontFamily, fontWeight: o.fontWeight, fontStyle: o.fontStyle }, turn: 0 };
      fontPreviewRef.current = p;
    }
    p.turn += 1;
    const mine = p.turn;
    const f = resolveFont(family, p.orig.fontWeight, startsItalic(family, p.orig.fontFamily) || p.orig.fontStyle === 'italic');
    await ensureFont(f.fontFamily, f.fontWeight, f.fontStyle === 'italic');
    // a later hover, or the end of the preview, wins over a font still loading
    if (fontPreviewRef.current !== p || p.turn !== mine) return;
    showFont(o, f);
  };
  // A font marked italicFirst starts in italic when it is chosen for text that
  // was in another font; the Italic tick box still switches it off.
  const startsItalic = (family, from) => family !== from && !!findFont(family, userFontsRef.current).italicFirst;
  const pickFont = (family) => {
    previewFont(null); // back to the real font first, so the weight and italic carry over from it
    const o = active1();
    if (o) setFont(family, o.fontWeight, startsItalic(family, o.fontFamily) ? true : undefined);
  };

  // ---------- the person's own fonts ----------
  const refreshUserFonts = useCallback(() => {
    const fams = buildFamilies(userFontItemsRef.current);
    userFontsRef.current = fams;
    setUserFonts(fams);
  }, []);

  // Fonts added on an earlier visit are kept in this browser and come back here.
  useEffect(() => {
    let off = false;
    loadStoredFontFiles().then(async (rows) => {
      for (const row of rows) {
        try {
          const item = await registerFont(row.buffer, row.fileName);
          if (off) return;
          userFontItemsRef.current.push(item);
        } catch (e) {
          /* a file the browser can no longer read is skipped */
        }
      }
      if (!off && rows.length) {
        refreshUserFonts();
        const c = fabricRef.current;
        if (c) c.requestRenderAll();
      }
    });
    return () => {
      off = true;
    };
  }, [refreshUserFonts]);

  const addFontFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => /\.(ttf|otf|ttc|woff2?)$/i.test(f.name));
    if (!files.length) {
      toast.warning('Choose font files (.ttf, .otf, .woff or .woff2).');
      return;
    }
    let added = 0;
    let failed = 0;
    const families = new Set();
    for (const f of files) {
      try {
        const buffer = await f.arrayBuffer();
        const meta = readFontMeta(buffer, f.name);
        families.add(meta.family);
        // The same style twice (a duplicate file) is only needed once.
        if (userFontItemsRef.current.some((it) => it.family === meta.family && it.weight === meta.weight && it.italic === meta.italic)) continue;
        const item = await registerFont(buffer, f.name);
        userFontItemsRef.current.push(item);
        await storeFontFile(f.name, buffer);
        added += 1;
      } catch (e) {
        failed += 1;
      }
    }
    refreshUserFonts();
    const names = Array.from(families).join(', ');
    if (added) toast.success(`Added ${added} font ${added === 1 ? 'style' : 'styles'}: ${names}. Select a text block and choose it under Font, in the "Your fonts" group.`);
    else if (!failed) toast.info(`${names} is already in your fonts.`);
    if (failed) toast.error(`${failed} ${failed === 1 ? 'file' : 'files'} could not be read as a font.`);
  };

  const onFontFiles = (e) => {
    const list = e.target.files;
    addFontFiles(list);
    e.target.value = '';
  };

  const removeUserFont = (fam) => {
    userFontItemsRef.current = userFontItemsRef.current.filter((it) => {
      if (it.family !== fam.family) return true;
      try {
        document.fonts.delete(it.face);
      } catch (e) {
        /* already gone */
      }
      return false;
    });
    deleteFontFiles(fam.files);
    refreshUserFonts();
    const c = fabricRef.current;
    if (c) c.requestRenderAll();
  };

  // ---------- one-click layouts ----------
  const applyLayout = (id, auto = false) => {
    const c = fabricRef.current;
    if (!c) return;
    if (!auto) autoLayoutRef.current = { on: true, id };
    const objs = c.getObjects();
    const logos = objs.filter((o) => o.studio && o.studio.kind === 'logo' && !o.studio.seal);
    const byRole = (r) => objs.find((o) => o.studio && o.studio.role === r);
    const texts = [byRole('label'), byRole('headline'), byRole('subhead')].filter(Boolean);
    if (!logos.length && !texts.length) {
      if (!auto) toast.info('That layout will be used as you add logos and text.');
      return;
    }
    if (!auto) c.discardActiveObject();

    const rowLogos = (cx, cy, maxW, maxH, anchor = 'center') => {
      if (!logos.length) return;
      const gap = 80;
      logos.forEach((o) => {
        o.set('angle', 0);
        fitLogo(o, maxW, maxH);
      });
      let total = logos.reduce((s, o) => s + o.getScaledWidth(), 0) + gap * (logos.length - 1);
      if (total > maxW) {
        const f = (maxW - gap * (logos.length - 1)) / (total - gap * (logos.length - 1));
        logos.forEach((o) => o.set({ scaleX: o.scaleX * f, scaleY: o.scaleY * f }));
        total = maxW;
      }
      let x = anchor === 'left' ? cx : cx - total / 2;
      logos.forEach((o) => {
        const w = o.getScaledWidth();
        o.set({ left: x + w / 2, top: cy });
        o.setCoords();
        x += w + gap;
      });
    };

    const stackText = (x, width, align, anchor, y) => {
      if (!texts.length) return;
      texts.forEach((t) => {
        t.set({ angle: 0, scaleX: 1, scaleY: 1, textAlign: align, width: t.studio.role === 'label' ? Math.min(width, 700) : width });
        t.initDimensions();
      });
      const gap = 26;
      const total = texts.reduce((s, t) => s + t.height, 0) + gap * (texts.length - 1);
      let top = anchor === 'bottom' ? y - total : anchor === 'top' ? y : y - total / 2;
      texts.forEach((t) => {
        const cx = align === 'center' ? x : x + t.width / 2;
        t.set({ left: cx, top: top + t.height / 2 });
        t.setCoords();
        top += t.height + gap;
      });
    };

    // The watermark sits bottom-centre; keep centred and low content clear of it.
    const floor = watermarkRef.current ? 735 : H - SAFE;
    const textHeight = () => texts.reduce((s, t) => s + t.height, 0) + 26 * Math.max(0, texts.length - 1);
    if (id === 'center') {
      if (!texts.length) {
        rowLogos(W / 2, watermarkRef.current ? 410 : H / 2, 1200, 340);
      } else {
        // Measure the text first, then centre logo + text as one block.
        stackText(W / 2, 1400, 'center', 'top', 0);
        const logoH = logos.length ? 210 : 0;
        const gapLT = logos.length ? 64 : 0;
        const block = logoH + gapLT + textHeight();
        const top = Math.max(SAFE - 20, (SAFE + floor) / 2 - block / 2);
        rowLogos(W / 2, top + logoH / 2, 1200, logoH || 1);
        stackText(W / 2, 1400, 'center', 'top', top + logoH + gapLT);
      }
    } else if (id === 'left') {
      rowLogos(W * 0.22, H / 2, 520, 340);
      stackText(W * 0.44, W * 0.5, 'left', 'center', H / 2);
    } else if (id === 'bottom') {
      rowLogos(SAFE + 20, SAFE + 80, 900, 120, 'left');
      stackText(SAFE + 20, 1250, 'left', 'bottom', floor);
    }
    c.requestRenderAll();
    if (auto) return;
    commit();
    bump();
  };
  applyLayoutRef.current = applyLayout;

  // ---------- keyboard ----------
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      const tag = ((e.target && e.target.tagName) || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) return;
      const c = fabricRef.current;
      if (!c) return;
      const o = c.getActiveObject();
      if (o && o.isEditing) return;
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (meta && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!o) return;
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        removeSelected();
      } else if (meta && key === 'd') {
        e.preventDefault();
        duplicate();
      } else if (key.startsWith('arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
        o.set({ left: o.left + d[0], top: o.top + d[1] });
        o.setCoords();
        if (o.studio && layoutAttachedRef.current) layoutAttachedRef.current(o.studio.attach ? o.studio.attach.to : o);
        c.requestRenderAll();
        commitSoon();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, undo, redo, removeSelected, duplicate, commitSoon]);

  // ---------- AI backdrop ----------
  const visibleStyles = useMemo(() => (styles || []).filter((s) => !s.internal), [styles]);
  const pickedStyle = visibleStyles.find((s) => s.id === aiStyle) || null;

  const rememberBackdrop = (url) => {
    setRecentBackdrops((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, 12);
      try {
        localStorage.setItem('cg_studio_backdrops', JSON.stringify(next));
      } catch (e) {
        /* storage unavailable */
      }
      return next;
    });
  };

  const applyImageUrl = async (url, label) => {
    try {
      const img = await loadImage(corsUrl(url));
      setBg({ kind: 'image', image: img, imageLabel: label || 'Image', dim: 0, contrast: 0 });
    } catch (e) {
      toast.error('Could not load that image.');
    }
  };

  const generateBackdrop = async () => {
    if (!aiStyle) {
      toast.warning('Pick a style for the backdrop first.');
      return;
    }
    setAiBusy(true);
    try {
      let authHeader = {};
      if (currentUser) {
        const token = await currentUser.getIdToken(true);
        authHeader = { Authorization: `Bearer ${token}` };
      }
      const pal = bgRef.current.palette;
      const body = {
        network: '',
        styleId: aiStyle,
        copySpace: aiSpace,
        skipWatermark: true, // the Studio adds the watermark itself, on top of the logos
        ...(aiUseColors ? { bgColor: pal.base, elementColor: pal.a1, accentLightColor: pal.a2, lightingColor: pal.a1 } : {}),
      };
      const start = await fetch(`${apiBase}/api/cover-generator/generate-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!start || !start.success || !start.jobId) throw new Error((start && start.error) || 'Could not start generation');
      let result = null;
      for (let i = 0; i < 80 && !result; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        let j = null;
        try {
          j = await fetch(`${apiBase}/api/cover-generator/job/${start.jobId}`).then((r) => r.json());
        } catch (e) {
          continue;
        }
        if (j && j.status === 'completed') result = j.result;
        if (j && j.status === 'failed') throw new Error(j.error || 'Generation failed');
      }
      if (!result || !result.imageUrl) throw new Error('Generation timed out');
      rememberBackdrop(result.imageUrl);
      await applyImageUrl(result.imageUrl, 'AI backdrop');
      toast.success('Backdrop ready. Add your logo and headline on top.');
    } catch (e) {
      toast.error(`Backdrop failed: ${e.message}`);
    } finally {
      setAiBusy(false);
    }
  };

  const onBgFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    readFileAsDataUrl(file)
      .then((url) => loadImage(url, false))
      .then((img) => setBg({ kind: 'image', image: img, imageLabel: file.name, dim: 0, contrast: 0 }))
      .catch(() => toast.error('Could not read that image.'));
  };

  // ---------- export ----------
  const exportDataUrl = () => {
    const c = fabricRef.current;
    if (!c) return null;
    c.discardActiveObject();
    // Compose the real file: background with its grain baked in at 1800x900,
    // then logos and text, then the watermark (and top grain if chosen).
    const b = bgRef.current;
    renderBackground(exportBgRef.current, b, { skipGrain: b.grainOnTop, ...design });
    bgObjRef.current.dirty = true;
    c.backgroundImage = bgObjRef.current;
    drawOverlay(true);
    c.renderAll();
    let url = null;
    try {
      url = c.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false });
    } catch (e) {
      toast.error('Export was blocked by an image that does not allow reuse. Remove the last image you added and try again.');
    }
    // back to the editing view
    c.backgroundImage = undefined;
    drawOverlay(false);
    return url;
  };

  const exportLabel = () => {
    const c = fabricRef.current;
    const logo = c && c.getObjects().find((o) => o.studio && o.studio.kind === 'logo' && o.studio.symbol);
    if (isInterview) return 'INTERVIEW';
    return logo ? logo.studio.symbol : 'STUDIO';
  };

  const headlineText = () => {
    const c = fabricRef.current;
    const h = c && c.getObjects().find((o) => o.studio && o.studio.role === 'headline');
    return h ? String(h.text || '').replace(/\s+/g, ' ').trim() : '';
  };

  const download = () => {
    const url = exportDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportLabel().toLowerCase()}-cover-${Date.now()}.png`;
    if (isInterview && c && c.getObjects().some((o) => o.studio && (o.studio.placeholder || (o.studio.kind === 'photo' && !o.studio.src)))) {
      toast.warning('This cover still has placeholder logos or empty guest photos in it.');
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    bump();
  };

  const save = async () => {
    if (!currentUser) {
      toast.info('Sign in to save covers to your profile. Download works without an account.');
      return;
    }
    const dataUrl = exportDataUrl();
    if (!dataUrl) return;
    setSaving(true);
    try {
      const blob = dataUrlToBlob(dataUrl);
      const label = exportLabel();
      const form = new FormData();
      form.append('image', blob, 'cover.png');
      form.append('label', label);
      const up = await fetch(`${apiBase}/api/cover-generator/upload-composed`, { method: 'POST', body: form }).then((r) => r.json());
      if (!up || !up.success || !up.imageUrl) throw new Error((up && up.error) || 'Upload failed');
      const token = await currentUser.getIdToken(true);
      const title = headlineText() || `${label} Cover`;
      const saved = await fetch(`${apiBase}/api/cover-generator/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: up.imageUrl, network: label, title }),
      }).then((r) => r.json());
      if (!saved || !saved.success) throw new Error((saved && saved.error) || 'Save failed');
      toast.success('Cover saved to your profile.');
      if (onSaved) onSaved(up.imageUrl, label);
    } catch (e) {
      toast.error(`Could not save: ${e.message}`);
    } finally {
      setSaving(false);
      bump();
    }
  };

  // ---------- derived view state ----------
  const c = fabricRef.current;
  const selection = c ? c.getActiveObjects() : [];
  const sel = selection.length === 1 ? selection[0] : null;
  const selKind = sel && sel.studio ? sel.studio.kind : null;
  const layerList = c ? [...c.getObjects()].reverse() : [];
  const hist = historyRef.current;

  const allLogos = useMemo(() => {
    const seen = new Set();
    return [
      ...networks.map((n) => ({ ...n, group: 'Network' })),
      ...companies.map((n) => ({ ...n, group: 'Company' })),
    ].filter((l) => {
      if (!l.symbol || seen.has(l.symbol)) return false;
      seen.add(l.symbol);
      return true;
    });
  }, [networks, companies]);
  const sealList = useMemo(() => (seals || []).filter((x) => x && x.grounded && x.imageUrl), [seals]);
  const shownLogos = useMemo(() => {
    const q = logoQuery.trim().toLowerCase();
    const list = q
      ? allLogos.filter((l) => (l.name || '').toLowerCase().includes(q) || (l.symbol || '').toLowerCase().includes(q))
      : allLogos;
    return list.slice(0, 72);
  }, [allLogos, logoQuery]);

  const mostUsedLogos = useMemo(
    () => (isInterview ? MOST_USED_LOGOS.map((sym) => allLogos.find((l) => l.symbol === sym)).filter(Boolean) : []),
    [allLogos, isInterview]
  );
  // one tile of a logo grid
  const logoTile = (l, onPick, busy, busyWord) => (
    <LogoTile key={`${l.group}_${l.symbol}`} onClick={() => onPick(l)} disabled={!!addingLogo} title={`${l.name} (${l.symbol})`}>
      <LogoThumb>
        <img
          src={`${apiBase}/api/cover-generator/logo-preview/${encodeURIComponent(l.symbol)}`}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.target.style.visibility = 'hidden';
          }}
        />
      </LogoThumb>
      <span>{addingLogo === busy ? busyWord : l.name}</span>
    </LogoTile>
  );

  const swapLogos = useMemo(() => {
    const q = swapQuery.trim().toLowerCase();
    const list = q
      ? allLogos.filter((l) => (l.name || '').toLowerCase().includes(q) || (l.symbol || '').toLowerCase().includes(q))
      : allLogos;
    return list.slice(0, 45);
  }, [allLogos, swapQuery]);

  // ---------- background size and position ----------
  // The part of the cover the background is actually seen in: the whole cover
  // minus any solid panel (or stack of framed photos) sitting against an edge.
  const openArea = () => {
    const c = fabricRef.current;
    const area = { x0: 0, y0: 0, x1: W, y1: H };
    if (!c) return area;
    const rects = c
      .getObjects()
      .filter(
        (o) =>
          o.visible !== false &&
          (o.opacity == null || o.opacity > 0.85) &&
          o.studio &&
          (o.studio.kind === 'shape' || (o.studio.kind === 'photo' && o.studio.shape === 'rect'))
      )
      .map((o) => {
        const b = o.getBoundingRect();
        return { l: b.left, t: b.top, r: b.left + b.width, b: b.top + b.height };
      });
    // how much of a side the pieces against it cover, overlaps counted once
    const span = (list, hi) => {
      let end = 0;
      let sum = 0;
      list
        .slice()
        .sort((p, q) => p[0] - q[0])
        .forEach(([from, to]) => {
          const a = Math.max(from, end);
          const b = Math.min(to, hi);
          if (b > a) {
            sum += b - a;
            end = b;
          }
        });
      return sum;
    };
    const edge = 6;
    const right = rects.filter((r) => r.r >= W - edge && r.l > W * 0.45);
    if (span(right.map((r) => [r.t, r.b]), H) >= H * 0.6) area.x1 = Math.min(...right.map((r) => r.l));
    const left = rects.filter((r) => r.l <= edge && r.r < W * 0.55);
    if (span(left.map((r) => [r.t, r.b]), H) >= H * 0.6) area.x0 = Math.max(...left.map((r) => r.r));
    const top = rects.filter((r) => r.t <= edge && r.b < H * 0.55);
    if (span(top.map((r) => [r.l, r.r]), W) >= W * 0.6) area.y0 = Math.max(...top.map((r) => r.b));
    const bottom = rects.filter((r) => r.b >= H - edge && r.t > H * 0.45);
    if (span(bottom.map((r) => [r.l, r.r]), W) >= W * 0.6) area.y1 = Math.min(...bottom.map((r) => r.t));
    return area;
  };

  // Move the middle of the background to the middle of the open area, and
  // enlarge it only as far as needed so it still reaches every edge.
  const centreBackground = () => {
    const a = openArea();
    const ox = (a.x0 + a.x1) / 2 - W / 2;
    const oy = (a.y0 + a.y1) / 2 - H / 2;
    const b = bgRef.current;
    let dw = W;
    let dh = H;
    if (b.kind === 'image' && b.image) {
      const iw = b.image.naturalWidth || b.image.width;
      const ih = b.image.naturalHeight || b.image.height;
      const sc = Math.max(W / iw, H / ih);
      dw = iw * sc;
      dh = ih * sc;
    }
    const zoom = Math.ceil(Math.max((W + 2 * Math.abs(ox)) / dw, (H + 2 * Math.abs(oy)) / dh) * 100) / 100;
    setBg({ zoom, shiftX: ox / W, shiftY: oy / H });
    setBgNote(ox === 0 && oy === 0 ? 'No side panel found, so the background is centred on the whole cover.' : '');
  };
  const resetBackgroundPlace = () => {
    setBg({ zoom: 1, shiftX: 0, shiftY: 0 });
    setBgNote('');
  };

  const applyPalette = (p) => setBg({ paletteId: p.id, palette: { base: p.base, a1: p.a1, a2: p.a2 } });
  const setColor = (key, value) => setBg((prev) => ({ paletteId: 'custom', palette: { ...prev.palette, [key]: value } }));
  const selFont = selKind === 'text' ? findFont(sel.fontFamily, userFonts) : null;
  const fontGroups = [
    ...(userFonts.length ? [{ label: 'Your fonts', fonts: userFonts }] : []),
    ...['Sans', 'Condensed', 'Serif', 'Display', 'Mono'].map((kind) => ({ label: kind, fonts: FONTS.filter((f) => f.kind === kind) })),
  ];
  const kindLabel = (o) => {
    const k = o.studio && o.studio.kind;
    if (k === 'text') return 'Text';
    if (k === 'photo') return 'Guest';
    if (k === 'shape') return 'Shape';
    return o.studio && o.studio.seal ? 'Seal' : 'Logo';
  };
  const layerName = (o) => {
    const k = o.studio && o.studio.kind;
    if (k === 'text') return String(o.text || '').replace(/\s+/g, ' ').slice(0, 26) || 'Text';
    if (k === 'photo') {
      const nm = guestText(o, 'name');
      return (nm && String(nm.text || '').replace(/\s+/g, ' ').slice(0, 26)) || 'Guest';
    }
    return (o.studio && o.studio.name) || 'Logo';
  };
  const guestList = c ? c.getObjects().filter((o) => o.studio && o.studio.kind === 'photo') : [];
  const selPhoto = selKind === 'photo' ? sel.studio : null;
  // the small label under a logo: its logo when the label itself is selected,
  // or the label when its logo is selected
  const selCap = selKind === 'text' && sel.studio.attach && sel.studio.attach.role === 'caption' ? sel.studio.attach.to : null;
  const logoCap = selKind === 'logo' && !sel.studio.attach ? guestText(sel, 'caption') : null;
  const sizedGuests = guestList.filter((o) => !o.studio.host).length; // guests that size together (a host is not one)
  // the whole pieces behind the selection, for the toolbar's Size control
  const sizePieces = c && selection.length ? piecesOf(selection) : [];
  const sizeNow = sizePieces.length ? spanOf(sizePieces).w : 0;
  // how many separate pieces are selected (a guest with its name and title is one)
  const alignCount = selection.filter((o) => o.studio && !(o.studio.attach && selection.includes(o.studio.attach.to))).length;
  // Guests that show a name plate, in reading order, for the name strip.
  const plateGuests = guestList
    .filter((o) => o.studio.textStyle !== 'none')
    .sort((p, q) => (Math.abs(p.top - q.top) > 60 ? p.top - q.top : p.left - q.left));
  const plateAlign = plateGuests.length && plateGuests.every((o) => (o.studio.textAlign || 'center') === (plateGuests[0].studio.textAlign || 'center')) ? plateGuests[0].studio.textAlign || 'center' : '';
  // Show on the cover which guest a name field belongs to.
  const pointAt = (o) => {
    if (!c || c.getActiveObject() === o) return;
    c.setActiveObject(o);
    c.requestRenderAll();
    bump();
  };
  const selBox = selKind === 'text' && sel.studio.box && sel.studio.box.on ? sel.studio.box : null;
  const paletteSwatches = [bg.palette.a1, bg.palette.a2, '#141414', '#ffffff'];

  return (
    <Wrap>
      {/* ------------------------------ left panel ------------------------------ */}
      <Panel>
        <Tabs $wrap={isInterview}>
          {(isInterview
            ? [
                ['layouts', 'Layouts'],
                ['background', 'Background'],
                ['elements', 'Elements'],
                ['guests', 'Guests'],
                ['logos', 'Logos'],
                ['text', 'Text'],
                ['shapes', 'Shapes'],
                ['layers', `Layers${objectCount ? ` (${objectCount})` : ''}`],
                ['edit', 'Edit'],
              ]
            : [
                ['background', 'Background'],
                ['logos', 'Logos'],
                ['seals', 'Seals'],
                ['text', 'Text'],
                ['layers', `Layers${objectCount ? ` (${objectCount})` : ''}`],
                ['edit', 'Edit'],
              ]
          ).map(([id, label]) => (
            <Tab key={id} $on={leftTab === id} $quarter={isInterview} $dim={id === 'edit' && selection.length === 0} onClick={() => setLeftTab(id)}>
              {label}
            </Tab>
          ))}
        </Tabs>

        {/* Kept outside the tab panels: the Edit tab opens it too (Replace logo). */}
        <input ref={logoFileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={onLogoFile} />

        {leftTab === 'layouts' && (
          <PanelBody>
            <Hint>
              Pick a starting layout. It fills the cover with placeholder guests, logos and text; then click any part to change it, move it or delete it. Colours come from the Background tab.
            </Hint>
            <TemplateGrid>
              {INTERVIEW_LAYOUTS.map((l) => (
                <TemplateTile key={l.id} title={l.note} onClick={() => applyInterviewLayout(l)}>
                  <LayoutThumb layout={l} palette={bg.palette} />
                  <span>{l.name}</span>
                </TemplateTile>
              ))}
            </TemplateGrid>
            <Hint>
              Changing layout keeps your work: what you typed, your guest photos and your logos move to their places in the new layout, in its style. Items you added yourself stay where they are. Undo goes back.
            </Hint>
            {lastLayoutRef.current && (
              <Ghost onClick={() => applyInterviewLayout(lastLayoutRef.current, true)}>Start again with empty placeholders</Ghost>
            )}
          </PanelBody>
        )}

        {leftTab === 'elements' && (
          <PanelBody>
            <Hint>
              Ready-made pieces. One click adds the whole piece to the middle of the cover; every part of it is its own item, so it can be moved, restyled or deleted on its own. A guest's mask shape is changed in its Edit panel.
            </Hint>
            <TemplateGrid>
              {INTERVIEW_ELEMENTS.map((el) => (
                <TemplateTile key={el.id} title={el.note} onClick={() => addElement(el.id)}>
                  <ElementThumb id={el.id} palette={bg.palette} />
                  <span>{el.name}</span>
                </TemplateTile>
              ))}
            </TemplateGrid>
          </PanelBody>
        )}

        {leftTab === 'guests' && (
          <PanelBody>
            <Hint>Add a guest, then click it on the cover to change the photo, the mask shape, and the name and title under it.</Hint>
            <AddText onClick={() => pickGuestPhoto(null)}>
              <b style={{ fontSize: 17 }}>Add a guest from a photo</b>
              <small>Choose a picture; it is placed in a round mask you can change</small>
            </AddText>
            <FieldLabel>Or add an empty guest slot</FieldLabel>
            <Seg>
              <SegBtn onClick={() => addGuest('circle')}>Circle</SegBtn>
              <SegBtn onClick={() => addGuest('rect')}>Rectangle</SegBtn>
              <SegBtn onClick={() => addGuest('polygon')}>Polygon</SegBtn>
            </Seg>
            <FieldLabel>Host</FieldLabel>
            <AddText onClick={() => addHost('guests')}>
              <b style={{ fontSize: 15 }}>Add "Hosted by"</b>
              <small>Starts with {HOSTS[0].name}: round photo, the line with the microphone badge above it and the handle under it. Each part can be moved or changed on its own.</small>
            </AddText>
            <FieldLabel>Our hosts</FieldLabel>
            <HostGrid>
              {HOSTS.map((h) => (
                <HostCard key={h.id}>
                  <img src={h.src} alt={h.name} draggable={false} />
                  <b>{h.name}</b>
                  <small>{h.title}</small>
                  <button type="button" onClick={() => putHost(h, 'host')}>Add as Hosted by</button>
                  <button type="button" onClick={() => putHost(h, 'guest')}>Add as a guest</button>
                </HostCard>
              ))}
            </HostGrid>
            <Hint>To put a host into a guest that is already on the cover, click that guest and pick the host under Photo.</Hint>
            {guestList.filter((o) => !o.studio.host).length > 1 && (
              <>
                <FieldLabel>All guests</FieldLabel>
                <Slider
                  label="Size of every guest at once"
                  min={60}
                  max={1200}
                  step={2}
                  value={(() => {
                    const only = guestList.filter((o) => !o.studio.host);
                    return only.reduce((sum, o) => sum + o.getScaledWidth(), 0) / Math.max(1, only.length);
                  })()}
                  onChange={resizeAllGuests}
                  fmt={(v) => `${Math.round(v)}px wide`}
                />
                <Hint>Each guest keeps its place; its photo, name, title and bar all change size together.</Hint>
              </>
            )}
            {guestList.length > 0 && <FieldLabel>Guests on this cover</FieldLabel>}
            {guestList.map((o, i) => (
              <LayerRow
                key={i}
                $on={selection.includes(o)}
                onClick={() => {
                  c.setActiveObject(o);
                  c.requestRenderAll();
                  prevTabRef.current = 'guests';
                  setLeftTab('edit');
                  bump();
                }}
              >
                <em>{o.studio.host ? 'Host' : 'Guest'}</em>
                <span>{layerName(o)}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); pickGuestPhoto(o); }}>{o.studio.src ? 'Replace photo' : 'Choose photo'}</button>
              </LayerRow>
            ))}
          </PanelBody>
        )}

        {leftTab === 'shapes' && (
          <PanelBody>
            <Hint>Flat shapes for side panels, bands and badges. Every shape can be recoloured, resized and rounded in the Edit tab.</Hint>
            <AddText onClick={() => addShapePreset('rect')}>
              <b style={{ fontSize: 15 }}>Rectangle</b>
              <small>A plain block of colour</small>
            </AddText>
            <AddText onClick={() => addShapePreset('rounded')}>
              <b style={{ fontSize: 15 }}>Rounded rectangle</b>
              <small>A block with soft corners</small>
            </AddText>
            <AddText onClick={() => addShapePreset('pill')}>
              <b style={{ fontSize: 15 }}>Pill</b>
              <small>Fully rounded ends</small>
            </AddText>
            <AddText onClick={() => addShapePreset('circle')}>
              <b style={{ fontSize: 15 }}>Circle</b>
              <small>A round disc</small>
            </AddText>
            <FieldLabel>Panels</FieldLabel>
            <Seg>
              <SegBtn onClick={() => addShapePreset('panelLeft')}>Left column</SegBtn>
              <SegBtn onClick={() => addShapePreset('panelRight')}>Right column</SegBtn>
              <SegBtn onClick={() => addShapePreset('bar')}>Bottom band</SegBtn>
            </Seg>
            <Hint>Panels are placed behind everything else.</Hint>
          </PanelBody>
        )}
        <input ref={guestFileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onGuestFile} />

        {leftTab === 'background' && (
          <PanelBody>
            <Seg>
              {[
                ['templates', 'Templates'],
                ['ai', 'AI backdrop'],
                ['image', 'Image'],
              ].map(([id, label]) => (
                <SegBtn key={id} $on={bgTab === id} onClick={() => setBgTab(id)}>
                  {label}
                </SegBtn>
              ))}
            </Seg>

            {bgTab === 'templates' && (
              <>
                <Hint>Refined backgrounds drawn live: soft light, fine line work and grain. No AI, instant, fully recolourable.</Hint>
                <TemplateGrid>
                  {TEMPLATES.map((t) => (
                    <TemplateTile
                      key={t.id}
                      $on={bg.kind === 'template' && bg.templateId === t.id}
                      title={t.note}
                      onClick={() => setBg({ kind: 'template', templateId: t.id })}
                    >
                      <TemplateThumb templateId={t.id} palette={bg.palette} seed={bg.seed} wide={isInterview} />
                      <span>{t.name}</span>
                    </TemplateTile>
                  ))}
                </TemplateGrid>
              </>
            )}

            {bgTab === 'ai' && (
              <>
                <Hint>
                  Generate a backdrop from any existing style with no logo in it, composed with clear space for your logo and headline.
                </Hint>
                <FieldLabel>Style</FieldLabel>
                {pickedStyle && (
                  <StylePreview>
                    <Thumb $ratio={56.25}>
                      <img src={pickedStyle.sampleImageUrl} alt="" />
                    </Thumb>
                    <b>{pickedStyle.name}</b>
                    {pickedStyle.description && <small>{pickedStyle.description}</small>}
                    <small>The sample shows this style with a logo. Your backdrop is generated without one.</small>
                  </StylePreview>
                )}
                <StyleGrid>
                  {visibleStyles.map((s) => (
                    <StyleTile
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      $on={aiStyle === s.id}
                      onClick={() => setAiStyle(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setAiStyle(s.id);
                        }
                      }}
                      title={s.description}
                    >
                      <Thumb $ratio={56.25}>
                        <img src={s.sampleImageUrl} alt="" loading="lazy" />
                      </Thumb>
                      <span>{s.name}</span>
                    </StyleTile>
                  ))}
                </StyleGrid>
                <FieldLabel>Keep clear space</FieldLabel>
                <Seg>
                  {[
                    ['center', 'Centre'],
                    ['left', 'Left'],
                    ['right', 'Right'],
                    ['bottom', 'Bottom'],
                    ['none', 'Even'],
                  ].map(([id, label]) => (
                    <SegBtn key={id} $on={aiSpace === id} onClick={() => setAiSpace(id)}>
                      {label}
                    </SegBtn>
                  ))}
                </Seg>
                <Check>
                  <input type="checkbox" checked={aiUseColors} onChange={(e) => setAiUseColors(e.target.checked)} />
                  Use my colours below instead of the style defaults
                </Check>
                <Primary disabled={aiBusy || !aiStyle} onClick={generateBackdrop}>
                  {aiBusy ? 'Generating backdrop (about a minute)...' : 'Generate backdrop'}
                </Primary>
                {recentBackdrops.length > 0 && (
                  <>
                    <FieldLabel>Recent backdrops</FieldLabel>
                    <RecentGrid>
                      {recentBackdrops.map((u) => (
                        <RecentTile key={u} onClick={() => applyImageUrl(u, 'AI backdrop')}>
                          <Thumb $ratio={50}>
                            <img src={u} alt="" loading="lazy" />
                          </Thumb>
                        </RecentTile>
                      ))}
                    </RecentGrid>
                  </>
                )}
              </>
            )}

            {bgTab === 'image' && (
              <>
                <Hint>Use your own image, or send a cover here from the Generate tab with "Open in Studio".</Hint>
                <Ghost onClick={() => fileInputRef.current && fileInputRef.current.click()}>Upload an image</Ghost>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onBgFile} />
                {bg.kind === 'image' && <Hint>Current: {bg.imageLabel || 'Image'}</Hint>}
                {recentBackdrops.length > 0 && (
                  <>
                    <FieldLabel>Recent backdrops</FieldLabel>
                    <RecentGrid>
                      {recentBackdrops.map((u) => (
                        <RecentTile key={u} onClick={() => applyImageUrl(u, 'AI backdrop')}>
                          <Thumb $ratio={50}>
                            <img src={u} alt="" loading="lazy" />
                          </Thumb>
                        </RecentTile>
                      ))}
                    </RecentGrid>
                  </>
                )}
              </>
            )}

            {bgTab !== 'image' && (
              <>
                <FieldLabel>Colours</FieldLabel>
                <PaletteGrid>
                  {PALETTES.map((p) => (
                    <PaletteChip key={p.id} $on={bg.paletteId === p.id} onClick={() => applyPalette(p)} title={p.name}>
                      <i style={{ background: p.base }} />
                      <i style={{ background: p.a1 }} />
                      <i style={{ background: p.a2 }} />
                    </PaletteChip>
                  ))}
                </PaletteGrid>
                <ColorRow>
                  {[
                    ['base', 'Base'],
                    ['a1', 'Accent'],
                    ['a2', 'Second'],
                  ].map(([k, label]) => (
                    <ColorCell key={k}>
                      <input type="color" value={normHex(bg.palette[k], '#000000')} onChange={(e) => setColor(k, e.target.value)} />
                      <span>{label}</span>
                    </ColorCell>
                  ))}
                </ColorRow>
              </>
            )}

            <FieldLabel>Size and position</FieldLabel>
            <Hint>
              The background is never selected by clicking on the cover. Size it and move it here, for example to bring its
              focus into the part of the cover that is not hidden behind a panel.
            </Hint>
            <Slider label="Size" min={0.5} max={3} step={0.01} value={bg.zoom} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setBg({ zoom: v })} />
            <Slider
              label="Left / right"
              min={-0.5}
              max={0.5}
              step={0.005}
              value={bg.shiftX}
              fmt={(v) => (Math.round(v * W) === 0 ? 'Centre' : `${Math.abs(Math.round(v * W))} px ${v < 0 ? 'left' : 'right'}`)}
              onChange={(v) => setBg({ shiftX: v })}
            />
            <Slider
              label="Up / down"
              min={-0.5}
              max={0.5}
              step={0.005}
              value={bg.shiftY}
              fmt={(v) => (Math.round(v * H) === 0 ? 'Centre' : `${Math.abs(Math.round(v * H))} px ${v < 0 ? 'up' : 'down'}`)}
              onChange={(v) => setBg({ shiftY: v })}
            />
            <Ghost onClick={centreBackground}>Centre on the open area</Ghost>
            <Ghost onClick={resetBackgroundPlace} disabled={(bg.zoom || 1) === 1 && !bg.shiftX && !bg.shiftY}>
              Reset to full cover (original size and position)
            </Ghost>
            {bgNote && <Hint>{bgNote}</Hint>}

            <FieldLabel>Finish</FieldLabel>
            {bg.kind === 'template' && (
              <Slider label="Intensity" min={0.2} max={1.5} step={0.05} value={bg.intensity} onChange={(v) => setBg({ intensity: v })} />
            )}
            {bg.kind === 'image' && (
              <Slider label="Darken" min={0} max={0.8} step={0.02} value={bg.dim} onChange={(v) => setBg({ dim: v })} />
            )}
            <Slider label="Contrast" min={0} max={1} step={0.02} value={bg.contrast} onChange={(v) => setBg({ contrast: v })} />
            <Slider label="Grain" min={0} max={1} step={0.02} value={bg.grain} onChange={(v) => setBg({ grain: v })} />
            <Slider label="Edge vignette" min={0} max={1} step={0.02} value={bg.vignette} onChange={(v) => setBg({ vignette: v })} />
            <Slider label="Centre vignette" min={0} max={1} step={0.02} value={bg.centerVignette} onChange={(v) => setBg({ centerVignette: v })} />
            <Check>
              <input type="checkbox" checked={bg.grainCoarse} onChange={(e) => setBg({ grainCoarse: e.target.checked })} />
              Coarser grain
            </Check>
            <Check>
              <input type="checkbox" checked={bg.grainOnTop} onChange={(e) => setBg({ grainOnTop: e.target.checked })} />
              Grain over logos and text too
            </Check>
            {bg.kind === 'template' && (
              <Row>
                <Ghost onClick={() => setBg((p) => ({ seed: (p.seed % 97) + 1 }))}>Shuffle layout</Ghost>
                <Ghost onClick={() => setBg((p) => ({ flip: !p.flip }))}>Flip</Ghost>
              </Row>
            )}
            {bg.kind === 'image' && (
              <Row>
                <Ghost onClick={() => setBg((p) => ({ flip: !p.flip }))}>Flip</Ghost>
              </Row>
            )}
          </PanelBody>
        )}

        {leftTab === 'logos' && (
          <PanelBody>
            <>
                {isInterview && (
                  <>
                    <FieldLabel>Add the next logo as</FieldLabel>
                    <Seg>
                      <SegBtn $on={logoMode === 'logo'} onClick={() => setLogoMode('logo')}>A logo</SegBtn>
                      <SegBtn $on={logoMode === 'ecosystem'} onClick={() => setLogoMode('ecosystem')}>Ecosystem (top left)</SegBtn>
                    </Seg>
                    <Hint>
                      {sel && selKind === 'logo' && sel.studio.placeholder
                        ? 'A placeholder is selected: the logo you click or upload fills it.'
                        : logoMode === 'ecosystem'
                        ? 'The logo goes top left with a small, widely spaced ECOSYSTEM label under it.'
                        : 'Select a placeholder on the cover first to fill it, or just click a logo to add it.'}
                    </Hint>
                  </>
                )}
                <Hint>Click a logo to drop it on the cover. Add as many as you need, then drag and scale them. Hold Shift while scaling to grow or shrink from the centre.</Hint>
                <Input placeholder="Search networks and companies" value={logoQuery} onChange={(e) => setLogoQuery(e.target.value)} />
                {mostUsedLogos.length > 0 && !logoQuery && (
                  <>
                    <FieldLabel>Most used</FieldLabel>
                    <LogoGrid>{mostUsedLogos.map((l) => logoTile(l, addLogo, l.symbol, 'Adding...'))}</LogoGrid>
                    <FieldLabel>All logos</FieldLabel>
                  </>
                )}
                <LogoGrid>
                  {shownLogos.map((l) => (
                    <LogoTile key={`${l.group}_${l.symbol}`} onClick={() => addLogo(l)} disabled={!!addingLogo} title={`${l.name} (${l.symbol})`}>
                      <LogoThumb>
                        <img
                          src={`${apiBase}/api/cover-generator/logo-preview/${encodeURIComponent(l.symbol)}`}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.visibility = 'hidden';
                          }}
                        />
                      </LogoThumb>
                      <span>{addingLogo === l.symbol ? 'Adding...' : l.name}</span>
                    </LogoTile>
                  ))}
                </LogoGrid>
                {allLogos.length > shownLogos.length && !logoQuery && <Hint>Showing the first {shownLogos.length}. Search to find the rest.</Hint>}
                {shownLogos.length === 0 && <Hint>No match. Upload the logo in the logo manager, or use a file below.</Hint>}
                <Ghost onClick={() => logoFileRef.current && logoFileRef.current.click()}>Use a logo file from my computer</Ghost>
                <Hint>Files added here are used for this cover only. They are not saved to the logo library.</Hint>
            </>
          </PanelBody>
        )}

        {leftTab === 'seals' && (
          <PanelBody>
            <Hint>
              Click a seal to place it behind your logos and text. It is the real seal, shown in white and faded by default. Then drag it, scale it, and set its opacity and colour (white, black, custom or full colour) in the Edit tab.
            </Hint>
            <SealGrid>
              {sealList.map((sl) => (
                <SealTile key={sl.slug} onClick={() => addSeal(sl)} disabled={!!addingLogo} title={sl.name}>
                  <LogoThumb>
                    <img src={sl.imageUrl} alt="" loading="lazy" />
                  </LogoThumb>
                  <span>{addingLogo === `seal:${sl.slug}` ? 'Adding...' : sl.name}</span>
                </SealTile>
              ))}
            </SealGrid>
            {sealList.length === 0 && <Hint>The seal library did not load. Refresh the page to try again.</Hint>}
          </PanelBody>
        )}

        {leftTab === 'text' && (
          <PanelBody>
            <Hint>Add a text block, then double-click it on the cover to type. Drag a corner to scale, drag a side to change the wrap width.</Hint>
            <AddText onClick={() => addText('headline')}>
              <b style={{ fontSize: 20 }}>Add a headline</b>
              <small>Large, bold title</small>
            </AddText>
            <AddText onClick={() => addText('subhead')}>
              <b style={{ fontSize: 15, fontWeight: 500 }}>Add a subhead</b>
              <small>Supporting line under the title</small>
            </AddText>
            <AddText onClick={() => addText('label')}>
              <b style={{ fontSize: 12, letterSpacing: 2 }}>ADD A LABEL</b>
              <small>Small spaced caps above the title</small>
            </AddText>
            {isInterview && (
              <>
                <AddText onClick={() => addInterviewText('pill')}>
                  <b style={{ fontSize: 15 }}>Add an "Interview" pill</b>
                  <small>Text in a rounded colour badge</small>
                </AddText>
                <AddText onClick={() => addInterviewText('highlight')}>
                  <b style={{ fontSize: 15 }}>Add a highlighted line</b>
                  <small>Text on a colour bar</small>
                </AddText>
                <AddText onClick={() => addInterviewText('brought')}>
                  <b style={{ fontSize: 15 }}>Add "Brought to you by Genfinity"</b>
                  <small>The line and the Genfinity wordmark</small>
                </AddText>
              </>
            )}

            <FieldLabel>Your own fonts</FieldLabel>
            <Hint>
              Use fonts you have on this computer. The files stay in this browser and are remembered here; they are not uploaded. Add every weight of a family at once.
            </Hint>
            <FontDrop
              $over={fontDrop}
              onClick={() => fontFileRef.current && fontFileRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setFontDrop(true);
              }}
              onDragLeave={() => setFontDrop(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFontDrop(false);
                addFontFiles(e.dataTransfer.files);
              }}
            >
              <b>Add font files</b>
              <small>Click to choose, or drop .ttf / .otf files here</small>
            </FontDrop>
            <input ref={fontFileRef} type="file" accept=".ttf,.otf,.ttc,.woff,.woff2" multiple hidden onChange={onFontFiles} />
            <Hint>On a Mac your Font Book fonts are in the Fonts folder of your Library: in the file window press Cmd+Shift+G and type ~/Library/Fonts.</Hint>
            {userFonts.map((f) => (
              <FontRow key={f.family}>
                <div>
                  <b style={{ fontFamily: `"${f.family}"` }}>{f.family}</b>
                  <small>{f.weights.map((w) => weightLabel(f, w)).join(', ')}{f.italicWeights.length ? ' (with italics)' : ''}</small>
                </div>
                <Ghost onClick={() => removeUserFont(f)}>Remove</Ghost>
              </FontRow>
            ))}
          </PanelBody>
        )}

        {leftTab === 'layers' && (
          <PanelBody>
            {layerList.length === 0 && <Hint>Nothing on the cover yet. Add a logo or text.</Hint>}
            {layerList.map((o, i) => (
              <LayerRow
                key={i}
                $on={selection.includes(o)}
                onClick={() => {
                  c.setActiveObject(o);
                  c.requestRenderAll();
                  bump();
                }}
              >
                <em>{kindLabel(o)}</em>
                <span>{layerName(o)}</span>
                <button type="button" title="Bring forward" onClick={(e) => { e.stopPropagation(); reorder(o, 'up'); }}>Up</button>
                <button type="button" title="Send backward" onClick={(e) => { e.stopPropagation(); reorder(o, 'down'); }}>Down</button>
              </LayerRow>
            ))}
            {layerList.length > 0 && <Hint>Top of the list is in front.</Hint>}
          </PanelBody>
        )}

        {leftTab === 'edit' && (
          <PanelBody>
          {!sel && selection.length === 0 && (
            <Muted>Nothing selected. Click a logo or text block on the cover and its controls appear here.</Muted>
          )}
          {selection.length > 1 && (
            <InsRow>
              <Muted>{selection.length} items selected</Muted>
              <Danger onClick={removeSelected}>Delete</Danger>
            </InsRow>
          )}
          {selection.length > 1 && (
            <>
              <FieldLabel style={{ marginTop: 10 }}>Line up and space out</FieldLabel>
              <AlignTools count={alignCount} onAlign={alignSelected} />
              <Muted style={{ marginTop: 6 }}>
                The first six line the items up with each other. The last two give three or more items equal gaps; the outer two stay where they are.
              </Muted>
            </>
          )}

          {sel && (
            <>
              <InsHead>
                <strong>{kindLabel(sel)}: {layerName(sel)}</strong>
                <Group>
                  <Tool onClick={duplicate}>Duplicate</Tool>
                  <Tool onClick={() => reorder(sel, 'front')}>To front</Tool>
                  <Tool onClick={() => reorder(sel, 'back')}>To back</Tool>
                  <Danger onClick={removeSelected}>Delete</Danger>
                </Group>
              </InsHead>

              <InsGrid>
                {selKind === 'text' && sel.studio.attach && sel.studio.attach.to && (
                  <InsCell>
                    <FieldLabel>{sel.studio.attach.to.studio && sel.studio.attach.to.studio.kind === 'photo' ? 'Whole guest' : 'Logo and its label'}</FieldLabel>
                    <Slider
                      label={sel.studio.attach.to.studio && sel.studio.attach.to.studio.kind === 'photo' ? 'Size (photo, name, title and bar together)' : 'Size (logo and label together)'}
                      min={40}
                      max={1500}
                      step={2}
                      value={sel.studio.attach.to.getScaledWidth()}
                      onChange={(v) => resizeWhole(sel.studio.attach.to, v)}
                      fmt={(v) => `${Math.round(v)}px wide`}
                    />
                    {sel.studio.attach.to.studio && sel.studio.attach.to.studio.kind === 'photo' && !sel.studio.attach.to.studio.host && sizedGuests > 1 && (
                      <Slider
                        label="Size of all guests together"
                        min={60}
                        max={1500}
                        step={2}
                        value={sel.studio.attach.to.getScaledWidth()}
                        onChange={(v) => scaleAllGuests(sel.studio.attach.to, v)}
                        fmt={(v) => `${Math.round(v)}px wide`}
                      />
                    )}
                    <Row>
                      <Ghost onClick={() => selectWhole(sel.studio.attach.to)}>{sel.studio.attach.to.studio && sel.studio.attach.to.studio.kind === 'photo' ? 'Select the guest photo' : 'Select the logo'}</Ghost>
                    </Row>
                    <Muted style={{ marginTop: 6 }}>The controls below change only this line of text.</Muted>
                  </InsCell>
                )}
                {selKind === 'text' && (
                  <>
                    <InsCell $wide>
                      <FieldLabel>Text</FieldLabel>
                      <TextArea rows={2} value={sel.text} onChange={(e) => change({ text: e.target.value })} />
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Font</FieldLabel>
                      <FontPicker
                        value={(fontPreviewRef.current && fontPreviewRef.current.o === sel ? fontPreviewRef.current.orig : sel).fontFamily}
                        groups={fontGroups}
                        onPreview={previewFont}
                        onPick={pickFont}
                      />
                      <Select value={sel.fontWeight} onChange={(e) => setFont(sel.fontFamily, Number(e.target.value))} style={{ marginTop: 6 }}>
                        {selFont.weights.map((w) => (
                          <option key={w} value={w}>{weightLabel(selFont, w)}</option>
                        ))}
                      </Select>
                      {hasItalic(selFont, sel.fontWeight) && !(selFont.italicOnly || []).includes(Number(sel.fontWeight)) && (
                        <Check style={{ marginTop: 6 }}>
                          <input type="checkbox" checked={sel.fontStyle === 'italic'} onChange={(e) => setFont(sel.fontFamily, sel.fontWeight, e.target.checked)} />
                          Italic
                        </Check>
                      )}
                    </InsCell>
                    <InsCell>
                      {selCap ? (
                        <>
                          <Slider label="Size" min={6} max={60} step={0.5} value={sel.fontSize} onChange={(v) => setCaption(selCap, { size: v })} fmt={(v) => `${v.toFixed(1)}px`} />
                          <Slider label="Letter spacing" min={0} max={3000} step={10} value={sel.charSpacing} onChange={(v) => setCaption(selCap, { spacing: v })} fmt={(v) => `${Math.round(v)}`} />
                          <Row style={{ marginBottom: 8 }}>
                            <Ghost onClick={() => setCaption(selCap, { spacing: null })} disabled={sel.studio.attach.track == null}>Spread to the logo's width</Ghost>
                          </Row>
                        </>
                      ) : (
                        <>
                          <Slider label="Size" min={12} max={260} step={1} value={sel.fontSize} onChange={(v) => change({ fontSize: v })} fmt={(v) => `${Math.round(v)}px`} />
                          <Slider label="Letter spacing" min={-80} max={500} step={5} value={sel.charSpacing} onChange={(v) => change({ charSpacing: v })} fmt={(v) => `${Math.round(v)}`} />
                        </>
                      )}
                      <Slider label="Line height" min={0.8} max={1.8} step={0.02} value={sel.lineHeight} onChange={(v) => change({ lineHeight: v })} fmt={(v) => v.toFixed(2)} />
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Colour</FieldLabel>
                      <SwatchRow>
                        <input type="color" value={normHex(sel.fill)} onChange={(e) => change({ fill: e.target.value })} />
                        {['#ffffff', '#0f172a', bg.palette.a1, bg.palette.a2].map((col, i) => (
                          <Swatch key={i} style={{ background: col }} onClick={() => change({ fill: col })} title={col} />
                        ))}
                      </SwatchRow>
                      <FieldLabel style={{ marginTop: 10 }}>Align text</FieldLabel>
                      <Seg>
                        {[['left', 'Left'], ['center', 'Centre'], ['right', 'Right']].map(([id, label]) => (
                          <SegBtn key={id} $on={sel.textAlign === id} onClick={() => (selCap ? setCaption(selCap, { align: id }) : change({ textAlign: id }))}>{label}</SegBtn>
                        ))}
                      </Seg>
                      {selCap && sel.studio.attach.track == null && (
                        <Muted style={{ marginTop: 6 }}>The letters are spread to the logo's full width, so left, centre and right look the same. Set the letter spacing and the label lines up with that edge of the logo.</Muted>
                      )}
                      <Row style={{ marginTop: 8 }}>
                        <Ghost onClick={() => change({ text: String(sel.text || '').toUpperCase() })}>Make uppercase</Ghost>
                      </Row>
                    </InsCell>
                    {isInterview && (
                      <InsCell>
                        <FieldLabel>Box behind the text</FieldLabel>
                        <Check>
                          <input type="checkbox" checked={!!selBox} onChange={(e) => setTextBox({ on: e.target.checked })} />
                          Show a filled box (pill or highlight bar)
                        </Check>
                        {selBox && (
                          <>
                            <SwatchRow style={{ marginTop: 8 }}>
                              <input type="color" value={normHex(selBox.color, '#000000')} onChange={(e) => setTextBox({ color: e.target.value })} />
                              {paletteSwatches.map((col, i) => (
                                <Swatch key={i} style={{ background: col }} onClick={() => setTextBox({ color: col })} title={col} />
                              ))}
                            </SwatchRow>
                            <Slider label="Side padding" min={0} max={160} step={1} value={selBox.padX} onChange={(v) => setTextBox({ padX: v })} fmt={(v) => `${Math.round(v)}px`} />
                            <Slider label="Top and bottom padding" min={0} max={100} step={1} value={selBox.padY} onChange={(v) => setTextBox({ padY: v })} fmt={(v) => `${Math.round(v)}px`} />
                            <Slider label="Corner rounding" min={0} max={160} step={1} value={Math.min(160, selBox.radius)} onChange={(v) => setTextBox({ radius: v >= 160 ? 999 : v })} fmt={(v) => (v >= 160 ? 'Pill' : `${Math.round(v)}px`)} />
                          </>
                        )}
                        {sel.studio.attach && (
                          <>
                            <Muted style={{ marginTop: 8 }}>This text follows its photo or logo and is sized to fit its width.</Muted>
                            <Row style={{ marginTop: 6 }}>
                              <Ghost onClick={detachText}>Detach it</Ghost>
                            </Row>
                          </>
                        )}
                      </InsCell>
                    )}
                  </>
                )}

                {selKind === 'photo' && (
                  <>
                    <InsCell>
                      <FieldLabel>Whole guest</FieldLabel>
                      <Slider label="Size (photo, name, title and bar together)" min={60} max={1500} step={2} value={sel.getScaledWidth()} onChange={(v) => resizeWhole(sel, v)} fmt={(v) => `${Math.round(v)}px wide`} />
                      {!selPhoto.host && sizedGuests > 1 && (
                        <Slider label="Size of all guests together" min={60} max={1500} step={2} value={sel.getScaledWidth()} onChange={(v) => scaleAllGuests(sel, v)} fmt={(v) => `${Math.round(v)}px wide`} />
                      )}
                      <Muted>
                        Dragging a corner of the photo does the same. The name and title keep their share of the size.
                        {!selPhoto.host && sizedGuests > 1 ? ' The second slider sizes every guest by the same amount, each with its photo shape, name and title; each guest stays where it is.' : ''}
                      </Muted>
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Photo</FieldLabel>
                      <Row>
                        <Ghost onClick={() => pickGuestPhoto(sel)}>{selPhoto.src ? 'Replace photo' : 'Choose photo'}</Ghost>
                        {selPhoto.src && <Ghost onClick={() => setPhoto({ src: null, srcOrig: null })}>Remove photo</Ghost>}
                      </Row>
                      {isInterview && (
                        <HostPick>
                          <span>Or use a host</span>
                          {HOSTS.map((h) => (
                            <button key={h.id} type="button" title={h.name} onClick={() => putHost(h, 'into', sel)}>
                              <img src={h.src} alt={h.name} draggable={false} />
                            </button>
                          ))}
                        </HostPick>
                      )}
                      {selPhoto.src && (
                        <>
                          <Row style={{ marginTop: 6 }}>
                            {selPhoto.srcOrig ? (
                              <Ghost onClick={() => setPhoto({ src: selPhoto.srcOrig, srcOrig: null })}>Bring the background back</Ghost>
                            ) : (
                              <Ghost onClick={cutOutPhoto} disabled={cutting}>{cutting ? 'Removing the background...' : 'Remove the background'}</Ghost>
                            )}
                          </Row>
                          <Muted style={{ marginTop: 6 }}>
                            For photos of people. It runs on your computer and the photo is not uploaded. You can also drag a picture from your computer straight onto a guest.
                          </Muted>
                        </>
                      )}
                      <FieldLabel style={{ marginTop: 10 }}>Photo look</FieldLabel>
                      <Seg>
                        {[['color', 'Colour'], ['bw', 'Black and white'], ['tint', 'Tint']].map(([id, label]) => (
                          <SegBtn key={id} $on={selPhoto.treatment === id} onClick={() => setPhoto({ treatment: id })}>{label}</SegBtn>
                        ))}
                      </Seg>
                      {selPhoto.treatment === 'tint' && (
                        <SwatchRow style={{ marginTop: 8 }}>
                          <input type="color" value={normHex(selPhoto.tintColor)} onChange={(e) => setPhoto({ tintColor: e.target.value })} />
                          {[bg.palette.a1, bg.palette.a2].map((col, i) => (
                            <Swatch key={i} style={{ background: col }} onClick={() => setPhoto({ tintColor: col })} />
                          ))}
                        </SwatchRow>
                      )}
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Mask shape</FieldLabel>
                      <Seg>
                        {[['circle', 'Circle'], ['rect', 'Rectangle'], ['polygon', 'Polygon']].map(([id, label]) => (
                          <SegBtn key={id} $on={selPhoto.shape === id} onClick={() => setPhoto({ shape: id })}>{label}</SegBtn>
                        ))}
                      </Seg>
                      {selPhoto.shape === 'polygon' && (
                        <Slider label="Sides" min={3} max={10} step={1} value={selPhoto.sides} onChange={(v) => setPhoto({ sides: v })} fmt={(v) => `${Math.round(v)}`} />
                      )}
                      {selPhoto.shape === 'rect' && (
                        <Slider label="Proportion (tall to wide)" min={0.5} max={2} step={0.01} value={selPhoto.aspect} onChange={(v) => setPhoto({ aspect: v })} fmt={(v) => (Math.abs(v - 1) < 0.01 ? 'Square' : v < 1 ? 'Tall' : 'Wide')} />
                      )}
                      {selPhoto.shape !== 'circle' && (
                        <>
                          <Slider label="Rounded corners" min={0} max={1} step={0.01} value={selPhoto.rounding} onChange={(v) => setPhoto({ rounding: v })} />
                          <Slider label="Turn the mask (the photo stays upright)" min={-180} max={180} step={1} value={selPhoto.maskAngle} onChange={(v) => setPhoto({ maskAngle: v })} fmt={(v) => `${Math.round(v)} deg`} />
                        </>
                      )}
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Photo inside the mask</FieldLabel>
                      <Slider label="Zoom" min={0.5} max={4} step={0.01} value={selPhoto.zoom} onChange={(v) => setPhoto({ zoom: v })} fmt={(v) => `${v.toFixed(2)}x`} />
                      <Slider label="Move left or right" min={-1} max={1} step={0.01} value={selPhoto.panX} onChange={(v) => setPhoto({ panX: v })} fmt={(v) => (Math.abs(v) < 0.01 ? 'Centre' : v < 0 ? 'Left' : 'Right')} />
                      <Slider label="Move up or down" min={-1} max={1} step={0.01} value={selPhoto.panY} onChange={(v) => setPhoto({ panY: v })} fmt={(v) => (Math.abs(v) < 0.01 ? 'Centre' : v < 0 ? 'Up' : 'Down')} />
                      <Muted>Zoom in a little to get room to move the photo.</Muted>
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Border</FieldLabel>
                      <Slider label="Border width" min={0} max={90} step={1} value={selPhoto.ring} onChange={(v) => setRing({ ring: v })} fmt={(v) => (v < 1 ? 'None' : `${Math.round(v)}`)} />
                      {selPhoto.ring > 0 && (
                        <SwatchRow>
                          <input type="color" value={normHex(selPhoto.ringColor)} onChange={(e) => setRing({ ringColor: e.target.value })} />
                          {paletteSwatches.map((col, i) => (
                            <Swatch key={i} style={{ background: col }} onClick={() => setRing({ ringColor: col })} />
                          ))}
                        </SwatchRow>
                      )}
                      {guestList.length > 1 && (
                        <Check>
                          <input
                            type="checkbox"
                            checked={ringAll}
                            onChange={(e) => {
                              setRingAll(e.target.checked);
                              // ticking it gives every guest this guest's border straight away
                              if (e.target.checked) setRing({ ring: selPhoto.ring, ringColor: selPhoto.ringColor }, true);
                            }}
                          />
                          Same border on every guest photo
                        </Check>
                      )}
                      <FieldLabel style={{ marginTop: 10 }}>Colour behind a cut-out photo</FieldLabel>
                      <SwatchRow>
                        <Ghost onClick={() => setPhoto({ backdrop: '' })}>None</Ghost>
                        <input type="color" value={normHex(selPhoto.backdrop, '#141414')} onChange={(e) => setPhoto({ backdrop: e.target.value })} />
                        {paletteSwatches.map((col, i) => (
                          <Swatch key={i} style={{ background: col }} onClick={() => setPhoto({ backdrop: col })} />
                        ))}
                      </SwatchRow>
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Name and title</FieldLabel>
                      <Input placeholder="Name" value={(guestText(sel, 'name') || {}).text || ''} onChange={(e) => setGuestText('name', e.target.value)} disabled={selPhoto.textStyle === 'none'} />
                      <Input placeholder="Title" style={{ marginTop: 6 }} value={(guestText(sel, 'title') || {}).text || ''} onChange={(e) => setGuestText('title', e.target.value)} disabled={selPhoto.textStyle === 'none'} />
                      <FieldLabel style={{ marginTop: 10 }}>Style</FieldLabel>
                      <Seg>
                        {[['below', 'Under photo'], ['bar', 'Label bar'], ['none', 'None']].map(([id, label]) => (
                          <SegBtn key={id} $on={selPhoto.textStyle === id} onClick={() => setGuestStyle({ textStyle: id })}>{label}</SegBtn>
                        ))}
                      </Seg>
                      {selPhoto.textStyle !== 'none' && (
                        <Seg style={{ marginTop: 6 }}>
                          {[['left', 'Left'], ['center', 'Centre'], ['right', 'Right']].map(([id, label]) => (
                            <SegBtn key={id} $on={selPhoto.textAlign === id} onClick={() => setGuestStyle({ textAlign: id })}>{label}</SegBtn>
                          ))}
                        </Seg>
                      )}
                      {selPhoto.textStyle === 'bar' && (
                        <SwatchRow style={{ marginTop: 8 }}>
                          <input type="color" value={normHex(selPhoto.barFill, '#141414')} onChange={(e) => setGuestStyle({ barFill: e.target.value })} />
                          {paletteSwatches.map((col, i) => (
                            <Swatch key={i} style={{ background: col }} onClick={() => setGuestStyle({ barFill: col })} />
                          ))}
                        </SwatchRow>
                      )}
                      <Muted style={{ marginTop: 6 }}>The name and title shrink to stay inside the photo's width. Click either one on the cover to change its font or colour.</Muted>
                    </InsCell>
                  </>
                )}

                {selKind === 'shape' && (
                  <>
                    <InsCell>
                      <FieldLabel>Fill colour</FieldLabel>
                      <SwatchRow>
                        <input type="color" value={normHex(sel.fill, '#000000')} onChange={(e) => setShape({ fill: e.target.value })} />
                        {paletteSwatches.map((col, i) => (
                          <Swatch key={i} style={{ background: col }} onClick={() => setShape({ fill: col })} title={col} />
                        ))}
                      </SwatchRow>
                    </InsCell>
                    {sel.studio.attach ? (
                      <InsCell>
                        <Muted>This bar belongs to a guest and sizes itself to the name and title. Change its style from the guest photo.</Muted>
                      </InsCell>
                    ) : (
                      <InsCell>
                        <Slider label="Width" min={10} max={W} step={2} value={sel.width} onChange={(v) => setShape({ width: v })} fmt={(v) => `${Math.round(v)}px`} />
                        <Slider label="Height" min={10} max={H} step={2} value={sel.height} onChange={(v) => setShape({ height: v })} fmt={(v) => `${Math.round(v)}px`} />
                        <Slider label="Rounded corners" min={0} max={1} step={0.01} value={sel.studio.round || 0} onChange={(v) => setShape({ round: v })} />
                        <Slider label="Grain on this shape" min={0} max={1} step={0.02} value={sel.studio.grain || 0} onChange={(v) => setShape({ grain: v })} />
                        <Muted>Only this shape gets the grain. Guests, bars and text on top of it stay clean.</Muted>
                      </InsCell>
                    )}
                  </>
                )}

                {selKind === 'logo' && (
                  <>
                    {!sel.studio.placeholder && !sel.studio.seal && sel.studio.source && (
                      <InsCell>
                        <FieldLabel>Background of this image</FieldLabel>
                        {sel.studio.sourceOrig ? (
                          <Row>
                            <Ghost onClick={restoreLogoBackground}>Bring the background back</Ghost>
                          </Row>
                        ) : (
                          <Row>
                            <Ghost onClick={cutOutLogoPerson} disabled={cutting}>{cutting ? 'Removing the background...' : 'Remove the background'}</Ghost>
                            <Ghost onClick={removeLogoBackground} disabled={cutting}>Remove plain background</Ghost>
                          </Row>
                        )}
                        <Muted style={{ marginTop: 6 }}>
                          "Remove the background" is for photos of people; it runs on your computer and the image is not uploaded. "Remove plain background" is for a logo on one flat colour.
                        </Muted>
                      </InsCell>
                    )}
                    <InsCell>
                      <FieldLabel>{sel.studio.seal ? 'Seal colour' : 'Logo colour'}</FieldLabel>
                      <Seg>
                        {[['original', sel.studio.seal ? 'Full colour' : 'Original'], ['white', 'White'], ['black', 'Black'], ['custom', 'Custom']].map(([id, label]) => (
                          <SegBtn key={id} $on={sel.studio.tint === id} onClick={() => setTint(id)}>{label}</SegBtn>
                        ))}
                      </Seg>
                      {sel.studio.tint === 'custom' && (
                        <SwatchRow style={{ marginTop: 8 }}>
                          <input type="color" value={normHex(sel.studio.tintColor)} onChange={(e) => setTint('custom', e.target.value)} />
                          {[bg.palette.a1, bg.palette.a2].map((col, i) => (
                            <Swatch key={i} style={{ background: col }} onClick={() => setTint('custom', col)} />
                          ))}
                        </SwatchRow>
                      )}
                    </InsCell>
                    <InsCell>
                      <Slider
                        label="Size"
                        min={40}
                        max={1700}
                        step={2}
                        value={sel.getScaledWidth()}
                        onChange={(v) => change({ scaleX: v / sel.width, scaleY: v / sel.width })}
                        fmt={(v) => `${Math.round(v)}px wide`}
                      />
                    </InsCell>
                    {isInterview && !sel.studio.seal && (
                      <InsCell>
                        <FieldLabel>Label under the logo</FieldLabel>
                        <Check>
                          <input type="checkbox" checked={!!guestText(sel, 'caption')} onChange={(e) => toggleCaption(e.target.checked)} />
                          Small "ECOSYSTEM" label under this logo
                        </Check>
                        {logoCap && (
                          <>
                            <Slider label="Label size" min={6} max={60} step={0.5} value={logoCap.fontSize} onChange={(v) => setCaption(sel, { size: v })} fmt={(v) => `${v.toFixed(1)}px`} />
                            <Slider label="Label letter spacing" min={0} max={3000} step={10} value={logoCap.charSpacing} onChange={(v) => setCaption(sel, { spacing: v })} fmt={(v) => `${Math.round(v)}`} />
                            <Row>
                              <Ghost onClick={() => setCaption(sel, { spacing: null })} disabled={logoCap.studio.attach.track == null}>Spread to the logo's width</Ghost>
                            </Row>
                            <FieldLabel style={{ marginTop: 10 }}>Line the label up with the logo's</FieldLabel>
                            <Seg>
                              {[['left', 'Left edge'], ['center', 'Centre'], ['right', 'Right edge']].map(([id, label]) => (
                                <SegBtn key={id} $on={(logoCap.studio.attach.align || 'center') === id} onClick={() => setCaption(sel, { align: id })}>{label}</SegBtn>
                              ))}
                            </Seg>
                            <Muted style={{ marginTop: 6 }}>The letters spread to the logo's width until you set the spacing yourself.</Muted>
                          </>
                        )}
                      </InsCell>
                    )}
                    {isInterview && !sel.studio.seal && (
                      <InsCell>
                        <FieldLabel>{sel.studio.placeholder ? 'Choose the logo for this spot' : 'Change this logo'}</FieldLabel>
                        <Muted>
                          {sel.studio.placeholder
                            ? 'Click a logo from the library, or use a file. It takes this spot and size.'
                            : 'Click a logo from the library to swap it in at the same place and size.'}
                        </Muted>
                        <Input style={{ marginTop: 8 }} placeholder="Search networks and companies" value={swapQuery} onChange={(e) => setSwapQuery(e.target.value)} />
                        {mostUsedLogos.length > 0 && !swapQuery && (
                          <>
                            <FieldLabel style={{ marginTop: 10 }}>Most used</FieldLabel>
                            <LogoGrid style={{ marginTop: 6 }}>{mostUsedLogos.map((l) => logoTile(l, swapLogoFromLibrary, `swap:${l.symbol}`, 'Loading...'))}</LogoGrid>
                            <FieldLabel style={{ marginTop: 10 }}>All logos</FieldLabel>
                          </>
                        )}
                        <LogoGrid style={{ maxHeight: 250, marginTop: 8 }}>
                          {swapLogos.map((l) => (
                            <LogoTile key={`${l.group}_${l.symbol}`} onClick={() => swapLogoFromLibrary(l)} disabled={!!addingLogo} title={`${l.name} (${l.symbol})`}>
                              <LogoThumb>
                                <img
                                  src={`${apiBase}/api/cover-generator/logo-preview/${encodeURIComponent(l.symbol)}`}
                                  alt=""
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.visibility = 'hidden';
                                  }}
                                />
                              </LogoThumb>
                              <span>{addingLogo === `swap:${l.symbol}` ? 'Loading...' : l.name}</span>
                            </LogoTile>
                          ))}
                        </LogoGrid>
                        {swapLogos.length === 0 && <Muted style={{ marginTop: 6 }}>No match in the library. Use a file instead.</Muted>}
                        {allLogos.length > swapLogos.length && !swapQuery && <Muted style={{ marginTop: 6 }}>Showing the first {swapLogos.length}. Search to find the rest.</Muted>}
                        <Row style={{ marginTop: 8 }}>
                          <Ghost onClick={() => pickReplaceLogo(sel)}>Use a file from my computer</Ghost>
                        </Row>
                      </InsCell>
                    )}
                    {sel.studio.colors && sel.studio.colors.length > 0 && bg.kind === 'template' && (
                      <InsCell>
                        <FieldLabel>Match the background to this logo</FieldLabel>
                        <SwatchRow>
                          {sel.studio.colors.map((col) => (
                            <Swatch key={col} style={{ background: col }} title={`Use ${col} as the accent`} onClick={() => setColor('a1', col)} />
                          ))}
                        </SwatchRow>
                        <Muted style={{ marginTop: 6 }}>Click a colour to make it the background accent.</Muted>
                      </InsCell>
                    )}
                  </>
                )}

                <InsCell>
                  <Slider label="Opacity" min={0.05} max={1} step={0.01} value={sel.opacity} onChange={(v) => change({ opacity: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Check>
                    <input type="checkbox" checked={!!sel.shadow} onChange={(e) => change({ shadow: e.target.checked ? softShadow() : null })} />
                    Soft shadow
                  </Check>
                </InsCell>
                <InsCell>
                  <FieldLabel>Place on cover</FieldLabel>
                  <Seg>
                    {[['left', 'Left'], ['hcenter', 'Centre'], ['right', 'Right']].map(([id, label]) => (
                      <SegBtn key={id} onClick={() => alignTo(id)}>{label}</SegBtn>
                    ))}
                  </Seg>
                  <Seg style={{ marginTop: 6 }}>
                    {[['top', 'Top'], ['vcenter', 'Middle'], ['bottom', 'Bottom']].map(([id, label]) => (
                      <SegBtn key={id} onClick={() => alignTo(id)}>{label}</SegBtn>
                    ))}
                  </Seg>
                </InsCell>
              </InsGrid>
            </>
          )}
          </PanelBody>
        )}
      </Panel>

      {/* ------------------------------ canvas side ------------------------------ */}
      <Main>
        <Toolbar>
          <Group>
            <Tool disabled={hist.index <= 0} onClick={undo} title="Undo (Cmd/Ctrl+Z)">Undo</Tool>
            <Tool disabled={hist.index >= hist.stack.length - 1} onClick={redo} title="Redo (Shift+Cmd/Ctrl+Z)">Redo</Tool>
          </Group>
          {!isInterview && (
          <Group>
            <ToolLabel>Layout</ToolLabel>
            <Tool onClick={() => applyLayout('center')} title="Logo centred, text centred below">Centred</Tool>
            <Tool onClick={() => applyLayout('left')} title="Logo left, text right">Logo left</Tool>
            <Tool onClick={() => applyLayout('bottom')} title="Small logo top-left, headline bottom-left">Headline low</Tool>
          </Group>
          )}
          <Group>
            <ToolCheck>
              <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> Safe area
            </ToolCheck>
            <ToolCheck title="Pull items to the centre lines and safe margins while dragging. Hold Option/Alt to place freely.">
              <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Snap
            </ToolCheck>
          </Group>
          {!isInterview && (
          <Group>
            <ToolLabel>Watermark</ToolLabel>
            <Seg>
              <SegBtn $on={watermark} onClick={() => chooseWatermark(true)} title="Show the Genfinity watermark on this cover">
                On
              </SegBtn>
              <SegBtn $on={!watermark} onClick={() => chooseWatermark(false)} title="No watermark on this cover">
                Off
              </SegBtn>
            </Seg>
          </Group>
          )}
          <Group title={alignCount < 2 ? 'Select two or more items first: hold Shift and click them, or drag a box around them' : undefined}>
            <ToolLabel>Align</ToolLabel>
            <AlignTools count={alignCount} onAlign={alignSelected} />
          </Group>
          <Group title="Sizes the selected piece as a whole: a guest with its name and title, Hosted by with its badge, or everything you have selected. Drag a part on the cover to size only that part.">
            <ToolLabel>Size</ToolLabel>
            <ToolRange
              type="range"
              aria-label="Size of the selected piece"
              min={30}
              max={Math.round(W * 1.2)}
              step={2}
              value={sizeNow ? Math.round(sizeNow) : 30}
              disabled={!sizeNow}
              onChange={(e) => scalePieces(Number(e.target.value))}
            />
            <ToolValue>{sizeNow ? `${Math.round(sizeNow)} px` : ''}</ToolValue>
          </Group>
          <Spacer />
          <Group>
            <Tool onClick={download}>Download PNG</Tool>
            {!isInterview && <SaveBtn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save to profile'}</SaveBtn>}
          </Group>
        </Toolbar>

        {isInterview && plateGuests.length > 0 && (
          <NameBar>
            <NameHead>
              <ToolLabel>Names and titles</ToolLabel>
              <NameNote>Type here. Each line keeps the layout's size and gets smaller only if it is too long for its plate.</NameNote>
              {plateGuests.length > 1 && (
                <Group>
                  <ToolLabel>Align all</ToolLabel>
                  <AlignSet value={plateAlign} onPick={(a) => plateGuests.forEach((o) => setGuestStyleOf(o, { textAlign: a }))} />
                </Group>
              )}
            </NameHead>
            <NameGrid>
              {plateGuests.map((o, i) => (
                <NameCell key={i} $on={selection.includes(o)}>
                  <NameNum>{i + 1}</NameNum>
                  <NameFields>
                    <NameInput
                      placeholder="Name"
                      aria-label={`Guest ${i + 1} name`}
                      value={(guestText(o, 'name') || {}).text || ''}
                      onFocus={() => pointAt(o)}
                      onChange={(e) => setGuestTextOf(o, 'name', e.target.value)}
                    />
                    <NameInput
                      placeholder="Title"
                      aria-label={`Guest ${i + 1} title`}
                      value={(guestText(o, 'title') || {}).text || ''}
                      onFocus={() => pointAt(o)}
                      onChange={(e) => setGuestTextOf(o, 'title', e.target.value)}
                    />
                  </NameFields>
                  <AlignSet value={o.studio.textAlign || 'center'} onPick={(a) => setGuestStyleOf(o, { textAlign: a })} />
                </NameCell>
              ))}
            </NameGrid>
          </NameBar>
        )}

        <Stage ref={stageRef} $ratio={`${W} / ${H}`} onDragOver={onStageDragOver} onDragLeave={onStageDragLeave} onDrop={onStageDrop}>
          <BgLayer ref={bgCanvasRef} width={W} height={H} />
          <GrainLayer
            ref={grainViewRef}
            style={{
              opacity: grainOpacity(bg.grain),
              zIndex: bg.grainOnTop ? 3 : 1,
              display: bg.grain > 0 ? 'block' : 'none',
            }}
          />
          <CanvasHost ref={hostRef} />
          <GrainLayer ref={shapeGrainViewRef} style={{ zIndex: 2, display: 'none' }} />
          {dropBox && (
            <DropBox style={{ left: `${dropBox.left}%`, top: `${dropBox.top}%`, width: `${dropBox.width}%`, height: `${dropBox.height}%` }}>
              <span>{dropBox.label}</span>
            </DropBox>
          )}
          {showGuides && <SafeBox $w={W} $h={H} />}
          {guides.v !== null && <GuideV style={{ left: `${(guides.v / W) * 100}%` }} />}
          {guides.h !== null && <GuideH style={{ top: `${(guides.h / H) * 100}%` }} />}
          {objectCount === 0 && (
            <EmptyHint>
              <b>{isInterview ? 'Pick a layout to start, or add guests, logos and text yourself.' : 'Start with a background, then add a logo and a headline.'}</b>
              <span>Everything you add can be dragged, scaled and restyled. Exports at {W} x {H}.</span>
            </EmptyHint>
          )}
        </Stage>

        <FootHint>
          Click anything on the cover to edit it in the side panel. Drag a corner to scale, hold Shift to scale from the centre. Hold Option/Alt while dragging to place freely without snapping. Double-click text to type. Arrow keys nudge, Delete removes, Cmd/Ctrl+D duplicates, Cmd/Ctrl+Z undoes.
        </FootHint>
      </Main>
    </Wrap>
  );
}

// ----- small labelled slider -----
function Slider({ label, min, max, step, value, onChange, fmt }) {
  const v = Number.isFinite(Number(value)) ? Number(value) : min;
  return (
    <SliderWrap>
      <div>
        <span>{label}</span>
        <em>{fmt ? fmt(v) : `${Math.round(((v - min) / (max - min)) * 100)}%`}</em>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, v))} onChange={(e) => onChange(Number(e.target.value))} />
    </SliderWrap>
  );
}

// The font list. Each name is shown in its own typeface, and pointing at one
// (or moving to it with the arrow keys) previews it on the selected text.
// A native <select> cannot do this: its options report no hover.
function FontPicker({ value, groups, onPreview, onPick }) {
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  const flat = groups.reduce((all, g) => all.concat(g.fonts), []);

  const close = useCallback(() => {
    setOpen(false);
    setHot(null);
    previewRef.current(null);
  }, []);

  // a click anywhere else closes the list and ends the preview
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', down, true);
    return () => document.removeEventListener('mousedown', down, true);
  }, [open, close]);
  useEffect(() => () => previewRef.current(null), []);

  // open on the current font
  useEffect(() => {
    if (!open || !listRef.current) return;
    const cur = listRef.current.querySelector('[aria-selected="true"]');
    if (cur) listRef.current.scrollTop = Math.max(0, cur.offsetTop - listRef.current.clientHeight / 2);
  }, [open]);

  const point = (family) => {
    setHot(family);
    onPreview(family);
  };
  const choose = (family) => {
    setOpen(false);
    setHot(null);
    onPick(family);
  };
  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && hot) {
      e.preventDefault();
      choose(hot);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const at = flat.findIndex((f) => f.family === (hot || value));
      const next = flat[Math.min(flat.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (!next) return;
      point(next.family);
      const el = listRef.current && listRef.current.querySelector(`[data-font="${next.family}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <FontBox ref={rootRef} onKeyDown={onKeyDown}>
      <FontBtn type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <span style={{ fontFamily: `"${value}", sans-serif` }}>{(flat.find((f) => f.family === value) || {}).label || value}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </FontBtn>
      {open && (
        <FontList
          ref={listRef}
          role="listbox"
          aria-label="Font"
          onMouseLeave={() => {
            setHot(null);
            onPreview(null);
          }}
        >
          {groups.map((g) => (
            <React.Fragment key={g.label}>
              <FontGroup>{g.label}</FontGroup>
              {g.fonts.map((f) => (
                <FontOpt
                  key={f.family}
                  role="option"
                  data-font={f.family}
                  aria-selected={f.family === value}
                  $on={f.family === value}
                  $hot={f.family === hot}
                  style={{
                    fontFamily: `"${f.family}", sans-serif`,
                    fontWeight: f.weights.reduce((a, b) => (Math.abs(b - 500) < Math.abs(a - 500) ? b : a)),
                    fontStyle: f.italicFirst || (f.italicOnly || []).length === f.weights.length ? 'italic' : 'normal',
                  }}
                  onMouseEnter={() => point(f.family)}
                  onClick={() => choose(f.family)}
                >
                  {f.label || f.family}
                </FontOpt>
              ))}
            </React.Fragment>
          ))}
        </FontList>
      )}
      {open && <FontTip>Point at a font to see it on the cover. Click to keep it.</FontTip>}
    </FontBox>
  );
}

// Buttons that line up the selected items, or space them out evenly.
// Each drawing is [guide line, bar, bar] on a 16 x 16 grid.
const ALIGN_TOOLS = [
  ['left', 'Line up left edges', [[2, 1, 2, 15], [4, 3, 9, 4], [4, 9, 6, 4]]],
  ['hcenter', 'Line up centres (left to right)', [[8, 1, 8, 15], [3, 3, 10, 4], [5, 9, 6, 4]]],
  ['right', 'Line up right edges', [[14, 1, 14, 15], [3, 3, 9, 4], [6, 9, 6, 4]]],
  ['top', 'Line up top edges', [[1, 2, 15, 2], [3, 4, 4, 9], [9, 4, 4, 6]]],
  ['middle', 'Line up middles (top to bottom)', [[1, 8, 15, 8], [3, 3, 4, 10], [9, 5, 4, 6]]],
  ['bottom', 'Line up bottom edges', [[1, 14, 15, 14], [3, 3, 4, 9], [9, 6, 4, 6]]],
  ['hspace', 'Space evenly left to right (three or more items)', [[2, 1, 2, 15], [6, 4, 4, 8], [14, 1, 14, 15]]],
  ['vspace', 'Space evenly top to bottom (three or more items)', [[1, 2, 15, 2], [4, 6, 8, 4], [1, 14, 15, 14]]],
];
function AlignTools({ count, onAlign }) {
  return (
    <AlignWrap role="group" aria-label="Line up selected items">
      {ALIGN_TOOLS.map(([mode, label, parts]) => (
        <AlignBtn key={mode} type="button" title={label} aria-label={label} disabled={count < (mode === 'hspace' || mode === 'vspace' ? 3 : 2)} onClick={() => onAlign(mode)}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            {parts.map((q, i) =>
              // lining up: one guide line, then two bars; spacing: a bar between two guide lines
              (mode === 'hspace' || mode === 'vspace' ? i !== 1 : i === 0) ? (
                <line key={i} x1={q[0]} y1={q[1]} x2={q[2]} y2={q[3]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <rect key={i} x={q[0]} y={q[1]} width={q[2]} height={q[3]} rx="1" fill="currentColor" />
              )
            )}
          </svg>
        </AlignBtn>
      ))}
    </AlignWrap>
  );
}

// Left / centre / right buttons for a guest's name and title.
const ALIGN_LINES = { left: [[1, 13], [1, 8], [1, 11]], center: [[2, 14], [4.5, 11.5], [3, 13]], right: [[3, 15], [8, 15], [5, 15]] };
const ALIGN_NAMES = { left: 'Left', center: 'Centre', right: 'Right' };
function AlignSet({ value, onPick }) {
  return (
    <AlignWrap role="group" aria-label="Alignment">
      {['left', 'center', 'right'].map((a) => (
        <AlignBtn key={a} type="button" $on={value === a} title={`${ALIGN_NAMES[a]} aligned`} aria-label={`${ALIGN_NAMES[a]} aligned`} aria-pressed={value === a} onClick={() => onPick(a)}>
          <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
            {ALIGN_LINES[a].map(([x1, x2], i) => (
              <line key={i} x1={x1} x2={x2} y1={2 + i * 5} y2={2 + i * 5} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ))}
          </svg>
        </AlignBtn>
      ))}
    </AlignWrap>
  );
}

// ------------------------------ styles ------------------------------
const Wrap = styled.div`
  display: grid;
  grid-template-columns: 372px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: #111111;
  border: 1px solid #222222;
  border-radius: 16px;
  overflow: hidden;
  /* 70px sticky site nav + 16px breathing room */
  position: sticky;
  top: 86px;
  max-height: calc(100vh - 102px);
  display: flex;
  flex-direction: column;

  @media (max-width: 1100px) {
    position: static;
    max-height: none;
  }
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: ${(p) => (p.$wrap ? 'wrap' : 'nowrap')};
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
`;

const Tab = styled.button`
  flex: ${(p) => (p.$quarter ? '1 1 20%' : '1 1 auto')}; /* interview: nine tabs, five to a row */
  background: ${(p) => (p.$on ? '#161616' : 'transparent')};
  color: ${(p) => (p.$on ? '#e6edf3' : '#8b949e')};
  opacity: ${(p) => (p.$dim && !p.$on ? 0.45 : 1)};
  border: none;
  border-bottom: 2px solid ${(p) => (p.$on ? '#00d4ff' : 'transparent')};
  padding: 0.85rem 0.2rem;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: #e6edf3;
  }
`;

const PanelBody = styled.div`
  padding: 1rem 1.1rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;

  /* Scrolling grids inside must keep their height; the panel itself scrolls. */
  > * {
    flex-shrink: 0;
  }
`;

const FontDrop = styled.button`
  display: block;
  width: 100%;
  padding: 0.85rem 0.75rem;
  border-radius: 10px;
  border: 1px dashed ${(p) => (p.$over ? '#00d4ff' : '#3a424d')};
  background: ${(p) => (p.$over ? 'rgba(0, 212, 255, 0.08)' : '#12161c')};
  color: #e6edf3;
  cursor: pointer;
  text-align: center;

  b {
    display: block;
    font-size: 0.86rem;
  }
  small {
    display: block;
    margin-top: 2px;
    color: #8b949e;
    font-size: 0.72rem;
  }
  &:hover {
    border-color: #00d4ff;
  }
`;

const FontRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #262c36;
  border-radius: 8px;
  background: #12161c;

  div {
    min-width: 0;
  }
  b {
    display: block;
    color: #e6edf3;
    font-size: 0.95rem;
    font-weight: 700;
  }
  small {
    display: block;
    color: #8b949e;
    font-size: 0.7rem;
    line-height: 1.35;
  }
  button {
    flex: 0 0 auto;
  }
`;

const Hint = styled.p`
  margin: 0;
  color: #8b949e;
  font-size: 0.78rem;
  line-height: 1.45;
`;

const Muted = styled.div`
  color: #8b949e;
  font-size: 0.8rem;
  line-height: 1.45;
`;

const FieldLabel = styled.div`
  color: #c9d1d9;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 0.35rem;
`;

const Seg = styled.div`
  display: flex;
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 9px;
  padding: 3px;
  gap: 3px;
`;

const SegBtn = styled.button`
  flex: 1;
  background: ${(p) => (p.$on ? '#1f2a33' : 'transparent')};
  color: ${(p) => (p.$on ? '#00d4ff' : '#c9d1d9')};
  border: none;
  border-radius: 6px;
  padding: 0.42rem 0.3rem;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${(p) => (p.$on ? '#1f2a33' : '#161616')};
  }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: max-content;
  gap: 0.55rem;
`;

const TemplateTile = styled.button`
  background: #0a0a0a;
  border: 2px solid ${(p) => (p.$on ? '#00d4ff' : '#222222')};
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  text-align: left;

  canvas {
    display: block;
    width: 100%;
    height: auto;
  }
  span {
    display: block;
    padding: 0.35rem 0.5rem 0.45rem;
    color: #e6edf3;
    font-size: 0.74rem;
    font-weight: 600;
  }
  &:hover {
    border-color: ${(p) => (p.$on ? '#00d4ff' : '#3d444d')};
  }
`;

// Fixed-ratio image box. Uses the padding-bottom technique on purpose:
// Safari collapses aspect-ratio images inside scrolling grid rows.
const Thumb = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: ${(p) => p.$ratio || 50}%;
  overflow: hidden;
  background: #050505;

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const StylePreview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: #0a0a0a;
  border: 1px solid #00d4ff;
  border-radius: 10px;
  overflow: hidden;
  padding-bottom: 0.6rem;

  b {
    color: #e6edf3;
    font-size: 0.9rem;
    padding: 0.35rem 0.7rem 0;
  }
  small {
    color: #8b949e;
    font-size: 0.74rem;
    line-height: 1.4;
    padding: 0 0.7rem;
  }
`;

const StyleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 0.55rem;
  height: 430px;
  overflow-y: auto;
  padding-right: 4px;
`;

const StyleTile = styled.div`
  background: #0a0a0a;
  border: 2px solid ${(p) => (p.$on ? '#00d4ff' : '#222222')};
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  min-width: 0;

  span {
    display: block;
    padding: 0.4rem 0.5rem 0.5rem;
    color: #e6edf3;
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.25;
  }
  &:hover {
    border-color: ${(p) => (p.$on ? '#00d4ff' : '#3d444d')};
  }
  &:focus-visible {
    outline: 2px solid #00d4ff;
    outline-offset: 1px;
  }
`;

const RecentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: max-content;
  gap: 0.4rem;
`;

const RecentTile = styled.div`
  border: 1px solid #222222;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: #0a0a0a;

  &:hover {
    border-color: #00d4ff;
  }
`;

const PaletteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
`;

const PaletteChip = styled.button`
  display: flex;
  height: 30px;
  padding: 0;
  border-radius: 7px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${(p) => (p.$on ? '#00d4ff' : '#30363d')};
  background: none;

  i {
    flex: 1;
    display: block;
  }
  i:first-child {
    flex: 2;
  }
`;

const ColorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const ColorCell = styled.label`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 0.3rem 0.45rem;
  color: #c9d1d9;
  font-size: 0.74rem;
  cursor: pointer;

  input {
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
`;

const SliderWrap = styled.label`
  display: block;

  div {
    display: flex;
    justify-content: space-between;
    color: #c9d1d9;
    font-size: 0.76rem;
    margin-bottom: 2px;
  }
  em {
    font-style: normal;
    color: #8b949e;
  }
  input {
    width: 100%;
    accent-color: #00d4ff;
  }
`;

const Check = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #c9d1d9;
  font-size: 0.78rem;
  cursor: pointer;

  input {
    accent-color: #00d4ff;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 0.5rem;

  > * {
    flex: 1;
  }
`;

const HostGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
`;

const HostCard = styled.div`
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 10px;
  padding: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 7px;
    display: block;
  }
  b {
    color: #e6edf3;
    font-size: 0.8rem;
  }
  small {
    color: #8b949e;
    font-size: 0.72rem;
    line-height: 1.3;
    margin-top: -0.25rem;
    min-height: 1.9em;
  }
  button {
    background: #161616;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 0.42rem 0.3rem;
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover {
    border-color: #00d4ff;
  }
`;

const HostPick = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 8px;

  span {
    color: #8b949e;
    font-size: 0.78rem;
  }
  button {
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #30363d;
    border-radius: 50%;
    overflow: hidden;
    background: #0a0a0a;
    cursor: pointer;
  }
  button:hover {
    border-color: #00d4ff;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const Ghost = styled.button`
  background: #161616;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 9px;
  padding: 0.55rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: #00d4ff;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

const Primary = styled.button`
  background: linear-gradient(135deg, #00d4ff, #8b5cf6);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.8rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 9px;
  color: #e6edf3;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;

  &:focus {
    outline: none;
    border-color: #00d4ff;
  }
`;

const LogoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: max-content;
  align-content: start;
  gap: 0.45rem;
  max-height: 46vh;
  overflow-y: auto;
  padding-right: 2px;
`;

const LogoTile = styled.button`
  background: #0a0a0a;
  border: 1px solid #222222;
  border-radius: 9px;
  padding: 0.4rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;

  span {
    color: #c9d1d9;
    font-size: 0.66rem;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &:hover {
    border-color: #00d4ff;
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const SealGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 0.45rem;
  max-height: 52vh;
  overflow-y: auto;
  padding-right: 2px;
`;

const SealTile = styled.button`
  background: #0a0a0a;
  border: 1px solid #222222;
  border-radius: 9px;
  padding: 0.4rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  text-align: left;

  span {
    color: #c9d1d9;
    font-size: 0.68rem;
    line-height: 1.25;
  }
  &:hover {
    border-color: #00d4ff;
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const LogoThumb = styled.div`
  background: #2b303a;
  border-radius: 6px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;

  img {
    max-width: 100%;
    max-height: 46px;
    object-fit: contain;
  }
`;

const AddText = styled.button`
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  b {
    color: #e6edf3;
  }
  small {
    color: #8b949e;
    font-size: 0.74rem;
  }
  &:hover {
    border-color: #00d4ff;
  }
`;

const LayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${(p) => (p.$on ? '#12222b' : '#0a0a0a')};
  border: 1px solid ${(p) => (p.$on ? '#00d4ff' : '#222222')};
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  cursor: pointer;

  em {
    font-style: normal;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #8b949e;
    width: 34px;
    flex-shrink: 0;
  }
  span {
    flex: 1;
    min-width: 0;
    color: #e6edf3;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button {
    background: #161616;
    border: 1px solid #30363d;
    color: #c9d1d9;
    border-radius: 6px;
    font-size: 0.68rem;
    padding: 0.2rem 0.4rem;
    cursor: pointer;
  }
`;

const Main = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const Toolbar = styled.div`
  background: #111111;
  border: 1px solid #222222;
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
`;

const NameBar = styled.div`
  background: #111111;
  border: 1px solid #222222;
  border-radius: 12px;
  padding: 0.6rem 0.7rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`;

const NameHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
`;

const NameNote = styled.span`
  color: #8b949e;
  font-size: 0.74rem;
  flex: 1;
  min-width: 200px;
`;

const NameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.5rem;
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #0a0a0a;
  border: 1px solid ${(p) => (p.$on ? '#00d4ff' : '#30363d')};
  border-radius: 10px;
  padding: 0.45rem 0.5rem;
  min-width: 0;
`;

const NameNum = styled.span`
  flex: none;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background: #1f2a33;
  color: #c9d1d9;
  font-size: 0.72rem;
  font-weight: 700;
  display: grid;
  place-items: center;
`;

const NameFields = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const NameInput = styled.input`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: #111111;
  border: 1px solid #30363d;
  border-radius: 7px;
  color: #e6edf3;
  padding: 0.36rem 0.5rem;
  font-size: 0.82rem;

  &:first-child {
    font-weight: 700;
  }

  &:focus {
    outline: none;
    border-color: #00d4ff;
  }
`;

const AlignWrap = styled.div`
  flex: none;
  display: flex;
  gap: 2px;
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 2px;
`;

const AlignBtn = styled.button`
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.6rem;
  background: ${(p) => (p.$on ? '#1f2a33' : 'transparent')};
  color: ${(p) => (p.$on ? '#00d4ff' : '#c9d1d9')};
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${(p) => (p.$on ? '#1f2a33' : '#161616')};
  }

  &:focus-visible {
    outline: 2px solid #00d4ff;
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
    background: transparent;
  }
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`;

const Spacer = styled.div`
  flex: 1;
`;

const ToolRange = styled.input`
  width: 96px;
  accent-color: #00d4ff;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const ToolValue = styled.span`
  color: #8b949e;
  font-size: 0.72rem;
  min-width: 3.1rem;
  font-variant-numeric: tabular-nums;
`;

const ToolLabel = styled.span`
  color: #8b949e;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Tool = styled.button`
  background: #161616;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 0.42rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: #00d4ff;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const ToolCheck = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #c9d1d9;
  font-size: 0.78rem;
  cursor: pointer;

  input {
    accent-color: #00d4ff;
  }
`;

const SaveBtn = styled.button`
  background: linear-gradient(135deg, #00d4ff, #8b5cf6);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.48rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const Danger = styled.button`
  background: transparent;
  color: #f85149;
  border: 1px solid #5a1e1a;
  border-radius: 8px;
  padding: 0.42rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #2a1211;
  }
`;

const Stage = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${(p) => p.$ratio || '2 / 1'};
  background: #050505;
  border: 1px solid #222222;
  border-radius: 10px;
  overflow: hidden;
  line-height: 0;
`;

const BgLayer = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
`;

// Drawn at the screen's own pixels and never resized: that is what keeps
// single-pixel grain free of any pattern.
const GrainLayer = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const CanvasHost = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
`;

const SafeBox = styled.div`
  position: absolute;
  z-index: 4;
  left: ${(p) => (SAFE / p.$w) * 100}%;
  right: ${(p) => (SAFE / p.$w) * 100}%;
  top: ${(p) => (SAFE / p.$h) * 100}%;
  bottom: ${(p) => (SAFE / p.$h) * 100}%;
  border: 1px dashed rgba(0, 212, 255, 0.55);
  pointer-events: none;
`;

const DropBox = styled.div`
  position: absolute;
  z-index: 6;
  box-sizing: border-box;
  border: 2px dashed #00d4ff;
  background: rgba(0, 212, 255, 0.12);
  pointer-events: none;
  display: grid;
  place-items: center;
  line-height: 1.2;

  span {
    background: rgba(0, 0, 0, 0.78);
    color: #e6edf3;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.3rem 0.55rem;
    border-radius: 6px;
    text-align: center;
  }
`;

const GuideV = styled.div`
  position: absolute;
  z-index: 5;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #ff3d9a;
  pointer-events: none;
`;

const GuideH = styled.div`
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  height: 1px;
  background: #ff3d9a;
  pointer-events: none;
`;

const EmptyHint = styled.div`
  position: absolute;
  z-index: 5;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
  pointer-events: none;
  line-height: 1.4;
  padding: 0.9rem 1.4rem;
  border-radius: 12px;
  background: rgba(5, 5, 5, 0.62);
  max-width: 86%;

  b {
    color: rgba(255, 255, 255, 0.92);
    font-size: 1.05rem;
    font-weight: 600;
  }
  span {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
  }
`;

const FootHint = styled.div`
  color: #6e7681;
  font-size: 0.76rem;
  line-height: 1.4;
  padding: 0 0.25rem;
`;

const InsHead = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid #222222;

  strong {
    color: #e6edf3;
    font-size: 0.9rem;
  }
`;

const InsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const InsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const InsCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  grid-column: ${(p) => (p.$wide ? '1 / -1' : 'auto')};
`;

const TextArea = styled.textarea`
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 9px;
  color: #e6edf3;
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #00d4ff;
  }
`;

const FontBox = styled.div`
  width: 100%;
`;

const FontBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 9px;
  color: #e6edf3;
  padding: 0.5rem 0.6rem;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex: none;
    color: #8b949e;
  }

  &:focus-visible,
  &[aria-expanded='true'] {
    outline: none;
    border-color: #00d4ff;
  }
`;

const FontList = styled.div`
  position: relative;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 9px;
  padding: 4px;
`;

const FontGroup = styled.div`
  color: #8b949e;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.5rem 0.5rem 0.25rem;
`;

const FontOpt = styled.div`
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  line-height: 1.25;
  color: ${(p) => (p.$on ? '#00d4ff' : '#e6edf3')};
  background: ${(p) => (p.$hot ? '#1f2a33' : 'transparent')};
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FontTip = styled.div`
  color: #8b949e;
  font-size: 0.72rem;
  margin-top: 4px;
`;

const Select = styled.select`
  background: #0a0a0a;
  border: 1px solid #30363d;
  border-radius: 9px;
  color: #e6edf3;
  padding: 0.5rem 0.6rem;
  font-size: 0.84rem;
  width: 100%;
`;

const SwatchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;

  input[type='color'] {
    width: 34px;
    height: 30px;
    padding: 0;
    border: 1px solid #30363d;
    border-radius: 7px;
    background: none;
    cursor: pointer;
  }
`;

const Swatch = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #3d444d;
  cursor: pointer;
  padding: 0;

  &:hover {
    border-color: #00d4ff;
  }
`;
