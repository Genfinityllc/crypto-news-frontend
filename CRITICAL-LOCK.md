# 🚨🔒 CRITICAL CONFIGURATION LOCK 🔒🚨

## ⚠️ STOP! READ THIS BEFORE MAKING CHANGES ⚠️

**This application has a WORKING configuration for:**
- ✅ AI Rewrite functionality 
- ✅ Image loading on Vercel
- ✅ Bookmark system

**Date Locked:** September 9, 2025  
**Last Tested:** All features confirmed working  
**Status:** 🟢 PRODUCTION READY

---

## 🚫 PROTECTED FILES - DO NOT MODIFY

### 1. `/src/services/api.js`
**PROTECTED LINES:** 76-92  
**CRITICAL SETTING:** `source: 'hybrid'` in all news API calls  
**WHY:** Essential for both image loading AND AI rewrite functionality

### 2. `/src/components/news/NewsCard.js` 
**PROTECTED LINES:** 699-738 (AI rewrite logic)  
**PROTECTED LINES:** 633 (Image loading order)  
**CRITICAL LOGIC:** Smart hybrid search for database articles by title  
**WHY:** Only way AI rewrite works with RSS articles

### 3. `/vercel.json`
**PROTECTED:** Entire CSP headers section  
**CRITICAL:** `images.weserv.nl` domain whitelist  
**WHY:** Images blocked on Vercel without proper CSP

### 4. `/.env`
**PROTECTED:** `REACT_APP_API_URL`  
**CRITICAL:** Must point to exact Railway backend URL  
**WHY:** Wrong URL breaks all API communication

---

## 🔥 EMERGENCY RESTORATION

If you accidentally break something, restore these EXACT values:

```javascript
// api.js - Line 77, 81, 88
source: 'hybrid'

// NewsCard.js - Line 717  
{ source: 'database', limit: 1 }

// NewsCard.js - Line 633
generatedImage || aiRewrite?.cardImage || article.cover_image || article.image_url || null

// vercel.json - CSP header
"img-src 'self' data: https: http:; connect-src 'self' https://crypto-news-curator-backend-production.up.railway.app https://images.weserv.nl"
```

---

## ✅ SAFE CHANGES

You CAN modify:
- CSS/styling in any component
- Add new pages/routes  
- Add new components (not touching NewsCard core logic)
- Update README/documentation
- Add new API endpoints (not modifying existing ones)

## 🚫 DANGEROUS CHANGES  

**NEVER:**
- Change `source` parameter from 'hybrid' 
- Modify AI rewrite search logic
- Remove CSP headers
- Change image loading priority order
- Update Railway API URL without testing
- Remove searchNews import

---

## 🧪 BEFORE MAKING CHANGES

1. **Test locally first** - Verify on localhost:3002
2. **Check all features** - AI rewrite, images, bookmarks  
3. **Test on Vercel** - Deploy and verify production works
4. **Document changes** - Update this file if you modify anything

---

## 📞 RECOVERY CONTACTS

- **Configuration Guide:** `/CONFIGURATION-GUIDE.md`
- **Working Git Commit:** `0b7cedc` (September 9, 2025)
- **Backup Instructions:** Git reset to last working commit if needed

**🛡️ REMEMBER: IF IT'S WORKING, DON'T TOUCH IT! 🛡️**