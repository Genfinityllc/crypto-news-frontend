import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNews, useBreakingNews } from '../hooks/useNews';
import { useFastNews } from '../hooks/useFastNews';
// eslint-disable-next-line no-unused-vars
import { useInstantNews } from '../hooks/useInstantNews';
import { usePreloadedNews } from '../hooks/usePreloadedNews';
import { useClientNews } from '../hooks/useClientNews';
import { useBookmarks } from '../hooks/useBookmarks';
import NewsCard from '../components/news/NewsCard';
import { rewriteArticle, getViralNews, getHighReadabilityNews } from '../services/api';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background: #1a1a1a;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #f0f0f0;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-family: Arial, Helvetica, sans-serif;
`;

const Welcome = styled.p`
  color: #aaa;
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
  background: #202020;
  padding: 15px;
  border-radius: 10px;
  border-bottom: 1px solid #333;
`;

const FilterSelect = styled.select`
  background: #2a2a2a;
  color: #f0f0f0;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  font-family: Arial, Helvetica, sans-serif;
  cursor: pointer;
  max-height: 250px;
  overflow-y: auto;

  &:focus {
    outline: none;
    border-color: #00aaff;
    box-shadow: 0 0 0 2px rgba(0, 170, 255, 0.2);
  }

  &:hover {
    border-color: #555;
  }

  option {
    background: #2a2a2a;
    color: #f0f0f0;
    padding: 8px;
  }
`;

// CryptoSelect removed - using expanded Networks dropdown instead

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FilterLabel = styled.label`
  color: #aaa;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: Arial, Helvetica, sans-serif;
`;

const EnhancedFiltersContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: end;
  background: #202020;
  padding: 15px;
  border-radius: 10px;
  border-bottom: 1px solid #333;
`;

const ActionButton = styled.button`
  display: inline-block;
  margin: 5px 5px 0 0;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: Arial, Helvetica, sans-serif;
  color: ${props => {
    switch(props.variant) {
      case 'viral': return '#000';
      case 'readable': return '#000';
      default: return '#fff';
    }
  }};
  background: ${props => {
    switch(props.variant) {
      case 'viral': return '#00ff99';
      case 'readable': return '#00ffaa';
      default: return '#00aaff';
    }
  }};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SearchInput = styled.input`
  background: #2a2a2a;
  color: #f0f0f0;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  font-family: Arial, Helvetica, sans-serif;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #00aaff;
    box-shadow: 0 0 0 2px rgba(0, 170, 255, 0.2);
  }

  &::placeholder {
    color: #888;
  }
`;

const SearchButton = styled.button`
  padding: 6px 12px;
  background: #00aaff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  font-family: Arial, Helvetica, sans-serif;

  &:hover {
    background: #0088cc;
  }
