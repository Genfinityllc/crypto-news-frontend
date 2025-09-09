# Crypto News Frontend - Configuration Guide

## Working Configuration Settings

This document records the tested, working configurations to prevent future issues.

### 🔑 Key Configuration Requirements

#### News API Source Settings
- **Main News Feed**: `source: 'database'` 
- **Breaking News**: `source: 'database'`
- **Search**: `source: 'database'`

**Why database source?**
- Database articles have proper UUID IDs required for AI rewrite functionality
- RSS articles have `null` IDs which don't work with `/api/enhanced-news/:id/rewrite` endpoint
- RSS rewrite endpoint `/api/news/rewrite-rss-article` exists but often not deployed on Railway

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
2. **AI Rewrite Fails**: Confirm using `source: 'database'` 
3. **Bookmarks Fail**: Test Firebase auth routes with curl
4. **Images Missing**: Verify using `cover_image` field from database articles
5. **Railway Deploy Fails**: Check package-lock.json exists with all dependencies

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