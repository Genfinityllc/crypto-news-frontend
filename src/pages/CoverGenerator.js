import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'https://crypto-news-curator-backend-production.up.railway.app';

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #8b5cf6, #ff00aa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #8b949e;
  font-size: 1.1rem;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  padding: 1.5rem;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #e6edf3;
`;

const InputSection = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #e6edf3;
  }
  
  .hint {
    font-size: 0.8rem;
    color: #8b949e;
    margin-top: 0.25rem;
  }
`;

const TextInput = styled.input`
  width: 100%;
  padding: 1rem;
  background: #0d1117;
  border: 2px solid ${props => props.hasValue ? '#00d4ff' : '#30363d'};
  border-radius: 12px;
  color: #e6edf3;
  font-size: 1.1rem;
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: #00d4ff;
    box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
  }
  
  &::placeholder {
    color: #6e7681;
    font-weight: 400;
  }
`;

const DropdownSection = styled.div`
  margin-bottom: 1.5rem;
`;

const DropdownLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #e6edf3;
  font-size: 0.9rem;
`;

const SelectDropdown = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #e6edf3;
  font-size: 1rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #00d4ff;
  }
  
  option {
    background: #0d1117;
    color: #e6edf3;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 1rem 0;
  color: #8b949e;
  font-size: 0.85rem;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #30363d;
  }
  
  span {
    padding: 0 1rem;
  }
`;

const GenerateButton = styled.button`
  width: 100%;
  margin-top: 1.5rem;
  padding: 1.25rem 2rem;
  background: ${props => props.loading ? '#30363d' : 'linear-gradient(135deg, #00d4ff, #8b5cf6)'};
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(0, 212, 255, 0.3);
  }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ResultsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const CurrentGeneration = styled.div`
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  border-radius: 12px;
  overflow: hidden;
  border: ${props => props.empty ? '2px dashed #30363d' : 'none'};
  
  img {
    max-width: 100%;
    max-height: 500px;
    object-fit: contain;
    border-radius: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: #8b949e;
  
  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.3;
  }
`;

const GenerationInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #0d1117;
  border-radius: 12px;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: #8b949e;
  
  span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.primary ? '#00d4ff' : '#161b22'};
  border: 1px solid ${props => props.primary ? '#00d4ff' : '#30363d'};
  border-radius: 8px;
  color: ${props => props.primary ? 'black' : '#e6edf3'};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #00d4ff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Rating System Styles
const RatingSection = styled.div`
  background: #0d1117;
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1rem;
`;

const RatingTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 1rem;
`;

const RatingRow = styled.div`
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const RatingLabel = styled.div`
  font-size: 0.85rem;
  color: #8b949e;
  margin-bottom: 0.5rem;
`;

const RatingOptions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const RatingButton = styled.button`
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => {
    if (props.selected) {
      switch(props.rating) {
        case 'excellent':
          return `background: #238636; border-color: #238636; color: white;`;
        case 'good':
          return `background: #1f6feb; border-color: #1f6feb; color: white;`;
        case 'okay':
          return `background: #9e6a03; border-color: #9e6a03; color: white;`;
        case 'bad':
          return `background: #da3633; border-color: #da3633; color: white;`;
        default:
          return `background: #30363d; border-color: #30363d; color: #e6edf3;`;
      }
    }
    return `background: transparent; border-color: #30363d; color: #8b949e;`;
  }}
  
  &:hover {
    opacity: 0.8;
  }
`;

const KeywordInput = styled.div`
  margin-top: 1rem;
  
  input {
    width: 100%;
    padding: 0.75rem;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    font-size: 0.9rem;
    
    &:focus {
      outline: none;
      border-color: #00d4ff;
    }
    
    &::placeholder {
      color: #6e7681;
    }
  }
`;

const SubmitRatingButton = styled.button`
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  background: ${props => props.disabled ? '#30363d' : '#238636'};
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: #2ea043;
  }
`;

const RatingSubmitted = styled.div`
  text-align: center;
  color: #238636;
  font-size: 0.9rem;
  padding: 0.75rem;
`;

const HistoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const HistoryItem = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.02);
  }
  
  img {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
  }
`;

const HistoryOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
`;

const NetworkTag = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #00d4ff;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: black;
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const HistoryCount = styled.span`
  color: #8b949e;
`;

const ErrorMessage = styled.div`
  color: #f85149;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const SavedBadge = styled.span`
  font-size: 0.7rem;
  background: #238636;
  color: white;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
`;

const LoginHint = styled.div`
  font-size: 0.8rem;
  color: #8b949e;
  margin-top: 0.5rem;
  text-align: center;
  
  a {
    color: #00d4ff;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
`;

export default function CoverGenerator() {
  const { currentUser } = useAuth();
  const [networks, setNetworks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [networkInput, setNetworkInput] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Rating state
  const [logoRating, setLogoRating] = useState(null);
  const [backgroundRating, setBackgroundRating] = useState(null);
  const [feedbackKeyword, setFeedbackKeyword] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Load networks on mount
  useEffect(() => {
    loadNetworks();
  }, []);

  // Load user's saved covers on mount/login
  useEffect(() => {
    if (currentUser) {
      loadSavedCovers();
    }
  }, [currentUser]);

  // Reset rating when new image is generated
  useEffect(() => {
    if (currentImage) {
      setLogoRating(null);
      setBackgroundRating(null);
      setFeedbackKeyword('');
      setRatingSubmitted(false);
    }
  }, [currentImage]);

  const loadNetworks = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/cover-generator/networks`);
      const data = await response.json();
      
      if (data.success) {
        setNetworks(data.networks || []);
        setCompanies(data.companies || []);
      } else {
        throw new Error(data.error || 'Failed to load networks');
      }
    } catch (err) {
      console.error('Failed to load networks:', err);
      setNetworks([
        { symbol: 'BTC', name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum' },
        { symbol: 'XRP', name: 'XRP (Ripple)' },
        { symbol: 'SOL', name: 'Solana' },
        { symbol: 'HBAR', name: 'Hedera' },
        { symbol: 'ADA', name: 'Cardano' },
        { symbol: 'DOGE', name: 'Dogecoin' },
      ]);
      setCompanies([
        { symbol: 'WLFI', name: 'World Liberty Financial' },
        { symbol: 'BLACKROCK', name: 'BlackRock' },
        { symbol: 'GRAYSCALE', name: 'Grayscale' },
      ]);
    }
  };

  const loadSavedCovers = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch(`${API_BASE}/api/cover-generator/my-covers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.covers) {
          setHistory(prev => {
            const existingUrls = new Set(prev.map(h => h.imageUrl));
            const newCovers = data.covers
              .filter(c => !existingUrls.has(c.image_url))
              .map(c => ({
                id: c.id,
                imageUrl: c.image_url,
                network: c.network,
                timestamp: c.created_at,
                saved: true
              }));
            return [...prev, ...newCovers];
          });
        }
      }
    } catch (err) {
      console.error('Failed to load saved covers:', err);
    }
  }, [currentUser]);

  const saveCover = useCallback(async (imageUrl, network, title) => {
    if (!currentUser) return false;
    
    try {
      const token = localStorage.getItem('firebaseToken');
      const response = await fetch(`${API_BASE}/api/cover-generator/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl,
          network,
          title: title || `${network} Cover`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success;
      }
      return false;
    } catch (err) {
      console.error('Failed to save cover:', err);
      return false;
    }
  }, [currentUser]);

  const submitRating = async () => {
    if (!logoRating && !backgroundRating) {
      toast.warning('Please rate at least one aspect');
      return;
    }
    
    setSubmittingRating(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/cover-generator/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: currentImage,
          network: currentMeta?.network,
          promptUsed: currentMeta?.prompt,
          logoRating,
          backgroundRating,
          feedbackKeyword: feedbackKeyword.trim() || null,
          userId: currentUser?.uid || null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRatingSubmitted(true);
        toast.success('Thanks for your feedback!');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleNetworkSelect = (e) => {
    const value = e.target.value;
    setSelectedNetwork(value);
    setSelectedCompany('');
    if (value) {
      setNetworkInput(value);
    }
  };

  const handleCompanySelect = (e) => {
    const value = e.target.value;
    setSelectedCompany(value);
    setSelectedNetwork('');
    if (value) {
      setNetworkInput(value);
    }
  };

  const handleGenerate = async () => {
    const networkToUse = networkInput.trim();
    
    if (!networkToUse) {
      toast.warning('Please enter a network or company name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/cover-generator/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: networkToUse.toUpperCase(),
          title: articleTitle || undefined,
          customKeyword: customKeyword.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        const imageUrl = data.imageUrl;
        const network = data.network || networkToUse;
        
        setCurrentImage(imageUrl);
        setCurrentMeta({
          network: network,
          method: data.method,
          duration: data.duration,
          prompt: data.promptUsed
        });
        
        let saved = false;
        if (currentUser) {
          saved = await saveCover(imageUrl, network, articleTitle);
          if (saved) {
            toast.success('Cover generated and saved to your profile!');
          } else {
            toast.success('Cover generated! (save failed)');
          }
        } else {
          toast.success('Cover generated successfully!');
        }
        
        setHistory(prev => [{
          imageUrl: imageUrl,
          network: network,
          timestamp: new Date().toISOString(),
          saved: saved
        }, ...prev]);
        
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      toast.error(`Generation failed: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `${currentMeta?.network || 'crypto'}-cover-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHistoryClick = (item) => {
    setCurrentImage(item.imageUrl);
    setCurrentMeta({
      network: item.network,
      method: item.saved ? 'saved' : 'history',
      duration: '-'
    });
  };

  const ratingOptions = [
    { value: 'excellent', label: 'So Good!' },
    { value: 'good', label: 'Good' },
    { value: 'okay', label: 'Just Okay' },
    { value: 'bad', label: 'Bad' }
  ];

  return (
    <PageContainer>
      <Header>
        <Title>Cover Generator</Title>
        <Subtitle>Create stunning 3D cryptocurrency cover images</Subtitle>
      </Header>

      <MainGrid>
        {/* Left Panel: Controls */}
        <div>
          <Card>
            <CardTitle>Network / Company</CardTitle>
            
            <InputSection>
              <label htmlFor="networkInput">Enter name or select from dropdown:</label>
              <TextInput
                type="text"
                id="networkInput"
                placeholder="e.g., Bitcoin, WLFI, Hedera, BlackRock..."
                value={networkInput}
                onChange={(e) => {
                  setNetworkInput(e.target.value);
                  setSelectedNetwork('');
                  setSelectedCompany('');
                }}
                hasValue={networkInput.length > 0}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              />
              <div className="hint">Type any crypto network, token, or company name</div>
            </InputSection>

            <Divider><span>or select from list</span></Divider>

            <DropdownSection>
              <DropdownLabel>Cryptocurrency Networks</DropdownLabel>
              <SelectDropdown 
                value={selectedNetwork} 
                onChange={handleNetworkSelect}
              >
                <option value="">-- Select Network --</option>
                {networks.map(n => (
                  <option key={n.symbol} value={n.symbol}>
                    {n.name} ({n.symbol})
                  </option>
                ))}
              </SelectDropdown>
            </DropdownSection>

            <DropdownSection>
              <DropdownLabel>Companies / Institutions</DropdownLabel>
              <SelectDropdown 
                value={selectedCompany} 
                onChange={handleCompanySelect}
              >
                <option value="">-- Select Company --</option>
                {companies.map(c => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name}
                  </option>
                ))}
              </SelectDropdown>
            </DropdownSection>

            <InputSection style={{ marginTop: '1rem' }}>
              <label htmlFor="articleTitle">Article Title (optional)</label>
              <TextInput
                type="text"
                id="articleTitle"
                placeholder="e.g., XRP Institutional Adoption Grows"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              />
              <div className="hint">Adds context for more relevant imagery</div>
            </InputSection>

            <InputSection>
              <label htmlFor="customKeyword">Custom Keyword (optional)</label>
              <TextInput
                type="text"
                id="customKeyword"
                placeholder="e.g., space, futuristic, wall street..."
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              />
              <div className="hint">Add a keyword to influence the style</div>
            </InputSection>

            <GenerateButton
              onClick={handleGenerate}
              disabled={!networkInput.trim() || loading}
              loading={loading}
            >
              {loading ? (
                <>
                  <Spinner /> Generating (~45s)...
                </>
              ) : (
                <>Generate Cover</>
              )}
            </GenerateButton>
            
            {!currentUser && (
              <LoginHint>
                <a href="/login">Sign in</a> to auto-save your generations
              </LoginHint>
            )}
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </Card>
        </div>

        {/* Right Panel: Results */}
        <ResultsSection>
          <Card>
            <CardTitle>Generated Cover</CardTitle>
            
            <CurrentGeneration empty={!currentImage}>
              {currentImage ? (
                <img src={currentImage} alt={`${currentMeta?.network} Cover`} />
              ) : (
                <EmptyState>
                  <div className="icon">IMG</div>
                  <p>Enter a network name and click Generate</p>
                </EmptyState>
              )}
            </CurrentGeneration>

            {currentMeta && (
              <GenerationInfo>
                <MetaInfo>
                  <span>Network: {currentMeta.network}</span>
                  <span>Method: {currentMeta.method}</span>
                  <span>Time: {currentMeta.duration}</span>
                </MetaInfo>
                <ActionButtons>
                  <ActionButton onClick={handleDownload}>Download</ActionButton>
                  <ActionButton onClick={handleGenerate} disabled={loading}>Regenerate</ActionButton>
                </ActionButtons>
              </GenerationInfo>
            )}

            {/* Rating Section */}
            {currentImage && !ratingSubmitted && (
              <RatingSection>
                <RatingTitle>Rate this generation (helps improve results)</RatingTitle>
                
                <RatingRow>
                  <RatingLabel>Logo Quality:</RatingLabel>
                  <RatingOptions>
                    {ratingOptions.map(opt => (
                      <RatingButton
                        key={`logo-${opt.value}`}
                        rating={opt.value}
                        selected={logoRating === opt.value}
                        onClick={() => setLogoRating(opt.value)}
                      >
                        {opt.label}
                      </RatingButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                <RatingRow>
                  <RatingLabel>Background Scene:</RatingLabel>
                  <RatingOptions>
                    {ratingOptions.map(opt => (
                      <RatingButton
                        key={`bg-${opt.value}`}
                        rating={opt.value}
                        selected={backgroundRating === opt.value}
                        onClick={() => setBackgroundRating(opt.value)}
                      >
                        {opt.label}
                      </RatingButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                <KeywordInput>
                  <input
                    type="text"
                    placeholder="Suggest a keyword to improve future generations..."
                    value={feedbackKeyword}
                    onChange={(e) => setFeedbackKeyword(e.target.value)}
                  />
                </KeywordInput>
                
                <SubmitRatingButton
                  onClick={submitRating}
                  disabled={submittingRating || (!logoRating && !backgroundRating)}
                >
                  {submittingRating ? 'Submitting...' : 'Submit Feedback'}
                </SubmitRatingButton>
              </RatingSection>
            )}
            
            {ratingSubmitted && (
              <RatingSubmitted>
                Thank you for your feedback! It helps improve future generations.
              </RatingSubmitted>
            )}
          </Card>

          {/* History */}
          <Card>
            <HistoryHeader>
              <CardTitle>
                Generation History
                {currentUser && <SavedBadge>Auto-saved</SavedBadge>}
              </CardTitle>
              <HistoryCount>{history.length} images</HistoryCount>
            </HistoryHeader>
            
            {history.length === 0 ? (
              <p style={{ color: '#8b949e', textAlign: 'center' }}>
                Generated images will appear here
                {currentUser && ' and save to your profile'}
              </p>
            ) : (
              <HistoryGrid>
                {history.map((item, index) => (
                  <HistoryItem key={item.id || index} onClick={() => handleHistoryClick(item)}>
                    <img src={item.imageUrl} alt={item.network} />
                    <HistoryOverlay>
                      <NetworkTag>{item.network}</NetworkTag>
                      {item.saved && <SavedBadge>Saved</SavedBadge>}
                    </HistoryOverlay>
                  </HistoryItem>
                ))}
              </HistoryGrid>
            )}
          </Card>
        </ResultsSection>
      </MainGrid>
    </PageContainer>
  );
}
