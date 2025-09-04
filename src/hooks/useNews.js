import { useState, useEffect, useCallback } from 'react';
import { getNews, searchNews, getBreakingNews } from '../services/api';

export function useNews(initialParams = {}) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false,
    totalCount: 0
  });

  const fetchNews = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    console.log('Fetching news with params:', params);
    console.log('API Base URL:', process.env.REACT_APP_API_URL);

    try {
      console.log('Making API request to getNews with params:', { ...initialParams, ...params });
      const response = await getNews({ ...initialParams, ...params });
      console.log('useNews response:', response);
      
      if (response && response.success) {
        console.log('Articles found:', response.data?.length || 0);
        setArticles(response.data || []);
        setPagination(response.pagination || {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false,
          totalCount: response.data?.length || 0
        });
      } else {
        console.error('API Response indicates failure:', response);
        throw new Error(response?.message || 'Failed to fetch news');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      setError(err.message || err.response?.data?.message || err.response?.message || 'Failed to fetch news');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  const searchArticles = useCallback(async (query, options = {}) => {
    if (!query.trim()) {
      fetchNews();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchNews(query, { ...initialParams, ...options });
      
      if (response.success) {
        setArticles(response.data || []);
        setPagination(response.pagination || {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false,
          totalCount: response.data?.length || 0
        });
      } else {
        throw new Error(response.message || 'Search failed');
      }
    } catch (err) {
      setError(err.message || 'Search failed');
      console.error('Error searching news:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [initialParams, fetchNews]);

  const loadPage = useCallback((page) => {
    fetchNews({ page });
  }, [fetchNews]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    articles,
    loading,
    error,
    pagination,
    refetch: fetchNews,
    search: searchArticles,
    loadPage
  };
}

export function useBreakingNews() {
  const [breakingNews, setBreakingNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBreakingNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getBreakingNews();
      
      if (response.success) {
        setBreakingNews(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch breaking news');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch breaking news');
      console.error('Error fetching breaking news:', err);
      setBreakingNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreakingNews();
    
    // Auto-refresh breaking news every 2 minutes
    const interval = setInterval(fetchBreakingNews, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBreakingNews]);

  return {
    breakingNews,
    loading,
    error,
    refetch: fetchBreakingNews
  };
}