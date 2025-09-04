import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../hooks/useBookmarks';
import NewsCard from '../components/news/NewsCard';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const BookmarksContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: white;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
`;

const Subtitle = styled.p`
  color: #ccc;
  margin: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #888;

  h3 {
    color: #ccc;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  p {
    margin-bottom: 2rem;
    line-height: 1.6;
  }
`;

const StyledLink = styled(Link)`
  display: inline-block;
  padding: 12px 24px;
  background: #0066cc;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: #0052a3;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;

  div {
    border: 4px solid #333;
    border-top: 4px solid #0066cc;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const BookmarksGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ErrorMessage = styled.div`
  background: #ff4444;
  color: white;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 2rem;
  text-align: center;
`;

const SignInPrompt = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #888;

  h3 {
    color: #ccc;
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 2rem;
  }
`;

export default function Bookmarks() {
  const { currentUser } = useAuth();
  const { bookmarks, loading, error, refetch } = useBookmarks();

  if (!currentUser) {
    return (
      <BookmarksContainer>
        <Header>
          <Title>My Bookmarks</Title>
          <Subtitle>Save your favorite crypto news articles</Subtitle>
        </Header>

        <SignInPrompt>
          <h3>Sign in to view your bookmarks</h3>
          <p>Create an account to save and organize your favorite crypto news articles.</p>
          <StyledLink to="/login">Sign In</StyledLink>
        </SignInPrompt>
      </BookmarksContainer>
    );
  }

  if (loading) {
    return (
      <BookmarksContainer>
        <Header>
          <Title>My Bookmarks</Title>
          <Subtitle>Save your favorite crypto news articles</Subtitle>
        </Header>
        <LoadingSpinner><div /></LoadingSpinner>
      </BookmarksContainer>
    );
  }

  return (
    <BookmarksContainer>
      <Header>
        <Title>My Bookmarks</Title>
        <Subtitle>
          {bookmarks.length === 0 
            ? 'No bookmarks saved yet' 
            : `${bookmarks.length} saved article${bookmarks.length === 1 ? '' : 's'}`
          }
        </Subtitle>
      </Header>

      {error && (
        <ErrorMessage>
          Failed to load bookmarks: {error}
        </ErrorMessage>
      )}

      {bookmarks.length > 0 ? (
        <BookmarksGrid>
          {bookmarks.map(bookmark => (
            <NewsCard
              key={bookmark.id}
              article={bookmark.articles || bookmark} // Handle different API response structures
              bookmarks={bookmarks}
              onBookmarkChange={refetch}
            />
          ))}
        </BookmarksGrid>
      ) : (
        <EmptyState>
          <h3>No bookmarks yet</h3>
          <p>
            Start exploring crypto news and bookmark articles you want to read later.<br />
            Click the bookmark icon (☆) on any article to save it here.
          </p>
          <StyledLink to="/dashboard">Browse News</StyledLink>
        </EmptyState>
      )}
    </BookmarksContainer>
  );
}