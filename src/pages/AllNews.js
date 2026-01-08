import React, { useEffect } from 'react';
import styled from 'styled-components';
import NewsCard from '../components/news/NewsCard';
import { usePreloadedNews } from '../contexts/NewsPreloadContext';

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

const RefreshButton = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #0056b3;
  }
`;

/**
 * ALL NEWS PAGE - Shows all cryptocurrency news articles
 * 
 * Uses preloaded news from context for instant loading.
 * Falls back to fetching if preload hasn't completed.
 */
function AllNews() {
  const { 
    allNews, 
    loading, 
    error, 
    refreshNews,
    fetchAllNews,
    isPreloaded 
  } = usePreloadedNews();

  // Ensure news is loaded if we navigate here directly
  useEffect(() => {
    if (!isPreloaded && !loading) {
      fetchAllNews();
    }
  }, [isPreloaded, loading, fetchAllNews]);

  // Show loading only if not preloaded AND actively loading
  if (loading && !isPreloaded) {
    return (
      <Container>
        <Header>
          <Title>All Crypto News</Title>
          <Subtitle>Complete cryptocurrency news from all sources</Subtitle>
        </Header>
        <LoadingMessage>Loading latest news articles...</LoadingMessage>
      </Container>
    );
  }

  if (error && allNews.length === 0) {
    return (
      <Container>
        <Header>
          <Title>All Crypto News</Title>
          <Subtitle>Complete cryptocurrency news from all sources</Subtitle>
        </Header>
        <ErrorMessage>
          Error loading news: {error}
          <br />
          <RefreshButton onClick={refreshNews}>
            Retry
          </RefreshButton>
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>All Crypto News</Title>
        <Subtitle>Complete cryptocurrency news from all sources • Updated in real-time</Subtitle>
        <ArticleCount>
          {allNews.length} articles with confirmed images
          {loading && ' (refreshing...)'}
        </ArticleCount>
      </Header>

      <NewsGrid>
        {allNews.map((article) => (
          <NewsCard
            key={article.id || article.url}
            article={article}
          />
        ))}
      </NewsGrid>

      {allNews.length === 0 && !loading && (
        <LoadingMessage>
          No articles found. This may happen if image validation is in progress.
          <br />
          <RefreshButton onClick={refreshNews}>
            Refresh Articles
          </RefreshButton>
        </LoadingMessage>
      )}
    </Container>
  );
}

export default AllNews;
