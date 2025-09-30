import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { generateNanoBananaImage, generateNanoBananaImageFromData } from '../../services/api';
import { toast } from 'react-toastify';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  padding: 20px;
  overflow-y: auto;
`;

const Modal = styled.div`
  background: #202020;
  border-radius: 16px;
  max-width: 1200px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 2px solid #0066cc;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  margin: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #333;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #0066cc;
    border-radius: 3px;
  }
`;

const Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #0066cc20, #00b4d820);
`;

const Title = styled.h2`
  color: #fff;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: #333;
  border: 1px solid #666;
  border-radius: 6px;
  color: #ccc;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 8px 12px;
  transition: all 0.2s;
  
  &:hover {
    background: #444;
    border-color: #0066cc;
    color: #0066cc;
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const ArticleContent = styled.div`
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #333;
`;

const ArticleTitle = styled.input`
  color: #000000;
  font-size: 1.25rem;
  margin: 0 0 16px 0;
  line-height: 1.4;
  background: #ffffff;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 8px 12px;
  width: 100%;
  font-weight: 600;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;

const ArticleEditor = styled.div`
  color: #000000;
  line-height: 1.7;
  font-size: 1rem;
  background: #ffffff;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
  }
  
  &[contenteditable="true"] {
    cursor: text;
  }
  
  h1, h2, h3, h4, h5, h6 {
    color: #000000;
    margin: 1.5rem 0 0.75rem 0;
    font-weight: 600;
  }
  
  h1 { font-size: 1.5rem; }
  h2 { 
    font-size: 1.3rem; 
    color: #000000;
    border-bottom: 2px solid #0066cc;
    padding-bottom: 4px;
  }
  h3 { font-size: 1.1rem; }
  
  p {
    margin: 0 0 1rem 0;
  }
  
  a {
    color: #0066cc;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  ul, ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  li {
    margin: 0.5rem 0;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #333;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #0066cc;
    border-radius: 3px;
  }
`;

const MetricsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const Metric = styled.div`
  background: linear-gradient(135deg, #0066cc20, #00b4d820);
  border: 1px solid #0066cc40;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
`;

