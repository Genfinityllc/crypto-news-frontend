import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addBookmark, removeBookmark, generateCardImage, generateAIRewrite, rewriteRSSArticle, addRSSBookmark, removeRSSBookmark } from '../../services/api';
import { toast } from 'react-toastify';
import styled from 'styled-components';

// Neon Badge Styles according to Style Guide
const BadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 10px 0;
`;

const NeonBadge = styled.span`
  display: inline-block;
  margin: 5px 5px 0 0;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: bold;
  font-family: Arial, Helvetica, sans-serif;
  color: ${props => {
    switch(props.type) {
      case 'press': return '#000';
      case 'virality': return '#000';
      case 'readability': return '#000';
      default: return '#fff';
    }
  }};
  background: ${props => {
    switch(props.type) {
      case 'breaking': return '#ff0055';
      case 'latest': return '#00aaff';
      case 'press': return '#ffcc00';
      case 'partner': return '#7d00ff';
      case 'virality': return '#00ff99';
      case 'readability': return '#00ffaa';
      case 'topic': return '#0af';
      default: return '#00aaff';
    }
  }};
`;

const TickerBadge = styled.span`
  display: inline-block;
  background: #007bff;
  color: #fff;
  border-radius: 14px;
  padding: 4px 12px;
  font-size: 12px;
  margin: 5px 5px 0 0;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: bold;
`;

const BookmarkButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: ${props => props.saved ? '#28a745' : '#007bff'};
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
`;

const CardImage = styled.img`
  width: 100%;
  border-radius: 6px;
  display: block;
`;

const AILabel = styled.div`
  font-size: 12px;
  color: #0af;
  margin: 2px 0 8px;
  font-family: Arial, Helvetica, sans-serif;
`;

const Card = styled.div`
  background: #202020;
  border-radius: 10px;
  margin-bottom: 25px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  position: relative;
  max-width: 900px;
  width: 100%;

  &:hover {
    border-color: #00aaff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 170, 255, 0.3);
  }

  @media (max-width: 768px) {
    margin-bottom: 20px;
    border-radius: 8px;
    width: 100%;
    max-width: none;
    
    .ai-inline-article { 
      display: block; 
    }
  }
`;


const CardContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-family: Arial, Helvetica, sans-serif;
`;

const CardHeader = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ImageContainer = styled.div`
  flex-shrink: 0;
  width: 240px;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(45deg, rgba(0,102,204,0.1), rgba(0,180,216,0.1));
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  &:hover::after {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    height: 180px;
    margin-bottom: 1rem;
  }
`;

const ArticleImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const PlaceholderImage = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #0066cc20, #00b4d820);
  color: #666;
  font-size: 3rem;
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

// const Badge = styled.span`
//   background: ${props => {
//     switch (props.type) {
//       case 'breaking': return 'linear-gradient(45deg, #ff4444, #ff6666)';
//       case 'market': return 'linear-gradient(45deg, #0066cc, #0080ff)';
//       case 'technology': return 'linear-gradient(45deg, #22c55e, #4ade80)';
//       case 'regulation': return 'linear-gradient(45deg, #f59e0b, #fbbf24)';
//       case 'viral': return 'linear-gradient(45deg, #8b5cf6, #a78bfa)';
//       default: return 'linear-gradient(45deg, #6b7280, #9ca3af)';
//     }
//   }};
//   color: white;
//   padding: 0.375rem 0.75rem;
//   border-radius: 20px;
//   font-size: 0.7rem;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.05em;
//   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
//   border: 1px solid rgba(255, 255, 255, 0.1);
//   backdrop-filter: blur(10px);
// `;

// const NetworkBadge = styled.span`
//   background: #374151;
//   color: #d1d5db;
//   padding: 0.25rem 0.5rem;
//   border-radius: 4px;
//   font-size: 0.75rem;
// `;

// const ViralScore = styled.div`
//   display: flex;
//   align-items: center;
//   gap: 0.5rem;
//   background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.2));
//   border: 1px solid rgba(139, 92, 246, 0.3);
//   border-radius: 20px;
//   padding: 0.375rem 0.75rem;
//   font-size: 0.75rem;
//   font-weight: 600;
//   color: #a78bfa;
//   backdrop-filter: blur(10px);
//   
//   &::before {
//     content: '🔥';
//     font-size: 0.8rem;
//   }
// `;

