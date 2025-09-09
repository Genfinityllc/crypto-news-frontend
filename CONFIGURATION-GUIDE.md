# Crypto News Frontend - Configuration Guide

## Working Configuration Settings

This document records the tested, working configurations to prevent future issues.

### 🔑 Key Configuration Requirements

#### News API Source Settings
- **Main News Feed**: `source: 'hybrid'` 
- **Breaking News**: `source: 'hybrid'`
- **Search**: `source: 'hybrid'`

**Why hybrid source?**
- Hybrid returns RSS articles with images (cover_image URLs)
- AI Rewrite uses smart matching: searches for database article by title to get UUID
- Falls back to RSS rewrite if no database match found
- Best of both: images from RSS + enhanced AI rewrite via database UUIDs

#### Authentication Flow
- Login redirects to `/` (public route) NOT `/dashboard` (protected route)
- `currentUser` must be set immediately after `signInWithEmailAndPassword()` to prevent race conditions
- API 401 interceptor should only redirect from protected routes, not auth pages or public routes

#### Image Display
- Remove large image rendering: `{articleImage && (<CardImage />)}` block should be deleted
- Keep small image in `<ImageContainer>` within card layout
- Use `cover_image` field, not non-existent `card_images.medium`

#### Railway Backend Requirements
- Must have `package-lock.json` with `firebase-admin` dependency
- Firebase auth routes available at `/api/firebase-auth/*`
- Enhanced news routes at `/api/enhanced-news/:id/rewrite` for database articles

### 🚨 Common Issues & Solutions

#### Login Loop
**Cause**: API interceptor redirecting to `/login` on 401 errors during login process
**Solution**: Smart redirect logic that excludes auth pages and public routes

#### AI Rewrite Not Working  
**Cause**: Using RSS articles without IDs or RSS rewrite endpoint not deployed
**Solution**: Use `source: 'database'` for articles with UUID IDs

#### Bookmarks Not Working
**Cause**: Firebase auth routes not deployed due to missing dependencies
**Solution**: Ensure `firebase-admin` in package.json and package-lock.json exists

#### Images Not Showing
**Cause**: Looking for wrong field names or trying to show RSS images that are null
**Solution**: Use database articles with `cover_image` field, remove large image display

### 📁 Critical Files & Settings

#### `/src/services/api.js`
```javascript
// WORKING CONFIGURATION
export const getNews = (params = {}) => {
  return api.get('/news', { params: { source: 'database', ...params } });
};

// API interceptor - smart 401 handling
if (error.response?.status === 401) {
  localStorage.removeItem('firebaseToken');
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath === '/login' || currentPath === '/signup';
  const isPublicRoute = currentPath === '/' || currentPath === '/dashboard';
  
  if (!isAuthPage && !isPublicRoute) {
    window.location.href = '/login';
  }
}
```

#### `/src/contexts/AuthContext.js`
```javascript
// CRITICAL: Set currentUser immediately
async function signin(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  setCurrentUser(result.user); // MUST BE IMMEDIATE
  // ... rest of function
}
```

#### `/src/components/auth/LoginForm.js`  
```javascript
// WORKING: Navigate to public route
await signin(formData.email, formData.password);
navigate('/'); // NOT '/dashboard'
```

#### `/src/components/news/NewsCard.js`
```javascript
// REMOVE large image rendering:
// {articleImage && (<CardImage src={articleImage} />)}

// KEEP small image in ImageContainer:
<ImageContainer>
  {articleImage ? (
    <ArticleImage src={articleImage} />
  ) : (
    <PlaceholderImage>📰</PlaceholderImage>
  )}
</ImageContainer>
```

### 🔄 Deployment Dependencies

#### Railway Backend
- `firebase-admin@^12.0.0` in package.json
- Generated package-lock.json (run `npm install` locally)
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (trimmed)

#### Vercel Frontend  
- No special dependencies
- Environment variables: `REACT_APP_API_URL` pointing to Railway backend

### ⚡ Quick Troubleshooting

