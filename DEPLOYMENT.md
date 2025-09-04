# 🚀 Crypto News App Deployment Guide

Your app has two parts:
- **Frontend** (React app) → Deploy to **Vercel** 
- **Backend** (Node.js API) → Deploy to **Railway**

## 📋 Prerequisites

1. **GitHub Account**: [github.com](https://github.com)
2. **Vercel Account**: [vercel.com](https://vercel.com) (free)
3. **Railway Account**: [railway.app](https://railway.app) (free tier)

---

## 🔧 Step 1: Deploy Backend to Railway

### 1.1 Push backend to GitHub (if not done)
```bash
cd /Users/valorkopeny/crypto-news-curator-backend
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 1.2 Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `crypto-news-curator-backend` repository
5. Railway will auto-deploy using the `railway.json` config

### 1.3 Set Environment Variables in Railway
In Railway dashboard → Your Project → Variables tab, add:
```
NODE_ENV=production
PORT=3001
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
OPENAI_API_KEY=your-openai-key
```

### 1.4 Get Backend URL
Railway will give you a URL like: `https://your-app-name.railway.app`

---

## 🎨 Step 2: Deploy Frontend to Vercel

### 2.1 Create frontend repository
```bash
cd /Users/valorkopeny/crypto-news-frontend
git add .
git commit -m "Initial commit"
```

Create a new repository on GitHub for the frontend, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/crypto-news-frontend.git
git branch -M main
git push -u origin main
```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import `crypto-news-frontend` repository
5. Configure build settings:
   - **Framework Preset**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 2.3 Set Environment Variables in Vercel
In Vercel dashboard → Your Project → Settings → Environment Variables:
```
REACT_APP_API_URL=https://your-railway-backend-url.railway.app/api
```

---

## ✅ Step 3: Test Your Deployment

1. **Backend Health Check**: Visit `https://your-railway-app.railway.app/health`
2. **Frontend**: Visit your Vercel URL (like `https://your-app.vercel.app`)

---

## 🔄 Future Updates

### Update Backend:
```bash
cd /Users/valorkopeny/crypto-news-curator-backend
git add .
git commit -m "Update backend"
git push origin main
# Railway auto-deploys
```

### Update Frontend:
```bash
cd /Users/valorkopeny/crypto-news-frontend
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys
```

---

## 🎯 What You'll Get

- **Frontend URL**: `https://your-crypto-news-app.vercel.app`
- **Backend API**: `https://your-backend.railway.app/api`
- **Automatic deployments** when you push to GitHub
- **Free hosting** (with generous limits)

Your crypto news app will be live on the internet! 🌐