// const ReadabilityScore = styled.div`
//   display: flex;
//   align-items: center;
//   gap: 0.5rem;
//   background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(74, 222, 128, 0.2));
//   border: 1px solid rgba(34, 197, 94, 0.3);
//   border-radius: 20px;
//   padding: 0.375rem 0.75rem;
//   font-size: 0.75rem;
//   font-weight: 600;
//   color: #4ade80;
//   backdrop-filter: blur(10px);
//   
//   &::before {
//     content: '📖';
//     font-size: 0.8rem;
//   }
// `;

const Title = styled.h3`
  color: #f0f0f0;
  margin: 0 0 0.75rem 0;
  font-size: 1.35rem;
  line-height: 1.3;
  cursor: pointer;
  font-weight: 700;
  font-family: Arial, Helvetica, sans-serif;
  transition: all 0.3s;
  
  &:hover {
    color: #00aaff;
    transform: translateX(4px);
  }
`;

const Summary = styled.p`
  color: #aaa;
  margin: 0 0 1rem 0;
  line-height: 1.5;
  font-family: Arial, Helvetica, sans-serif;
`;

const AIRewriteContainer = styled.div`
  margin: 1rem 0;
`;

const AIRewriteHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #0066cc20, #00b4d820);
  border: 1px solid #0066cc40;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background: linear-gradient(135deg, #0066cc30, #00b4d830);
    border-color: #0066cc60;
  }
`;

const AIRewriteTitle = styled.h4`
  color: #0066cc;
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ExpandIcon = styled.span`
  transition: transform 0.3s;
  transform: ${props => props.expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  font-size: 0.8rem;
`;

const AIRewriteContent = styled.div`
  background: #1a1a1a;
  border: 1px solid #0066cc40;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 1.5rem;
  max-height: ${props => props.expanded ? '600px' : '0'};
  overflow-y: auto;
  opacity: ${props => props.expanded ? '1' : '0'};
  transition: all 0.4s ease-in-out;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #2a2a2a;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #0066cc;
    border-radius: 3px;
  }
`;

const RewrittenArticle = styled.div`
  color: #e5e7eb;
  line-height: 1.7;
  font-size: 1rem;
  
  h1, h2, h3, h4, h5, h6 {
    color: #ffffff;
    margin: 1.5rem 0 0.75rem 0;
    font-weight: 600;
  }
  
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.3rem; }
  h3 { font-size: 1.1rem; }
  
  p {
    margin: 0 0 1rem 0;
    text-align: justify;
  }
  
  strong {
    color: #0066cc;
    font-weight: 600;
  }
  
  em {
    color: #00b4d8;
    font-style: italic;
  }
  
  ul, ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  li {
    margin: 0.5rem 0;
  }
  
  blockquote {
    border-left: 3px solid #0066cc;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #ccc;
  }
`;

const RewriteStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #888;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #333;
`;

const RewriteMetrics = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  
  span {
    background: #2a2a2a;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid #444;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #333;
`;