`;

const Section = styled.div`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  color: #f0f0f0;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BreakingBadge = styled.span`
  display: inline-block;
  margin: 5px 5px 0 0;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  background: #ff0055;
  font-family: Arial, Helvetica, sans-serif;
  text-transform: uppercase;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #888;
  font-family: Arial, Helvetica, sans-serif;

  h3 {
    color: #aaa;
    margin-bottom: 1rem;
    font-family: Arial, Helvetica, sans-serif;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  text-align: center;
  background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
  border-radius: 20px;
  border: 1px solid #333;
  margin: 2rem 0;
`;

const LoadingSpinner = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 2rem;
  
  div {
    border: 3px solid transparent;
    border-top: 3px solid #00aaff;
    border-right: 3px solid #00b4d8;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1.2s linear infinite;
    position: absolute;
  }
  
  div:nth-child(2) {
    border: 3px solid transparent;
    border-bottom: 3px solid #22c55e;
    border-left: 3px solid #4ade80;
    animation: spin 1.8s linear infinite reverse;
    width: 45px;
    height: 45px;
    top: 7.5px;
    left: 7.5px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingMessage = styled.p`
  color: #e5e7eb;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
  font-family: Arial, Helvetica, sans-serif;
  animation: fadeInOut 3s infinite;
  min-height: 1.5rem;
  
  @keyframes fadeInOut {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`;

const LoadingSubtext = styled.p`
  color: #9ca3af;
  font-size: 0.9rem;
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
`;

// Enhanced Loading Component with rotating messages
function EnhancedLoadingSpinner() {
  const loadingMessages = [
    "🔍 Scanning global crypto news feeds...",
    "📊 Analyzing market trends and sentiment...",
    "🚀 Fetching breaking news from top sources...",
    "💎 Discovering viral cryptocurrency stories...",
    "⚡ Processing real-time market data...",
    "🎯 Curating the most relevant news for you...",
    "🔄 Synchronizing with live RSS feeds...",
    "✨ AI is enhancing content readability...",
    "🌐 Aggregating news from 50+ sources...",
    "📈 Loading the latest price movements..."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <LoadingContainer>
      <LoadingSpinner>
        <div />
        <div />
      </LoadingSpinner>
      <LoadingMessage>{loadingMessages[messageIndex]}</LoadingMessage>
      <LoadingSubtext>This usually takes 5-10 seconds...</LoadingSubtext>
    </LoadingContainer>
  );
}

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const PaginationButton = styled.button`
  padding: 6px 12px;
  background: ${props => props.disabled ? '#444' : '#00aaff'};
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-family: Arial, Helvetica, sans-serif;
  font-weight: bold;

  &:hover:not(:disabled) {
    background: #0088cc;
  }
`;

const PageInfo = styled.span`
  color: #aaa;
  font-family: Arial, Helvetica, sans-serif;
`;

const SectionNavigation = styled.div`
  display: flex;
  gap: 0.75rem;
  margin: 2rem 0 1.5rem 0;
  padding: 0.5rem;
  background: #1e1e1e;
  border-radius: 12px;
  border: 1px solid #333;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    margin: 1.5rem 0 1rem 0;
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ArticleCount = styled.span`
  background: rgba(255, 255, 255, 0.15);
  color: ${props => props.active ? '#fff' : '#888'};
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  
  ${props => props.active && `
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  `}
`;

const SectionButton = styled.button`
  position: relative;
  background: ${props => {
    if (props.active) {
      switch(props.variant) {
        case 'breaking': return 'linear-gradient(135deg, #ff4757, #ff3742)';
        case 'client': return 'linear-gradient(135deg, #ffa502, #ff9500)';  
        case 'all': return 'linear-gradient(135deg, #2ed573, #1dd1a1)';
        default: return 'linear-gradient(135deg, #007bff, #0056b3)';
      }
    }
    return 'rgba(255, 255, 255, 0.05)';
  }};
  color: ${props => props.active ? '#fff' : '#aaa'};
  border: 1px solid ${props => {
    if (props.active) {
      switch(props.variant) {
        case 'breaking': return '#ff4757';
        case 'client': return '#ffa502';
        case 'all': return '#2ed573';
        default: return '#007bff';
      }
    }
    return 'rgba(255, 255, 255, 0.1)';
  }};
  padding: 0.875rem 1.75rem;
  border-radius: 10px;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: ${props => props.active ? '700' : '500'};
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: ${props => props.active ? '0 4px 20px rgba(0, 123, 255, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: ${props => {
      switch(props.variant) {
        case 'breaking': return 'linear-gradient(135deg, rgba(255, 71, 87, 0.1), rgba(255, 55, 66, 0.05))';
        case 'client': return 'linear-gradient(135deg, rgba(255, 165, 2, 0.1), rgba(255, 149, 0, 0.05))';
        case 'all': return 'linear-gradient(135deg, rgba(46, 213, 115, 0.1), rgba(29, 209, 161, 0.05))';
        default: return 'linear-gradient(135deg, rgba(0, 123, 255, 0.1), rgba(0, 86, 179, 0.05))';
      }
    }};
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => {
      switch(props.variant) {
        case 'breaking': return '0 8px 25px rgba(255, 71, 87, 0.4)';
        case 'client': return '0 8px 25px rgba(255, 165, 2, 0.4)';
        case 'all': return '0 8px 25px rgba(46, 213, 115, 0.4)';
        default: return '0 8px 25px rgba(0, 123, 255, 0.4)';
      }
    }};
    border-color: ${props => {
      switch(props.variant) {
        case 'breaking': return '#ff4757';
        case 'client': return '#ffa502';
        case 'all': return '#2ed573';
        default: return '#007bff';
      }
    }};
    color: #fff;
    
    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1.25rem;
    font-size: 0.85rem;
  }
`;

// Client Submenu Styled Components
const ClientSubmenu = styled.div`
  background: linear-gradient(135deg, #1e1e1e, #2a2a2a);
  border-radius: 12px;
  border: 1px solid #333;
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin: 0.75rem 0;
  }
`;

const SubmenuTitle = styled.h3`
  color: #ffa502;
  font-size: 1rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
  font-family: Arial, Helvetica, sans-serif;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &::before {
    content: '🎯 ';
  }
`;

const SubmenuButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const ClientFilterButton = styled.button`
  position: relative;
  background: ${props => props.active ? 
    `linear-gradient(135deg, ${props.color}, ${props.color}cc)` : 
    'rgba(255, 255, 255, 0.05)'
  };
  color: ${props => props.active ? '#fff' : '#aaa'};
  border: 1px solid ${props => props.active ? props.color : 'rgba(255, 255, 255, 0.1)'};
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: ${props => props.active ? '700' : '500'};
  font-size: 0.85rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: ${props => props.active ? 
    `0 4px 15px ${props.color}40` : 
    '0 2px 8px rgba(0, 0, 0, 0.1)'
  };
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: ${props => `linear-gradient(135deg, ${props.color}20, ${props.color}10)`};
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => `0 8px 25px ${props.color}50`};
    border-color: ${props => props.color};
    color: #fff;
    
    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
`;

const ClientButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ClientLogo = styled.img`
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 2px;
  transition: all 0.3s ease;
  
  ${props => props.active && `
    filter: brightness(1.2);
  `}
`;

const MultiClientLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  
  img {
    width: 12px;
    height: 12px;
    object-fit: contain;
    border-radius: 1px;
    opacity: 0.8;
    transition: all 0.3s ease;
  }
  
  ${props => props.active && `
    img {
      opacity: 1;
      filter: brightness(1.1);
    }
  `}
`;

const ClientArticleCount = styled.span`
  background: rgba(255, 255, 255, 0.15);
  color: ${props => props.active ? '#fff' : '#888'};
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  
  ${props => props.active && `
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  `}
`;

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { breakingNews, loading: breakingLoading } = useBreakingNews();
  const { bookmarks, refetch: refetchBookmarks } = useBookmarks();
  // Removed crypto dropdown - now using expanded network filter
  
  const [filters, setFilters] = useState({
    network: 'all',
    category: 'all',
    sortBy: 'date',
    crypto: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  // const [showEnhanced, setShowEnhanced] = useState(false);
  const [rewritingArticles, setRewritingArticles] = useState(new Set());
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [showClientSubmenu, setShowClientSubmenu] = useState(false);

  // Client News: the clients, their logos, counts and articles all come from
  // one request (the server's single client list), so they always agree.
  // This replaced five overlapping sources that still looked for the old
  // client names and counted only articles with pictures (which gave 0).
  const clientNews = useClientNews();

  const { articles, loading, error, pagination, search, loadPage, refetch } = useNews(filters);
  // eslint-disable-next-line no-unused-vars
  // useFastNews returns one list called `news`. This page used to read three
  // lists from it that do not exist, got undefined, and crashed on the first
  // render (`fastAllNews.length`), which left the whole Dashboard blank.
  const fastNews = useFastNews();
  const fastAllNews = fastNews.allNews || fastNews.news || [];
  const fastBreakingNews = fastNews.breakingNews || [];
  // eslint-disable-next-line no-unused-vars
  const fastLoading = fastNews.loading;
  
  // PRELOADED NEWS: Instant 0-second loading with auto-population
  const {
    allNews: preloadedAllNews,
    breakingNews: preloadedBreakingNews
    // loading: preloadedLoading,
    // backgroundUpdating,
    // refreshAll: refreshPreloadedNews,
    // totalArticles: preloadedTotalArticles
  } = usePreloadedNews();
  
  // Legacy instant loading hook (fallback)
  // eslint-disable-next-line no-unused-vars
  const { 
    allNews: instantAllNews, 
    breakingNews: instantBreakingNews, 
    // eslint-disable-next-line no-unused-vars
    loading: instantLoading,
    // eslint-disable-next-line no-unused-vars
    backgroundLoading,
    // eslint-disable-next-line no-unused-vars
    refreshNews: instantRefreshNews,
    // eslint-disable-next-line no-unused-vars
    isInitialLoad
  } = useInstantNews();

  // The filter buttons under "Client News": All clients, then one per client
  const CLIENT_FILTERS = React.useMemo(() => {
    const filters = {
      all: {
        name: 'All Clients',
        color: '#ffa502',
        logo: 'multi',
        logos: clientNews.clients.map(client => client.logo),
        count: clientNews.articles.length
      }
    };
    clientNews.clients.forEach(client => {
      filters[client.id] = {
        name: client.displayName,
        color: client.color,
        logo: client.logo,
        count: client.count
      };
    });
    return filters;
  }, [clientNews.clients, clientNews.articles.length]);

  // Filter articles based on active section
  const getFilteredArticles = () => {
    // When searching, use regular API results
    if (searchQuery) {
      console.log('🔍 Using search results');
      return articles;
    }
    
    // PRELOADED INSTANT LOADING: Show stored data immediately (0 seconds)
    switch (activeSection) {
      case 'all':
        // Priority: Preloaded (instant) > Instant > Fast > Regular
        if (preloadedAllNews.length > 0) {
          console.log('⚡ Using PRELOADED all news (0 seconds):', preloadedAllNews.length);
          return preloadedAllNews;
        } else if (instantAllNews.length > 0) {
          console.log('⚡ Using instant all news:', instantAllNews.length);
          return instantAllNews;
        } else if (fastAllNews.length > 0) {
          console.log('📊 Using fast all news:', fastAllNews.length);
          return fastAllNews;
        }
        return articles; // Final fallback
        
      case 'breaking':
        // Priority: Preloaded (instant) > Instant > Fast
        if (preloadedBreakingNews.length > 0) {
          console.log('⚡ Using PRELOADED breaking news (0 seconds):', preloadedBreakingNews.length);
          return preloadedBreakingNews;
        } else if (instantBreakingNews.length > 0) {
          console.log('⚡ Using instant breaking news:', instantBreakingNews.length);
          return instantBreakingNews;
        } else if (fastBreakingNews.length > 0) {
          console.log('🚨 Using fast breaking news:', fastBreakingNews.length);
          return fastBreakingNews;
        }
        return []; // No fallback for breaking news
        
      case 'client':
        return clientNews.forClient(selectedClientFilter);
        
      default:
        console.log('📰 Using regular articles (fallback)');
        return articles;
    }
  };

  const filteredArticles = getFilteredArticles();
  
  // Leaving Client News closes its filter row and goes back to "All Clients"
  React.useEffect(() => {
    if (activeSection !== 'client') {
      setShowClientSubmenu(false);
      setSelectedClientFilter('all');
    } else {
      setShowClientSubmenu(true);
    }
  }, [activeSection]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSectionChange = async (section) => {
    setActiveSection(section);
    setSearchQuery(''); // Clear search when switching sections
    
    // Apply filters based on section with more specific logic
    switch (section) {
      case 'all':
        // Show all news including latest news (merged from previous latest section)
        setFilters(prev => ({ 
          ...prev, 
          category: 'all', 
          network: 'all',
          sortBy: 'date' 
        }));
        break;
        
      case 'breaking':
        // Show only breaking news
        setFilters(prev => ({ 
          ...prev, 
          category: 'breaking',
          network: 'all',
          sortBy: 'date' 
        }));
        break;
        
      case 'client':
        setFilters(prev => ({ 
          ...prev, 
          category: 'all',
          network: 'all',
          sortBy: 'date'
        }));
        clientNews.refresh();
        break;
        
      default:
        setFilters(prev => ({ 
          ...prev, 
          category: 'all', 
          network: 'all',
          sortBy: 'date' 
        }));
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      search(searchQuery, filters);
    } else {
      refetch();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRewriteArticle = async (articleId) => {
    setRewritingArticles(prev => new Set([...prev, articleId]));
    try {
      await rewriteArticle(articleId);
      toast.success('Article rewritten successfully! Refreshing...');
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      toast.error('Failed to rewrite article');
      console.error('Rewrite error:', error);
    } finally {
      setRewritingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const handleShowViral = async () => {
    try {
      const response = await getViralNews(75, 20);
      // This would need to be integrated with the news hook
      toast.info(`Found ${response.count} viral articles`);
    } catch (error) {
      toast.error('Failed to fetch viral news');
    }
  };

  const handleShowHighReadability = async () => {
    try {
      const response = await getHighReadabilityNews(97, 20);
      toast.info(`Found ${response.count} high-readability articles`);
    } catch (error) {
      toast.error('Failed to fetch high-readability news');
    }
  };

  return (
    <DashboardContainer>
      <Header>
        <Title>Crypto News Dashboard</Title>
        {currentUser && (
          <Welcome>
            Welcome back, {userProfile?.displayName || currentUser.displayName || currentUser.email}!
          </Welcome>
        )}
      </Header>


      {/* Section Navigation - 3 buttons: All News, Breaking, Client News */}
      <SectionNavigation>
        <SectionButton 
          active={activeSection === 'all'}
          variant="all"
          onClick={() => handleSectionChange('all')}
        >
          <ButtonContent>
            <span>📊 All News</span>
            <ArticleCount active={activeSection === 'all'}>
              {(() => {
                // Show the count of articles that would be displayed
                const preloadedCount = preloadedAllNews.length;
                const instantCount = instantAllNews.length;  
                const fastCount = fastAllNews.length;
                const regularCount = articles.length;
                
                // Use the same priority as getFilteredArticles
                return preloadedCount > 0 ? preloadedCount : 
                       (instantCount > 0 ? instantCount : 
                       (fastCount > 0 ? fastCount : regularCount));
              })()}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
        <SectionButton 
          active={activeSection === 'breaking'}
          variant="breaking"
          onClick={() => handleSectionChange('breaking')}
        >
          <ButtonContent>
            <span>🚨 Breaking</span>
            <ArticleCount active={activeSection === 'breaking'}>
              {(() => {
                const preloadedCount = preloadedBreakingNews.length;
                const instantCount = instantBreakingNews.length;
                const fastCount = fastBreakingNews.length; 
                const regularCount = breakingNews.length;
                
                // Use same priority as getFilteredArticles for breaking news
                return preloadedCount > 0 ? preloadedCount : 
                       (instantCount > 0 ? instantCount : 
                       (fastCount > 0 ? fastCount : regularCount));
              })()}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
        <SectionButton 
          active={activeSection === 'client'}
          variant="client"
          onClick={() => handleSectionChange('client')}
        >
          <ButtonContent>
            <MultiClientLogo active={activeSection === 'client'}>
              {clientNews.clients.map(client => (
                <img key={client.id} src={client.logo} alt={client.displayName} />
              ))}
            </MultiClientLogo>
            <span>Client News</span>
            <ArticleCount active={activeSection === 'client'}>
              {clientNews.loading && clientNews.articles.length === 0 ? '…' : clientNews.articles.length}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
      </SectionNavigation>

      {/* Client Submenu - Only show when client section is active */}
      {showClientSubmenu && activeSection === 'client' && (
        <ClientSubmenu>
          <SubmenuTitle>Filter by Client Network:</SubmenuTitle>
          <SubmenuButtons>
            {clientNews.clients.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                color: '#aaa', 
                padding: '0.75rem 1.5rem' 
              }}>
                <span>{clientNews.error ? 'Client news could not be loaded.' : 'Loading clients...'}</span>
              </div>
            ) : (
              Object.entries(CLIENT_FILTERS).map(([key, client]) => (
              <ClientFilterButton
                key={key}
                active={selectedClientFilter === key}
                color={client.color}
                onClick={() => setSelectedClientFilter(key)}
              >
                <ClientButtonContent>
                  {client.logo === 'multi' ? (
                    <MultiClientLogo active={selectedClientFilter === key}>
                      {client.logos.map((logo, index) => (
                        <img key={index} src={logo} alt="" />
                      ))}
                    </MultiClientLogo>
                  ) : (
                    <ClientLogo 
                      src={client.logo} 
                      alt={client.name}
                      active={selectedClientFilter === key}
                    />
                  )}
                  <span>{client.name}</span>
                  <ClientArticleCount active={selectedClientFilter === key}>
                    {client.count}
                  </ClientArticleCount>
                </ClientButtonContent>
              </ClientFilterButton>
              ))
            )}
          </SubmenuButtons>
        </ClientSubmenu>
      )}

      {/* Enhanced Filters - Moved to top */}
      <EnhancedFiltersContainer>
        <FilterGroup>
          <FilterLabel>Network</FilterLabel>
          <FilterSelect
            value={filters.network}
            onChange={(e) => handleFilterChange('network', e.target.value)}
          >
            <option value="all">All Networks</option>
            
            {/* Client Networks - Always at top */}
            <optgroup label="🌟 Client Networks">
              <option value="Hedera">Hedera (HBAR)</option>
              <option value="HashPack">HashPack (PACK)</option>
              <option value="XDC Network">XDC Network (XDC)</option>
              <option value="Solana">Solana (SOL)</option>
              <option value="Canton">Canton (CC)</option>
            </optgroup>
            
            {/* Top Networks */}
            <optgroup label="📈 Major Networks">
              <option value="Bitcoin">Bitcoin (BTC)</option>
              <option value="Ethereum">Ethereum (ETH)</option>
              <option value="Binance">Binance Coin (BNB)</option>
              <option value="XRP">XRP</option>
              <option value="Cardano">Cardano (ADA)</option>
              <option value="Avalanche">Avalanche (AVAX)</option>
              <option value="Polkadot">Polkadot (DOT)</option>
              <option value="Polygon">Polygon (MATIC)</option>
              <option value="Chainlink">Chainlink (LINK)</option>
              <option value="Uniswap">Uniswap (UNI)</option>
            </optgroup>
            
            {/* Other Popular Networks */}
            <optgroup label="🔥 Popular Networks">
              <option value="Litecoin">Litecoin (LTC)</option>
              <option value="Cosmos">Cosmos (ATOM)</option>
              <option value="Near">NEAR Protocol (NEAR)</option>
              <option value="Fantom">Fantom (FTM)</option>
              <option value="Arbitrum">Arbitrum (ARB)</option>
              <option value="Optimism">Optimism (OP)</option>
              <option value="Sui">Sui (SUI)</option>
              <option value="Aptos">Aptos (APT)</option>
              <option value="Injective">Injective Protocol (INJ)</option>
              <option value="Sei">Sei (SEI)</option>
            </optgroup>
            
            {/* Layer 2 & Scaling */}
            <optgroup label="⚡ Layer 2 & Scaling">
              <option value="Base">Base</option>
              <option value="Mantle">Mantle (MNT)</option>
              <option value="Blast">Blast</option>
              <option value="Starknet">Starknet (STRK)</option>
              <option value="zkSync">zkSync Era</option>
            </optgroup>
            
            {/* DeFi Tokens */}
            <optgroup label="💰 DeFi Ecosystem">
              <option value="Aave">Aave (AAVE)</option>
              <option value="Compound">Compound (COMP)</option>
              <option value="Maker">MakerDAO (MKR)</option>
              <option value="Curve">Curve (CRV)</option>
              <option value="SushiSwap">SushiSwap (SUSHI)</option>
              <option value="PancakeSwap">PancakeSwap (CAKE)</option>
            </optgroup>
            
            {/* Meme & Community */}
            <optgroup label="🐕 Community Tokens">
              <option value="Dogecoin">Dogecoin (DOGE)</option>
              <option value="Shiba">Shiba Inu (SHIB)</option>
              <option value="Pepe">Pepe (PEPE)</option>
              <option value="Bonk">Bonk (BONK)</option>
            </optgroup>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <FilterSelect
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="breaking">Breaking</option>
            <option value="market">Market</option>
            <option value="technology">Technology</option>
            <option value="regulation">Regulation</option>
            <option value="analysis">Analysis</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Sort By</FilterLabel>
          <FilterSelect
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="date">Latest</option>
            <option value="score">By Impact</option>
            <option value="engagement">Most Popular</option>
            <option value="viral">Viral Score</option>
            <option value="readability">Readability</option>
          </FilterSelect>
        </FilterGroup>
      </EnhancedFiltersContainer>

      <FiltersContainer>
        <SearchInput
          type="text"
          placeholder="Search crypto news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        
        <SearchButton onClick={handleSearch}>
          Search
        </SearchButton>
        
        <ActionButton variant="viral" onClick={handleShowViral}>
          🔥 Show Viral
        </ActionButton>
        
        <ActionButton variant="readable" onClick={handleShowHighReadability}>
          📖 High Readability
        </ActionButton>
      </FiltersContainer>

      {/* Breaking News Section - Only show when Breaking button is clicked */}
      {activeSection === 'breaking' && (
        <Section>
          <SectionTitle>
            <BreakingBadge>Breaking</BreakingBadge>
            Latest Breaking News
          </SectionTitle>
          {(() => {
            const breakingToShow = preloadedBreakingNews.length > 0 ? preloadedBreakingNews : breakingNews;
            return breakingToShow.slice(0, 3).map(article => (
              <NewsCard
                key={article.id}
                article={article}
                bookmarks={bookmarks}
                onBookmarkChange={refetchBookmarks}
              />
            ));
          })()}
        </Section>
      )}

      {/* News Articles */}
      <Section>
        <SectionTitle>
          {searchQuery ? `Search Results for "${searchQuery}"` : 
            activeSection === 'all' ? 'All News' :
            activeSection === 'breaking' ? 'Breaking News' :
            activeSection === 'client' ? 'Client News' :
            'All News'
          }
        </SectionTitle>
        
        {/* INSTANT LOADING: Only show loading if searching AND no preloaded content available */
        (searchQuery && loading && filteredArticles.length === 0) ? (
          <EnhancedLoadingSpinner />
        ) : (!searchQuery && activeSection === 'client' && clientNews.loading && filteredArticles.length === 0) ? (
          <LoadingContainer>
            <LoadingSpinner>
              <div />
              <div />
            </LoadingSpinner>
            <LoadingMessage>Loading client news...</LoadingMessage>
            <LoadingSubtext>{clientNews.clients.map(client => client.displayName).join(', ')}</LoadingSubtext>
          </LoadingContainer>
        ) : filteredArticles.length > 0 ? (
          <>
            {filteredArticles.map(article => (
              <NewsCard
                key={article.id}
                article={article}
                bookmarks={bookmarks}
                onBookmarkChange={refetchBookmarks}
                onRewrite={() => handleRewriteArticle(article.id)}
                isRewriting={rewritingArticles.has(article.id)}
              />
            ))}
            
            {/* Pagination */}
            {(searchQuery || activeSection !== 'client') && pagination.total > 1 && (
              <Pagination>
                <PaginationButton
                  onClick={() => loadPage(pagination.current - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </PaginationButton>
                
                <PageInfo>
                  Page {pagination.current} of {pagination.total} ({pagination.totalCount} articles)
                </PageInfo>
                
                <PaginationButton
                  onClick={() => loadPage(pagination.current + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </PaginationButton>
              </Pagination>
            )}
          </>
        ) : (
          <EmptyState>
            <h3>{error ? 'Error Loading Articles' : 
              activeSection === 'client' ? 'No client news found' : 
              'No articles found'}</h3>
            <p>{error ? error :
              activeSection === 'client' ? (
                clientNews.error ? clientNews.error :
                selectedClientFilter === 'all' ? 'There are no client articles from the last 30 days yet.' :
                `No articles for ${CLIENT_FILTERS[selectedClientFilter]?.name || 'this client'} in the last 30 days.`
              ) :
              'Try adjusting your filters or search terms.'}</p>
            {error && (
              <button 
                onClick={() => window.location.reload()} 
                style={{
                  marginTop: '1rem',
                  padding: '8px 16px',
                  background: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            )}
          </EmptyState>
        )}
      </Section>
    </DashboardContainer>
  );
}
