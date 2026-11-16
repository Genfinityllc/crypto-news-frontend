# ⚡ CLAUDE: READ THIS FIRST — Crypto News Frontend

> The full source-of-truth doc lives in the backend repo's CLAUDE.md:
> `/Users/valorkopeny/crypto-news-curator-backend/CLAUDE.md`
> Read that first if you have any questions about what is live, what is dead, or how to deploy.

## 📍 This repo

| Thing | Value |
|---|---|
| **Local path** | `/Users/valorkopeny/crypto-news-frontend` |
| **GitHub repo** | `https://github.com/Genfinityllc/crypto-news-frontend` branch `main` |
| **Live URL** | `https://crypto-news-frontend-ruddy.vercel.app` |
| **Vercel team** | `team_kYZ8yndpCmXg5hf3sDSUQ6tZ` (NOT `valors-projects-e78ccc5f` — that's a stale dup) |
| **Deploy method** | **Git auto-deploy** — `git push origin main` → Vercel rebuilds in ~2 min |
| **Backend it talks to** | `https://crypto-news-curator-backend-production.up.railway.app` (also git-auto-deploys from its own `main`) |
| **Cover generator UI** | `src/pages/CoverGenerator.js` |

## 🚨 Hard rule
**Never run `vercel --prod` directly.** That bypasses git and desyncs the live site from GitHub `main`. This is exactly the mess we cleaned up on 2026-06-15 — don't recreate it.

The only correct deploy flow is:
```bash
git add <files>
git commit -m "..."
git push origin main
# Vercel auto-deploys. Watch https://crypto-news-frontend-ruddy.vercel.app
```

## 🛠 GitHub auth on this Mac
`gh auth` is logged in as `ValtronXRP` (token in macOS keychain). Has Write access to `Genfinityllc/crypto-news-frontend` (granted 2026-06-15). `git push origin main` just works — no PAT prompts.

Do NOT swap to `valor-cmd` — that identity is used for unrelated repos (`trading-platform`, `pod-etsy-system`, `hedera-ecosystem-map`).

## 🔑 Accounts & Connections (verified 2026-06-17)

| Service | Account / Owner | How this Mac authenticates |
|---|---|---|
| **GitHub** (`Genfinityllc/crypto-news-frontend`) | `Genfinityllc` org | `gh auth` as `ValtronXRP` (Write access granted 2026-06-15) |
| **Vercel** (project `crypto-news-frontend`) | Team `team_kYZ8yndpCmXg5hf3sDSUQ6tZ` (Genfinity team) | `vercel` CLI logged in — but you should NOT use `vercel --prod`. Deploys happen automatically via the GitHub integration. |
| **Backend it calls** | Railway service `crypto-news-curator-backend` under project `intelligent-contentment` (`8979a89d-75ee-40f7-a47f-7a5d7ecaa2b2`), Railway account `support@genfinity.io` | Frontend just hits the public URL `https://crypto-news-curator-backend-production.up.railway.app`. No auth handshake on this side. |
| **Reference image storage** | Supabase project `daqxnvcfmepjzcgfdrdf`, bucket `logos`, folder `references/` | Backend handles all writes via its `SUPABASE_SERVICE_KEY`. Frontend never talks to Supabase directly. |
| **Image generation** | Wavespeed Nano-Banana-Pro | Frontend never sees the API key — backend holds `WAVESPEED_API_KEY` env var on Railway. |

### Stale things to ignore
- Vercel scope `valors-projects-e78ccc5f` — old duplicate of the project under personal account, not connected to the `-ruddy` URL.
- Any branch other than `main`.
- Old `main.<hash>.js` build files that were deployed pre-2026-06-15 via direct `vercel --prod` from local (we cleaned this up; never recreate it).

### Quick "where do I change X" cheat sheet
| I want to… | Do this |
|---|---|
| Deploy a frontend change | `git push origin main` → Vercel auto-rebuilds in ~2 min |
| Add/change an env var the frontend reads at build time | Vercel dashboard → team `team_kYZ8yndpCmXg5hf3sDSUQ6tZ` → project `crypto-news-frontend` → Settings → Environment Variables → push any commit to trigger a fresh build |
| Look up a backend route the frontend hits | They all live under `${REACT_APP_API_BASE || https://crypto-news-curator-backend-production.up.railway.app}/api/cover-generator/*`. See backend `CLAUDE.md` for the full route table. |
| Add a new brand logo to the dropdown | Use the in-app "Upload Logo" form (no code change). Backend writes to local + Supabase. |

## 🔴 Do NOT modify these (deprecated)
Anything in the frontend that talks to LoRA, RunPod, HuggingFace Spaces, or any old AI cover endpoint other than `/api/cover-generator/*` is dead. See backend `CLAUDE.md` for the full list.

## 🟢 What's live
Only the Wavespeed Nano-Banana-Pro flow via these backend endpoints:
- `POST /api/cover-generator/generate`
- `POST /api/cover-generator/upload-logo`
- `GET  /api/cover-generator/networks`
- `GET  /api/cover-generator/logo-info/:symbol`
- `GET  /api/cover-generator/logo-preview/:symbol`
- `POST /api/cover-generator/save`
- `/api/style-catalog/*`, `/api/logos/*`, `/api/client-networks/*`

The whole cover generator UI lives in `src/pages/CoverGenerator.js`. Everything else in the app (news feed, auth, admin, etc.) is unrelated to the cover generator and should not be touched when working on cover features.

## Design Studio (2026-11-16)
The Cover Generator page has two modes: **Generate with AI** (the original flow) and **Design Studio**.
- Code: `src/components/coverStudio/CoverStudio.js` (editor) and `src/components/coverStudio/backgrounds.js` (flat procedural templates, palettes, grain). Uses `fabric` v7.
- The canvas backing store is always 1800x900 and is scaled with CSS only, so the export is exactly what is on screen. Do not change the canvas size.
- Logos load from `/api/cover-generator/logo-preview/:symbol` with `crossOrigin="anonymous"`. Anything drawn on the canvas must be CORS-enabled or the export is blocked.
- Use gradients and paths only in `backgrounds.js` (no `ctx.filter`, Safari does not support it).
- **Grain is never resized.** Fine (single-pixel) grain is the default the owner wants, and it only stays pattern-free when shown pixel for pixel; resizing it creates a woven ripple (moire). So the editor is three stacked layers inside `Stage`: `BgLayer` (1800x900 background, CSS-scaled, no grain), `GrainLayer` (one grain field at exactly the screen's device pixels, strength = CSS opacity), then the transparent fabric canvas (logos, text, watermark). The downloaded file is composed separately in `exportDataUrl()` with grain drawn at 1800x900. Do not put grain back into a CSS-scaled canvas. "Coarser grain" is the soft blurred variant. Thumbnails always use the soft variant.
- **The owner uses Safari.** Fixed-ratio thumbnails use the `Thumb` padding-bottom box, never `aspect-ratio` on an image inside a scrolling grid (Safari collapses those rows into strips). Scrolling grids set `grid-auto-rows: max-content`. Check new UI in real Safari (`safaridriver`), and tell the owner before opening an automation window: touching it shows a "remotely controlled" prompt.
- Template house rules (owner feedback 2026-11-16): dark fields only, never white or light backgrounds. No hard colour blocks, panels, diagonal splits, overlapping discs or light beams. Soft glows, fine line work and grain are what the owner wants.
- No emojis and no em dashes in UI copy.
- **The live site has a strict Content-Security-Policy and a catch-all route (both in `vercel.json`) that localhost does not have.** Anything new must respect them: fonts are self-hosted (`studioFonts.js`, `@fontsource/*`, no font CDN), images may be `https:` or `data:` but never `blob:`, `fetch()` of a `data:` URL is blocked, and files in `public/` outside `/static/` and `/logos/` are answered with `index.html` (so assets are imported through webpack, like the watermark). Always verify on the live URL after a deploy.
- Local dev: launch config `crypto-news-frontend` (port 3000, which the backend CORS allowlist accepts).

## 🗺 Recent cover-generator UI changes
- **2026-06-17 — Phase 4-ext3** (commit `9677ce5`): Reference Image + Prompt section now accepts up to **14 ref images** (Wavespeed cap), with drag-and-drop (`RefDropZone`) and a thumbnail grid (`RefThumbGrid`) with per-image × remove. State changed from `refImageUrl` (string) → `refImageUrls` (array). Generate payload sends `referenceImageUrls` array + legacy `referenceImageUrl` (first item) for back-compat.
- **2026-06-17 — Phase 4-ext A** (commit `e0fc28a`): Generate button now enables when ref image + custom prompt are present even with no network/style (PURE REF mode). Previously the button stayed disabled in that combo.
- **2026-06-16 — Phase 4** (commit `84cca1b`): Original Reference Image + Prompt section, single image, two behavior chips (Style Reference / Composition Restyle).

See the backend CLAUDE.md "Roadmap" section for the full feature changelog with backend commit refs.
