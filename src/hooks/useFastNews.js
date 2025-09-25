import { useState, useEffect, useCallback } from 'react';
import { getFastNews, getFastBreakingNews, getFastClientNews } from '../services/api';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export function useFastNews(category = 'all', options = {}) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    console.log(`🚀 Fetching news: category=${category}, options=`, options);

    try {
      let response;
      
      // Use unified news endpoint for better image reliability
      if (category === 'all' || options.network) {
        const params = {
          onlyWithImages: true,
          limit: 200,
          ...options
        };
        
        if (options.network) {
          params.network = options.network;
        }
        
        response = await axios.get(`${API_BASE_URL}/unified-news`, { params });
        
      } else if (category === 'client') {
        response = await axios.get(`${API_BASE_URL}/unified-news`, {
          params: {
            network: 'clients',
            onlyWithImages: true,
            limit: 200,
            ...options
          }
        });
        
      } else if (category === 'breaking') {
        response = await axios.get(`${API_BASE_URL}/unified-news/breaking`, {
          params: {
            onlyWithImages: true,
            limit: 50,
            ...options
          }
        });
        
      } else {
        // Fallback to original API
        response = await getFastNews(category, options);
      }
      
      console.log(`✅ News response:`, response.data);
      
      if (response.data && response.data.success) {
        const articles = response.data.data || [];
        console.log(`📰 Articles found:`, articles.length);
        setNews(articles);
        return articles;
      } else {
        throw new Error(`Failed to fetch news: ${response.data?.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error(`❌ Error fetching news:`, error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch news');
      return [];
    } finally {
      setLoading(false);
    }
  }, [category, JSON.stringify(options)]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    news,
    loading,
    error,
    refreshNews: fetchNews,
    refetch: fetchNews
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