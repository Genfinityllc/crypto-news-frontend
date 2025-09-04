# 🔍 Deployment Verification Checklist

## Backend (Railway) Checks

### ✅ Health Check
```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```
**Expected**: `{"status":"OK","timestamp":"...","uptime":...,"environment":"production"}`

### ✅ API Endpoint Check
```bash
curl https://YOUR-RAILWAY-URL.railway.app/api/news?limit=2
```
**Expected**: JSON response with articles array

### ✅ Environment Variables in Railway
Make sure these are set in Railway dashboard:
- ✅ `NODE_ENV=production`
- ✅ `SUPABASE_URL=your-actual-supabase-url`
- ✅ `SUPABASE_ANON_KEY=your-actual-supabase-key`
- ✅ `OPENAI_API_KEY=your-actual-openai-key` (optional)

---

## Frontend (Vercel) Checks

### ✅ Website Loads
Visit your Vercel URL - should show the crypto news dashboard

### ✅ Articles Display
- Articles should load and display
- Images should appear in cards
- No "localhost" references in network requests

### ✅ Environment Variables in Vercel
Make sure this is set in Vercel dashboard:
- ✅ `REACT_APP_API_URL=https://your-railway-url.railway.app/api`

### ✅ Browser Console Check
Press F12 → Console tab, look for:
- ❌ CORS errors
- ❌ 404 errors (API not found)
- ❌ Network errors

---

## Common Issues & Fixes

### 🔴 "CORS Error"
**Fix**: Add your Vercel domain to CORS in backend
```javascript
// In backend src/server.js
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:3000']
}));
```

### 🔴 "API 404 Error" 
**Fix**: Check `REACT_APP_API_URL` in Vercel environment variables

### 🔴 "Articles not loading"
**Fix**: Check Railway logs for database connection issues

### 🔴 "Images not showing"
**Fix**: Images should be working automatically with our system

---

## Success Indicators

✅ Backend health endpoint returns OK
✅ Articles API returns data
✅ Frontend loads without console errors  
✅ Articles display with images
✅ No CORS errors in browser console

## Quick Test Commands

```bash
# Test backend
curl https://YOUR-RAILWAY-URL/health
curl https://YOUR-RAILWAY-URL/api/news?limit=1

# Test frontend (visit in browser)
https://YOUR-VERCEL-URL.vercel.app
```