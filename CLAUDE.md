# ⚡ CLAUDE: READ THIS FIRST — Crypto News Frontend

> The full source-of-truth doc lives in the backend repo's CLAUDE.md:
> `/Users/valorkopeny/Desktop/crypto-news-curator-backend/CLAUDE.md`
> Read that first if you have any questions about what is live, what is dead, or how to deploy.

## 📍 This repo

| Thing | Value |
|---|---|
| **Local path** | `/Users/valorkopeny/crypto-news-frontend` |
| **GitHub repo** | `https://github.com/Genfinityllc/crypto-news-frontend` branch `main` |
| **Live URL** | `https://crypto-news-frontend-ruddy.vercel.app` |
| **Vercel team** | `team_kYZ8yndpCmXg5hf3sDSUQ6tZ` (NOT `valors-projects-e78ccc5f` — that's a stale dup) |
| **Deploy method** | **Git auto-deploy** — `git push origin main` → Vercel rebuilds in ~2 min |
| **Backend it talks to** | `https://crypto-news-curator-backend-production.up.railway.app` |
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
