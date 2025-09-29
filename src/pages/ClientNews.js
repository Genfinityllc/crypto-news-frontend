import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import NewsCard from '../components/news/NewsCard';
import { useFastNews } from '../hooks/useFastNews';
import { getClientNetworkMetadata } from '../services/api';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, Helvetica, sans-serif;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #fff;
  margin-bottom: 0.5rem;
  font-size: 2.5rem;
  font-weight: bold;
`;

const Subtitle = styled.p`
  color: #aaa;
  font-size: 1.1rem;
  margin-bottom: 2rem;
`;

const ClientFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin: 2rem 0;
  
  @media (max-width: 768px) {
    gap: 0.3rem;
    margin: 1.5rem 0;
    padding: 0 0.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.25rem;
    margin: 1rem 0;
    padding: 0 0.25rem;
  }
`;

const ClientFilter = styled(Link)`
  padding: 0.6rem 1.2rem;
  background: ${props => props.active ? (props.color || '#007bff') : '#333'};
  color: ${props => props.active ? '#fff' : '#aaa'};
  border: 1px solid ${props => props.active ? (props.color || '#007bff') : '#555'};
  border-radius: 25px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;

  &:hover {
    background: ${props => props.active ? (props.color ? `${props.color}dd` : '#0056b3') : '#555'};
    color: #fff;
    text-decoration: none;
    border-color: ${props => props.color || '#007bff'};
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    gap: 0.25rem;
    border-radius: 20px;
  }
  
  @media (max-width: 480px) {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
    gap: 0.2rem;
    border-radius: 15px;
    /* Allow text to wrap on very small screens */
    white-space: normal;
    text-align: center;
    min-width: auto;
  }
`;

const ClientLogo = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 2px;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    width: 16px;
    height: 16px;
  }
  
  @media (max-width: 480px) {
    width: 14px;
    height: 14px;
  }
`;

const MultiLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  
  img {
    width: 14px;
    height: 14px;
    object-fit: contain;
    border-radius: 1px;
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    img {
      width: 12px;
      height: 12px;
    }
  }
  
  @media (max-width: 480px) {
    img {
      width: 10px;
      height: 10px;
    }
  }
`;

const NewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: #aaa;
  font-size: 1.2rem;
  padding: 3rem;
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
`;

const ArticleCount = styled.div`
  text-align: center;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

// Fallback client network definitions (used while loading from API)
const FALLBACK_CLIENT_NETWORKS = [
  { name: 'All Clients', path: '/clients', emoji: '🏢', logo: 'multi', color: '#007bff', logos: [] },
  { name: 'Hedera', path: '/clients/hedera', emoji: '🌐', logo: '/logos/hedera_icon.png', color: '#0066cc' },
  { name: 'XDC Network', path: '/clients/xdc', emoji: '⚡', logo: '/logos/xdc_icon.png', color: '#22c55e' },
  { name: 'Algorand', path: '/clients/algorand', emoji: '🔷', logo: '/logos/algorand_icon.png', color: '#ff4757' },
  { name: 'Constellation', path: '/clients/constellation', emoji: '✨', logo: '/logos/constellation_icon.png', color: '#8b5cf6' },
  { name: 'HashPack', path: '/clients/hashpack', emoji: '📦', logo: '/logos/hashpack_icon.png', color: '#00b4d8' }
];

/**
 * 🏢 CLIENT NEWS PAGE - Shows client-specific cryptocurrency news
 * 
 * Features:
 * - All client networks or specific client filtering
 * - Persistent URL-based filtering  
 * - 100% guaranteed working images
 * - Real-time updates from RSS feeds
 */
