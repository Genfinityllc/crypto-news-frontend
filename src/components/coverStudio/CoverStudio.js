import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { Canvas, FabricImage, Textbox, Shadow } from 'fabric';
import {
  COVER_W,
  COVER_H,
  PALETTES,
  TEMPLATES,
  renderBackground,
  drawGrain,
  extractLogoColors,
  isLight,
} from './backgrounds';
import './studioFonts';
import watermarkUrl from './genfinity-watermark.png';

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
  { family: 'Barlow Condensed', weights: [500, 600, 700], kind: 'Condensed' },
  { family: 'Playfair Display', weights: [400, 600, 700, 800], kind: 'Serif' },
  { family: 'Source Serif 4', weights: [400, 600, 700], kind: 'Serif' },
  { family: 'Newsreader', weights: [400, 500, 700], kind: 'Serif' },
  { family: 'Fraunces', weights: [400, 600, 800], kind: 'Serif' },
  { family: 'DM Serif Display', weights: [400], kind: 'Serif' },
  { family: 'IBM Plex Mono', weights: [400, 500, 600], kind: 'Mono' },
];
const WEIGHT_NAMES = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold' };

// Canvas text is measured the moment it is drawn, so the font file must be in
// memory first or the text box wraps with fallback metrics.
async function ensureFont(family, weight) {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.race([
      document.fonts.load(`${weight} 64px "${family}"`),
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

const softShadow = () => new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 34, offsetX: 0, offsetY: 14 });

const normHex = (v, fallback = '#ffffff') => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? v : fallback);

const DEFAULT_BG = {
  kind: 'template',
  templateId: 'fields',
  paletteId: 'midnight',
  palette: { base: PALETTES[0].base, a1: PALETTES[0].a1, a2: PALETTES[0].a2 },
  intensity: 1,
  seed: 1,
  flip: false,
  grain: 0.4,
  grainCoarse: false,
  grainOnTop: false,
  vignette: 0.25,
  dim: 0,
  image: null,
  imageLabel: '',
};

// ----- small template thumbnail (re-renders with the current palette) -----
function TemplateThumb({ templateId, palette, seed }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    renderBackground(ref.current, { kind: 'template', templateId, palette, intensity: 1, seed, grain: 0.25, vignette: 0.15 });
  }, [templateId, palette, seed]);
  return <canvas ref={ref} width={240} height={120} />;
}

