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
  text-align: left;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #ffffff;
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

const ToggleRow = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ToggleButton = styled.button`
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1px solid ${props => props.selected ? '#00d4ff' : '#30363d'};
  background: ${props => props.selected ? 'rgba(0, 212, 255, 0.15)' : '#0d1117'};
  color: ${props => props.selected ? '#00d4ff' : '#e6edf3'};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #00d4ff;
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

const NumberButton = styled.button`
  width: 36px;
  height: 32px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => {
    const value = props.value;
    const rating = value >= 8 ? 'excellent' : value >= 6 ? 'good' : value >= 4 ? 'okay' : 'bad';
    if (props.selected) {
      switch(rating) {
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

const RatingSlider = styled.input`
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(
    to right,
    #da3633 0%,
    #da3633 20%,
    #9e6a03 20%,
    #9e6a03 50%,
    #1f6feb 50%,
    #1f6feb 70%,
    #238636 70%,
    #238636 100%
  );
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #ffffff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    border: 2px solid #00d4ff;
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #ffffff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    border: 2px solid #00d4ff;
  }
`;

const FeedbackInput = styled.div`
  margin-top: 1rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    color: #8b949e;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    
    &:focus {
      outline: none;
      border-color: #00d4ff;
    }
    
    &::placeholder {
      color: #6e7681;
    }
  }
  
  .hint {
    font-size: 0.75rem;
    color: #6e7681;
    margin-top: 0.25rem;
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
  const [logoTextMode, setLogoTextMode] = useState('full');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Rating state - 1-10 numeric scale (checkbox buttons)
  const [logoQuality, setLogoQuality] = useState(null);
  const [logoSize, setLogoSize] = useState(null);  // 1-3=too small, 4-6=good, 7-10=too large
  const [logoStyle, setLogoStyle] = useState(null);
  const [backgroundQuality, setBackgroundQuality] = useState(null);
  const [backgroundStyle, setBackgroundStyle] = useState(null);
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
      setLogoQuality(null);
      setLogoSize(null);
      setLogoStyle(null);
      setBackgroundQuality(null);
      setBackgroundStyle(null);
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
        { symbol: 'ALGO', name: 'Algorand', type: 'network', hasLogo: true },
        { symbol: 'APT', name: 'Aptos', type: 'network', hasLogo: true },
        { symbol: 'ARB', name: 'Arbitrum', type: 'network', hasLogo: true },
        { symbol: 'AVAX', name: 'Avalanche', type: 'network', hasLogo: true },
        { symbol: 'AXELAR', name: 'Axelar', type: 'network', hasLogo: true },
        { symbol: 'BNB', name: 'Binance', type: 'network', hasLogo: true },
        { symbol: 'BTC', name: 'Bitcoin', type: 'network', hasLogo: true },
        { symbol: 'TAO', name: 'Bittensor', type: 'network', hasLogo: true },
        { symbol: 'CANTON', name: 'Canton', type: 'network', hasLogo: true },
        { symbol: 'ADA', name: 'Cardano', type: 'network', hasLogo: true },
        { symbol: 'TIA', name: 'Celestia', type: 'network', hasLogo: true },
        { symbol: 'LINK', name: 'Chainlink', type: 'network', hasLogo: true },
        { symbol: 'DAG', name: 'Constellation (DAG)', type: 'network', hasLogo: true },
        { symbol: 'ATOM', name: 'Cosmos', type: 'network', hasLogo: true },
        { symbol: 'CRO', name: 'Cronos', type: 'network', hasLogo: true },
        { symbol: 'DOGE', name: 'Dogecoin', type: 'network', hasLogo: true },
        { symbol: 'ETH', name: 'Ethereum', type: 'network', hasLogo: true },
        { symbol: 'FIL', name: 'Filecoin', type: 'network', hasLogo: true },
        { symbol: 'HBAR', name: 'Hedera Hashgraph', type: 'network', hasLogo: true },
        { symbol: 'IMX', name: 'Immutable X', type: 'network', hasLogo: true },
        { symbol: 'INJ', name: 'Injective', type: 'network', hasLogo: true },
        { symbol: 'LTC', name: 'Litecoin', type: 'network', hasLogo: true },
        { symbol: 'MONAD', name: 'Monad', type: 'network', hasLogo: true },
        { symbol: 'XMR', name: 'Monero', type: 'network', hasLogo: true },
        { symbol: 'NEAR', name: 'NEAR Protocol', type: 'network', hasLogo: true },
        { symbol: 'ONDO', name: 'Ondo', type: 'network', hasLogo: true },
        { symbol: 'OP', name: 'Optimism', type: 'network', hasLogo: true },
        { symbol: 'PEPE', name: 'Pepe', type: 'network', hasLogo: true },
        { symbol: 'DOT', name: 'Polkadot', type: 'network', hasLogo: true },
        { symbol: 'MATIC', name: 'Polygon', type: 'network', hasLogo: true },
        { symbol: 'QNT', name: 'Quant', type: 'network', hasLogo: true },
        { symbol: 'SEI', name: 'Sei', type: 'network', hasLogo: true },
        { symbol: 'SHIB', name: 'Shiba Inu', type: 'network', hasLogo: true },
        { symbol: 'SOL', name: 'Solana', type: 'network', hasLogo: true },
        { symbol: 'XLM', name: 'Stellar', type: 'network', hasLogo: true },
        { symbol: 'SUI', name: 'Sui', type: 'network', hasLogo: true },
        { symbol: 'USDT', name: 'Tether', type: 'network', hasLogo: true },
        { symbol: 'RUNE', name: 'THORChain', type: 'network', hasLogo: true },
        { symbol: 'TON', name: 'Toncoin', type: 'network', hasLogo: true },
        { symbol: 'TRX', name: 'Tron', type: 'network', hasLogo: true },
        { symbol: 'UNI', name: 'Uniswap', type: 'network', hasLogo: true },
        { symbol: 'USDC', name: 'USD Coin', type: 'network', hasLogo: true },
        { symbol: 'XDC', name: 'XDC Network', type: 'network', hasLogo: true },
        { symbol: 'XRP', name: 'XRP (Ripple)', type: 'network', hasLogo: true },
        { symbol: 'ZEC', name: 'Zcash', type: 'network', hasLogo: true },
      ]);
      setCompanies([
        { symbol: '21SHARES', name: '21Shares', type: 'company', hasLogo: true },
        { symbol: 'ABERDEEN', name: 'Aberdeen', type: 'company', hasLogo: true },
        { symbol: 'ARCHAX', name: 'Archax', type: 'company', hasLogo: true },
        { symbol: 'ARROW', name: 'Arrow', type: 'company', hasLogo: true },
        { symbol: 'AVERYDENNISON', name: 'Avery Dennison', type: 'company', hasLogo: true },
        { symbol: 'AXIOM', name: 'Axiom', type: 'company', hasLogo: true },
        { symbol: 'BINANCE', name: 'Binance Exchange', type: 'company', hasLogo: true },
        { symbol: 'BITGO', name: 'BitGo', type: 'company', hasLogo: true },
        { symbol: 'BITMINE', name: 'Bitmine', type: 'company', hasLogo: true },
        { symbol: 'BLACKROCK', name: 'BlackRock', type: 'company', hasLogo: true },
        { symbol: 'BLOCKCHAINFORENERGY', name: 'Blockchain for Energy', type: 'company', hasLogo: true },
        { symbol: 'BOEING', name: 'Boeing', type: 'company', hasLogo: true },
        { symbol: 'CFTC', name: 'CFTC', type: 'company', hasLogo: true },
        { symbol: 'CONFRA', name: 'Confra', type: 'company', hasLogo: true },
        { symbol: 'DELL', name: 'Dell', type: 'company', hasLogo: true },
        { symbol: 'DENTONS', name: 'Dentons', type: 'company', hasLogo: true },
        { symbol: 'DEUTSCHETELEKOM', name: 'Deutsche Telekom', type: 'company', hasLogo: true },
        { symbol: 'DLAPIPER', name: 'DLA Piper', type: 'company', hasLogo: true },
        { symbol: 'EDF', name: 'EDF', type: 'company', hasLogo: true },
        { symbol: 'EFTPOS', name: 'Eftpos', type: 'company', hasLogo: true },
        { symbol: 'GBBC', name: 'GBBC', type: 'company', hasLogo: true },
        { symbol: 'GOOGLE', name: 'Google', type: 'company', hasLogo: true },
        { symbol: 'GRAYSCALE', name: 'Grayscale', type: 'company', hasLogo: true },
        { symbol: 'HASHPACK', name: 'HashPack (PACK)', type: 'company', hasLogo: true },
        { symbol: 'HITACHI', name: 'Hitachi', type: 'company', hasLogo: true },
        { symbol: 'IBM', name: 'IBM', type: 'company', hasLogo: true },
        { symbol: 'IITMADRAS', name: 'IIT Madras', type: 'company', hasLogo: true },
        { symbol: 'IMF', name: 'IMF', type: 'company', hasLogo: true },
        { symbol: 'KRAKEN', name: 'Kraken', type: 'company', hasLogo: true },
        { symbol: 'KUCOIN', name: 'KuCoin', type: 'company', hasLogo: true },
        { symbol: 'LGELECTRONICS', name: 'LG Electronics', type: 'company', hasLogo: true },
        { symbol: 'LSE', name: 'LSE', type: 'company', hasLogo: true },
        { symbol: 'MAGALU', name: 'Magalu', type: 'company', hasLogo: true },
        { symbol: 'MAGICEDEN', name: 'Magic Eden', type: 'company', hasLogo: true },
        { symbol: 'METAMASK', name: 'MetaMask', type: 'company', hasLogo: true },
        { symbol: 'MONDELEZ', name: 'Mondelez', type: 'company', hasLogo: true },
        { symbol: 'MOONPAY', name: 'MoonPay', type: 'company', hasLogo: true },
        { symbol: 'NOMURA', name: 'Nomura', type: 'company', hasLogo: true },
        { symbol: 'NVIDIA', name: 'NVIDIA', type: 'company', hasLogo: true },
        { symbol: 'PAXOS', name: 'Paxos', type: 'company', hasLogo: true },
        { symbol: 'PLUGANDPLAY', name: 'Plug and Play', type: 'company', hasLogo: true },
        { symbol: 'RAZE', name: 'Raze', type: 'company', hasLogo: true },
        { symbol: 'RIPPLE', name: 'Ripple', type: 'company', hasLogo: true },
        { symbol: 'ROBINHOOD', name: 'Robinhood', type: 'company', hasLogo: true },
        { symbol: 'SERVICENOW', name: 'ServiceNow', type: 'company', hasLogo: true },
        { symbol: 'SHINHANBANK', name: 'Shinhan Bank', type: 'company', hasLogo: true },
        { symbol: 'SWIRLDSLABS', name: 'Swirlds Labs', type: 'company', hasLogo: true },
        { symbol: 'TATACOMMUNICATIONS', name: 'Tata Communications', type: 'company', hasLogo: true },
        { symbol: 'UBISOFT', name: 'Ubisoft', type: 'company', hasLogo: true },
        { symbol: 'UPHOLD', name: 'Uphold', type: 'company', hasLogo: true },
        { symbol: 'WLFI', name: 'World Liberty Financial', type: 'company', hasLogo: true },
        { symbol: 'WORLDPAY', name: 'Worldpay', type: 'company', hasLogo: true },
        { symbol: 'ZAIN', name: 'Zain', type: 'company', hasLogo: true },
      ]);
    }
  };

  const loadSavedCovers = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Get fresh token directly from Firebase
      const freshToken = await currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', freshToken);
      
      console.log('Loading saved covers for user:', currentUser.uid);
      
      const response = await fetch(`${API_BASE}/api/cover-generator/my-covers`, {
        headers: {
          'Authorization': `Bearer ${freshToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded covers:', data);
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
      // Get fresh token directly from Firebase (tokens expire after 1 hour)
      const freshToken = await currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', freshToken);
      
      console.log('Saving cover with fresh token for user:', currentUser.uid);
      
      const response = await fetch(`${API_BASE}/api/cover-generator/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshToken}`
        },
        body: JSON.stringify({
          imageUrl,
          network,
          title: title || `${network} Cover`
        })
      });
      
      const data = await response.json();
      console.log('Save response:', data);
      
      if (response.ok && data.success) {
        return true;
      }
      console.error('Save failed:', data.error);
      return false;
    } catch (err) {
      console.error('Failed to save cover:', err);
      return false;
    }
  }, [currentUser]);

  const submitRating = async () => {
    const hasAnyRating = logoQuality !== null || logoSize !== null || logoStyle !== null ||
      backgroundQuality !== null || backgroundStyle !== null || feedbackKeyword.trim();
    if (!hasAnyRating) {
      toast.warning('Please provide at least one rating or feedback');
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
          // 1-10 numeric ratings
          logoQuality,
          logoSize,
          logoStyle,
          backgroundQuality,
          backgroundStyle,
          feedbackKeyword: feedbackKeyword.trim() || null,
          userId: currentUser?.uid || null,
          userEmail: currentUser?.email || null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRatingSubmitted(true);
        toast.success('Thanks for your feedback! This helps improve future generations.');
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
      let authHeader = {};
      if (currentUser) {
        const freshToken = await currentUser.getIdToken(true);
        authHeader = { 'Authorization': `Bearer ${freshToken}` };
      }

      const response = await fetch(`${API_BASE}/api/cover-generator/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          network: networkToUse.toUpperCase(),
          title: articleTitle || undefined,
          customKeyword: customKeyword.trim() || undefined,
          logoTextMode
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

  // Rating scale (1-10)
  const ratingScale = Array.from({ length: 10 }, (_, i) => i + 1);

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

            <InputSection>
              <label>Logo Text Mode</label>
              <ToggleRow>
                <ToggleButton
                  type="button"
                  selected={logoTextMode === 'full'}
                  onClick={() => setLogoTextMode('full')}
                >
                  Full Logo (text + mark)
                </ToggleButton>
                <ToggleButton
                  type="button"
                  selected={logoTextMode === 'mark'}
                  onClick={() => setLogoTextMode('mark')}
                >
                  Logo Mark Only
                </ToggleButton>
              </ToggleRow>
              <div className="hint">Choose whether to preserve the full logo text or only the symbol.</div>
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

            {/* Rating Section - 1-10 Checkboxes */}
            {currentImage && !ratingSubmitted && (
              <RatingSection>
                <RatingTitle>📊 Rate This Generation (1-10)</RatingTitle>
                
                {/* Logo Quality */}
                <RatingRow>
                  <RatingLabel>Logo Quality</RatingLabel>
                  <RatingOptions>
                    {ratingScale.map(value => (
                      <NumberButton
                        key={`logoQuality-${value}`}
                        value={value}
                        selected={logoQuality === value}
                        onClick={() => setLogoQuality(value)}
                      >
                        {value}
                      </NumberButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                {/* Logo Size */}
                <RatingRow>
                  <RatingLabel>Logo Size (1 = very bad size, 10 = perfect size)</RatingLabel>
                  <RatingOptions>
                    {ratingScale.map(value => (
                      <NumberButton
                        key={`logoSize-${value}`}
                        value={value}
                        selected={logoSize === value}
                        onClick={() => setLogoSize(value)}
                      >
                        {value}
                      </NumberButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                {/* Logo Style */}
                <RatingRow>
                  <RatingLabel>Logo Style</RatingLabel>
                  <RatingOptions>
                    {ratingScale.map(value => (
                      <NumberButton
                        key={`logoStyle-${value}`}
                        value={value}
                        selected={logoStyle === value}
                        onClick={() => setLogoStyle(value)}
                      >
                        {value}
                      </NumberButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                {/* Background Quality */}
                <RatingRow>
                  <RatingLabel>Background Quality</RatingLabel>
                  <RatingOptions>
                    {ratingScale.map(value => (
                      <NumberButton
                        key={`bgQuality-${value}`}
                        value={value}
                        selected={backgroundQuality === value}
                        onClick={() => setBackgroundQuality(value)}
                      >
                        {value}
                      </NumberButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                {/* Background Style */}
                <RatingRow>
                  <RatingLabel>Background Style</RatingLabel>
                  <RatingOptions>
                    {ratingScale.map(value => (
                      <NumberButton
                        key={`bgStyle-${value}`}
                        value={value}
                        selected={backgroundStyle === value}
                        onClick={() => setBackgroundStyle(value)}
                      >
                        {value}
                      </NumberButton>
                    ))}
                  </RatingOptions>
                </RatingRow>
                
                <FeedbackInput>
                  <label>💬 Additional Feedback (optional):</label>
                  <textarea
                    placeholder="Describe what you liked or didn't like... e.g., 'The logo should be bigger', 'Love the underwater theme', 'Too much glass everywhere', 'Try a space theme'..."
                    value={feedbackKeyword}
                    onChange={(e) => setFeedbackKeyword(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <div className="hint">
                    AI will analyze your feedback to improve future generations. Be specific!
                  </div>
                </FeedbackInput>
                
                <SubmitRatingButton
                  onClick={submitRating}
                  disabled={submittingRating}
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
                    <img 
                      src={item.imageUrl} 
                      alt={item.network}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
                        e.target.parentElement.style.minHeight = '120px';
                      }}
                    />
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
