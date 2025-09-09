import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNews, useBreakingNews } from '../hooks/useNews';
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
        case 'latest': return 'linear-gradient(135deg, #3742fa, #2f3542)';
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
        case 'latest': return '#3742fa'; 
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
        case 'latest': return 'linear-gradient(135deg, rgba(55, 66, 250, 0.1), rgba(47, 53, 66, 0.05))';  
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
        case 'latest': return '0 8px 25px rgba(55, 66, 250, 0.4)';
        case 'all': return '0 8px 25px rgba(46, 213, 115, 0.4)';
        default: return '0 8px 25px rgba(0, 123, 255, 0.4)';
      }
    }};
    border-color: ${props => {
      switch(props.variant) {
        case 'breaking': return '#ff4757';
        case 'client': return '#ffa502';
        case 'latest': return '#3742fa';
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
  
  const { articles, loading, error, pagination, search, loadPage, refetch } = useNews(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSearchQuery(''); // Clear search when switching sections
    
    // Apply filters based on section with more specific logic
    switch (section) {
      case 'all':
        // Show all news without any filters
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
        
      case 'latest':
        // Show recent non-breaking news
        setFilters(prev => ({ 
          ...prev, 
          category: 'all',
          network: 'all',
          sortBy: 'date' 
        }));
        break;
        
      case 'client':
        // Show news from major client networks (not general news)
        setFilters(prev => ({ 
          ...prev, 
          category: 'all',
          network: 'all', // Will be refined to exclude 'general' 
          sortBy: 'date'
        }));
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


      {/* Section Navigation */}
      <SectionNavigation>
        <SectionButton 
          active={activeSection === 'all'}
          variant="all"
          onClick={() => handleSectionChange('all')}
        >
          <ButtonContent>
            <span>📊 All News</span>
            <ArticleCount active={activeSection === 'all'}>
              {articles.length}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
        <SectionButton 
          active={activeSection === 'latest'}
          variant="latest"
          onClick={() => handleSectionChange('latest')}
        >
          <ButtonContent>
            <span>📰 Latest News</span>
            <ArticleCount active={activeSection === 'latest'}>
              {activeSection === 'latest' ? articles.length : '•'}
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
              {breakingNews.length > 0 ? breakingNews.length : '•'}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
        <SectionButton 
          active={activeSection === 'client'}
          variant="client"
          onClick={() => handleSectionChange('client')}
        >
          <ButtonContent>
            <span>🌟 Client News</span>
            <ArticleCount active={activeSection === 'client'}>
              {activeSection === 'client' ? articles.length : '•'}
            </ArticleCount>
          </ButtonContent>
        </SectionButton>
      </SectionNavigation>

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

      {/* Breaking News Section */}
      {breakingNews.length > 0 && (
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
            'Latest News'
          }
        </SectionTitle>
        
        {loading ? (
          <EnhancedLoadingSpinner />
        ) : articles.length > 0 ? (
          <>
            {articles.map(article => (
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
            <h3>{error ? 'Error Loading Articles' : 'No articles found'}</h3>
            <p>{error || 'Try adjusting your filters or search terms.'}</p>
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