export default function CoverStudio({
  apiBase,
  networks = [],
  companies = [],
  styles = [],
  currentUser,
  incoming,
  active = true,
  onSaved,
}) {
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const fabricRef = useRef(null);
  const bgCanvasRef = useRef(null);
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
  // New items are arranged for you until you move something by hand.
  const autoLayoutRef = useRef({ on: true, id: 'center' });
  const prevTabRef = useRef('background');
  const applyLayoutRef = useRef(null);

  const [bg, setBgState] = useState(DEFAULT_BG);
  const [watermark, setWatermark] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [guides, setGuides] = useState({ v: null, h: null });
  const [, setTick] = useState(0);
  const [leftTab, setLeftTab] = useState('background');
  const [bgTab, setBgTab] = useState('templates');
  const [logoQuery, setLogoQuery] = useState('');
  const [addingLogo, setAddingLogo] = useState('');
  const [aiStyle, setAiStyle] = useState('');
  const [aiSpace, setAiSpace] = useState('center');
  const [aiUseColors, setAiUseColors] = useState(false);
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
    if (o.studio && o.studio.kind === 'text') {
      Object.assign(p, {
        text: o.text,
        fontFamily: o.fontFamily,
        fontWeight: o.fontWeight,
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
        const { shadowOn, tint, tintColor, ...props } = p;
        o.set(props);
        o.set('shadow', shadowOn ? softShadow() : null);
        if (o.studio && o.studio.kind === 'logo' && (o.studio.tint !== tint || o.studio.tintColor !== tintColor)) {
          o.studio.tint = tint;
          o.studio.tintColor = tintColor;
          o.setElement(tintedCanvas(o.studio.source, tint, tintColor));
        }
        o.setCoords();
        c.add(o);
      });
      c.requestRenderAll();
      bump();
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
      width: COVER_W,
      height: COVER_H,
      preserveObjectStacking: true,
      enableRetinaScaling: false,
      backgroundColor: '#050505',
      selectionColor: 'rgba(0,212,255,0.08)',
      selectionBorderColor: '#00d4ff',
      uniformScaling: true,
    });
    fabricRef.current = c;

    const bgC = document.createElement('canvas');
    bgC.width = COVER_W;
    bgC.height = COVER_H;
    bgCanvasRef.current = bgC;
    const ovC = document.createElement('canvas');
    ovC.width = COVER_W;
    ovC.height = COVER_H;
    overlayCanvasRef.current = ovC;

    const fixed = { originX: 'left', originY: 'top', left: 0, top: 0, selectable: false, evented: false, objectCaching: false };
    bgObjRef.current = new FabricImage(bgC, fixed);
    c.backgroundImage = bgObjRef.current;
    overlayObjRef.current = new FabricImage(ovC, fixed);
    c.overlayImage = overlayObjRef.current;

    const onSel = () => bump();
    c.on('selection:created', onSel);
    c.on('selection:updated', onSel);
    c.on('selection:cleared', () => {
      setLeftTab((t) => (t === 'edit' ? prevTabRef.current : t));
      bump();
    });
    // Clicking something on the cover opens its controls beside the canvas.
    c.on('mouse:down', (e) => {
      if (e.target) {
        setLeftTab((t) => {
          if (t !== 'edit') prevTabRef.current = t;
          return 'edit';
        });
      }
    });
    c.on('text:changed', onSel);
    c.on('text:editing:exited', () => commit());

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
      autoLayoutRef.current.on = false;
      commit();
      bump();
    });

    // Snap to the centre lines and the safe margins while dragging.
    c.on('object:moving', (e) => {
      const o = e.target;
      if (!o) return;
      const T = 9 / (displayScaleRef.current || 0.5);
      const br = o.getBoundingRect();
      const pick = (cands) => {
        let best = null;
        cands.forEach(([d, line]) => {
          if (Math.abs(d) < T && (!best || Math.abs(d) < Math.abs(best[0]))) best = [d, line];
        });
        return best;
      };
      const sx = pick([
        [COVER_W / 2 - (br.left + br.width / 2), COVER_W / 2],
        [SAFE - br.left, SAFE],
        [COVER_W - SAFE - (br.left + br.width), COVER_W - SAFE],
      ]);
      const sy = pick([
        [COVER_H / 2 - (br.top + br.height / 2), COVER_H / 2],
        [SAFE - br.top, SAFE],
        [COVER_H - SAFE - (br.top + br.height), COVER_H - SAFE],
      ]);
      if (sx) o.set('left', o.left + sx[0]);
      if (sy) o.set('top', o.top + sy[0]);
      setGuides((g) => {
        const v = sx ? sx[1] : null;
        const h = sy ? sy[1] : null;
        return g.v === v && g.h === h ? g : { v, h };
      });
    });
    c.on('mouse:up', () => setGuides((g) => (g.v === null && g.h === null ? g : { v: null, h: null })));

    // Fit the 1800x900 canvas to the available width (CSS only: the backing
    // store stays 1800x900 so the export never changes).
    const fit = () => {
      const w = Math.floor(stageRef.current ? stageRef.current.clientWidth : 0);
      if (!w) return;
      displayScaleRef.current = w / COVER_W;
      c.setDimensions({ width: `${w}px`, height: `${Math.round(w / 2)}px` }, { cssOnly: true });
      c.getObjects().forEach((o) => {
        styleObject(o);
        o.setCoords();
      });
      c.calcOffset();
      c.requestRenderAll();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(stageRef.current);
    fit();

    loadImage(watermarkUrl, false)
      .then((img) => {
        wmImgRef.current = img;
        drawOverlay();
      })
      .catch(() => {});

    ensureFont('Inter', 700);
    ensureFont('Inter', 400);

    renderBackground(bgC, bgRef.current, { skipGrain: bgRef.current.grainOnTop });
    drawOverlay();
    c.requestRenderAll();
    commit();

    return () => {
      ro.disconnect();
      clearTimeout(commitTimer.current);
      fabricRef.current = null;
      c.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
      // fabric wraps the canvas in a container div; clear whatever is left
      while (host.firstChild) host.removeChild(host.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- overlay: optional top grain + watermark ----------
  const watermarkRef = useRef(true);
  const drawOverlay = useCallback(() => {
    const ov = overlayCanvasRef.current;
    const c = fabricRef.current;
    if (!ov || !c) return;
    const g = ov.getContext('2d');
    g.clearRect(0, 0, COVER_W, COVER_H);
    const b = bgRef.current;
    if (b.grainOnTop) drawGrain(g, COVER_W, COVER_H, b.grain, b.grainCoarse, 3);
    const wm = wmImgRef.current;
    if (watermarkRef.current && wm) {
      // Same locked placement as the server watermark: centred, 5px low.
      const ww = wm.naturalWidth;
      const wh = wm.naturalHeight;
      g.drawImage(wm, Math.round((COVER_W - ww) / 2), COVER_H - wh + 5);
    }
    if (overlayObjRef.current) overlayObjRef.current.dirty = true;
    c.requestRenderAll();
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
      renderBackground(bgCanvasRef.current, bg, { skipGrain: bg.grainOnTop });
      if (bgObjRef.current) bgObjRef.current.dirty = true;
      drawOverlay();
    });
    return () => cancelAnimationFrame(id);
  }, [bg, drawOverlay]);

  // ---------- incoming cover from the Generate tab ----------
  useEffect(() => {
    if (!incoming || !incoming.url) return;
    let cancelled = false;
    loadImage(corsUrl(incoming.url))
      .then((img) => {
        if (cancelled) return;
        setBg({ kind: 'image', image: img, imageLabel: 'Generated cover', dim: 0, vignette: 0, grain: 0 });
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
      const source = prepareLogo(img);
      const existing = c.getObjects().filter((o) => o.studio && o.studio.kind === 'logo').length;
      const o = new FabricImage(tintedCanvas(source, 'original'), {
        originX: 'center',
        originY: 'center',
        left: COVER_W / 2 + existing * 46,
        top: COVER_H / 2 + existing * 46,
        objectCaching: false,
      });
      o.studio = {
        kind: 'logo',
        symbol: meta.symbol || '',
        name: meta.name || meta.symbol || 'Logo',
        tint: 'original',
        tintColor: '#ffffff',
        source,
        colors: extractLogoColors(source),
      };
      o.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
      fitLogo(o, 640, 320);
      styleObject(o);
      c.add(o);
      if (autoLayoutRef.current.on && applyLayoutRef.current) applyLayoutRef.current(autoLayoutRef.current.id, true);
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
        addLogoFromImage(img, entry);
      } catch (e) {
        toast.error(`No logo file found for ${entry.name || entry.symbol}. Upload it in the logo manager first.`);
      } finally {
        setAddingLogo('');
      }
    },
    [addLogoFromImage, addingLogo, apiBase]
  );

  const onLogoFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    readFileAsDataUrl(file)
      .then((url) => loadImage(url, false))
      .then((img) => addLogoFromImage(img, { symbol: '', name: file.name.replace(/\.[^.]+$/, '') }))
      .catch(() => toast.error('Could not read that image.'));
  };

  const TEXT_PRESETS = {
    headline: { text: 'Your headline goes here', fontSize: 92, fontWeight: 700, width: 1180, charSpacing: -12, lineHeight: 1.06, opacity: 1 },
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
      const y = { headline: COVER_H / 2, subhead: COVER_H / 2 + 150, label: COVER_H / 2 - 150 }[role];
      const o = new Textbox(p.text, {
        originX: 'center',
        originY: 'center',
        left: COVER_W / 2,
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
    c.remove(...list);
    c.requestRenderAll();
    commit();
    bump();
  }, [bump, commit]);

  const duplicate = useCallback(async () => {
    const c = fabricRef.current;
    const o = active1();
    if (!c || !o) return;
    const cl = await o.clone();
    cl.studio = { ...o.studio };
    cl.set({ left: o.left + 40, top: o.top + 40, originX: 'center', originY: 'center' });
    if (o.studio.kind === 'logo') cl.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
    else cl.setControlsVisibility({ mt: false, mb: false });
    styleObject(cl);
    c.add(cl);
    c.setActiveObject(cl);
    c.requestRenderAll();
    commit();
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, commit, styleObject]);

  const reorder = (o, how) => {
    const c = fabricRef.current;
    if (!c || !o) return;
    if (how === 'front') c.bringObjectToFront(o);
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
    if (where === 'hcenter') d.x = COVER_W / 2 - (br.left + br.width / 2);
    if (where === 'right') d.x = COVER_W - SAFE - (br.left + br.width);
    if (where === 'top') d.y = SAFE - br.top;
    if (where === 'vcenter') d.y = COVER_H / 2 - (br.top + br.height / 2);
    if (where === 'bottom') d.y = COVER_H - SAFE - (br.top + br.height);
    o.set({ left: o.left + d.x, top: o.top + d.y });
    o.setCoords();
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
    o.setElement(tintedCanvas(o.studio.source, mode, o.studio.tintColor));
    c.requestRenderAll();
    commitSoon();
    bump();
  };

  const setFont = async (family, weight) => {
    const o = active1();
    if (!o) return;
    const def = FONTS.find((f) => f.family === family) || FONTS[0];
    const w = def.weights.includes(Number(weight)) ? Number(weight) : def.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
    await ensureFont(family, w);
    change({ fontFamily: family, fontWeight: w });
  };

  // ---------- one-click layouts ----------
  const applyLayout = (id, auto = false) => {
    const c = fabricRef.current;
    if (!c) return;
    if (!auto) autoLayoutRef.current = { on: true, id };
    const objs = c.getObjects();
    const logos = objs.filter((o) => o.studio && o.studio.kind === 'logo');
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
    const floor = watermarkRef.current ? 735 : COVER_H - SAFE;
    const textHeight = () => texts.reduce((s, t) => s + t.height, 0) + 26 * Math.max(0, texts.length - 1);
    if (id === 'center') {
      if (!texts.length) {
        rowLogos(COVER_W / 2, watermarkRef.current ? 410 : COVER_H / 2, 1200, 340);
      } else {
        // Measure the text first, then centre logo + text as one block.
        stackText(COVER_W / 2, 1400, 'center', 'top', 0);
        const logoH = logos.length ? 210 : 0;
        const gapLT = logos.length ? 64 : 0;
        const block = logoH + gapLT + textHeight();
        const top = Math.max(SAFE - 20, (SAFE + floor) / 2 - block / 2);
        rowLogos(COVER_W / 2, top + logoH / 2, 1200, logoH || 1);
        stackText(COVER_W / 2, 1400, 'center', 'top', top + logoH + gapLT);
      }
    } else if (id === 'left') {
      rowLogos(COVER_W * 0.22, COVER_H / 2, 520, 340);
      stackText(COVER_W * 0.44, COVER_W * 0.5, 'left', 'center', COVER_H / 2);
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
      setBg({ kind: 'image', image: img, imageLabel: label || 'Image', dim: 0 });
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
      .then((img) => setBg({ kind: 'image', image: img, imageLabel: file.name, dim: 0 }))
      .catch(() => toast.error('Could not read that image.'));
  };

  // ---------- export ----------
  const exportDataUrl = () => {
    const c = fabricRef.current;
    if (!c) return null;
    c.discardActiveObject();
    c.renderAll();
    try {
      return c.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false });
    } catch (e) {
      toast.error('Export was blocked by an image that does not allow reuse. Remove the last image you added and try again.');
      return null;
    }
  };

  const exportLabel = () => {
    const c = fabricRef.current;
    const logo = c && c.getObjects().find((o) => o.studio && o.studio.kind === 'logo' && o.studio.symbol);
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
  const shownLogos = useMemo(() => {
    const q = logoQuery.trim().toLowerCase();
    const list = q
      ? allLogos.filter((l) => (l.name || '').toLowerCase().includes(q) || (l.symbol || '').toLowerCase().includes(q))
      : allLogos;
    return list.slice(0, 72);
  }, [allLogos, logoQuery]);

  const applyPalette = (p) => setBg({ paletteId: p.id, palette: { base: p.base, a1: p.a1, a2: p.a2 } });
  const setColor = (key, value) => setBg((prev) => ({ paletteId: 'custom', palette: { ...prev.palette, [key]: value } }));
  const selFont = selKind === 'text' ? FONTS.find((f) => f.family === sel.fontFamily) || FONTS[0] : null;
  const layerName = (o) =>
    o.studio && o.studio.kind === 'text'
      ? String(o.text || '').replace(/\s+/g, ' ').slice(0, 26) || 'Text'
      : (o.studio && o.studio.name) || 'Logo';

  return (
    <Wrap>
      {/* ------------------------------ left panel ------------------------------ */}
      <Panel>
        <Tabs>
          {[
            ['background', 'Background'],
            ['logos', 'Logos'],
            ['text', 'Text'],
            ['layers', `Layers${objectCount ? ` (${objectCount})` : ''}`],
            ['edit', 'Edit'],
          ].map(([id, label]) => (
            <Tab key={id} $on={leftTab === id} $dim={id === 'edit' && selection.length === 0} onClick={() => setLeftTab(id)}>
              {label}
            </Tab>
          ))}
        </Tabs>

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
                      <TemplateThumb templateId={t.id} palette={bg.palette} seed={bg.seed} />
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

            <FieldLabel>Finish</FieldLabel>
            {bg.kind === 'template' && (
              <Slider label="Intensity" min={0.2} max={1.5} step={0.05} value={bg.intensity} onChange={(v) => setBg({ intensity: v })} />
            )}
            {bg.kind === 'image' && (
              <Slider label="Darken" min={0} max={0.8} step={0.02} value={bg.dim} onChange={(v) => setBg({ dim: v })} />
            )}
            <Slider label="Grain" min={0} max={1} step={0.02} value={bg.grain} onChange={(v) => setBg({ grain: v })} />
            <Slider label="Vignette" min={0} max={1} step={0.02} value={bg.vignette} onChange={(v) => setBg({ vignette: v })} />
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
            <Hint>Click a logo to drop it on the cover. Add as many as you need, then drag and scale them.</Hint>
            <Input placeholder="Search networks and companies" value={logoQuery} onChange={(e) => setLogoQuery(e.target.value)} />
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
            <input ref={logoFileRef} type="file" accept="image/png,image/svg+xml,image/webp" hidden onChange={onLogoFile} />
            <Hint>Files added here are used for this cover only. They are not saved to the logo library.</Hint>
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
                <em>{o.studio && o.studio.kind === 'text' ? 'Text' : 'Logo'}</em>
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

          {sel && (
            <>
              <InsHead>
                <strong>{selKind === 'text' ? 'Text' : 'Logo'}: {layerName(sel)}</strong>
                <Group>
                  <Tool onClick={duplicate}>Duplicate</Tool>
                  <Tool onClick={() => reorder(sel, 'front')}>To front</Tool>
                  <Tool onClick={() => reorder(sel, 'back')}>To back</Tool>
                  <Danger onClick={removeSelected}>Delete</Danger>
                </Group>
              </InsHead>

              <InsGrid>
                {selKind === 'text' && (
                  <>
                    <InsCell $wide>
                      <FieldLabel>Text</FieldLabel>
                      <TextArea rows={2} value={sel.text} onChange={(e) => change({ text: e.target.value })} />
                    </InsCell>
                    <InsCell>
                      <FieldLabel>Font</FieldLabel>
                      <Select value={sel.fontFamily} onChange={(e) => setFont(e.target.value, sel.fontWeight)}>
                        {['Sans', 'Condensed', 'Serif', 'Mono'].map((kind) => (
                          <optgroup key={kind} label={kind}>
                            {FONTS.filter((f) => f.kind === kind).map((f) => (
                              <option key={f.family} value={f.family}>{f.family}</option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                      <Select value={sel.fontWeight} onChange={(e) => setFont(sel.fontFamily, Number(e.target.value))} style={{ marginTop: 6 }}>
                        {selFont.weights.map((w) => (
                          <option key={w} value={w}>{WEIGHT_NAMES[w] || w}</option>
                        ))}
                      </Select>
                    </InsCell>
                    <InsCell>
                      <Slider label="Size" min={12} max={260} step={1} value={sel.fontSize} onChange={(v) => change({ fontSize: v })} fmt={(v) => `${Math.round(v)}px`} />
                      <Slider label="Letter spacing" min={-80} max={500} step={5} value={sel.charSpacing} onChange={(v) => change({ charSpacing: v })} fmt={(v) => `${Math.round(v)}`} />
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
                          <SegBtn key={id} $on={sel.textAlign === id} onClick={() => change({ textAlign: id })}>{label}</SegBtn>
                        ))}
                      </Seg>
                      <Row style={{ marginTop: 8 }}>
                        <Ghost onClick={() => change({ text: String(sel.text || '').toUpperCase() })}>Make uppercase</Ghost>
                      </Row>
                    </InsCell>
                  </>
                )}

                {selKind === 'logo' && (
                  <>
                    <InsCell>
                      <FieldLabel>Logo colour</FieldLabel>
                      <Seg>
                        {[['original', 'Original'], ['white', 'White'], ['black', 'Black'], ['custom', 'Custom']].map(([id, label]) => (
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
          <Group>
            <ToolLabel>Layout</ToolLabel>
            <Tool onClick={() => applyLayout('center')} title="Logo centred, text centred below">Centred</Tool>
            <Tool onClick={() => applyLayout('left')} title="Logo left, text right">Logo left</Tool>
            <Tool onClick={() => applyLayout('bottom')} title="Small logo top-left, headline bottom-left">Headline low</Tool>
          </Group>
          <Group>
            <ToolCheck>
              <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> Safe area
            </ToolCheck>
            <ToolCheck>
              <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> Watermark
            </ToolCheck>
          </Group>
          <Spacer />
          <Group>
            <Tool onClick={download}>Download PNG</Tool>
            <SaveBtn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save to profile'}</SaveBtn>
          </Group>
        </Toolbar>

        <Stage ref={stageRef}>
          <div ref={hostRef} />
          {showGuides && <SafeBox />}
          {guides.v !== null && <GuideV style={{ left: `${(guides.v / COVER_W) * 100}%` }} />}
          {guides.h !== null && <GuideH style={{ top: `${(guides.h / COVER_H) * 100}%` }} />}
          {objectCount === 0 && (
            <EmptyHint>
              <b>Start with a background, then add a logo and a headline.</b>
              <span>Everything you add can be dragged, scaled and restyled. Exports at 1800 x 900.</span>
            </EmptyHint>
          )}
        </Stage>

        <FootHint>
          Click anything on the cover to edit it in the side panel. Double-click text to type. Arrow keys nudge, Delete removes, Cmd/Ctrl+D duplicates, Cmd/Ctrl+Z undoes.
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
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
`;

const Tab = styled.button`
  flex: 1 1 auto;
  background: ${(p) => (p.$on ? '#161616' : 'transparent')};
  color: ${(p) => (p.$on ? '#e6edf3' : '#8b949e')};
  opacity: ${(p) => (p.$dim && !p.$on ? 0.45 : 1)};
  border: none;
  border-bottom: 2px solid ${(p) => (p.$on ? '#00d4ff' : 'transparent')};
  padding: 0.85rem 0.3rem;
  font-size: 0.78rem;
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

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`;

const Spacer = styled.div`
  flex: 1;
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
  aspect-ratio: 2 / 1;
  background: #050505;
  border: 1px solid #222222;
  border-radius: 10px;
  overflow: hidden;
  line-height: 0;
`;

const SafeBox = styled.div`
  position: absolute;
  left: ${(SAFE / COVER_W) * 100}%;
  right: ${(SAFE / COVER_W) * 100}%;
  top: ${(SAFE / COVER_H) * 100}%;
  bottom: ${(SAFE / COVER_H) * 100}%;
  border: 1px dashed rgba(0, 212, 255, 0.55);
  pointer-events: none;
`;

const GuideV = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #ff3d9a;
  pointer-events: none;
`;

const GuideH = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #ff3d9a;
  pointer-events: none;
`;

const EmptyHint = styled.div`
  position: absolute;
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
