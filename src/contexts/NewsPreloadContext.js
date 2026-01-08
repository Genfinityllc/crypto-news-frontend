import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://crypto-news-curator-backend-production.up.railway.app/api';

const NewsPreloadContext = createContext();

export function usePreloadedNews() {
  const context = useContext(NewsPreloadContext);
  if (!context) {
    throw new Error('usePreloadedNews must be used within a NewsPreloadProvider');
  }
  return context;
}

export function NewsPreloadProvider({ children }) {
  const [allNews, setAllNews] = useState([]);
  const [clientNews, setClientNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAllNews = useCallback(async (force = false) => {
    // Skip if already loaded recently (within 2 minutes) and not forcing
    if (!force && lastFetch && (Date.now() - lastFetch) < 120000 && allNews.length > 0) {
      console.log('📰 Using cached news data');
      return allNews;
    }

    console.log('📰 Background preloading all news...');
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/unified-news`, {
        params: {
          onlyWithImages: true,
          limit: 200
        }
      });

      if (response.data && response.data.success) {
        const articles = response.data.data || [];
        console.log(`✅ Preloaded ${articles.length} articles`);
        setAllNews(articles);
        setLastFetch(Date.now());
        return articles;
      } else {
        throw new Error('Failed to preload news');
      }
    } catch (err) {
      console.error('❌ News preload error:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [lastFetch, allNews.length]);

  const fetchClientNews = useCallback(async (force = false) => {
    if (!force && clientNews.length > 0) {
      return clientNews;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/unified-news`, {
        params: {
          network: 'clients',
          onlyWithImages: true,
          limit: 200
        }
      });

      if (response.data && response.data.success) {
        const articles = response.data.data || [];
        setClientNews(articles);
        return articles;
      }
    } catch (err) {
      console.error('❌ Client news preload error:', err);
    }
    return [];
  }, [clientNews.length]);

  // Start preloading immediately when app loads
  useEffect(() => {
    // Small delay to not block initial render
    const timer = setTimeout(() => {
      fetchAllNews();
      fetchClientNews();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const refreshNews = useCallback(() => {
    return fetchAllNews(true);
  }, [fetchAllNews]);

  const value = {
    allNews,
    clientNews,
    loading,
    error,
    refreshNews,
    fetchAllNews,
    fetchClientNews,
    isPreloaded: allNews.length > 0
  };

  return (
    <NewsPreloadContext.Provider value={value}>
      {children}
    </NewsPreloadContext.Provider>
  );
}