function ClientNews() {
  const { client } = useParams();
  const currentClient = client ? client.toLowerCase() : 'all';
  
  // State for client network metadata
  const [clientNetworks, setClientNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(true);
  
  // Generate CLIENT_NETWORKS from API data or fallback
  const CLIENT_NETWORKS = React.useMemo(() => {
    if (clientNetworks.length === 0) {
      return FALLBACK_CLIENT_NETWORKS;
    }

    const networks = [
      {
        name: 'All Clients',
        path: '/clients',
        logo: 'multi',
        color: '#007bff',
        logos: clientNetworks.map(network => network.logo)
      }
    ];

    // Add individual client networks from API
    clientNetworks.forEach(network => {
      const path = `/clients/${network.id}`;
      networks.push({
        name: network.displayName,
        path: path,
        logo: network.logo,
        color: network.color,
        id: network.id
      });
    });

    return networks;
  }, [clientNetworks]);

  // Fetch client network metadata on mount
  useEffect(() => {
    const fetchClientNetworks = async () => {
      try {
        setLoadingNetworks(true);
        const response = await getClientNetworkMetadata(true);
        if (response && response.data) {
          console.log('🎨 Fetched client network metadata for ClientNews:', response.data);
          setClientNetworks(response.data);
        }
      } catch (error) {
        console.error('❌ Error fetching client network metadata:', error);
        // Keep fallback data if API fails
      } finally {
        setLoadingNetworks(false);
      }
    };

    fetchClientNetworks();
  }, []);
  
  // Get news with appropriate network filter
  const networkParam = currentClient === 'all' ? 'clients' : 
                      currentClient === 'xdc' ? 'XDC Network' : 
                      currentClient === 'hedera' ? 'Hedera' :
                      currentClient === 'algorand' ? 'Algorand' :
                      currentClient === 'constellation' ? 'Constellation' :
                      currentClient === 'hashpack' ? 'HashPack' : 'clients';
  
  const { 
    news, 
    loading, 
    error, 
    refreshNews 
  } = useFastNews(networkParam === 'clients' ? 'client' : 'all', { network: networkParam });

  // Get current client info
  const currentClientInfo = CLIENT_NETWORKS.find(c => 
    c.path === `/clients/${currentClient}` || (currentClient === 'all' && c.path === '/clients')
  ) || CLIENT_NETWORKS[0];

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>
            {currentClientInfo.logo && currentClientInfo.logo !== 'multi' && !loadingNetworks ? (
              <ClientLogo 
                src={currentClientInfo.logo} 
                alt={currentClientInfo.name}
                style={{ marginRight: '0.5rem' }}
                onError={(e) => {
                  // Fallback to emoji if logo fails
                  e.target.style.display = 'none';
                  const span = document.createElement('span');
                  span.textContent = currentClientInfo.emoji || '🏢';
                  span.style.marginRight = '0.5rem';
                  e.target.parentNode.insertBefore(span, e.target);
                }}
              />
            ) : (
              currentClientInfo.emoji + ' '
            )}
            {currentClientInfo.name} News
          </Title>
          <Subtitle>Latest news from our valued clients</Subtitle>
        </Header>
        
        <ClientFilters>
          {CLIENT_NETWORKS.map((clientNetwork) => (
            <ClientFilter
              key={clientNetwork.path}
              to={clientNetwork.path}
              color={clientNetwork.color}
              active={clientNetwork.path === `/clients/${currentClient}` || 
                     (currentClient === 'all' && clientNetwork.path === '/clients')}
            >
                {clientNetwork.logo === 'multi' ? (
                  <MultiLogo>
                    {clientNetwork.logos && clientNetwork.logos.map((logo, index) => (
                      <img key={index} src={logo} alt={`Client ${index + 1}`} />
                    ))}
                  </MultiLogo>
                ) : (
                  <ClientLogo 
                    src={clientNetwork.logo} 
                    alt={clientNetwork.name}
                    onError={(e) => {
                      // Fallback to emoji if logo fails to load
                      e.target.style.display = 'none';
                      const span = document.createElement('span');
                      span.textContent = clientNetwork.emoji || '🏢';
                      e.target.parentNode.insertBefore(span, e.target);
                    }}
                  />
                )}
                {clientNetwork.name}
            </ClientFilter>
          ))}
        </ClientFilters>
        
        <LoadingMessage>Loading client news articles...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>
            {currentClientInfo.logo && currentClientInfo.logo !== 'multi' && !loadingNetworks ? (
              <ClientLogo 
                src={currentClientInfo.logo} 
                alt={currentClientInfo.name}
                style={{ marginRight: '0.5rem' }}
                onError={(e) => {
                  // Fallback to emoji if logo fails
                  e.target.style.display = 'none';
                  const span = document.createElement('span');
                  span.textContent = currentClientInfo.emoji || '🏢';
                  span.style.marginRight = '0.5rem';
                  e.target.parentNode.insertBefore(span, e.target);
                }}
              />
            ) : (
              currentClientInfo.emoji + ' '
            )}
            {currentClientInfo.name} News
          </Title>
          <Subtitle>Latest news from our valued clients</Subtitle>
        </Header>
        
        <ClientFilters>
          {CLIENT_NETWORKS.map((clientNetwork) => (
            <ClientFilter
              key={clientNetwork.path}
              to={clientNetwork.path}
              color={clientNetwork.color}
              active={clientNetwork.path === `/clients/${currentClient}` || 
                     (currentClient === 'all' && clientNetwork.path === '/clients')}
            >
                {clientNetwork.logo === 'multi' ? (
                  <MultiLogo>
                    {clientNetwork.logos && clientNetwork.logos.map((logo, index) => (
                      <img key={index} src={logo} alt={`Client ${index + 1}`} />
                    ))}
                  </MultiLogo>
                ) : (
                  <ClientLogo 
                    src={clientNetwork.logo} 
                    alt={clientNetwork.name}
                    onError={(e) => {
                      // Fallback to emoji if logo fails to load
                      e.target.style.display = 'none';
                      const span = document.createElement('span');
                      span.textContent = clientNetwork.emoji || '🏢';
                      e.target.parentNode.insertBefore(span, e.target);
                    }}
                  />
                )}
                {clientNetwork.name}
            </ClientFilter>
          ))}
        </ClientFilters>
        
        <ErrorMessage>
          Error loading client news: {error.message || 'Unknown error occurred'}
          <br />
          <button 
            onClick={refreshNews}
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              background: '#ff6b6b', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>{currentClientInfo.emoji} {currentClientInfo.name} News</Title>
        <Subtitle>
          {currentClient === 'all' 
            ? 'Latest news from all our valued client networks' 
            : `Exclusive ${currentClientInfo.name} updates and insights`
          }
        </Subtitle>
        <ArticleCount>
          {news.length} articles with confirmed images
        </ArticleCount>
      </Header>

      <ClientFilters>
        {CLIENT_NETWORKS.map((clientNetwork) => (
          <ClientFilter
            key={clientNetwork.path}
            to={clientNetwork.path}
            color={clientNetwork.color}
            active={clientNetwork.path === `/clients/${currentClient}` || 
                   (currentClient === 'all' && clientNetwork.path === '/clients')}
          >
            {clientNetwork.logo === 'multi' ? (
              <MultiLogo>
                {clientNetwork.logos && clientNetwork.logos.map((logo, index) => (
                  <img key={index} src={logo} alt={`Client ${index + 1}`} />
                ))}
              </MultiLogo>
            ) : clientNetwork.logo && !loadingNetworks ? (
              <ClientLogo 
                src={clientNetwork.logo} 
                alt={clientNetwork.name}
                onError={(e) => {
                  // Fallback to emoji if logo fails to load
                  e.target.style.display = 'none';
                  const span = document.createElement('span');
                  span.textContent = clientNetwork.emoji || '🏢';
                  e.target.parentNode.insertBefore(span, e.target);
                }}
              />
            ) : (
              clientNetwork.emoji || '🏢'
            )}
            {clientNetwork.name}
          </ClientFilter>
        ))}
      </ClientFilters>

      <NewsGrid>
        {news.map((article) => (
          <NewsCard
            key={article.id || article.url}
            article={article}
          />
        ))}
      </NewsGrid>

      {news.length === 0 && !loading && (
        <LoadingMessage>
          No {currentClient === 'all' ? 'client' : currentClientInfo.name} articles found with images.
          <br />
          This may happen if image validation is in progress or there are no recent articles.
          <br />
          <button 
            onClick={refreshNews}
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              background: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Articles
          </button>
        </LoadingMessage>
      )}
    </Container>
  );
}

export default ClientNews;