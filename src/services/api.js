import axios from 'axios';

// Create axios instance with base configuration
const baseURL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL
  : 'http://localhost:3001/api';

console.log('API Base URL:', baseURL);

const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('firebaseToken');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('firebaseToken');
      // Only redirect if not on login/signup pages and user should be authenticated
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/signup';
      const isPublicRoute = currentPath === '/' || currentPath === '/dashboard';
      
      if (!isAuthPage && !isPublicRoute) {
        // Only redirect from protected routes that require authentication
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth API calls
export const createProfile = (idToken, profileData) => {
  return api.post('/firebase-auth/create-profile', profileData, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
};

export const getUserProfile = (idToken) => {
  return api.get('/firebase-auth/profile', {
    headers: { Authorization: `Bearer ${idToken}` }
  });
};

export const updateUserProfile = (profileData) => {
  return api.put('/firebase-auth/profile', profileData);
};

export const verifyToken = (idToken) => {
  return api.post('/firebase-auth/verify-token', { idToken });
};

// =====================================================
// 🔒 LOCKED CONFIGURATION - DO NOT MODIFY! 🔒
// =====================================================
// These API calls use 'source: hybrid' which is CRITICAL for:
// - Image loading: RSS articles provide cover_image URLs
// - AI rewrite: Smart matching to database articles by title
// CHANGING THESE WILL BREAK IMAGES AND AI REWRITE!
// =====================================================

// News API calls  
export const getNews = (params = {}) => {
  return api.get('/news', { params: { source: 'hybrid', ...params } }); // 🔒 DO NOT CHANGE 'hybrid'
};

export const getBreakingNews = () => {
  return api.get('/news', { params: { breaking: true, limit: 10, source: 'hybrid' } }); // 🔒 DO NOT CHANGE 'hybrid'
};

export const searchNews = (query, options = {}) => {
  return api.get('/news', { 
    params: { 
      search: query,
      source: 'hybrid', // 🔒 DO NOT CHANGE 'hybrid' - needed for AI rewrite search
      ...options 
    } 
  });
};

export const getArticleById = (id) => {
  return api.get(`/news/${id}`);
};

// Helper function to check if image is a placeholder
const isPlaceholderImage = (url) => {
  if (!url) return true;
  return url.includes('placehold.co') || 
         url.includes('placeholder') || 
         url.includes('via.placeholder') ||
         url.includes('text=') || 
         url.includes('lorem') ||
         url.includes('Generated%20') ||
         url.includes('generated');
};

// Helper function to check if article has a real image
const hasRealImage = (article) => {
  return !isPlaceholderImage(article.cover_image) || 
         !isPlaceholderImage(article.image_url) ||
         (article.card_images && !isPlaceholderImage(article.card_images.medium));
};

// =====================================================
// ⚡ OPTIMIZED FAST NEWS API - 13x PERFORMANCE BOOST ⚡
// =====================================================
// These new endpoints use 4-day caching for lightning-fast responses

export const getFastNews = async (category = 'all', params = {}) => {
  try {
    const response = await api.get('/fast-news', { 
      params: { 
        category, 
        _t: Date.now(), // Cache busting parameter
        ...params 
      } 
    });
    
    // Filter out articles that only have placeholder images
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.filter(article => hasRealImage(article));
      console.log(`🖼️ Filtered out articles with placeholder images. Showing ${response.data.length} articles with real images.`);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching fast news:', error);
    throw error;
  }
};

export const getFastBreakingNews = async () => {
  try {
    const response = await api.get('/fast-news', { params: { category: 'breaking' } });
    
    // Filter out articles that only have placeholder images
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.filter(article => hasRealImage(article));
      console.log(`🖼️ Breaking news filtered: ${response.data.length} articles with real images.`);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching breaking news:', error);
    throw error;
  }
};

export const getFastClientNews = async () => {
  try {
    const response = await api.get('/fast-news', { 
      params: { 
        network: 'clients', 
        limit: 200,
        _cacheBust: Date.now()
      } 
    });
    
    // Filter out articles that only have placeholder images
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.filter(article => hasRealImage(article));
      console.log(`🖼️ Client news filtered: ${response.data.length} articles with real images.`);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching client news:', error);
    throw error;
  }
};

export const getClientCounts = () => {
  return api.get('/fast-news/client-counts');
};

export const getCacheStats = () => {
  return api.get('/cache/stats');
};

// Bookmark API calls
export const addBookmark = (articleId) => {
  return api.post('/firebase-auth/bookmarks', { articleId });
};

export const getBookmarks = () => {
  return api.get('/firebase-auth/bookmarks');
};

export const removeBookmark = (bookmarkId) => {
  return api.delete(`/firebase-auth/bookmarks/${bookmarkId}`);
};

// RSS Article Bookmarks
export const addRSSBookmark = (articleData, userId) => {
  return api.post('/news/bookmark-rss-article', { articleData, userId });
};

export const getRSSBookmarks = (userId) => {
  return api.get(`/news/rss-bookmarks/${userId}`);
};

export const removeRSSBookmark = (bookmarkId, userId) => {
  return api.delete(`/news/rss-bookmarks/${bookmarkId}?userId=${userId}`);
};

// AI API calls
export const generateAISummary = (articleId) => {
  return api.post(`/news/summarize/${articleId}`);
};

export const generateAIRewrite = (articleId) => {
  return api.post(`/enhanced-news/${articleId}/rewrite`);
};

// Crypto Market API calls
export const getCryptoMarketData = () => {
  return api.get('/crypto-market/top50');
};

export const getCryptoBySymbol = (symbol) => {
  return api.get(`/crypto-market/symbol/${symbol}`);
};

export const getTrendingCryptos = (limit = 10) => {
  return api.get('/crypto-market/trending', { params: { limit } });
};

export const getCryptoDropdownOptions = () => {
  return api.get('/crypto-market/dropdown');
};

// Enhanced News API calls
export const getViralNews = (minScore = 75, limit = 200) => {
  return api.get('/enhanced-news/viral', { params: { min_score: minScore, limit } });
};

export const getHighReadabilityNews = (minScore = 97, limit = 200) => {
  return api.get('/enhanced-news/high-readability', { params: { min_score: minScore, limit } });
};

export const rewriteArticle = (articleId) => {
  return api.post(`/enhanced-news/${articleId}/rewrite`);
};

// Enhanced Client News API calls
export const getEnhancedClientNews = (params = {}) => {
  return api.get('/enhanced-client-news', { params });
};

export const getCachedClientNews = (limit = 500) => {
  return api.get('/enhanced-client-news/cached', { params: { limit } });
};

// Article Management API calls
export const getArticleCounts = () => {
  return api.get('/article-management/counts');
};

export const getArticleStats = () => {
  return api.get('/article-management/stats');
};

export const rewriteRSSArticle = (articleData) => {
  return api.post('/news/rewrite-rss-article', articleData);
};

export const getNewsAnalytics = () => {
  return api.get('/enhanced-news/analytics');
};

// Admin API calls (if user has admin access)
export const getSystemStatus = () => {
  return api.get('/admin/status');
};

export const getArticlesOverview = () => {
  return api.get('/admin/articles');
};

export const adminSearch = (query, filters = {}) => {
  return api.get('/admin/search', { 
    params: { 
      query,
      ...filters 
    } 
  });
};

export const triggerCronJob = (jobName) => {
  return api.post(`/admin/trigger/${jobName}`);
};

// Image Generation API calls
export const generateCardImage = (articleId, size = 'medium') => {
  return api.post(`/news/generate-card-image/${articleId}`, { size });
};

export const generateCardImageFromData = (articleData, size = 'medium') => {
  return api.post('/news/generate-card-image', { ...articleData, size });
};

export const batchGenerateCardImages = (articleIds, size = 'medium') => {
  return api.post('/news/generate-card-images/batch', { articleIds, size });
};

export default api;