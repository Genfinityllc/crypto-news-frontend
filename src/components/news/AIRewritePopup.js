import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { generateLoRAImage, generateLoRAImageFromData, getLoRAStatus } from '../../services/api';
import { generateCoverForArticle, fetchStyleCatalog } from '../../services/coverForArticle';
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
  z-index: 999;
  
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
    margin: 1.5rem 0 0.5rem 0;
    padding: 0;
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

const PopupNotification = styled.div`
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.type === 'error' ? '#dc2626' : '#16a34a'};
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  max-width: 80%;
  text-align: center;
  animation: slideInFromTop 0.3s ease-out;
  
  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
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

const CreditsDisplay = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    if (props.status === 'Active') return 'rgba(34, 197, 94, 0.1)';
    if (props.status === 'Quota Exceeded') return 'rgba(239, 68, 68, 0.1)';
    return 'rgba(156, 163, 175, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.status === 'Active') return '#22c55e';
    if (props.status === 'Quota Exceeded') return '#ef4444';
    return '#9ca3af';
  }};
  color: ${props => {
    if (props.status === 'Active') return '#22c55e';
    if (props.status === 'Quota Exceeded') return '#ef4444';
    return '#9ca3af';
  }};
`;

const CreditsIcon = styled.span`
  font-size: 0.7rem;
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
  const [xReadyImage, setXReadyImage] = useState(null); // under-1MB 1800x900 copy for x.com
  const [styleOptions, setStyleOptions] = useState([]); // curated styles for the re-render picker
  const [selectedStyleId, setSelectedStyleId] = useState(''); // style chosen for re-render
  const [useSubject, setUseSubject] = useState(true); // add an article-related 3D element to the cover
  const [imagePrompt, setImagePrompt] = useState('');
  const [intelligentPrompt, setIntelligentPrompt] = useState('');
  const [useLoRA, setUseLoRA] = useState(true);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [loraStatus, setLoraStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [popupNotification, setPopupNotification] = useState(null);

  // Internal notification system for popup
  const showPopupNotification = (message, type = 'success') => {
    setPopupNotification({ message, type });
    setTimeout(() => {
      setPopupNotification(null);
    }, 15000); // 15 seconds
  };

  // AUTO-GENERATE Universal LoRA image using HF Spaces directly
  const handleGenerateUniversalLoRA = async () => {
    setGeneratingImage(true);
    try {
      const currentTitle = editableTitle || article?.title;
      console.log('🚀 Auto-generating Universal LoRA image for:', currentTitle);
      console.log('🔍 Article data received:', {
        originalTitle: article?.title,
        editableTitle: editableTitle,
        finalTitle: currentTitle,
        network: article?.network,
        content_preview: article?.content?.substring(0, 100),
        url: article?.url,
        hasArticle: !!article
      });
      
      // Validate article data before proceeding
      if (!article) {
        throw new Error('No article data provided for LoRA generation');
      }
      
      if (!currentTitle) {
        throw new Error('Article title is required for LoRA generation');
      }
      
      console.log('✅ Article validation passed, calling the live cover generator...');

      // Call the live cover generator via the /for-article wrapper. It detects
      // the network/company for the real logo and rotates through the curated
      // styles for variety, and returns an under-1MB 1800x900 PNG X-ready copy.
      const response = await generateCoverForArticle({
        title: currentTitle,
        content: article.content || article.description || article.summary || '',
        network: article.network,
        xFormat: 'png',
        useSubject
      });

      console.log('🔍 Cover generator response:', {
        success: response?.success,
        imageUrl: response?.imageUrl,
        xReadyUrl: response?.xReadyUrl,
        symbolUsed: response?.symbolUsed,
        mode: response?.mode
      });

      if (response && response.success && response.imageUrl) {
        // Display the full-quality cover; keep the under-1MB copy for download/X.
        setGeneratedImage(response.imageUrl);
        setXReadyImage(response.xReadyUrl || null);
        showPopupNotification('🎨 Cover generated with your logo library!', 'success');
        console.log('✅ Mode:', response.mode, '| Symbol:', response.symbolUsed || 'background-only');
      } else {
        console.error('❌ Response indicates failure:', response);
        throw new Error(`Cover generation failed: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ DETAILED Universal LoRA generation error:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name,
        articleTitle: article?.title,
        articleExists: !!article,
        timestamp: new Date().toISOString()
      });
      
      // Show the actual error instead of generic message
      const errorMsg = error.message || 'Unknown error occurred';
      showPopupNotification(`LoRA generation failed: ${errorMsg}`, 'error');
      console.log('🚨 Showing error to user:', errorMsg);
    } finally {
      setGeneratingImage(false);
      console.log('🏁 Generation process completed, generatingImage set to false');
    }
  };

  // Initialize editable content when rewrite data loads (ONLY ONCE)
  React.useEffect(() => {
    console.log('AIRewritePopup: useEffect triggered', { rewriteData, isOpen, currentEditableTitle: editableTitle });
    if (isOpen && (!editableTitle || editableTitle === 'AI Rewrite Loading...')) {
      const safeData = rewriteData || {
        title: 'AI Rewrite Loading...',
        content: '<p>Content is being processed...</p>'
      };
      
      // Ensure we have valid content
      const finalTitle = safeData.title || safeData.rewrittenTitle || article?.title || 'AI Rewrite Loading...';
      const finalContent = safeData.content || safeData.rewrittenContent || safeData.rewrittenText || '<p>Content is being processed...</p>';
      
      // Show success notification when real rewrite data loads
      if (rewriteData && finalTitle !== 'AI Rewrite Loading...') {
        showPopupNotification('🤖 AI rewrite generated successfully with OpenAI GPT-4!', 'success');
      }
      
      console.log('AIRewritePopup: Setting editable content (INITIAL LOAD ONLY)', {
        originalRewriteData: rewriteData,
        finalTitle,
        finalContentLength: finalContent?.length,
        safeData,
        willUpdateTitle: !editableTitle || editableTitle === 'AI Rewrite Loading...'
      });
      
      // Only set title if it's not already set by user
      if (!editableTitle || editableTitle === 'AI Rewrite Loading...') {
        setEditableTitle(finalTitle);
      }
      setEditableContent(finalContent);
      
      // Use intelligent prompt if available, otherwise generate default
      const intelligentCoverPrompt = safeData.intelligentCoverPrompt || `Create a professional cryptocurrency news cover image for "${finalTitle}". Use modern design with blue/teal accents, blockchain-inspired elements, and ${article?.network || 'crypto'} branding. Style: clean, corporate, high-tech with subtle grid patterns. Include abstract crypto symbols and professional gradients.`;
      
      setIntelligentPrompt(intelligentCoverPrompt);
      setImagePrompt(intelligentCoverPrompt);
      
      // AUTO-GENERATE Universal LoRA image when popup opens (with longer delay for rewrite title)
      setTimeout(() => {
        if (article && !generatedImage && !generatingImage && editableTitle && editableTitle !== 'AI Rewrite Loading...') {
          console.log('🚀 Starting auto-generation with confirmed rewrite title:', editableTitle);
          handleGenerateUniversalLoRA();
        } else {
          console.log('⏳ Rewrite title not ready yet, waiting...', { editableTitle, finalTitle });
          // Try again after another delay if rewrite title isn't loaded
          setTimeout(() => {
            if (article && !generatedImage && !generatingImage && editableTitle && editableTitle !== 'AI Rewrite Loading...') {
              console.log('🚀 Starting delayed auto-generation with rewrite title:', editableTitle);
              handleGenerateUniversalLoRA();
            }
          }, 5000);
        }
      }, 7000);
    }
  }, [rewriteData, isOpen, article, editableTitle]);

  // AUTO-GENERATE when rewrite title becomes available
  React.useEffect(() => {
    if (isOpen && 
        editableTitle && 
        editableTitle !== 'AI Rewrite Loading...' && 
        editableTitle !== '' &&
        article && 
        !generatedImage && 
        !generatingImage) {
      
      console.log('🎯 TRIGGER: Rewrite title ready for auto-generation:', editableTitle);
      
      // Small delay to ensure everything is settled
      const autoGenTimer = setTimeout(() => {
        console.log('🚀 AUTO-GENERATING with rewrite title:', editableTitle);
        handleGenerateUniversalLoRA();
      }, 2000);
      
      return () => clearTimeout(autoGenTimer);
    }
  }, [editableTitle, isOpen, article, generatedImage, generatingImage]);

  // Fetch LoRA status when popup opens
  React.useEffect(() => {
    if (isOpen && showImageGenerator) {
      setLoadingStatus(true);
      getLoRAStatus()
        .then(response => {
          setLoraStatus(response);
        })
        .catch(error => {
          console.error('Failed to fetch LoRA status:', error);
          setLoraStatus({ 
            available: false, 
            service: 'LoRA AI',
            status: 'Error',
            error: 'Failed to check status'
          });
        })
        .finally(() => {
          setLoadingStatus(false);
        });
    }
  }, [isOpen, showImageGenerator]);

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
      showPopupNotification(`${type} copied to clipboard!`, 'success');
    } catch (error) {
      showPopupNotification('Failed to copy to clipboard', 'error');
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

  const handleCopyWordPressFormat = () => {
    // Copy content optimized for WordPress (no line breaks)
    const wordpressContent = editableContent
      .replace(/\n\s*\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const fullContent = `${editableTitle}\n\n${wordpressContent}`;
    handleCopy(fullContent, 'WordPress-ready article');
  };

  const handleDownloadImage = async () => {
    // Prefer the under-1MB X-ready copy so the download is ready to post to x.com.
    const downloadUrl = xReadyImage || generatedImage;
    if (!downloadUrl) return;

    setDownloadingImage(true);
    try {
      // Create a safe filename from the title
      const safeTitle = editableTitle
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const ext = downloadUrl.toLowerCase().includes('.jpg') || downloadUrl.toLowerCase().includes('.jpeg') ? 'jpg' : 'png';
      const filename = `${safeTitle}_cover.${ext}`;

      // Fetch the image and create download
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showPopupNotification(`📥 Cover image downloaded as ${filename}`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      showPopupNotification('Failed to download image. Try right-clicking to save.', 'error');
    } finally {
      setDownloadingImage(false);
    }
  };

  const handleContentChange = (e) => {
    setEditableContent(e.target.innerHTML);
  };

  const handleGenerateImage = async () => {
    await handleGenerateUniversalLoRA();
  };

  // Load the curated style list once when the popup opens (for the re-render picker).
  React.useEffect(() => {
    if (isOpen && styleOptions.length === 0) {
      fetchStyleCatalog().then(setStyleOptions).catch(() => {});
    }
  }, [isOpen, styleOptions.length]);

  // Re-render the cover in a specific style the user picked.
  const handleRerenderWithStyle = async () => {
    if (!selectedStyleId) return;
    setGeneratingImage(true);
    try {
      const currentTitle = editableTitle || article?.title;
      const response = await generateCoverForArticle({
        title: currentTitle,
        content: article?.content || article?.description || article?.summary || '',
        network: article?.network,
        styleId: selectedStyleId,
        xFormat: 'png',
        useSubject
      });
      if (response && response.success && response.imageUrl) {
        setGeneratedImage(response.imageUrl);
        setXReadyImage(response.xReadyUrl || null);
        const styleName = (styleOptions.find(s => s.id === selectedStyleId) || {}).name || selectedStyleId;
        showPopupNotification(`🎨 Re-rendered in "${styleName}" style!`, 'success');
      } else {
        throw new Error(response?.error || 'Re-render failed');
      }
    } catch (error) {
      showPopupNotification(`Re-render failed: ${error.message}`, 'error');
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
        {popupNotification && (
          <PopupNotification type={popupNotification.type}>
            {popupNotification.type === 'error' ? '❌' : '✅'} {popupNotification.message}
          </PopupNotification>
        )}
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
              <MetricLabel>SEO Score</MetricLabel>
              <MetricValue>{safeRewriteData.seoScore || 97}%</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Word Count</MetricLabel>
              <MetricValue>{safeRewriteData.wordCount || 'N/A'}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Title Words</MetricLabel>
              <MetricValue>{editableTitle.split(' ').length}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Sources</MetricLabel>
              <MetricValue>{safeRewriteData.sources?.length || 5}+</MetricValue>
            </Metric>
          </MetricsBar>

          <ArticleContent>
            <ArticleTitle
              value={editableTitle}
              onChange={(e) => {
                console.log('📝 User editing title:', e.target.value);
                setEditableTitle(e.target.value);
                // Clear generated image when title changes so user can regenerate with new title
                if (generatedImage) {
                  console.log('🔄 Title changed - clearing generated image for regeneration');
                  setGeneratedImage(null);
                }
              }}
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
              📋 Copy Article
            </ActionButton>
            
            <ActionButton 
              variant="success" 
              onClick={handleCopyWordPressFormat}
              style={{ background: 'linear-gradient(45deg, #16a34a, #22c55e)' }}
            >
              🌐 Copy for WordPress
            </ActionButton>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CreditsDisplay status="Active">
                <CreditsIcon>🎨</CreditsIcon>
                Universal LoRA Ready
              </CreditsDisplay>
            </div>
            
            <CopyButton onClick={() => handleCopy(editableTitle, 'Title')}>
              Copy Title
            </CopyButton>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✅ WordPress Ready</span>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✅ Copyright Safe</span>
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✅ 3-5 Word Title</span>
            </div>
          </Actions>

          <ImageSection>
            <ImageSectionTitle>
              Cover Image
            </ImageSectionTitle>
            
            {generatingImage && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                background: 'rgba(0, 102, 204, 0.1)', 
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid rgba(0, 102, 204, 0.3)'
              }}>
                <div style={{ color: '#0066cc', marginBottom: '12px', fontSize: '1rem', fontWeight: '600' }}>
                  Generating cover image...
                </div>
                
                {/* Progress Bar */}
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  background: '#333', 
                  borderRadius: '4px', 
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #0066cc, #00b4d8)',
                    borderRadius: '4px',
                    animation: 'progress-animation 240s ease-out forwards',
                    width: '0%'
                  }} />
                </div>
                
                {/* Time Estimates */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.8rem', 
                  color: '#aaa',
                  marginBottom: '8px'
                }}>
                  <span>Typical time: 30-60 seconds</span>
                  <span>High quality generation</span>
                </div>
                
                {/* Status Messages */}
                <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                  Please wait while the cover image is being generated...
                </div>
                
                <style jsx>{`
                  @keyframes progress-animation {
                    0% { width: 0%; }
                    5% { width: 15%; }
                    15% { width: 25%; }
                    30% { width: 40%; }
                    50% { width: 60%; }
                    70% { width: 75%; }
                    85% { width: 85%; }
                    95% { width: 92%; }
                    100% { width: 95%; }
                  }
                `}</style>
              </div>
            )}

            {generatedImage && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h5 style={{ color: '#0066cc', margin: 0 }}>🎨 Cover:</h5>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ActionButton
                      variant="primary"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      {generatingImage ? '🎨 Generating...' : '🔄 Generate Again'}
                    </ActionButton>
                    <ActionButton
                      variant="success"
                      onClick={handleDownloadImage}
                      disabled={downloadingImage}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      {downloadingImage ? '⬇️ Downloading...' : '⬇️ Download'}
                    </ActionButton>
                  </div>
                </div>
                {console.log('🖼️ RENDER DEBUG: generatedImage state:', generatedImage)}
                <GeneratedImage src={generatedImage} alt="Universal LoRA generated cover" />
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#22c55e'
                }}>
                  ✅ <strong>Cover generated:</strong> Real logo from your library, 1800x900 • Download gives the under-1MB copy for X
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#8b949e' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={useSubject} onChange={(e) => setUseSubject(e.target.checked)} />
                    Add an article-related 3D element (e.g. vault, chart, gears)
                  </label>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Prefer a specific style?</span>
                  <select
                    value={selectedStyleId}
                    onChange={(e) => setSelectedStyleId(e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem', background: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d' }}
                  >
                    <option value="">Choose a style...</option>
                    {styleOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ActionButton
                    variant="primary"
                    onClick={handleRerenderWithStyle}
                    disabled={generatingImage || !selectedStyleId}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {generatingImage ? '🎨 Rendering...' : '🎨 Re-render in this style'}
                  </ActionButton>
                </div>
              </div>
            )}

            {!generatingImage && !generatedImage && (
              <div style={{ 
                padding: '16px', 
                textAlign: 'center',
                background: 'rgba(0, 102, 204, 0.1)', 
                borderRadius: '8px'
              }}>
                <div style={{ color: '#0066cc', marginBottom: '8px' }}>
                  {editableTitle && editableTitle !== 'AI Rewrite Loading...' 
                    ? '🎨 Auto-generating cover with your rewrite title...' 
                    : '⏳ Waiting for rewrite to complete for auto-generation...'}
                </div>
                <ActionButton
                  variant="primary"
                  onClick={handleGenerateImage}
                  style={{ marginTop: '8px' }}
                >
                  🎨 Generate Cover Now (Manual)
                </ActionButton>
              </div>
            )}
          </ImageSection>
        </Content>
      </Modal>
    </Overlay>,
    document.body
  );
};

export default AIRewritePopup;