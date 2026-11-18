import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import NewsCard from '../components/news/NewsCard';
import { useClientNews } from '../hooks/useClientNews';

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

/**
 * CLIENT NEWS PAGE (/clients and /clients/:client)
 *
 * The clients, their logos and their articles come from one request
 * (useClientNews, backed by the server's single client list), so this page
 * holds no client names of its own.
 */
function ClientNews() {
  const { client } = useParams();
  const { clients, forClient, loading, error, refresh } = useClientNews();

  const wanted = client ? client.toLowerCase() : 'all';
  const current = clients.find(c => c.id === wanted) || null;
  const currentId = current ? current.id : 'all';
  const news = forClient(currentId);
  const title = current ? `${current.displayName} News` : 'Client News';

  const filters = (
    <ClientFilters>
      <ClientFilter to="/clients" color="#007bff" active={currentId === 'all'}>
        <MultiLogo>
          {clients.map(c => (
            <img key={c.id} src={c.logo} alt="" />
          ))}
        </MultiLogo>
        All Clients
      </ClientFilter>
      {clients.map(c => (
        <ClientFilter key={c.id} to={`/clients/${c.id}`} color={c.color} active={currentId === c.id}>
          <ClientLogo src={c.logo} alt="" />
          {c.displayName}
        </ClientFilter>
      ))}
    </ClientFilters>
  );

  const retry = (
    <button
      onClick={refresh}
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
      Try again
    </button>
  );

  return (
    <Container>
      <Header>
        <Title>
          {current && <ClientLogo src={current.logo} alt="" style={{ marginRight: '0.5rem' }} />}
          {title}
        </Title>
        <Subtitle>
          {current
            ? `News that names ${current.displayName}, from the last 30 days`
            : 'News about our clients, from the last 30 days'}
        </Subtitle>
        {!loading && !error && (
          <ArticleCount>
            {news.length} {news.length === 1 ? 'article' : 'articles'}
          </ArticleCount>
        )}
      </Header>

      {filters}

      {loading && news.length === 0 ? (
        <LoadingMessage>Loading client news...</LoadingMessage>
      ) : error && news.length === 0 ? (
        <ErrorMessage>
          Client news could not be loaded.
          <br />
          {retry}
        </ErrorMessage>
      ) : news.length === 0 ? (
        <LoadingMessage>
          {client && !current
            ? 'That client is not on the list.'
            : `No articles ${current ? `for ${current.displayName} ` : ''}in the last 30 days.`}
          <br />
          {retry}
        </LoadingMessage>
      ) : (
        <NewsGrid>
          {news.map(article => (
            <NewsCard key={article.id || article.url} article={article} />
          ))}
        </NewsGrid>
      )}
    </Container>
  );
}

export default ClientNews;
