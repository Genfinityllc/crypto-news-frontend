import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import NewsCard from '../components/news/NewsCard';
import { useFastNews } from '../hooks/useFastNews';

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
  }
`;

const ClientFilter = styled(Link)`
  padding: 0.6rem 1.2rem;
  background: ${props => props.active ? '#007bff' : '#333'};
  color: ${props => props.active ? '#fff' : '#aaa'};
  border: 1px solid ${props => props.active ? '#007bff' : '#555'};
  border-radius: 25px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.active ? '#0056b3' : '#555'};
    color: #fff;
    text-decoration: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
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

// Client network definitions
const CLIENT_NETWORKS = [
  { name: 'All Clients', path: '/clients', emoji: '🏢' },
  { name: 'Hedera', path: '/clients/hedera', emoji: '🌐' },
  { name: 'XDC Network', path: '/clients/xdc', emoji: '⚡' },
  { name: 'Algorand', path: '/clients/algorand', emoji: '🔷' },
  { name: 'Constellation', path: '/clients/constellation', emoji: '✨' },
  { name: 'HashPack', path: '/clients/hashpack', emoji: '📦' },
  { name: 'SWAP', path: '/clients/swap', emoji: '🔄' }
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
  
  // Get news with appropriate network filter
  const networkParam = currentClient === 'all' ? 'clients' : 
                      currentClient === 'xdc' ? 'XDC Network' : 
                      currentClient === 'hedera' ? 'Hedera' :
                      currentClient === 'algorand' ? 'Algorand' :
                      currentClient === 'constellation' ? 'Constellation' :
                      currentClient === 'hashpack' ? 'HashPack' :
                      currentClient === 'swap' ? 'SWAP' : 'clients';
  
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
          <Title>{currentClientInfo.emoji} {currentClientInfo.name} News</Title>
          <Subtitle>Latest news from our valued clients</Subtitle>
        </Header>
        
        <ClientFilters>
          {CLIENT_NETWORKS.map((clientNetwork) => (
            <ClientFilter
              key={clientNetwork.path}
              to={clientNetwork.path}
              active={clientNetwork.path === `/clients/${currentClient}` || 
                     (currentClient === 'all' && clientNetwork.path === '/clients')}
            >
              {clientNetwork.emoji} {clientNetwork.name}
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
          <Title>{currentClientInfo.emoji} {currentClientInfo.name} News</Title>
          <Subtitle>Latest news from our valued clients</Subtitle>
        </Header>
        
        <ClientFilters>
          {CLIENT_NETWORKS.map((clientNetwork) => (
            <ClientFilter
              key={clientNetwork.path}
              to={clientNetwork.path}
              active={clientNetwork.path === `/clients/${currentClient}` || 
                     (currentClient === 'all' && clientNetwork.path === '/clients')}
            >
              {clientNetwork.emoji} {clientNetwork.name}
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
            active={clientNetwork.path === `/clients/${currentClient}` || 
                   (currentClient === 'all' && clientNetwork.path === '/clients')}
          >
            {clientNetwork.emoji} {clientNetwork.name}
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