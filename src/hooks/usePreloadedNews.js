import { useState, useEffect, useCallback } from 'react';
import { getFastNews } from '../services/api';

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

      let allCount = 0, breakingCount = 0, clientCount = 0;

      if (storedAll) {
        const parsedAll = JSON.parse(storedAll);
        setAllNews(parsedAll);
        allCount = parsedAll.length;
        console.log(`⚡ Loaded ${parsedAll.length} all news articles instantly`);
      }

      if (storedBreaking) {
        const parsedBreaking = JSON.parse(storedBreaking);
        setBreakingNews(parsedBreaking);
        breakingCount = parsedBreaking.length;
        console.log(`⚡ Loaded ${parsedBreaking.length} breaking news articles instantly`);
      } else if (storedAll) {
        // If no stored breaking news but we have all news, filter it
        const parsedAll = JSON.parse(storedAll);
        const filteredBreaking = parsedAll.filter(article => {
          const title = (article.title || '').toLowerCase();
          const content = (article.content || '').toLowerCase();
          return title.includes('breaking') || title.includes('urgent') || 
                 title.includes('alert') || title.includes('crash') ||
                 title.includes('surge') || title.includes('dump') ||
                 title.includes('moon') || title.includes('all-time high') ||
                 content.includes('breaking') || content.includes('urgent');
        });
        setBreakingNews(filteredBreaking);
        breakingCount = filteredBreaking.length;
        localStorage.setItem(STORAGE_KEYS.BREAKING_NEWS, JSON.stringify(filteredBreaking));
        console.log(`⚡ Filtered ${filteredBreaking.length} breaking articles from all news`);
      }

      if (storedClient) {
        const parsedClient = JSON.parse(storedClient);
        setClientNews(parsedClient);
        clientCount = parsedClient.length;
        console.log(`⚡ Loaded ${parsedClient.length} client news articles instantly`);
      } else if (storedAll) {
        // If no stored client news but we have all news, filter it
        const parsedAll = JSON.parse(storedAll);
        const CLIENT_KEYWORDS = [
          // Hedera
          'hedera', 'hbar', 'hashgraph', 'hedera hashgraph', 'hedera network',
          // Constellation  
          'dag', 'constellation', 'constellation network', 'constellation labs',
          // XDC
          'xdc', 'xinfin', 'xdc network', 'xinfin network',
          // HashPack
          'hashpack', 'hash pack', 'pack token',
          // Algorand
          'algorand', 'algo', 'algorand foundation'
        ];
        const filteredClient = parsedAll.filter(article => {
          const title = (article.title || '').toLowerCase();
          const content = (article.content || '').toLowerCase();
          const combined = title + ' ' + content;
          return CLIENT_KEYWORDS.some(keyword => combined.includes(keyword));
        });
        setClientNews(filteredClient);
        clientCount = filteredClient.length;
        localStorage.setItem(STORAGE_KEYS.CLIENT_NEWS, JSON.stringify(filteredClient));
        console.log(`⚡ Filtered ${filteredClient.length} client articles from all news`);
      }

      console.log(`✅ INSTANT LOAD COMPLETE: ${allCount} all, ${breakingCount} breaking, ${clientCount} client articles loaded in 0 seconds`);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data in background without affecting UI
  const updateInBackground = useCallback(async () => {
    setBackgroundUpdating(true);
    console.log('🔄 Background update starting...');
    
    try {
      // Fetch all news first
      const allResponse = await getFastNews('all').catch(() => ({ data: [] }));
      const newAllNews = allResponse.success ? allResponse.data : [];
      
      // Extract breaking and client news from all news since backend categories aren't working
      const newBreakingNews = newAllNews.filter(article => {
        const title = (article.title || '').toLowerCase();
        const content = (article.content || '').toLowerCase();
        
        // Breaking news keywords
        return title.includes('breaking') || title.includes('urgent') || 
               title.includes('alert') || title.includes('crash') ||
               title.includes('surge') || title.includes('dump') ||
               title.includes('moon') || title.includes('all-time high') ||
               content.includes('breaking') || content.includes('urgent');
      });
      
      // Client networks keywords for filtering (comprehensive list)
      const CLIENT_KEYWORDS = [
        // Hedera
        'hedera', 'hbar', 'hashgraph', 'hedera hashgraph', 'hedera network',
        // Constellation  
        'dag', 'constellation', 'constellation network', 'constellation labs',
        // XDC
        'xdc', 'xinfin', 'xdc network', 'xinfin network',
        // HashPack
        'hashpack', 'hash pack', 'pack token',
        // Algorand
        'algorand', 'algo', 'algorand foundation'
      ];
      
      const newClientNews = newAllNews.filter(article => {
        const title = (article.title || '').toLowerCase();
        const content = (article.content || '').toLowerCase();
        const combined = title + ' ' + content;
        
        return CLIENT_KEYWORDS.some(keyword => combined.includes(keyword));
      });
      
      console.log(`📊 Filtered: ${newAllNews.length} total, ${newBreakingNews.length} breaking, ${newClientNews.length} client`);

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
    console.log('🔄 Manual refresh: Clearing cache and fetching fresh data...');
    setLoading({ all: true, breaking: true, client: true });
    
    try {
      // Clear localStorage and fetch fresh data
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared ${key} from localStorage`);
      });
      
      // Reset state
      setAllNews([]);
      setBreakingNews([]);
      setClientNews([]);
      console.log('🔄 Cleared all state, fetching fresh data...');
      
      // Fetch fresh data with new filtering logic
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