const CopyButton = styled.button`
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 8px;
  background: transparent;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;

  &:hover {
    background: #2a2a2a;
    color: #0066cc;
    border-color: #0066cc;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ActionButton = styled.button`
  padding: 0.625rem 1.25rem;
  border: 1px solid #444;
  border-radius: 10px;
  background: ${props => props.active ? 'linear-gradient(45deg, #0066cc, #0080ff)' : 'transparent'};
  color: ${props => props.active ? 'white' : '#ccc'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(45deg, rgba(0, 102, 204, 0.1), rgba(0, 180, 216, 0.1));
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    background: ${props => props.active ? 'linear-gradient(45deg, #0080ff, #00b4d8)' : 'linear-gradient(45deg, #2a2a2a, #333)'};
    color: white;
    border-color: #0066cc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
  }

  &:hover::before {
    opacity: 1;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  &:active {
    transform: translateY(0);
  }
`;

const Timestamp = styled.span`
  color: #888;
  font-size: 0.875rem;
  font-family: Arial, Helvetica, sans-serif;
`;

const Source = styled.span`
  color: #888;
  font-size: 0.875rem;
  font-family: Arial, Helvetica, sans-serif;
`;

// Helper function to strip HTML and clean text
function stripHtml(html) {
  if (!html) return '';
  
  // Convert to string in case it's not
  html = String(html);
  
  let text = html
    // Remove script and style tags completely with their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove all HTML tags (more comprehensive)
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Handle common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '...')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    // Remove any remaining HTML entities (fallback)
    .replace(/&[#\w]+;/g, '')
    // Clean up excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
    
  return text;
}

// Helper function to get clean, readable content
function getReadableContent(article) {
  // Try different content sources in order of preference
  let content = article.summary || article.content || article.description || '';
  
  // Clean HTML thoroughly
  content = stripHtml(content);
  
  // Additional cleaning for specific patterns
  content = content
    // Remove image references and URLs that might have slipped through
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/www\.[^\s]+/g, '')
    // Remove file references
    .replace(/\.(jpg|jpeg|png|gif|webp|svg)[^\s]*/gi, '')
    // Clean up extra spaces again
    .replace(/\s+/g, ' ')
    .trim();
  
  // If content is too long, truncate it intelligently
  if (content.length > 250) {
    // Try to cut at a sentence or word boundary
    let truncated = content.substring(0, 250);
    const lastSentence = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSentence > 200) {
      content = content.substring(0, lastSentence + 1);
    } else if (lastSpace > 200) {
      content = content.substring(0, lastSpace) + '...';
    } else {
      content = truncated + '...';
    }
  }
  
  // If content is too short or empty, provide a meaningful fallback
  if (content.length < 20) {
    // Try to create a summary from the title
    const title = article.title || '';
    if (title.length > 10) {
      content = `Read more about ${title.toLowerCase()} in the full article.`;
    } else {
      content = 'Click "Read Full Article" to view the complete story from the source.';
    }
  }
  
  return content;
}

export default function NewsCard({ article, bookmarks = [], onBookmarkChange, onRewrite, isRewriting = false }) {
  const { currentUser } = useAuth();
  const [aiRewrite, setAiRewrite] = useState(null);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [rewriteExpanded, setRewriteExpanded] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const isBookmarked = bookmarks.some(b => b.articleId === article.id);
  const publishedDate = new Date(article.published_at).toLocaleDateString();
  const timeAgo = getTimeAgo(article.published_at);
  const readableContent = getReadableContent(article);
  
  const viralScore = article.viral_score || 0;
  const readabilityScore = article.readability_score || 0;
  const articleImage = generatedImage || aiRewrite?.cardImage || article.cover_image || article.image_url || null;
  
  // Debug image loading
  React.useEffect(() => {
    console.log('Article image debug:', {
      title: article.title?.substring(0, 50),
      generatedImage,
      aiRewriteCardImage: aiRewrite?.cardImage,
      cover_image: article.cover_image,
      image_url: article.image_url,
      finalArticleImage: articleImage
    });
  }, [article.title, generatedImage, aiRewrite?.cardImage, article.cover_image, article.image_url, articleImage]);

  const handleTitleClick = () => {
    if (article.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleBookmark = async () => {
    if (!currentUser) {
      toast.error('Please sign in to bookmark articles');
      return;
    }

    console.log('Bookmarking article:', article.title);
    console.log('Current user:', currentUser);
    console.log('Article ID type:', typeof article.id, 'ID value:', article.id);
    console.log('Is bookmarked:', isBookmarked);
    
    setBookmarking(true);
    try {
      // Check if this is an RSS article (no database ID) or database article
      // Database articles have UUID strings, RSS articles have no ID or non-UUID format
      if (article.id && (typeof article.id === 'string' && article.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        // Database article with proper UUID ID - use Firebase bookmark system
        if (isBookmarked) {
          const bookmark = bookmarks.find(b => b.articleId === article.id);
          await removeBookmark(bookmark.id);
          toast.success('Bookmark removed');
        } else {
          await addBookmark(article.id);
          toast.success('Article bookmarked');
        }
      } else {
        // RSS article - use RSS bookmark system
        const userId = currentUser.uid;
        
        if (isBookmarked) {
          // Find the RSS bookmark to remove
          const bookmark = bookmarks.find(b => b.rssId === article.rssId || b.url === article.url);
          if (bookmark) {
            await removeRSSBookmark(bookmark.bookmarkId, userId);
            toast.success('RSS bookmark removed');
          }
        } else {
          // Add RSS bookmark
          const articleData = {
            title: article.title,
            url: article.url,
            content: article.content || article.description || article.summary,
            source: article.source,
            network: article.network,
            category: article.category,
            published_at: article.published_at,
            image_url: article.image_url || article.cover_image
          };
          
          await addRSSBookmark(articleData, userId);
          toast.success('RSS article bookmarked');
        }
      }
      
      if (onBookmarkChange) onBookmarkChange();
    } catch (error) {
      toast.error('Failed to update bookmark: ' + (error.message || 'Unknown error'));
      console.error('Bookmark error:', error);
    } finally {
      setBookmarking(false);
    }
  };

  const handleGenerateRewrite = async () => {
    setLoadingRewrite(true);
    try {
      let response;
      
      // Check if this is an RSS article (no database ID) or database article
      if (article.id && (typeof article.id === 'string' && article.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
        // Database article with proper UUID ID - use enhanced rewrite
        response = await generateAIRewrite(article.id);
      } else {
        // RSS article - try to find matching database article first
        try {
          // Search for database article with same title
          const searchResponse = await searchNews(article.title, { source: 'database', limit: 1 });
          const dbArticle = searchResponse.data?.[0];
          
          if (dbArticle && dbArticle.id) {
            // Found matching database article, use its ID for enhanced rewrite
            response = await generateAIRewrite(dbArticle.id);
          } else {
            throw new Error('No database article found');
          }
        } catch (dbError) {
          // Fallback to RSS rewrite if database article not found
          const articleData = {
            title: article.title,
            content: article.content || article.description || article.summary || '',
            url: article.url,
            source: article.source,
            network: article.network,
            category: article.category
          };
          response = await rewriteRSSArticle(articleData);
        }
      }
      
      if (response && response.data) {
        setAiRewrite(response.data);
        setRewriteExpanded(true);
        toast.success('AI rewrite generated successfully!');
      } else {
        throw new Error('Invalid response from AI rewrite service');
      }
    } catch (error) {
      console.error('AI rewrite error:', error);
      toast.error('Failed to generate AI rewrite: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingRewrite(false);
    }
  };

  const toggleRewriteExpanded = () => {
    setRewriteExpanded(!rewriteExpanded);
  };

  const handleCopy = async (type) => {
    let textToCopy = '';
    
    switch (type) {
      case 'title':
        textToCopy = article.title;
        break;
      case 'url':
        textToCopy = article.url;
        break;
      case 'summary':
        textToCopy = readableContent;
        break;
      default:
        textToCopy = `${article.title}\n\n${readableContent}\n\nSource: ${article.url}`;
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
      toast.success(`${type === 'title' ? 'Title' : type === 'url' ? 'URL' : type === 'summary' ? 'Summary' : 'Article'} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleGenerateImage = async () => {
    if (article.id) {
      setGeneratingImage(true);
      try {
        const response = await generateCardImage(article.id, 'medium');
        if (response.success) {
          setGeneratedImage(response.data.coverImage);
          toast.success('Card image generated!');
        }
      } catch (error) {
        toast.error('Failed to generate card image');
        console.error('Image generation error:', error);
      } finally {
        setGeneratingImage(false);
      }
    }
  };

  return (
    <Card>
      {currentUser && (
        <BookmarkButton 
          onClick={handleBookmark}
          disabled={bookmarking}
          saved={isBookmarked}
        >
          {bookmarking ? '...' : isBookmarked ? '★' : '☆'}
        </BookmarkButton>
      )}
      {generatedImage && (
        <>
          <AILabel>AI Generated Cover Image</AILabel>
          <CardImage 
            src={generatedImage} 
            alt={`AI generated cover for: ${article.title}`}
          />
        </>
      )}
      <CardContent>
        <MetaInfo>
          <BadgeContainer>
            {article.is_breaking && <NeonBadge type="breaking">BREAKING</NeonBadge>}
            {article.category === 'press-release' && <NeonBadge type="press">PRESS RELEASE</NeonBadge>}
            {viralScore > 75 && <NeonBadge type="virality">VIRAL {viralScore}</NeonBadge>}
            {readabilityScore >= 97 && <NeonBadge type="readability">READ {readabilityScore}%</NeonBadge>}
            {article.network && article.network.toLowerCase() !== 'general' && (
              <TickerBadge>${article.network.toUpperCase()}</TickerBadge>
            )}
            {article.network && article.network.toLowerCase() === 'general' && (
              <NeonBadge type="topic">GENERAL</NeonBadge>
            )}
            <NeonBadge type="latest">LATEST</NeonBadge>
            {article.category && article.category !== 'press-release' && (
              <NeonBadge type="topic">{article.category.toUpperCase()}</NeonBadge>
            )}
          </BadgeContainer>
          <Source>from {article.source}</Source>
          <Timestamp title={publishedDate}>{timeAgo}</Timestamp>
        </MetaInfo>

        <CardHeader>
          <MainContent>
            <Title onClick={handleTitleClick}>
              {article.title}
            </Title>

            <Summary>
              {readableContent}
            </Summary>

            {aiRewrite && (
              <AIRewriteContainer>
                <AIRewriteHeader onClick={toggleRewriteExpanded}>
                  <AIRewriteTitle>
                    ✨ AI Rewritten Article
                    <span>({aiRewrite.readabilityScore || 97}% Readable, SEO Optimized)</span>
                  </AIRewriteTitle>
                  <ExpandIcon expanded={rewriteExpanded}>▼</ExpandIcon>
                </AIRewriteHeader>
                
                <AIRewriteContent expanded={rewriteExpanded}>
                  <RewrittenArticle>
                    {aiRewrite.rewrittenContent ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: aiRewrite.rewrittenContent.replace(/\n/g, '<br>') 
                      }} />
                    ) : (
                      <div>
                        <h2>{aiRewrite.rewrittenTitle || article.title}</h2>
                        <p>{aiRewrite.rewrittenText || 'Rewritten content will appear here...'}</p>
                      </div>
                    )}
                  </RewrittenArticle>
                  
                  <RewriteStatus>
                    <span>✅ Google Ads Ready</span>
                    <span>✅ Copyright Compliant</span>
                    <span>✅ SEO Optimized</span>
                  </RewriteStatus>
                  
                  <RewriteMetrics>
                    <span>Readability: {aiRewrite.readabilityScore || 97}%</span>
                    <span>Viral Score: {aiRewrite.viralScore || viralScore}</span>
                    <span>Word Count: {aiRewrite.wordCount || 'N/A'}</span>
                  </RewriteMetrics>
                </AIRewriteContent>
              </AIRewriteContainer>
            )}
          </MainContent>

          <ImageContainer>
            {articleImage ? (
              <ArticleImage 
                src={articleImage} 
                alt={article.title}
                onError={(e) => {
                  console.log('Image failed to load:', articleImage);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', articleImage);
                }}
              />
            ) : null}
            <PlaceholderImage style={{ display: articleImage ? 'none' : 'flex' }}>
              📰
            </PlaceholderImage>
          </ImageContainer>
        </CardHeader>

        <Actions>
          {currentUser && (
            <ActionButton
              onClick={handleBookmark}
              disabled={bookmarking}
              active={isBookmarked}
            >
              {bookmarking ? 'Loading...' : isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
            </ActionButton>
          )}

          {!aiRewrite && (
            <ActionButton
              onClick={handleGenerateRewrite}
              disabled={loadingRewrite}
              style={{ 
                background: loadingRewrite ? '#8b5cf680' : 'linear-gradient(45deg, #8b5cf6, #a78bfa)',
                opacity: loadingRewrite ? 0.7 : 1
              }}
            >
              {loadingRewrite ? '✨ Rewriting...' : '✨ Generate AI Rewrite'}
            </ActionButton>
          )}

          <ActionButton onClick={handleTitleClick}>
            Read Full Article →
          </ActionButton>
          
          {/* Always show image generation button */}
          <ActionButton
            onClick={handleGenerateImage}
            disabled={generatingImage}
            style={{ 
              background: generatingImage ? '#22c55e80' : 'linear-gradient(45deg, #22c55e, #4ade80)',
              opacity: generatingImage ? 0.7 : 1
            }}
          >
            {generatingImage ? '🎨 Generating...' : '🎨 Generate Image'}
          </ActionButton>
          
          <CopyButton 
            onClick={() => handleCopy('title')}
            title={copyFeedback || 'Copy title'}
          >
            {copyFeedback ? '✓' : '📋'}
          </CopyButton>
          
          <CopyButton 
            onClick={() => handleCopy('url')}
            title="Copy URL"
          >
            🔗
          </CopyButton>
        </Actions>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}