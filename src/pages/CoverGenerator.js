import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';

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
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem;
  padding-left: 3rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  color: #e6edf3;
  font-size: 1rem;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    border-color: #00d4ff;
  }
  
  &::placeholder {
    color: #8b949e;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  
  &::before {
    content: '🔍';
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }
`;

const NetworkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #0d1117;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 3px;
  }
`;

const NetworkButton = styled.button`
  padding: 0.75rem;
  background: ${props => props.selected ? 'rgba(0, 212, 255, 0.1)' : '#0d1117'};
  border: 2px solid ${props => props.selected ? '#00d4ff' : 'transparent'};
  border-radius: 12px;
  color: #e6edf3;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    border-color: #30363d;
    transform: translateY(-2px);
  }
`;

const NetworkSymbol = styled.span`
  font-weight: 700;
  font-size: 1rem;
`;

const NetworkName = styled.span`
  font-size: 0.7rem;
  color: #8b949e;
  text-align: center;
  line-height: 1.2;
`;

const TitleSection = styled.div`
  margin-top: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #8b949e;
  }
  
  input {
    width: 100%;
    padding: 1rem;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 12px;
    color: #e6edf3;
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: #00d4ff;
    }
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    border-color: #00d4ff;
  }
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

const LoadingNetworks = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  color: #8b949e;
  padding: 2rem;
`;

export default function CoverGenerator() {
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNetworks, setLoadingNetworks] = useState(true);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState([]);

  // Load networks on mount
  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cover-generator/networks`);
      const data = await response.json();
      
      if (data.success) {
        setNetworks(data.networks);
      } else {
        throw new Error(data.error || 'Failed to load networks');
      }
    } catch (error) {
      toast.error(`Failed to load networks: ${error.message}`);
    } finally {
      setLoadingNetworks(false);
    }
  };

  const filteredNetworks = networks.filter(n => 
    n.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.name && n.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleGenerate = async () => {
    if (!selectedNetwork) {
      toast.warning('Please select a network first');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/cover-generator/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: selectedNetwork,
          title: articleTitle || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentImage(data.imageUrl);
        setCurrentMeta({
          network: data.network,
          method: data.method,
          duration: data.duration
        });
        
        // Add to history
        setHistory(prev => [{
          imageUrl: data.imageUrl,
          network: data.network,
          timestamp: new Date().toISOString()
        }, ...prev]);
        
        toast.success('Cover generated successfully!');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      toast.error(`Generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `${selectedNetwork || 'crypto'}-cover-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHistoryClick = (item) => {
    setCurrentImage(item.imageUrl);
    setCurrentMeta({
      network: item.network,
      method: 'history',
      duration: '-'
    });
  };

  return (
    <PageContainer>
      <Header>
        <Title>🎨 Cover Generator</Title>
        <Subtitle>Create stunning 3D cryptocurrency cover images</Subtitle>
      </Header>

      <MainGrid>
        {/* Left Panel: Controls */}
        <div>
          <Card>
            <CardTitle>🪙 Select Network</CardTitle>
            
            <SearchWrapper>
              <SearchInput
                type="text"
                placeholder="Search networks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchWrapper>

            <NetworkGrid>
              {loadingNetworks ? (
                <LoadingNetworks>Loading networks...</LoadingNetworks>
              ) : filteredNetworks.length === 0 ? (
                <LoadingNetworks>No networks found</LoadingNetworks>
              ) : (
                filteredNetworks.map(n => (
                  <NetworkButton
                    key={n.symbol}
                    selected={selectedNetwork === n.symbol}
                    onClick={() => setSelectedNetwork(n.symbol)}
                  >
                    <NetworkSymbol>{n.symbol}</NetworkSymbol>
                    <NetworkName>{n.name || n.symbol}</NetworkName>
                  </NetworkButton>
                ))
              )}
            </NetworkGrid>

            <TitleSection>
              <label htmlFor="articleTitle">Article Title (optional)</label>
              <input
                type="text"
                id="articleTitle"
                placeholder="e.g., XRP Institutional Adoption Grows"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
              />
            </TitleSection>

            <GenerateButton
              onClick={handleGenerate}
              disabled={!selectedNetwork || loading}
              loading={loading}
            >
              {loading ? (
                <>
                  <Spinner /> Generating...
                </>
              ) : (
                <>✨ Generate Cover</>
              )}
            </GenerateButton>
          </Card>
        </div>

        {/* Right Panel: Results */}
        <ResultsSection>
          <Card>
            <CardTitle>🖼️ Generated Cover</CardTitle>
            
            <CurrentGeneration empty={!currentImage}>
              {currentImage ? (
                <img src={currentImage} alt={`${currentMeta?.network} Cover`} />
              ) : (
                <EmptyState>
                  <div className="icon">🎨</div>
                  <p>Select a network and click Generate</p>
                </EmptyState>
              )}
            </CurrentGeneration>

            {currentMeta && (
              <GenerationInfo>
                <MetaInfo>
                  <span>🪙 {currentMeta.network}</span>
                  <span>⚡ {currentMeta.method}</span>
                  <span>⏱️ {currentMeta.duration}</span>
                </MetaInfo>
                <ActionButtons>
                  <ActionButton onClick={handleDownload}>⬇️ Download</ActionButton>
                  <ActionButton onClick={handleGenerate} disabled={loading}>🔄 Regenerate</ActionButton>
                </ActionButtons>
              </GenerationInfo>
            )}
          </Card>

          {/* History */}
          <Card>
            <HistoryHeader>
              <CardTitle>📚 Generation History</CardTitle>
              <HistoryCount>{history.length} images</HistoryCount>
            </HistoryHeader>
            
            {history.length === 0 ? (
              <p style={{ color: '#8b949e', textAlign: 'center' }}>
                Generated images will appear here
              </p>
            ) : (
              <HistoryGrid>
                {history.map((item, index) => (
                  <HistoryItem key={index} onClick={() => handleHistoryClick(item)}>
                    <img src={item.imageUrl} alt={item.network} />
                    <HistoryOverlay>
                      <NetworkTag>{item.network}</NetworkTag>
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

