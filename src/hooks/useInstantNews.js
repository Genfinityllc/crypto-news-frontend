import { useState, useEffect, useCallback, useRef } from 'react';
import { getFastNews, getFastBreakingNews, getFastClientNews } from '../services/api';

export function useInstantNews() {
  const [allNews, setAllNews] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [clientNews, setClientNews] = useState([]);
  const [loading, setLoading] = useState({
    all: false,
    breaking: false,
    client: false
  });
  const [backgroundLoading, setBackgroundLoading] = useState({
    all: false,
    breaking: false,
    client: false
  });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({
    all: null,
    breaking: null,
    client: null
  });
  
  // Track if this is the initial load
  const initialLoadRef = useRef(true);
  const updateIntervalRef = useRef(null);

  const fetchNewsInstant = useCallback(async (category = 'all', isBackground = false) => {
    // eslint-disable-next-line no-unused-vars
    const loadingKey = isBackground ? 'backgroundLoading' : 'loading';
    const setLoadingState = isBackground ? setBackgroundLoading : setLoading;
    
    setLoadingState(prev => ({ ...prev, [category]: true }));
    setError(null);
    
    if (!isBackground) {
      console.log(`⚡ Instant fetch ${category} news...`);
    } else {
      console.log(`🔄 Background update ${category} news...`);
    }

    try {
      let response;
      switch (category) {
        case 'breaking':
          response = await getFastBreakingNews();
          break;
        case 'client':
          // Force refresh for client news to get latest
          response = await getFastClientNews();
          break;
        default:
          response = await getFastNews('all');
      }
      
      if (response && response.success) {
        const articles = response.data || [];
        
        if (!isBackground) {
          console.log(`✅ Instant ${category}: ${articles.length} articles`);
        } else {
          console.log(`🔄 Background ${category}: ${articles.length} articles`);
        }
        
        switch (category) {
          case 'breaking':
            setBreakingNews(articles);
            break;
          case 'client':
            setClientNews(articles);
            break;
          default:
            setAllNews(articles);
        }
        
        // Update last updated timestamp
        setLastUpdated(prev => ({ ...prev, [category]: new Date() }));
        
        return articles;
      } else {
        throw new Error(`Failed to fetch ${category} news`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${category} news:`, error);
      if (!isBackground) {
        setError(error.message || 'Failed to fetch news');
      }
      return [];
    } finally {
      setLoadingState(prev => ({ ...prev, [category]: false }));
    }
  }, []);

  // Initial instant load - show cached data immediately for ALL categories
  useEffect(() => {
    if (initialLoadRef.current) {
      console.log('🚀 INSTANT NEWS: Loading ALL categories with FORCED refresh...');
      
      // Clear any existing cached data first
      setAllNews([]);
      setBreakingNews([]);
      setClientNews([]);
      
      // Load all categories in parallel with forced refresh - no cache!
      Promise.all([
        fetchNewsInstant('all', false),
        fetchNewsInstant('breaking', false), 
        fetchNewsInstant('client', false)
      ]).then(() => {
        console.log('✅ ALL CATEGORIES loaded with fresh data!');
        console.log(`📊 Fresh Counts: All=${allNews.length}, Breaking=${breakingNews.length}, Client=${clientNews.length}`);
      });
      
      initialLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNewsInstant]);

  // Background updates every 2 minutes for fresh content
  useEffect(() => {
    const startBackgroundUpdates = () => {
      updateIntervalRef.current = setInterval(() => {
        console.log('🔄 Background refresh starting...');
        
        // Update in background without showing loading states
        fetchNewsInstant('all', true);
        fetchNewsInstant('breaking', true);
        fetchNewsInstant('client', true);
      }, 120000); // 2 minutes
    };

    // Start background updates after initial load
    const timer = setTimeout(startBackgroundUpdates, 5000); // Wait 5 seconds after initial load

    return () => {
      clearTimeout(timer);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [fetchNewsInstant]);

  // Manual refresh function for user-triggered updates
  const refreshNews = useCallback(async (category = 'all') => {
    console.log(`🔄 Manual refresh: ${category}`);
    return await fetchNewsInstant(category, false);
  }, [fetchNewsInstant]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    allNews,
    breakingNews,
    clientNews,
    loading,
    backgroundLoading,
    error,
    lastUpdated,
    refreshNews,
    isInitialLoad: initialLoadRef.current
  };
}

export function useInstantBreakingNews() {
  const [breakingNews, setBreakingNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const updateIntervalRef = useRef(null);

  const fetchBreaking = useCallback(async (isBackground = false) => {
    const setLoadingState = isBackground ? setBackgroundLoading : setLoading;
    setLoadingState(true);
    setError(null);
    
    try {
      if (!isBackground) {
        console.log('⚡ Instant breaking news...');
      }
      
      const response = await getFastBreakingNews();
      
      if (response && response.success) {
        const articles = response.data || [];
        setBreakingNews(articles);
        setLastUpdated(new Date());
        
        if (!isBackground) {
          console.log(`⚡ Breaking: ${articles.length} articles`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching breaking news:', error);
      if (!isBackground) {
        setError(error.message || 'Failed to fetch breaking news');
      }
    } finally {
      setLoadingState(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchBreaking(false);
  }, [fetchBreaking]);

  // Background updates every 30 seconds for breaking news
  useEffect(() => {
    updateIntervalRef.current = setInterval(() => {
      fetchBreaking(true);
    }, 30000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [fetchBreaking]);

  return {
    breakingNews,
    loading,
    backgroundLoading,
    error,
    lastUpdated,
    refetch: () => fetchBreaking(false)
  };
}