1. **Login Loop**: Check API interceptor redirect logic
2. **AI Rewrite Fails**: Confirm using `source: 'hybrid'` with smart matching fallback
3. **Bookmarks Fail**: Test Firebase auth routes with curl  
4. **Images Missing**: Verify using `cover_image` field from hybrid RSS articles
5. **Railway Deploy Fails**: Check package-lock.json exists with all dependencies

### 🚨🔒 CRITICAL: LOCKED CONFIGURATION - NEVER MODIFY! 🔒🚨

**⚠️ WARNING: The following configuration is 100% WORKING and TESTED ⚠️**
**🚫 CHANGING ANY PART OF THIS WILL BREAK THE APPLICATION! 🚫**

## 🔐 Protected Components:

### 1. 🔒 API Source Configuration (api.js)
```javascript
// 🔒 LOCKED - DO NOT CHANGE 'hybrid' SOURCE
source: 'hybrid'  // CRITICAL for both images AND AI rewrite
```
**Why hybrid is essential:**
- RSS articles provide `cover_image` URLs for image display
- Smart search finds database matches for AI rewrite UUIDs
- Perfect balance of functionality

### 2. 🔒 AI Rewrite Logic (NewsCard.js)
```javascript
// 🔒 CRITICAL LOGIC - DO NOT MODIFY
const searchResponse = await searchNews(article.title, { source: 'database', limit: 1 });
const dbArticle = searchResponse.data?.[0];

if (dbArticle && dbArticle.id) {
  response = await generateAIRewrite(dbArticle.id); // Enhanced rewrite
} else {
  response = await rewriteRSSArticle(articleData); // RSS fallback
}
```

### 3. 🔒 Image Loading Order (NewsCard.js)  
```javascript
// 🔒 DO NOT CHANGE THIS ORDER
const articleImage = generatedImage || aiRewrite?.cardImage || article.cover_image || article.image_url || null;
```
**Critical:** `article.cover_image` from hybrid RSS source is primary image source!

### 4. 🔒 Vercel CSP Configuration (vercel.json)
```json
{
  "Content-Security-Policy": "img-src 'self' data: https: http:; connect-src 'self' https://crypto-news-curator-backend-production.up.railway.app https://images.weserv.nl"
}
```
**Critical:** Allows `images.weserv.nl` CDN for image loading on production!

## 🚫 WHAT NOT TO CHANGE:

1. **NEVER** change `source: 'hybrid'` to `'database'` or `'rss'`
2. **NEVER** modify the AI rewrite search logic in NewsCard.js
3. **NEVER** change the image loading priority order
4. **NEVER** remove CSP headers from vercel.json
5. **NEVER** change the Railway API URL
6. **NEVER** modify the searchNews database fallback logic

## ✅ What You CAN Safely Modify:

- UI styling and colors
- Additional features that don't touch core news fetching
- Non-critical components outside of NewsCard and api.js
- Add new pages or routes

## 🔥 EMERGENCY RESTORE:

If something breaks, immediately restore these exact settings:
1. API calls: `source: 'hybrid'` 
2. AI rewrite: Search database by title → use UUID → fallback to RSS
3. Images: `cover_image` from RSS hybrid response
4. CSP: Allow `images.weserv.nl` domain

**🎯 TESTED WORKING STATE: September 9, 2025**
**📍 Last verified: AI rewrite ✅ | Images ✅ | Bookmarks ✅**

### 📝 Testing Commands

```bash
# Test Firebase auth routes
curl -s "https://crypto-news-curator-backend-production.up.railway.app/api/firebase-auth/verify-token" -X POST -H "Content-Type: application/json" -d '{"idToken":"test"}'

# Test database articles (should have IDs)
curl -s "https://crypto-news-curator-backend-production.up.railway.app/api/news?source=database&limit=1" | jq '.data[0].id'

# Test AI rewrite (should return success: true)
curl -s -X POST "https://crypto-news-curator-backend-production.up.railway.app/api/enhanced-news/[ARTICLE_ID]/rewrite" | jq '.success'
```

---

**Last Updated**: 2025-09-08  
**Working Configuration Verified**: ✅ All features functional