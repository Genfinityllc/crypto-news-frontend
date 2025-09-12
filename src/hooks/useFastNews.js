import { useState, useEffect, useCallback } from 'react';
import { getFastNews, getFastBreakingNews, getFastClientNews } from '../services/api';

export function useFastNews() {
  const [allNews, setAllNews] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [clientNews, setClientNews] = useState([]);
  const [loading, setLoading] = useState({
    all: false,
    breaking: false,
    client: false
  });
  const [error, setError] = useState(null);

  const fetchFastNews = useCallback(async (category = 'all') => {
    setLoading(prev => ({ ...prev, [category]: true }));
    setError(null);
    
    console.log(`🚀 Fetching fast ${category} news...`);

    try {
      let response;
      switch (category) {
        case 'breaking':
          response = await getFastBreakingNews();
          break;
        case 'client':
          response = await getFastClientNews();
          break;
        default:
          response = await getFastNews('all');
      }
      
      console.log(`✅ Fast ${category} news response:`, response);
      
      if (response && response.success) {
        const articles = response.data || [];
        console.log(`📰 ${category} articles found:`, articles.length);
        
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
        
        return articles;
      } else {
        throw new Error(`Failed to fetch ${category} news`);
      }
    } catch (error) {
      console.error(`❌ Error fetching fast ${category} news:`, error);
      setError(error.message || 'Failed to fetch news');
      return [];
    } finally {
      setLoading(prev => ({ ...prev, [category]: false }));
    }
  }, []);

  // Fetch all categories on mount
  useEffect(() => {
    const fetchAllCategories = async () => {
      console.log('🔄 Fetching all fast news categories...');
      await Promise.all([
        fetchFastNews('all'),
        fetchFastNews('breaking'),
        fetchFastNews('client')
      ]);
    };

    fetchAllCategories();
  }, [fetchFastNews]);

  return {
    allNews,
    breakingNews,
    clientNews,
    loading,
    error,
    refetch: fetchFastNews
  };
}

export function useBreakingNews() {
  const [breakingNews, setBreakingNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBreaking = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚨 Fetching fast breaking news...');
      const response = await getFastBreakingNews();
      
      if (response && response.success) {
        const articles = response.data || [];
        console.log('🚨 Breaking news articles found:', articles.length);
        setBreakingNews(articles);
      }
    } catch (error) {
      console.error('❌ Error fetching breaking news:', error);
      setError(error.message || 'Failed to fetch breaking news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreaking();
  }, [fetchBreaking]);

  return {
    breakingNews,
    loading,
    error,
    refetch: fetchBreaking
  };
}