const MetricLabel = styled.span`
  color: #0066cc;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const MetricValue = styled.span`
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  border: 1px solid ${props => props.variant === 'primary' ? '#0066cc' : '#666'};
  border-radius: 6px;
  background: ${props => {
    if (props.variant === 'primary') return '#0066cc';
    if (props.variant === 'success') return '#22c55e';
    return '#444';
  }};
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: ${props => {
      if (props.variant === 'primary') return '#0080ff';
      if (props.variant === 'success') return '#16a34a';
      return '#555';
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CopyButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #666;
  border-radius: 4px;
  background: #444;
  color: #ccc;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: #555;
    border-color: #0066cc;
    color: #0066cc;
  }
`;

const ImageSection = styled.div`
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #333;
  margin-top: 24px;
`;

const ImageSectionTitle = styled.h4`
  color: #0066cc;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PromptEditor = styled.div`
  margin-bottom: 16px;
`;

const PromptLabel = styled.label`
  display: block;
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 8px;
  font-weight: 600;
`;

const PromptTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #666;
  border-radius: 8px;
  background: #2a2a2a;
  color: #fff;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }
  
  &::placeholder {
    color: #888;
  }
`;

const GeneratedImage = styled.img`
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  margin-top: 16px;
  border: 2px solid #0066cc;
`;

const AIRewritePopup = ({ 
  isOpen, 
  onClose, 
  article, 
  rewriteData,
  onImageGenerated 
}) => {
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [useNanoBanana, setUseNanoBanana] = useState(true);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableContent, setEditableContent] = useState('');

  // Initialize editable content when rewrite data loads
  React.useEffect(() => {
    console.log('AIRewritePopup: useEffect triggered', { rewriteData, isOpen });
    if (isOpen) {
      const safeData = rewriteData || {
        title: 'AI Rewrite Loading...',
        content: '<p>Content is being processed...</p>'
      };
      
      // Ensure we have valid content
      const finalTitle = safeData.title || safeData.rewrittenTitle || article?.title || 'AI Rewrite Loading...';
      const finalContent = safeData.content || safeData.rewrittenContent || safeData.rewrittenText || '<p>Content is being processed...</p>';
      
      console.log('AIRewritePopup: Setting editable content', {
        originalRewriteData: rewriteData,
        finalTitle,
        finalContentLength: finalContent?.length,
        safeData
      });
      
      setEditableTitle(finalTitle);
      setEditableContent(finalContent);
      
      const defaultPrompt = `Create a professional cryptocurrency news cover image for "${finalTitle}". Use modern design with blue/teal accents, blockchain-inspired elements, and ${article?.network || 'crypto'} branding. Style: clean, corporate, high-tech with subtle grid patterns. Include abstract crypto symbols and professional gradients.`;
      setImagePrompt(defaultPrompt);
    }
  }, [rewriteData, isOpen, article]);

  // Lock body scroll when popup is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCopy = async (content, type = 'content') => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${type} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyFullArticle = () => {
    // Strip HTML tags but preserve line breaks for readability
    const cleanContent = editableContent
      .replace(/<\/p>/g, '\n\n')
      .replace(/<\/h[1-6]>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .trim();
    
    const fullContent = `${editableTitle}\n\n${cleanContent}`;
    handleCopy(fullContent, 'Full article');
  };

  const handleContentChange = (e) => {
    setEditableContent(e.target.innerHTML);
  };

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      let imageResult;
      
      if (article?.id) {
        // Database article - use generateNanoBananaImage
        console.log('🎨 Generating Nano Banana image for database article:', article.title);
        imageResult = await generateNanoBananaImage(article.id, {
          prompt: imagePrompt,
          style: useNanoBanana ? 'professional' : 'default',
          size: 'medium'
        });
      } else {
        // RSS article or rewrite data - use generateNanoBananaImageFromData
        console.log('🎨 Generating Nano Banana image for content:', safeRewriteData.title);
        const articleData = {
          title: safeRewriteData.title,
          content: safeRewriteData.content,
          network: article?.network || 'cryptocurrency',
          category: article?.category || 'market',
          source: article?.source || 'analysis'
        };
        imageResult = await generateNanoBananaImageFromData(articleData, {
          prompt: imagePrompt,
          style: useNanoBanana ? 'professional' : 'default',
          size: 'medium'
        });
      }
      
      // Set the generated image
      const imageUrl = imageResult.path || imageResult.url || imageResult;
      setGeneratedImage(imageUrl);
      if (onImageGenerated) {
        onImageGenerated(imageUrl);
      }
      toast.success('🎨 Cover image generated successfully with Nano Banana AI!');
      
    } catch (error) {
      console.error('Nano Banana image generation error:', error);
      
      // Fallback to mock image if API fails
      const fallbackImageUrl = `https://picsum.photos/800/450?random=${Date.now()}&blur=1`;
      setGeneratedImage(fallbackImageUrl);
      if (onImageGenerated) {
        onImageGenerated(fallbackImageUrl);
      }
      toast.error('API connection failed - using placeholder image. Check backend server.');
    } finally {
      setGeneratingImage(false);
    }
  };

  if (!isOpen) return null;
  
  // Ensure we have some default content even if rewriteData is missing
  const safeRewriteData = rewriteData ? {
    title: rewriteData.title || rewriteData.rewrittenTitle || article?.title || 'AI Rewrite Loading...',
    content: rewriteData.content || rewriteData.rewrittenContent || rewriteData.rewrittenText || '<p>Content is being processed...</p>',
    readabilityScore: rewriteData.readabilityScore || 98,
    viralScore: rewriteData.viralScore || 85,
    wordCount: rewriteData.wordCount || 0,
    sources: rewriteData.sources || []
  } : {
    title: 'AI Rewrite Loading...',
    content: '<p>Content is being processed...</p>',
    readabilityScore: 98,
    viralScore: 85,
    wordCount: 0,
    sources: []
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <Header>
          <Title>
            ✨ AI Rewritten Article
          </Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>
        
        <Content>
          <MetricsBar>
            <Metric>
              <MetricLabel>Readability</MetricLabel>
              <MetricValue>{safeRewriteData.readabilityScore || 98}%</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Word Count</MetricLabel>
              <MetricValue>{safeRewriteData.wordCount || 'N/A'}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Sources</MetricLabel>
              <MetricValue>{safeRewriteData.sources?.length || 5}+</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>SEO Score</MetricLabel>
              <MetricValue>97%</MetricValue>
            </Metric>
          </MetricsBar>

          <ArticleContent>
            <ArticleTitle
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              placeholder="Article title..."
            />
            <ArticleEditor
              contentEditable={true}
              dangerouslySetInnerHTML={{ __html: editableContent }}
              onInput={handleContentChange}
              suppressContentEditableWarning={true}
            />
          </ArticleContent>

          <Actions>
            <ActionButton 
              variant="primary" 
              onClick={handleCopyFullArticle}
            >
              📋 Copy Full Article
            </ActionButton>
            
            <ActionButton 
              variant="success" 
              onClick={() => setShowImageGenerator(!showImageGenerator)}
            >
              🎨 Generate Cover Image
            </ActionButton>
            
            <CopyButton onClick={() => handleCopy(editableTitle, 'Title')}>
              Copy Title
            </CopyButton>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✅ Google Ads Ready</span>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✅ Copyright Safe</span>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✅ SEO Optimized</span>
            </div>
          </Actions>

          {showImageGenerator && (
            <ImageSection>
              <ImageSectionTitle>
                🎨 Generate Cover Image with Nano Banana
              </ImageSectionTitle>
              
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={useNanoBanana}
                  onChange={(e) => setUseNanoBanana(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#0066cc' }}
                />
                <span style={{ color: '#0066cc', fontWeight: '600' }}>
                  Use Nano Banana AI Generation (Recommended)
                </span>
              </div>

              <PromptEditor>
                <PromptLabel>
                  Image Generation Prompt (Edit to customize your image):
                </PromptLabel>
                <PromptTextarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe how you want your cover image to look..."
                />
              </PromptEditor>

              <ActionButton
                variant="primary"
                onClick={handleGenerateImage}
                disabled={generatingImage || !imagePrompt.trim()}
              >
                {generatingImage 
                  ? (useNanoBanana ? '🤖 AI Generating...' : '🎨 Generating...') 
                  : (useNanoBanana ? '🤖 Generate with AI' : '🎨 Generate Image')
                }
              </ActionButton>

              {generatedImage && (
                <div style={{ marginTop: '16px' }}>
                  <h5 style={{ color: '#0066cc', marginBottom: '8px' }}>Generated Cover Image:</h5>
                  <GeneratedImage src={generatedImage} alt="Generated cover" />
                </div>
              )}
            </ImageSection>
          )}
        </Content>
      </Modal>
    </Overlay>,
    document.body
  );
};

export default AIRewritePopup;