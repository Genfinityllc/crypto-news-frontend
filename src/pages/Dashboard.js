import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNews, useBreakingNews } from '../hooks/useNews';
import { useFastNews } from '../hooks/useFastNews';
import { useInstantNews } from '../hooks/useInstantNews';
import { usePreloadedNews } from '../hooks/usePreloadedNews';
import { useBookmarks } from '../hooks/useBookmarks';
import NewsCard from '../components/news/NewsCard';
import { rewriteArticle, getViralNews, getHighReadabilityNews, searchNews, getCachedClientNews, getEnhancedClientNews } from '../services/api';
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
  const [historicalClientArticles, setHistoricalClientArticles] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [clientArticlesLoading, setClientArticlesLoading] = useState(false);
  const [directClientArticles, setDirectClientArticles] = useState([]);
  const [enhancedClientArticles, setEnhancedClientArticles] = useState([]);
  const [cachedClientArticles, setCachedClientArticles] = useState([]);
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [showClientSubmenu, setShowClientSubmenu] = useState(false);
  // const [clientNewsMode, setClientNewsMode] = useState('instant'); // 'instant', 'enhanced', 'mixed'
  
  const { articles, loading, error, pagination, search, loadPage, refetch } = useNews(filters);
  const { allNews: fastAllNews, breakingNews: fastBreakingNews, clientNews: fastClientNews, loading: fastLoading } = useFastNews();
  
  // PRELOADED NEWS: Instant 0-second loading with auto-population
  const {
    allNews: preloadedAllNews,
    breakingNews: preloadedBreakingNews, 
    clientNews: preloadedClientNews
    // loading: preloadedLoading,
    // backgroundUpdating,
    // refreshAll: refreshPreloadedNews,
    // totalArticles: preloadedTotalArticles
  } = usePreloadedNews();
  
  // Legacy instant loading hook (fallback)
  const { 
    allNews: instantAllNews, 
    breakingNews: instantBreakingNews, 
    clientNews: instantClientNews
    // loading: instantLoading,
    // backgroundLoading,
    // refreshNews: instantRefreshNews,
    // isInitialLoad
  } = useInstantNews();

  // Client networks - your specific clients
  const CLIENT_NETWORKS = [
    // Hedera client
    'HBAR', 'Hedera', 'Hedera Hashgraph', 'Hedera Network',
    // Constellation client  
    'DAG', 'Constellation', 'Constellation Network', 'Constellation Labs',
    // XDC client
    'XDC', 'XDC Network', 'XinFin',
    // HashPack client
    'HashPack', 'Hashpack', 'PACK',
    // Algorand client
    'ALGO', 'Algorand', 'Algorand Foundation',
    // Additional ticker: SWAP
    'SWAP'
  ];

  // Individual client definitions for submenu filtering with logos
  const CLIENT_FILTERS = {
    'all': {
      name: 'All Clients',
      terms: CLIENT_NETWORKS,
      color: '#ffa502',
      logo: 'multi', // Special case for multiple logos
      logos: ['/logos/hedera_icon.png', '/logos/constellation_icon.png', '/logos/xdc_icon.png', '/logos/algorand_icon.png', '/logos/hashpack_icon.png']
    },
    'hedera': {
      name: 'Hedera',
      terms: ['HBAR', 'Hedera', 'Hedera Hashgraph', 'Hedera Network'],
      color: '#0066cc',
      logo: '/logos/hedera_icon.png'
    },
    'constellation': {
      name: 'Constellation', 
      terms: ['DAG', 'Constellation', 'Constellation Network', 'Constellation Labs'],
      color: '#8b5cf6',
      logo: '/logos/constellation_icon.png'
    },
    'xdc': {
      name: 'XDC Network',
      terms: ['XDC', 'XDC Network', 'XinFin'],
      color: '#22c55e',
      logo: '/logos/xdc_icon.png'
    },
    'algorand': {
      name: 'Algorand',
      terms: ['ALGO', 'Algorand', 'Algorand Foundation'], 
      color: '#ff4757',
      logo: '/logos/algorand_icon.png'
    },
    'hashpack': {
      name: 'HashPack',
      terms: [
        'HashPack', 'Hashpack', 'PACK',
        'HashPack wallet', 'HashPack app', 'HashPack mobile',
        'HashPack extension', 'HashPack browser', 'HashPack NFT',
        'HashPack staking', 'HashPack DeFi', 'HashPack.app'
      ],
      color: '#00b4d8',
      logo: '/logos/hashpack_icon.png'
    }
  };

  // Instant cached client news loading
  const loadCachedClientNews = async () => {
    console.log('⚡ Loading cached client news instantly...');
    try {
      const response = await getCachedClientNews(500);
      if (response && response.data) {
        setCachedClientArticles(response.data);
        console.log(`⚡ Loaded ${response.data.length} cached client articles instantly`);
        
        // If should trigger full search, do it in background
        if (response.data.meta?.shouldTriggerFullSearch) {
          setTimeout(() => fetchEnhancedClientNews(), 1000); // 1 second delay
        }
      }
    } catch (error) {
      console.error('❌ Error loading cached client news:', error);
    }
  };

  // Enhanced client news fetching with multiple search strategies
  const fetchEnhancedClientNews = async () => {
    console.log('🎯 Fetching enhanced client news with multiple search strategies...');
    try {
      const response = await getEnhancedClientNews({ limit: 500 });
      if (response && response.data) {
        setEnhancedClientArticles(response.data);
        console.log(`🎯 Enhanced client news: ${response.data.length} high-quality articles`);
        
        if (response.data.meta) {
          console.log('📊 Client distribution:', response.data.meta.clientDistribution);
          console.log(`📈 Average relevance score: ${response.data.meta.averageRelevanceScore?.toFixed(2)}`);
          toast.success(`Found ${response.data.length} enhanced client articles!`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching enhanced client news:', error);
      toast.error('Failed to fetch enhanced client news');
    }
  };

  // Direct client article fetching function (legacy)
  const fetchDirectClientArticles = async () => {
    setClientArticlesLoading(true);
    console.log('🚀 Starting direct client article extraction...');
    
    try {
      
      // Comprehensive client search terms for better discovery
      const clientSearchTerms = [
        // Primary identifiers with high search volume
        'Hedera', 'HBAR', 'Hedera Hashgraph', 'HBAR price', 'HBAR news',
        'Algorand', 'ALGO', 'Algorand Foundation', 'ALGO price', 'ALGO news',
        'Constellation Network', 'Constellation Labs', 'DAG Constellation', '$DAG token',
        'XDC Network', 'XDC token', 'XinFin', 'XDC price', 'XDC news',
        'HashPack', 'HashPack wallet', 'PACK token'
      ];
      
      console.log(`📡 Searching for articles using ${clientSearchTerms.length} client-specific terms...`);
      console.log(`🔍 HashPack terms in search:`, clientSearchTerms.filter(term => term.toLowerCase().includes('hashpack') || term.toLowerCase().includes('pack')));
      
      // Parallel searches for better performance
      const searchPromises = clientSearchTerms.map(async (term) => {
        try {
          console.log(`🔍 Searching API for: ${term}`);
          
          // Search both database and hybrid sources with higher limits for comprehensive coverage
          const [dbResults, hybridResults] = await Promise.all([
            searchNews(term, { source: 'database', limit: 25 }).catch(() => ({ data: [] })),
            searchNews(term, { source: 'hybrid', limit: 25 }).catch(() => ({ data: [] }))
          ]);
          
          const results = [...(dbResults.data || []), ...(hybridResults.data || [])];
          console.log(`✅ Found ${results.length} articles for "${term}"`);
          
          // Debug: Log image availability
          const articlesWithImages = results.filter(a => a.cover_image || a.image_url);
          console.log(`📸 ${articlesWithImages.length} of ${results.length} articles have images`);
          
          // Special debugging for HashPack searches
          if (term.toLowerCase().includes('hashpack') || term.toLowerCase().includes('pack')) {
            console.log(`🔍 HASHPACK DEBUG: Searching "${term}"`);
            console.log(`🔍 Database results: ${dbResults.data?.length || 0}`);
            console.log(`🔍 Hybrid results: ${hybridResults.data?.length || 0}`);
            if (results.length > 0) {
              console.log(`🔍 Sample HashPack results:`, results.slice(0, 2).map(a => a.title));
            } else {
              console.log(`🔍 No HashPack articles found for "${term}" - trying alternative search...`);
              
              // Try a broader search for HashPack
              try {
                const altSearch = await searchNews('HashPack OR "hash pack" OR "PACK token"', { 
                  source: 'hybrid', 
                  limit: 10 
                }).catch(() => ({ data: [] }));
                console.log(`🔍 Alternative HashPack search found: ${altSearch.data?.length || 0} articles`);
                if (altSearch.data?.length > 0) {
                  console.log(`🔍 Alternative results:`, altSearch.data.slice(0, 2).map(a => a.title));
                }
              } catch (altError) {
                console.log(`🔍 Alternative HashPack search failed:`, altError.message);
              }
            }
          }
          
          // Filter for English-only articles and client-specific relevance
          const englishClientResults = results.filter(article => {
            if (!article) return false;
            
            const title = (article.title || '').toLowerCase();
            const content = (article.content || article.description || article.summary || '').toLowerCase();
            
            // English language detection (basic)
            const isEnglish = /^[a-zA-Z0-9\s.,;:!?\-'"()[\]{}@#$%^&*+=<>/\\|~`]*$/.test(
              (article.title || '').replace(/[\u00C0-\u017F]/g, '') // Remove accented chars
            );
            
            if (!isEnglish) {
              console.log(`🙅 Filtered non-English article: "${article.title}"`);
              return false;
            }
            
            // Enhanced client-specific filtering
            if (term.toLowerCase().includes('constellation') || term.toLowerCase().includes('dag')) {
              // For Constellation/DAG, ensure it's actually about Constellation Network
              const isConstellationSpecific = 
                title.includes('constellation network') ||
                title.includes('constellation labs') ||
                content.includes('constellation network') ||
                content.includes('constellation labs') ||
                (title.includes('dag') && (title.includes('constellation') || content.includes('constellation')));
              
              if (!isConstellationSpecific && (term.toLowerCase().includes('dag'))) {
                console.log(`🙅 Filtered generic DAG article: "${article.title}"`);
                return false;
              }
            }
            
            return true;
          });
          
          console.log(`🌍 Filtered to ${englishClientResults.length} English client-specific articles for "${term}"`);
          return englishClientResults;
        } catch (error) {
          console.log(`⚠️ Error searching for ${term}:`, error.message);
          return [];
        }
      });
      
      // Wait for all searches to complete
      const allResults = await Promise.all(searchPromises);
      let flatResults = allResults.flat();
      
      // If we have very few results, try additional comprehensive searches
      if (flatResults.length < 10) {
        console.log(`🔍 Low results (${flatResults.length}), attempting comprehensive search...`);
        
        const comprehensiveTerms = [
          'crypto news today',
          'cryptocurrency market',
          'bitcoin ethereum news',
          'altcoin news',
          'blockchain technology news'
        ];
        
        for (const broadTerm of comprehensiveTerms) {
          try {
            const broadSearch = await searchNews(broadTerm, { 
              source: 'hybrid', 
              limit: 200 
            }).catch(() => ({ data: [] }));
            
            if (broadSearch.data && broadSearch.data.length > 0) {
              console.log(`📈 Comprehensive search "${broadTerm}" added ${broadSearch.data.length} articles`);
              flatResults.push(...broadSearch.data);
            }
          } catch (error) {
            console.log(`⚠️ Comprehensive search "${broadTerm}" failed:`, error.message);
          }
        }
        
        console.log(`📈 Total articles after comprehensive search: ${flatResults.length}`);
      }
      
      // Remove duplicates and filter for quality client content
      // Prioritize articles with images (usually from hybrid source)
      const uniqueClientArticles = flatResults
        .filter((article, index, self) => {
          // Remove duplicates by URL or title, but prefer articles with images
          const duplicateIndex = self.findIndex(a => 
            (a.url && article.url && a.url === article.url) ||
            (a.title && article.title && a.title === article.title)
          );
          
          if (duplicateIndex === index) {
            return true; // First occurrence, keep it
          }
          
          // If this is a duplicate, only keep it if it has an image and the original doesn't
          const original = self[duplicateIndex];
          const hasImage = article.cover_image || article.image_url;
          const originalHasImage = original.cover_image || original.image_url;
          
          return hasImage && !originalHasImage;
        })
        .filter(article => {
          // Enhanced quality filter with English detection and client relevance
          const title = (article.title || '').toLowerCase();
          const text = `${title} ${article.content || ''} ${article.description || ''} ${article.summary || ''}`.toLowerCase();
          
          // English language check
          const isEnglish = /^[a-zA-Z0-9\s.,;:!?\-'"()[\]{}@#$%^&*+=<>/\\|~`]*$/.test(
            (article.title || '').replace(/[\u00C0-\u017F]/g, '')
          );
          
          if (!isEnglish) {
            console.log(`🙅 Filtered non-English: "${article.title}"`);
            return false;
          }
          
          // Enhanced client mention detection
          const clientMentions = [
            'hedera', 'hbar', 'algorand', 'algo', 'constellation network', 'constellation labs',
            'xdc network', 'xinfin', 'hashpack', 'pack token'
          ];
          
          const hasClientMention = clientMentions.some(client => text.includes(client));
          
          // Special handling for DAG - must be Constellation-specific
          if (text.includes('dag') && !text.includes('constellation')) {
            console.log(`🙅 Filtered generic DAG: "${article.title}"`);
            return false;
          }
          
          return hasClientMention;
        })
        .sort((a, b) => {
          // Sort by publication date (newest first)
          const dateA = new Date(a.published_at || a.pubDate || 0);
          const dateB = new Date(b.published_at || b.pubDate || 0);
          return dateB - dateA;
        });
      
      console.log(`🎯 Final client articles after deduplication: ${uniqueClientArticles.length}`);
      
      // Debug: Check distribution by client network
      const clientDistribution = {
        hedera: uniqueClientArticles.filter(a => {
          const text = `${a.title || ''} ${a.content || ''} ${a.description || ''}`.toLowerCase();
          return text.includes('hedera') || text.includes('hbar');
        }).length,
        algorand: uniqueClientArticles.filter(a => {
          const text = `${a.title || ''} ${a.content || ''} ${a.description || ''}`.toLowerCase();
          return text.includes('algorand') || text.includes('algo');
        }).length,
        constellation: uniqueClientArticles.filter(a => {
          const text = `${a.title || ''} ${a.content || ''} ${a.description || ''}`.toLowerCase();
          return text.includes('constellation') || (text.includes('dag') && text.includes('constellation'));
        }).length,
        xdc: uniqueClientArticles.filter(a => {
          const text = `${a.title || ''} ${a.content || ''} ${a.description || ''}`.toLowerCase();
          return text.includes('xdc') || text.includes('xinfin');
        }).length,
        hashpack: uniqueClientArticles.filter(a => {
          const text = `${a.title || ''} ${a.content || ''} ${a.description || ''}`.toLowerCase();
          return text.includes('hashpack') || text.includes('pack token');
        }).length
      };
      
      console.log(`📊 Client distribution:`, clientDistribution);
      
      // If no HashPack articles found, add a helpful notice
      let articlesWithNotice = [...uniqueClientArticles];
      
      if (clientDistribution.hashpack === 0 && uniqueClientArticles.length < 5) {
        console.log(`📝 Adding client source notices for missing RSS feeds`);
        
        // Add informational articles about client sources without RSS feeds
        const clientSourceNotices = [
          {
            id: 'hedera-blog-' + Date.now(),
            title: '🔷 Hedera Official Blog: Latest Network Updates Available',
            content: 'For comprehensive Hedera network updates, partnerships, and ecosystem developments, visit the official Hedera blog. While the RSS feed is currently not accessible for automated aggregation, the blog contains the most authoritative Hedera content. Visit https://hedera.com/blog for official announcements.',
            summary: 'Official Hedera blog contains comprehensive network updates - visit https://hedera.com/blog',
            url: 'https://hedera.com/blog',
            source: 'Hedera Official',
            published_at: new Date(Date.now() - 300000).toISOString(),
            network: 'Hedera',
            category: 'announcement'
          },
          {
            id: 'xdc-news-' + Date.now(),
            title: '💎 XDC Network "What\'s Happening": Weekly Updates Available',
            content: 'XDC Network publishes regular updates in their "What\'s Happening" section, including weekly community updates, network milestones, and ecosystem developments. Visit https://xdc.org to access the latest XDC Network news and announcements.',
            summary: 'XDC Network updates available in "What\'s Happening" section - visit https://xdc.org',
            url: 'https://xdc.org',
            source: 'XDC Network',
            published_at: new Date(Date.now() - 600000).toISOString(),
            network: 'XDC',
            category: 'announcement'
          },
          {
            id: 'constellation-newsletter-' + Date.now(),
            title: '⭐ Constellation Newsletter: Ecosystem Updates Archive',
            content: 'Constellation publishes detailed newsletter updates with ecosystem developments, network news, and community insights. Access their newsletter archive for comprehensive Constellation ecosystem updates and announcements.',
            summary: 'Constellation newsletter archive - comprehensive ecosystem updates available',
            url: 'https://us7.campaign-archive.com/home/?u=56cac902d74c5bcbf6354cdb5&id=2e170d50c3',
            source: 'Constellation Newsletter',
            published_at: new Date(Date.now() - 900000).toISOString(),
            network: 'Constellation',
            category: 'announcement'
          }
        ];
        
        // Add client-specific tags to the notices
        const taggedNotices = clientSourceNotices.map(notice => ({
          ...notice,
          // Override breaking news and add client-specific tags
          is_breaking: false,
          client_network: notice.network,
          category: 'client-update'
        }));
        
        articlesWithNotice.unshift(...taggedNotices);
      }
      
      // Add client-specific tags and remove breaking labels for client articles
      const taggedClientArticles = articlesWithNotice.map(article => {
        const title = (article.title || '').toLowerCase();
        const articleText = (article.content || article.description || article.summary || '').toLowerCase();
        
        // Determine primary client network from title and content
        const fullText = `${title} ${articleText}`;
        let primaryClient = 'General';
        
        if (fullText.includes('hedera') || fullText.includes('hbar') || fullText.includes('hashpack')) {
          primaryClient = 'Hedera';
        } else if (fullText.includes('algorand') || fullText.includes('algo')) {
          primaryClient = 'Algorand';
        } else if (fullText.includes('constellation') || (fullText.includes('dag') && fullText.includes('constellation'))) {
          primaryClient = 'Constellation';
        } else if (fullText.includes('xdc') || fullText.includes('xinfin')) {
          primaryClient = 'XDC';
        } else if (fullText.includes('hashpack') || fullText.includes('pack token')) {
          primaryClient = 'HashPack';
        }
        
        return {
          ...article,
          // Override network with primary client
          network: primaryClient,
          // Remove breaking news label for client articles
          is_breaking: false,
          // Add client-specific category
          category: article.category === 'announcement' ? 'announcement' : 'client-news',
          // Add client tags
          client_network: primaryClient
        };
      });
      
      setDirectClientArticles(taggedClientArticles);
      
      if (uniqueClientArticles.length > 0) {
        toast.success(`Found ${uniqueClientArticles.length} client articles from direct search!`);
      } else {
        console.log('⚠️ No client articles found through direct API search');
        // Still try the historical search as backup
        await searchHistoricalClientContent();
      }
      
    } catch (error) {
      console.error('Error fetching direct client articles:', error);
      toast.error('Error fetching client articles');
    } finally {
      setClientArticlesLoading(false);
    }
  };

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
        console.log('=== CLIENT FILTER ACTIVE ===');
        
        let clientArticles = [];
        
        // Priority: Preloaded (instant) > Enhanced > Instant > Fast > Cached > Direct
        if (preloadedClientNews.length > 0) {
          console.log(`⚡ Using PRELOADED client news (0 seconds): ${preloadedClientNews.length}`);
          clientArticles = preloadedClientNews;
        } else if (enhancedClientArticles.length > 0) {
          console.log(`🎯 Using ${enhancedClientArticles.length} enhanced client articles`);
          clientArticles = enhancedClientArticles;
        } else if (instantClientNews.length > 0) {
          console.log(`⚡ Using ${instantClientNews.length} instant client articles`);
          clientArticles = instantClientNews;
        } else if (fastClientNews.length > 0) {
          console.log(`📰 Using ${fastClientNews.length} fast client articles`);
          clientArticles = fastClientNews;
        } else if (cachedClientArticles.length > 0) {
          console.log(`💾 Using ${cachedClientArticles.length} cached client articles`);
          clientArticles = cachedClientArticles;
        } else if (directClientArticles.length > 0) {
          console.log(`🔍 Using ${directClientArticles.length} direct client articles`);
          clientArticles = directClientArticles;
        } else {
          console.log('🔄 Fallback: Filtering regular articles for client content');
          // Fallback: Filter main articles for client content
          const currentClientArticles = (fastAllNews.length > 0 ? fastAllNews : articles).filter(article => {
            const title = (article.title || '').toLowerCase();
            const content = (article.content || article.description || article.summary || '').toLowerCase();
            const network = (article.network || '').toLowerCase();
            
            const allClientTerms = [
              ...CLIENT_NETWORKS,
              'hbar', 'hedera', 'algo', 'algorand', 'dag', 'constellation', 
              'xdc', 'xinfin', 'hashpack', 'pack', 'swap'
            ];
            
            return allClientTerms.some(clientNetwork => {
              const networkLower = clientNetwork.toLowerCase();
              return title.includes(networkLower) || 
                     content.includes(networkLower) || 
                     network.includes(networkLower);
            });
          });
          
          // Combine with historical articles if available
          const combinedArticles = [...currentClientArticles, ...historicalClientArticles];
          const uniqueArticles = combinedArticles.filter((article, index, self) => 
            index === self.findIndex(a => a.url === article.url || a.title === article.title)
          );
          
          clientArticles = uniqueArticles.sort((a, b) => 
            new Date(b.published_at || b.pubDate || 0) - new Date(a.published_at || a.pubDate || 0)
          );
        }
      
      // Apply client-specific filter if selected
      if (selectedClientFilter !== 'all') {
        const filterTerms = CLIENT_FILTERS[selectedClientFilter]?.terms || [];
        console.log(`🔍 Filtering by ${selectedClientFilter}: ${filterTerms.join(', ')}`);
        
        const filteredByClient = clientArticles.filter(article => {
          const title = (article.title || '').toLowerCase();
          const content = (article.content || article.description || article.summary || '').toLowerCase();
          const network = (article.network || '').toLowerCase();
          
          return filterTerms.some(term => {
            const termLower = term.toLowerCase();
            return title.includes(termLower) || 
                   content.includes(termLower) || 
                   network.includes(termLower);
          });
        });
        
        console.log(`📊 Filtered to ${filteredByClient.length} ${selectedClientFilter} articles`);
        
        // Special case for HashPack: if no direct matches, include Hedera ecosystem articles
        if (selectedClientFilter === 'hashpack' && filteredByClient.length <= 1) {
          console.log(`👝 HashPack filter: Including Hedera ecosystem articles as relevant to HashPack wallet users`);
          
          const hederaArticles = clientArticles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const content = (article.content || article.description || article.summary || '').toLowerCase();
            const network = (article.network || '').toLowerCase();
            
            return title.includes('hedera') || 
                   content.includes('hedera') || 
                   network.includes('hedera') ||
                   title.includes('hbar') ||
                   content.includes('hbar');
          });
          
          // Combine HashPack notice with Hedera articles and apply client tagging
          const combined = [...filteredByClient, ...hederaArticles]
            .filter((article, index, self) => 
              index === self.findIndex(a => a.id === article.id || a.url === article.url)
            )
            .map(article => ({
              ...article,
              network: 'Hedera', // Tag as Hedera for HashPack context
              is_breaking: false, // Remove breaking labels in client section
              category: 'client-news'
            }))
            .sort((a, b) => 
              new Date(b.published_at || 0) - new Date(a.published_at || 0)
            );
          
          console.log(`👝 HashPack + Hedera articles: ${combined.length} total`);
          return combined;
        }
        
        return filteredByClient;
      }
      
        return clientArticles;
        
      default:
        console.log('📰 Using regular articles (fallback)');
        return articles;
    }
  };

  const filteredArticles = getFilteredArticles();
  
  // Historical client content search function
  const searchHistoricalClientContent = async () => {
    setLoadingHistorical(true);
    console.log('🔍 Starting historical search...');
    
    // Safety timeout - ensure loading stops after 30 seconds max
    const timeoutId = setTimeout(() => {
      console.log('⏰ Historical search timeout - stopping loading');
      setLoadingHistorical(false);
    }, 30000);
    
    try {
      const allHistoricalArticles = [];
      
      console.log('🔍 Searching for historical client articles...');
      
      // Try to fetch from client-specific RSS feeds as additional sources
      try {
        console.log('🌐 Attempting to fetch from client-specific RSS sources...');
        
        // Client network Medium RSS feeds - these are direct, high-quality sources!
        const clientMediumFeeds = [
          'https://medium.com/feed/constellationlabs', // Constellation Network Medium ✅
          'https://medium.com/feed/hedera', // Hedera Blog Medium ✅  
          'https://medium.com/feed/algorand', // Algorand Medium ✅
        ];
        
        // 🚨 MISSING CLIENT SOURCES - NO RSS FEEDS AVAILABLE:
        // These sources require alternative integration methods:
        const missingClientSources = {
          hedera_blog: 'https://hedera.com/blog (RSS blocked - 403 Forbidden)',
          xdc_news: 'https://xdc.org "What\'s Happening" (No RSS feed - 404)',
          constellation_newsletter: 'Mailchimp archive (No RSS syndication)',
          hashpack_blog: 'https://www.hashpack.app/blog (No RSS detected)'
        };
        
        console.log('⚠️ Missing client RSS sources:', Object.keys(missingClientSources).length);
        console.log('📄 Working Medium RSS feeds:', clientMediumFeeds.length);
        
        // Future enhancement: Web scraping or API integration needed for missing sources
        
        // We have direct access to official Medium feeds for major client networks
        // These provide high-quality, official content directly from the networks
        console.log(`📡 Enhanced search with ${clientMediumFeeds.length} official Medium RSS feeds + comprehensive API search`);
        
        // Attempt to fetch directly from Medium RSS feeds
        for (const mediumFeed of clientMediumFeeds) {
          try {
            console.log(`📰 Attempting to fetch from ${mediumFeed}...`);
            
            // For now, we'll document these feeds and rely on the comprehensive API search
            // which may already aggregate Medium content. Direct RSS parsing could be added
            // as a future enhancement to the backend system.
            
          } catch (feedError) {
            console.log(`⚠️ Could not fetch from ${mediumFeed}:`, feedError.message);
          }
        }
        
      } catch (error) {
        console.log('⚠️ Could not fetch from additional RSS sources:', error.message);
      }
      
      // Enhanced search terms for your specific clients - MORE COMPREHENSIVE
      const enhancedSearchTerms = [
        // Core client identifiers
        ...CLIENT_NETWORKS,
        
        // Hedera comprehensive terms
        'HBAR', 'Hedera Hashgraph', 'Hedera Network', 'Hedera Council', 'Hedera Governing Council',
        'HBAR token', 'HBAR price', 'HBAR news', 'HBAR staking', 'HBAR DeFi',
        'Hypergraph Protocol', 'HGTP', 'Hedera consensus', 'Hedera enterprise',
        'Hedera adoption', 'Hedera partnership', 'Hedera ecosystem',
        
        // Constellation comprehensive terms - SPECIFIC to avoid generic DAG matches
        'Constellation Network', 'Constellation Labs', 'Constellation protocol',
        'DAG Constellation', 'Constellation DAG', '$DAG token', 'DAG cryptocurrency',
        'Constellation Hypergraph', 'Constellation State Channels', 'CNDX',
        'Constellation blockchain', 'Constellation ecosystem',
        
        // XDC comprehensive terms
        'XDC Network', 'XDC token', 'XDC blockchain', 'XinFin Network', 'XinFin',
        'XDC price', 'XDC news', 'XDC adoption', 'XDC partnership', 'XDC enterprise',
        'XDC trade finance', 'XDC CBDC', 'XDC ecosystem', 'XDC DeFi',
        
        // Algorand comprehensive terms
        'Algorand', 'ALGO token', 'ALGO price', 'ALGO news', 'Algorand Foundation',
        'Algorand blockchain', 'Algorand DeFi', 'Algorand governance', 'Algorand ecosystem',
        'Algorand adoption', 'Algorand partnership', 'Pure Proof of Stake',
        
        // HashPack comprehensive terms
        'HashPack', 'HashPack wallet', 'HashPack app', 'PACK token',
        'HashPack mobile', 'HashPack extension', 'HashPack NFT', 'HashPack DeFi',
        'Hedera wallet HashPack', 'HashPack governance', 'HashPack staking'
      ];
      
      console.log(`🔍 Enhanced search with ${enhancedSearchTerms.length} comprehensive client terms`);
      
      // Search for each client network individually to get comprehensive results
      for (const clientNetwork of enhancedSearchTerms) {
        try {
          console.log(`🔍 Searching for: ${clientNetwork}`);
          
          // Search both database and hybrid sources for maximum coverage
          const [databaseResults, hybridResults] = await Promise.all([
            searchNews(clientNetwork, { 
              source: 'database', 
              limit: 200,
              // Backend should handle date range, but we'll get what we can
            }).catch(() => ({ data: [] })),
            searchNews(clientNetwork, { 
              source: 'hybrid', 
              limit: 200 
            }).catch(() => ({ data: [] }))
          ]);
          
          // Combine results, avoiding duplicates
          const combinedResults = [...(databaseResults.data || []), ...(hybridResults.data || [])];
          const uniqueResults = combinedResults.filter((article, index, self) => 
            index === self.findIndex(a => a.url === article.url || a.title === article.title)
          );
          
          console.log(`✅ Found ${uniqueResults.length} articles for ${clientNetwork}`);
          allHistoricalArticles.push(...uniqueResults);
          
          // Small delay between searches to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`⚠️ Error searching for ${clientNetwork}:`, error.message);
        }
      }
      
      // Remove duplicates from all results
      const uniqueHistoricalArticles = allHistoricalArticles.filter((article, index, self) => 
        index === self.findIndex(a => a.url === article.url || a.title === article.title)
      );
      
      // Sort by date (newest first)
      uniqueHistoricalArticles.sort((a, b) => 
        new Date(b.published_at || b.pubDate || 0) - new Date(a.published_at || a.pubDate || 0)
      );
      
      console.log(`🎯 Total unique historical client articles found: ${uniqueHistoricalArticles.length}`);
      setHistoricalClientArticles(uniqueHistoricalArticles);
      
      if (uniqueHistoricalArticles.length > 0) {
        toast.success(`Found ${uniqueHistoricalArticles.length} historical client articles!`);
      } else {
        toast.info('No historical client articles found. Try again later as new content is indexed.');
      }
      
    } catch (error) {
      console.error('Error searching historical client content:', error);
      toast.error('Error searching for historical client content');
    } finally {
      clearTimeout(timeoutId);
      setLoadingHistorical(false);
      console.log('✅ Historical search completed');
    }
  };

  // Clear client articles when switching away from client section
  React.useEffect(() => {
    if (activeSection !== 'client') {
      setHistoricalClientArticles([]);
      setDirectClientArticles([]);
      setShowClientSubmenu(false);
      setSelectedClientFilter('all');
    } else {
      // Show submenu when entering client section
      setShowClientSubmenu(true);
    }
  }, [activeSection]);

  // DISABLED: Old client news loading - now using preloaded system for instant loading
  // React.useEffect(() => {
  //   loadCachedClientNews();
  //   setTimeout(() => {
  //     fetchEnhancedClientNews();
  //   }, 2000);
  // }, []);

  // Debug: Log client filter results (minimal logging)
  React.useEffect(() => {
    if (activeSection === 'client') {
      const totalClientArticles = filteredArticles.length + historicalClientArticles.length;
      console.log(`🌟 Client News: ${filteredArticles.length} current + ${historicalClientArticles.length} historical = ${totalClientArticles} total`);
    }
  }, [activeSection, articles.length, filteredArticles.length, historicalClientArticles.length]);

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
        // PRELOADED CLIENT NEWS: Show stored data instantly (0 seconds)
        console.log('⚡ Loading client news section with PRELOADED data (0 seconds)...');
        setFilters(prev => ({ 
          ...prev, 
          category: 'all',
          network: 'all',
          sortBy: 'date'
        }));
        
        // Using preloaded data - no API calls needed!
        if (preloadedClientNews.length > 0) {
          console.log(`⚡ PRELOADED client articles ready instantly: ${preloadedClientNews.length}`);
        } else {
          console.log('📥 No preloaded client data yet - background update will populate soon');
        }
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
              {preloadedAllNews.length > 0 ? preloadedAllNews.length : (instantAllNews.length > 0 ? instantAllNews.length : (fastAllNews.length > 0 ? fastAllNews.length : articles.length))}
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
              {preloadedBreakingNews.length > 0 ? preloadedBreakingNews.length : (instantBreakingNews.length > 0 ? instantBreakingNews.length : (fastBreakingNews.length > 0 ? fastBreakingNews.length : breakingNews.length))}
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
              <img src="/logos/hedera_icon.png" alt="Hedera" />
              <img src="/logos/constellation_icon.png" alt="Constellation" />
              <img src="/logos/xdc_icon.png" alt="XDC" />
              <img src="/logos/algorand_icon.png" alt="Algorand" />
              <img src="/logos/hashpack_icon.png" alt="HashPack" />
            </MultiClientLogo>
            <span>Client News</span>
            <ArticleCount active={activeSection === 'client'}>
              {(() => {
                // Priority: Preloaded > Enhanced > Instant > Fast > Cached > Direct > Calculated
                if (preloadedClientNews.length > 0) return preloadedClientNews.length;
                if (enhancedClientArticles.length > 0) return enhancedClientArticles.length;
                if (instantClientNews.length > 0) return instantClientNews.length;
                if (fastClientNews.length > 0) return fastClientNews.length;
                if (cachedClientArticles.length > 0) return cachedClientArticles.length;
                if (directClientArticles.length > 0) return directClientArticles.length;
                
                // Fallback: calculate from general articles
                const clientCount = (preloadedAllNews.length > 0 ? preloadedAllNews : (instantAllNews.length > 0 ? instantAllNews : articles)).filter(article => {
                  const title = (article.title || '').toLowerCase();
                  const content = (article.content || article.description || article.summary || '').toLowerCase();
                  const allClientTerms = [...CLIENT_NETWORKS, 'hbar', 'hedera', 'algo', 'algorand', 'dag', 'constellation', 'xdc', 'xinfin', 'hashpack', 'pack', 'swap'];
                  return allClientTerms.some(term => title.includes(term.toLowerCase()) || content.includes(term.toLowerCase()));
                }).length;
                return clientCount;
              })()}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
      </SectionNavigation>

      {/* Client Submenu - Only show when client section is active */}
      {showClientSubmenu && activeSection === 'client' && (
        <ClientSubmenu>
          <SubmenuTitle>Filter by Client Network:</SubmenuTitle>
          <SubmenuButtons>
            {Object.entries(CLIENT_FILTERS).map(([key, client]) => (
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
                        <img key={index} src={logo} alt={`Client ${index + 1}`} />
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
                    {key === 'all' ? directClientArticles.length : 
                     directClientArticles.filter(article => {
                       const title = (article.title || '').toLowerCase();
                       const content = (article.content || article.description || article.summary || '').toLowerCase();
                       const network = (article.network || '').toLowerCase();
                       return client.terms.some(term => {
                         const termLower = term.toLowerCase();
                         return title.includes(termLower) || content.includes(termLower) || network.includes(termLower);
                       });
                     }).length
                    }
                  </ClientArticleCount>
                </ClientButtonContent>
              </ClientFilterButton>
            ))}
            
            {/* Refresh button for client articles */}
            {directClientArticles.length > 0 && (
              <ClientFilterButton
                color="#6c757d"
                onClick={() => fetchDirectClientArticles()}
                disabled={clientArticlesLoading}
                style={{ minWidth: '120px' }}
              >
                <ClientButtonContent>
                  <span style={{ fontSize: '14px' }}>
                    {clientArticlesLoading ? '🔄' : '🔄'} {clientArticlesLoading ? 'Refreshing...' : 'Refresh'}
                  </span>
                </ClientButtonContent>
              </ClientFilterButton>
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
              <option value="Algorand">Algorand (ALGO)</option>
              <option value="XDC">XDC Network (XDC)</option>
              <option value="Constellation">Constellation (DAG)</option>
              <option value="XRP">XRP</option>
            </optgroup>
            
            {/* Top Networks */}
            <optgroup label="📈 Major Networks">
              <option value="Bitcoin">Bitcoin (BTC)</option>
              <option value="Ethereum">Ethereum (ETH)</option>
              <option value="Binance">Binance Coin (BNB)</option>
              <option value="Solana">Solana (SOL)</option>
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
      {breakingNews.length > 0 && activeSection === 'breaking' && (
        <Section>
          <SectionTitle>
            <BreakingBadge>Breaking</BreakingBadge>
            Latest Breaking News
          </SectionTitle>
          {breakingLoading ? (
            <EnhancedLoadingSpinner />
          ) : (
            breakingNews.slice(0, 3).map(article => (
              <NewsCard
                key={article.id}
                article={article}
                bookmarks={bookmarks}
                onBookmarkChange={refetchBookmarks}
              />
            ))
          )}
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
        
        {(searchQuery ? loading : (fastLoading.all || fastLoading.breaking || fastLoading.client)) || (activeSection === 'client' && clientArticlesLoading) ? (
          activeSection === 'client' ? (
            <LoadingContainer>
              <LoadingSpinner>
                <div />
                <div />
              </LoadingSpinner>
              <LoadingMessage>🔍 Extracting client articles from API...</LoadingMessage>
              <LoadingSubtext>Searching for Hedera, Constellation, XDC, Algorand, and HashPack content</LoadingSubtext>
            </LoadingContainer>
          ) : (
            <EnhancedLoadingSpinner />
          )
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
            
            {/* Historical search loading indicator - show after articles */}
            {loadingHistorical && activeSection === 'client' && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', borderTop: '1px solid #333' }}>
                <div style={{ marginBottom: '1rem' }}>🔍</div>
                <div>Searching for additional historical client articles...</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Checking {CLIENT_NETWORKS.length} client networks for past content
                </div>
              </div>
            )}
            
            {/* Pagination */}
            {pagination.total > 1 && (
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
            <p>{error || 
              activeSection === 'client' ? 'No articles found for Hedera, Constellation, XDC, Algorand, or HashPack. Try another section.' :
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
