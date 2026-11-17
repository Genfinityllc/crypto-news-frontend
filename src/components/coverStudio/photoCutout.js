// Background removal for guest photos, done in the visitor's own browser.
//
// The model is MODNet (portrait matting, Apache 2.0), run with onnxruntime-web
// (MIT) as plain single-threaded WebAssembly. Nothing is uploaded and nothing
// costs money per photo. The model file (26 MB) and the runtime are fetched
// only the first time someone presses the button.
//
// Why it is set up this way on the live site (see vercel.json):
// - every file is imported through webpack so it is served from /static/,
//   the only place that is not answered with index.html;
// - no worker and no threads: workers would need blob: URLs and threads need
//   cross-origin isolation, and the site's policy allows neither;
// - the .wasm files come from the installed onnxruntime-web by relative path,
//   because the package does not export them by name. They always match the
//   installed version that way.
import modelUrl from './models/modnet.onnx';
import wasmUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm.wasm';
import wasmSimdUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm';

let ready = null;

function load() {
  if (!ready) {
    ready = (async () => {
      const mod = await import('onnxruntime-web');
      const ort = mod.InferenceSession ? mod : mod.default;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = { 'ort-wasm.wasm': wasmUrl, 'ort-wasm-simd.wasm': wasmSimdUrl };
      const res = await fetch(modelUrl);
      if (!res.ok) throw new Error('model not found');
      const bytes = new Uint8Array(await res.arrayBuffer());
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
      return { ort, session };
    })().catch((e) => {
      ready = null; // let the next press try again
      throw e;
    });
  }
  return ready;
}

// The model wants sides that are multiples of 32, with the shorter side near
// 512 (the size it was trained at); very long pictures are capped.
function workSize(sw, sh) {
  let k = 512 / Math.min(sw, sh);
  if (Math.max(sw, sh) * k > 1024) k = 1024 / Math.max(sw, sh);
  const fit = (v) => Math.max(32, Math.round((v * k) / 32) * 32);
  return [fit(sw), fit(sh)];
}

// source: a canvas or image. Returns a canvas of the same size with the
// background made transparent, or null when no person was found in it.
export async function cutOutPerson(source) {
  const { ort, session } = await load();
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const [w, h] = workSize(sw, sh);

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sg = small.getContext('2d', { willReadFrequently: true });
  sg.imageSmoothingQuality = 'high';
  sg.drawImage(source, 0, 0, w, h);
  const px = sg.getImageData(0, 0, w, h).data;
  const n = w * h;
  const input = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    input[i] = px[i * 4] / 127.5 - 1;
    input[n + i] = px[i * 4 + 1] / 127.5 - 1;
    input[n * 2 + i] = px[i * 4 + 2] / 127.5 - 1;
  }

  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, h, w]) });
  const matte = out[session.outputNames[0]].data;

  // The matte becomes the alpha of a small white sheet, which is then
  // stretched smoothly over the full-size photo. Faint haze in the
  // background and faint holes in the person are closed by the curve.
  const sheet = sg.createImageData(w, h);
  let kept = 0;
  for (let i = 0; i < n; i += 1) {
    const a = Math.min(1, Math.max(0, (matte[i] - 0.06) / 0.88));
    kept += a;
    sheet.data[i * 4] = 255;
    sheet.data[i * 4 + 1] = 255;
    sheet.data[i * 4 + 2] = 255;
    sheet.data[i * 4 + 3] = Math.round(a * 255);
  }
  if (kept / n < 0.02) return null;
  sg.putImageData(sheet, 0, 0);

  const cut = document.createElement('canvas');
  cut.width = sw;
  cut.height = sh;
  const g = cut.getContext('2d');
  g.drawImage(source, 0, 0, sw, sh);
  g.globalCompositeOperation = 'destination-in';
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, sw, sh);
  g.globalCompositeOperation = 'source-over';
  return cut;
}
