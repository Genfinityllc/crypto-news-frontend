import React from 'react';
import styled from 'styled-components';
import NewsCard from '../components/news/NewsCard';
import { useFastNews } from '../hooks/useFastNews';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, Helvetica, sans-serif;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const Title = styled.h1`
  color: #fff;
  margin-bottom: 0.5rem;
  font-size: 2.5rem;
  font-weight: bold;
  
  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
  }
`;

const Subtitle = styled.p`
  color: #aaa;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    padding: 0 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 1rem;
    padding: 0 0.5rem;
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
    margin-top: 1.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 1rem;
    margin-top: 1rem;
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
 * 📰 ALL NEWS PAGE - Shows all cryptocurrency news articles
 * 
 * Features:
 * - Chronological ordering (newest first)  
 * - 100% guaranteed working images
 * - Persistent state on page refresh
 * - Real-time updates from RSS feeds
 */
function AllNews() {
  const { 
    news, 
    loading, 
    error, 
    refreshNews 
  } = useFastNews();

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>🌐 All Crypto News</Title>
          <Subtitle>Complete cryptocurrency news from all sources</Subtitle>
        </Header>
        <LoadingMessage>Loading latest news articles...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>🌐 All Crypto News</Title>
          <Subtitle>Complete cryptocurrency news from all sources</Subtitle>
        </Header>
        <ErrorMessage>
          Error loading news: {error.message || 'Unknown error occurred'}
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
        <Title>🌐 All Crypto News</Title>
        <Subtitle>Complete cryptocurrency news from all sources • Updated in real-time</Subtitle>
        <ArticleCount>
          {news.length} articles with confirmed images
        </ArticleCount>
      </Header>

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
          No articles found. This may happen if image validation is in progress.
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

export default AllNews;