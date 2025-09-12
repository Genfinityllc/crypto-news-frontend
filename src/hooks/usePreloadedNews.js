import { useState, useEffect, useCallback } from 'react';
import { getFastNews, getFastBreakingNews, getFastClientNews } from '../services/api';

// Local storage keys for instant loading
const STORAGE_KEYS = {
  ALL_NEWS: 'preloaded_all_news',
  BREAKING_NEWS: 'preloaded_breaking_news', 
  CLIENT_NEWS: 'preloaded_client_news',
  LAST_UPDATE: 'preloaded_news_timestamp'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

export function usePreloadedNews() {
  const [allNews, setAllNews] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [clientNews, setClientNews] = useState([]);
  const [loading, setLoading] = useState({
    all: false,
    breaking: false,
    client: false
  });
  const [backgroundUpdating, setBackgroundUpdating] = useState(false);

  // Load stored data instantly on mount
  const loadStoredData = useCallback(() => {
    console.log('⚡ INSTANT LOAD: Loading stored articles from localStorage...');
    
    try {
      // Load all stored data instantly
      const storedAll = localStorage.getItem(STORAGE_KEYS.ALL_NEWS);
      const storedBreaking = localStorage.getItem(STORAGE_KEYS.BREAKING_NEWS);
      const storedClient = localStorage.getItem(STORAGE_KEYS.CLIENT_NEWS);
      const lastUpdate = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);

      if (storedAll) {
        const parsedAll = JSON.parse(storedAll);
        setAllNews(parsedAll);
        console.log(`⚡ Loaded ${parsedAll.length} all news articles instantly`);
      }

      if (storedBreaking) {
        const parsedBreaking = JSON.parse(storedBreaking);
        setBreakingNews(parsedBreaking);
        console.log(`⚡ Loaded ${parsedBreaking.length} breaking news articles instantly`);
      }

      if (storedClient) {
        const parsedClient = JSON.parse(storedClient);
        setClientNews(parsedClient);
        console.log(`⚡ Loaded ${parsedClient.length} client news articles instantly`);
      }

      const totalLoaded = (allNews.length || 0) + (breakingNews.length || 0) + (clientNews.length || 0);
      console.log(`✅ INSTANT LOAD COMPLETE: ${totalLoaded} total articles loaded in 0 seconds`);

      // Check if we need to update (cache expired)
      const isStale = !lastUpdate || (Date.now() - parseInt(lastUpdate)) > CACHE_DURATION;
      if (isStale) {
        console.log('🔄 Cache is stale, triggering background update...');
        setTimeout(() => updateInBackground(), 1000); // Update after 1 second
      }

    } catch (error) {
      console.error('❌ Error loading stored data:', error);
      // If no stored data, fetch fresh data
      updateInBackground();
    }
  }, []);

  // Update data in background without affecting UI
  const updateInBackground = useCallback(async () => {
    setBackgroundUpdating(true);
    console.log('🔄 Background update starting...');
    
    try {
      // Fetch all categories in parallel
      const [allResponse, breakingResponse, clientResponse] = await Promise.all([
        getFastNews('all').catch(() => ({ data: [] })),
        getFastBreakingNews().catch(() => ({ data: [] })),
        getFastClientNews().catch(() => ({ data: [] }))
      ]);

      const newAllNews = allResponse.success ? allResponse.data : [];
      const newBreakingNews = breakingResponse.success ? breakingResponse.data : [];
      const newClientNews = clientResponse.success ? clientResponse.data : [];

      // Merge new articles with existing (prepend new ones)
      const mergeArticles = (existing, fresh) => {
        if (!existing.length) return fresh;
        
        // Get existing URLs/IDs to avoid duplicates
        const existingIds = new Set(existing.map(a => a.id || a.url || a.link));
        
        // Filter out duplicates from fresh articles
        const newArticles = fresh.filter(a => !existingIds.has(a.id || a.url || a.link));
        
        // Prepend new articles (newest first)
        return [...newArticles, ...existing].slice(0, 500); // Limit to 500 total
      };

      // Update state with merged articles
      setAllNews(prev => {
        const merged = mergeArticles(prev, newAllNews);
        localStorage.setItem(STORAGE_KEYS.ALL_NEWS, JSON.stringify(merged));
        return merged;
      });

      setBreakingNews(prev => {
        const merged = mergeArticles(prev, newBreakingNews);
        localStorage.setItem(STORAGE_KEYS.BREAKING_NEWS, JSON.stringify(merged));
        return merged;
      });

      setClientNews(prev => {
        const merged = mergeArticles(prev, newClientNews);
        localStorage.setItem(STORAGE_KEYS.CLIENT_NEWS, JSON.stringify(merged));
        return merged;
      });

      // Update timestamp
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString());

      console.log('✅ Background update completed');
      console.log(`📊 Updated counts: All=${newAllNews.length}, Breaking=${newBreakingNews.length}, Client=${newClientNews.length}`);

    } catch (error) {
      console.error('❌ Background update error:', error);
    } finally {
      setBackgroundUpdating(false);
    }
  }, []);

  // Manual refresh function
  const refreshAll = useCallback(async () => {
    setLoading({ all: true, breaking: true, client: true });
    
    try {
      // Clear localStorage and fetch fresh data
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      
      // Reset state
      setAllNews([]);
      setBreakingNews([]);
      setClientNews([]);
      
      // Fetch fresh data
      await updateInBackground();
      
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
    } finally {
      setLoading({ all: false, breaking: false, client: false });
    }
  }, [updateInBackground]);

  // Load stored data instantly on component mount
  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // Set up periodic background updates every 5 minutes
  useEffect(() => {
    const interval = setInterval(updateInBackground, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateInBackground]);

  return {
    allNews,
    breakingNews,
    clientNews,
    loading,
    backgroundUpdating,
    refreshAll,
    totalArticles: allNews.length + breakingNews.length + clientNews.length
  };
}