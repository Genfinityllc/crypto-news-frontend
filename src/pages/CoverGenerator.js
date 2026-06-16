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
  background: #111111;
  border: 1px solid #222222;
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
  background: #0a0a0a;
  border: 2px solid ${props => props.hasValue ? '#00d4ff' : '#1a1a1a'};
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
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 8px;
  color: #e6edf3;
  font-size: 1rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #00d4ff;
  }
  
  option {
    background: #0a0a0a;
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
  border: 1px solid ${props => props.selected ? '#00d4ff' : '#1a1a1a'};
  background: ${props => props.selected ? 'rgba(0, 212, 255, 0.15)' : '#0a0a0a'};
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
    background: #1a1a1a;
  }
  
  span {
    padding: 0 1rem;
  }
`;

const GenerateButton = styled.button`
  width: 100%;
  margin-top: 1.5rem;
  padding: 1.25rem 2rem;
  background: ${props => props.loading ? '#1a1a1a' : 'linear-gradient(135deg, #00d4ff, #8b5cf6)'};
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
  background: #0a0a0a;
  border-radius: 12px;
  overflow: hidden;
  border: ${props => props.empty ? '2px dashed #1a1a1a' : 'none'};
  
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
  background: #0a0a0a;
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
  background: ${props => props.primary ? '#00d4ff' : '#111111'};
  border: 1px solid ${props => props.primary ? '#00d4ff' : '#1a1a1a'};
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

const RatingSection = styled.div`
  background: #0a0a0a;
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
          return `background: #1a1a1a; border-color: #1a1a1a; color: #e6edf3;`;
      }
    }
    return `background: transparent; border-color: #1a1a1a; color: #8b949e;`;
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
    background: #111111;
    border: 1px solid #1a1a1a;
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
  background: ${props => props.disabled ? '#1a1a1a' : '#238636'};
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

const LogoPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 10px;
  margin-bottom: 0.75rem;

  img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 8px;
    background: #111111;
  }

  .logo-info {
    flex: 1;
    min-width: 0;
  }

  .logo-name {
    color: #e6edf3;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .logo-symbol {
    color: #00d4ff;
    font-size: 0.8rem;
    font-weight: 500;
  }
`;

const AddLogoButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px dashed #1a1a1a;
  border-radius: 8px;
  color: #8b949e;
  font-size: 0.85rem;
  cursor: pointer;
  margin-top: 0.75rem;
  transition: all 0.2s;

  &:hover {
    border-color: #00d4ff;
    color: #00d4ff;
  }
`;

const LogoSlotRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: center;
`;

const RemoveLogoBtn = styled.button`
  background: transparent;
  border: none;
  color: #f85149;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;

  &:hover {
    background: rgba(248, 81, 73, 0.1);
  }
`;

const AdminSection = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
`;

const AdminTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f0883e;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 1rem;
  cursor: pointer;
`;

const UploadRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const SmallInput = styled.input`
  padding: 0.5rem 0.75rem;
  background: #111111;
  border: 1px solid #1a1a1a;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 0.85rem;
  width: ${props => props.width || '80px'};

  &:focus {
    outline: none;
    border-color: #00d4ff;
  }

  &::placeholder {
    color: #6e7681;
  }
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background: #238636;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: #2ea043;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TypeToggle = styled.button`
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid ${props => props.active ? '#8b5cf6' : '#1a1a1a'};
  background: ${props => props.active ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};
  color: ${props => props.active ? '#8b5cf6' : '#8b949e'};
  font-size: 0.8rem;
  cursor: pointer;
`;

const StyleSection = styled.div`
  margin-bottom: 1.5rem;
`;

// Phase 4: collapsible Reference Image + Prompt section
const RefSection = styled.div`
  margin-bottom: 1.5rem;
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  background: rgba(0, 212, 255, 0.03);
`;

const RefHeader = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  color: #00d4ff;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
  cursor: pointer;
  text-align: left;
  &:hover { background: rgba(0, 212, 255, 0.06); }
`;

const RefBody = styled.div`
  padding: 0 1rem 1rem 1rem;
  display: ${p => p.$open ? 'block' : 'none'};
`;

const RefModeRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0 0.75rem 0;
`;

const RefModeChip = styled.button`
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: ${p => p.$active ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#00d4ff' : 'rgba(255,255,255,0.7)'};
  border: 1px solid ${p => p.$active ? '#00d4ff' : 'rgba(255,255,255,0.08)'};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #00d4ff; }
`;

const RefFileInput = styled.input`
  display: block;
  width: 100%;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
`;

const RefThumb = styled.img`
  max-width: 100%;
  max-height: 140px;
  border-radius: 6px;
  margin: 0.25rem 0 0.5rem 0;
  border: 1px solid rgba(255,255,255,0.08);
`;

const RefPromptTextarea = styled.textarea`
  width: 100%;
  min-height: 70px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: white;
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  &:focus { border-color: #00d4ff; outline: none; }
`;

const RefHint = styled.div`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  margin-top: 0.4rem;
  line-height: 1.4;
`;

const RefClearBtn = styled.button`
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  text-decoration: underline;
  &:hover { color: #ff6b6b; }
`;

const RefDropZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 90px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 2px dashed ${p => p.$dragActive ? '#00d4ff' : 'rgba(255,255,255,0.18)'};
  border-radius: 8px;
  background: ${p => p.$dragActive ? 'rgba(0,212,255,0.08)' : 'rgba(0,0,0,0.2)'};
  cursor: pointer;
  text-align: center;
  color: rgba(255,255,255,0.65);
  font-size: 0.85rem;
  transition: all 0.15s ease;
  &:hover { border-color: rgba(0,212,255,0.6); background: rgba(0,212,255,0.04); }
`;

const RefThumbGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.4rem;
  margin: 0.25rem 0 0.5rem 0;
`;

const RefThumbCell = styled.div`
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.3);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const RefThumbRemove = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  &:hover { background: #ff6b6b; border-color: #ff6b6b; }
`;

const RefCountBadge = styled.span`
  font-size: 0.7rem;
  color: rgba(255,255,255,0.55);
  margin-left: 0.4rem;
`;

const StyleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.25rem;
`;

const StyleThumb = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => props.selected ? '#00d4ff' : 'transparent'};
  transition: all 0.2s;
  width: 100%;
  min-width: 0;
  /* Safari-safe square via padding-bottom hack (aspect-ratio inside CSS grid
     auto-rows misbehaves in Safari, causing thumbs to collapse + overlap) */
  height: 0;
  padding-bottom: 100%;

  &:hover {
    border-color: #00d4ff;
    transform: scale(1.05);
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const StyleLabel = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.2rem 0.3rem;
  background: rgba(0, 0, 0, 0.75);
  color: #e6edf3;
  font-size: 0.6rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CategoryFilters = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`;

const CategoryChip = styled.button`
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  border: 1px solid ${props => props.active ? '#00d4ff' : '#1a1a1a'};
  background: ${props => props.active ? 'rgba(0, 212, 255, 0.1)' : 'transparent'};
  color: ${props => props.active ? '#00d4ff' : '#8b949e'};
  font-size: 0.75rem;
  cursor: pointer;
`;

const NoStyleNote = styled.div`
  font-size: 0.8rem;
  color: #8b949e;
  margin-top: 0.25rem;
`;

const ColorRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
`;

const ColorField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  label {
    font-size: 0.75rem;
    color: #8b949e;
  }
`;

const ColorInput = styled.input`
  width: 40px;
  height: 30px;
  border: 1px solid #1a1a1a;
  border-radius: 6px;
  background: #0a0a0a;
  cursor: pointer;
  padding: 2px;
  
  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  
  &::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }
`;

const InlineDropdownRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
`;

const SmallSelect = styled.select`
  padding: 0.5rem;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 8px;
  color: #e6edf3;
  font-size: 0.85rem;
  cursor: pointer;
  flex: 1;
  min-width: 0;
  max-width: 100%;

  &:focus {
    outline: none;
    border-color: #00d4ff;
  }

  option {
    background: #0a0a0a;
    color: #e6edf3;
  }
`;

export default function CoverGenerator() {
  const { currentUser } = useAuth();
  const [networks, setNetworks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [networkInput, setNetworkInput] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [logoSlots, setLogoSlots] = useState([]);
  const [articleTitle, setArticleTitle] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [logoTextMode, setLogoTextMode] = useState('full');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);


  const [styles, setStyles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const [bgColor, setBgColor] = useState('');
  const [elementColor, setElementColor] = useState('');
  const [elementColor2, setElementColor2] = useState('');
  const [accentLightColor, setAccentLightColor] = useState('');
  const [accentLightColor2, setAccentLightColor2] = useState('');
  const [lightingColor, setLightingColor] = useState('');
  const [lightingColor2, setLightingColor2] = useState('');

  const [primaryLogoOverrides, setPrimaryLogoOverrides] = useState({ material: 'default', baseColor: '', accentLight: '' });

  const [customSubject, setCustomSubject] = useState('');
  const [patternId, setPatternId] = useState('');
  const [patternColor, setPatternColor] = useState('');
  const [showWatermark, setShowWatermark] = useState(true);

  // Phase 4: Reference image + custom prompt mode
  // Phase 4-ext3: now supports up to 14 reference images (Wavespeed cap)
  const [refSectionOpen, setRefSectionOpen] = useState(false);
  const [refImageUrls, setRefImageUrls] = useState([]); // string[]
  const [refMode, setRefMode] = useState('style_reference'); // 'style_reference' | 'composition_restyle'
  const [customPromptText, setCustomPromptText] = useState('');
  const [refUploading, setRefUploading] = useState(false);
  const [refDragActive, setRefDragActive] = useState(false);
  const MAX_REF_IMAGES = 14;
  // Legacy single-URL flag kept for callers below that still reference refImageUrl
  const refImageUrl = refImageUrls[0] || '';

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSymbol, setUploadSymbol] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('company');
  const [uploadVariant, setUploadVariant] = useState('mark');
  const [uploading, setUploading] = useState(false);

  const [logoQuality, setLogoQuality] = useState(null);
  const [logoSize, setLogoSize] = useState(null);
  const [logoStyle, setLogoStyle] = useState(null);
  const [backgroundQuality, setBackgroundQuality] = useState(null);
  const [backgroundStyle, setBackgroundStyle] = useState(null);
  const [feedbackKeyword, setFeedbackKeyword] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const adminEmails = ['valor.kopeny@cc-ea.org'];
  const isAdmin = currentUser?.email && adminEmails.includes(currentUser.email.toLowerCase());

  useEffect(() => {
    loadNetworks();
    loadStyles();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSavedCovers();
    }
  }, [currentUser]);

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
        { symbol: 'BTC', name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum' },
        { symbol: 'XRP', name: 'XRP (Ripple)' },
        { symbol: 'SOL', name: 'Solana' },
        { symbol: 'HBAR', name: 'Hedera Hashgraph' },
        { symbol: 'ADA', name: 'Cardano' },
        { symbol: 'AVAX', name: 'Avalanche' },
        { symbol: 'DOT', name: 'Polkadot' },
        { symbol: 'MATIC', name: 'Polygon' },
        { symbol: 'LINK', name: 'Chainlink' },
        { symbol: 'UNI', name: 'Uniswap' },
        { symbol: 'DOGE', name: 'Dogecoin' },
        { symbol: 'LTC', name: 'Litecoin' },
        { symbol: 'ATOM', name: 'Cosmos' },
        { symbol: 'NEAR', name: 'NEAR Protocol' },
        { symbol: 'ALGO', name: 'Algorand' },
        { symbol: 'XLM', name: 'Stellar' },
        { symbol: 'SUI', name: 'Sui' },
        { symbol: 'APT', name: 'Aptos' },
        { symbol: 'ARB', name: 'Arbitrum' },
        { symbol: 'OP', name: 'Optimism' },
        { symbol: 'INJ', name: 'Injective' },
        { symbol: 'SEI', name: 'Sei' },
        { symbol: 'TIA', name: 'Celestia' },
        { symbol: 'PEPE', name: 'Pepe' },
        { symbol: 'SHIB', name: 'Shiba Inu' },
        { symbol: 'BNB', name: 'Binance' },
        { symbol: 'TRX', name: 'Tron' },
        { symbol: 'TON', name: 'Toncoin' },
        { symbol: 'FIL', name: 'Filecoin' },
        { symbol: 'XMR', name: 'Monero' },
        { symbol: 'CRO', name: 'Cronos' },
        { symbol: 'RUNE', name: 'THORChain' },
        { symbol: 'TAO', name: 'Bittensor' },
        { symbol: 'QNT', name: 'Quant' },
        { symbol: 'ONDO', name: 'Ondo' },
        { symbol: 'IMX', name: 'Immutable X' },
        { symbol: 'DAG', name: 'Constellation (DAG)' },
        { symbol: 'XDC', name: 'XDC Network' },
        { symbol: 'USDC', name: 'USD Coin' },
        { symbol: 'USDT', name: 'Tether' },
        { symbol: 'ZEC', name: 'Zcash' },
        { symbol: 'CANTON', name: 'Canton' },
        { symbol: 'MONAD', name: 'Monad' },
        { symbol: 'AXELAR', name: 'Axelar' },
      ]);
      setCompanies([
        { symbol: 'BLACKROCK', name: 'BlackRock' },
        { symbol: 'GRAYSCALE', name: 'Grayscale' },
        { symbol: '21SHARES', name: '21Shares' },
        { symbol: 'WLFI', name: 'World Liberty Financial' },
        { symbol: 'BITMINE', name: 'Bitmine' },
        { symbol: 'MOONPAY', name: 'MoonPay' },
        { symbol: 'NVIDIA', name: 'NVIDIA' },
        { symbol: 'PAXOS', name: 'Paxos' },
        { symbol: 'ROBINHOOD', name: 'Robinhood' },
        { symbol: 'HASHPACK', name: 'HashPack (PACK)' },
        { symbol: 'KRAKEN', name: 'Kraken' },
        { symbol: 'KUCOIN', name: 'KuCoin' },
        { symbol: 'BINANCE', name: 'Binance Exchange' },
        { symbol: 'BITGO', name: 'BitGo' },
        { symbol: 'METAMASK', name: 'MetaMask' },
        { symbol: 'MAGICEDEN', name: 'Magic Eden' },
        { symbol: 'UPHOLD', name: 'Uphold' },
        { symbol: 'IMF', name: 'IMF' },
        { symbol: 'CFTC', name: 'CFTC' },
        { symbol: 'ABERDEEN', name: 'Aberdeen' },
        { symbol: 'ARROW', name: 'Arrow' },
        { symbol: 'ARCHAX', name: 'Archax' },
        { symbol: 'AVERYDENNISON', name: 'Avery Dennison' },
        { symbol: 'BLOCKCHAINFORENERGY', name: 'Blockchain for Energy' },
        { symbol: 'BOEING', name: 'Boeing' },
        { symbol: 'CONFRA', name: 'Confra' },
        { symbol: 'DELL', name: 'Dell' },
        { symbol: 'DENTONS', name: 'Dentons' },
        { symbol: 'DEUTSCHETELEKOM', name: 'Deutsche Telekom' },
        { symbol: 'DLAPIPER', name: 'DLA Piper' },
        { symbol: 'EDF', name: 'EDF' },
        { symbol: 'EFTPOS', name: 'Eftpos' },
        { symbol: 'GBBC', name: 'GBBC' },
        { symbol: 'GOOGLE', name: 'Google' },
        { symbol: 'HITACHI', name: 'Hitachi' },
        { symbol: 'IBM', name: 'IBM' },
        { symbol: 'IITMADRAS', name: 'IIT Madras' },
        { symbol: 'LGELECTRONICS', name: 'LG Electronics' },
        { symbol: 'LSE', name: 'LSE' },
        { symbol: 'MAGALU', name: 'Magalu' },
        { symbol: 'MONDELEZ', name: 'Mondelez' },
        { symbol: 'NOMURA', name: 'Nomura' },
        { symbol: 'SERVICENOW', name: 'ServiceNow' },
        { symbol: 'SHINHANBANK', name: 'Shinhan Bank' },
        { symbol: 'SWIRLDSLABS', name: 'Swirlds Labs' },
        { symbol: 'TATACOMMUNICATIONS', name: 'Tata Communications' },
        { symbol: 'UBISOFT', name: 'Ubisoft' },
        { symbol: 'WORLDPAY', name: 'Worldpay' },
        { symbol: 'ZAIN', name: 'Zain' },
        { symbol: 'AXIOM', name: 'Axiom' },
        { symbol: 'PLUGANDPLAY', name: 'Plug and Play' },
        { symbol: 'RAZE', name: 'Raze' },
        { symbol: 'RIPPLE', name: 'Ripple' },
        { symbol: 'COINBASE', name: 'Coinbase' },
        { symbol: 'COINBASE_FULL', name: 'Coinbase (FULL)' },
        { symbol: 'HEDERA_FULL', name: 'Hedera (FULL)' },
        { symbol: 'LOOPSCALE_FULL', name: 'Loopscale (FULL)' },
        { symbol: 'DRIFT_FULL', name: 'Drift (FULL)' },
      ]);
    }
  };

  const loadStyles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/style-catalog`);
      const data = await response.json();
      if (data.success) {
        setStyles(data.styles || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load styles:', err);
    }
  };

  const loadSavedCovers = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const freshToken = await currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', freshToken);
      
      const response = await fetch(`${API_BASE}/api/cover-generator/my-covers`, {
        headers: {
          'Authorization': `Bearer ${freshToken}`
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
      const freshToken = await currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', freshToken);
      
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

  const handleAddLogoSlot = () => {
    if (logoSlots.length < 7) {
      setLogoSlots(prev => [...prev, { network: '', company: '', input: '', material: 'default', baseColor: '', accentLight: '' }]);
    }
  };

  const handleRemoveLogoSlot = (index) => {
    setLogoSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogoSlotChange = (index, field, value) => {
    setLogoSlots(prev => {
      const updated = [...prev];
      if (field === '_overrides') {
        updated[index] = { ...updated[index], material: value.material, baseColor: value.baseColor, accentLight: value.accentLight };
      } else {
        updated[index] = { ...updated[index], [field]: value };
        if (field === 'network') { updated[index].company = ''; updated[index].input = value; }
        if (field === 'company') { updated[index].network = ''; updated[index].input = value; }
        if (field === 'input') { updated[index].network = ''; updated[index].company = ''; }
      }
      return updated;
    });
  };

  const handleUploadLogo = async () => {
    if (!uploadFile || !uploadSymbol || !uploadName) {
      toast.warning('Please fill in all fields and select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', uploadFile);
      const baseSymbol = uploadSymbol.toUpperCase().replace(/\s+/g, '');
      formData.append('symbol', uploadVariant === 'full' ? `${baseSymbol}_FULL` : baseSymbol);
      formData.append('name', uploadName);
      formData.append('type', uploadType);

      const response = await fetch(`${API_BASE}/api/cover-generator/upload-logo`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Logo uploaded: ${uploadName} (${uploadVariant})`);
        setUploadFile(null);
        setUploadSymbol('');
        setUploadName('');
        setUploadVariant('mark');
        loadNetworks();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Phase 4-ext3: upload one or more reference image files, append URLs to refImageUrls
  const handleRefFilesUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_REF_IMAGES - refImageUrls.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_REF_IMAGES} reference images reached`);
      return;
    }
    const files = Array.from(fileList).filter(f => /^image\//.test(f.type)).slice(0, remaining);
    if (files.length === 0) {
      toast.error('Please drop image files (PNG or JPEG)');
      return;
    }
    if (fileList.length > remaining) {
      toast(`Only adding ${remaining} of ${fileList.length} (cap is ${MAX_REF_IMAGES})`);
    }
    setRefUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append('reference', f);
        const r = await fetch(`${API_BASE}/api/cover-generator/upload-reference`, { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success && j.referenceImageUrl) {
          uploaded.push(j.referenceImageUrl);
        } else {
          toast.error(j.error || `Upload failed for ${f.name}`);
        }
      }
      if (uploaded.length > 0) {
        setRefImageUrls(prev => [...prev, ...uploaded].slice(0, MAX_REF_IMAGES));
        toast.success(`Uploaded ${uploaded.length} reference image${uploaded.length === 1 ? '' : 's'}`);
      }
    } catch (err) {
      toast.error('Reference upload error: ' + err.message);
    } finally {
      setRefUploading(false);
    }
  };

  const handleGenerate = async () => {
    const networkToUse = networkInput.trim();
    const isBackgroundOnly = !networkToUse;

    // Phase 4-ext: PURE REF MODE — allow generation with just ref image + custom prompt
    // (no logo, no style). Otherwise background-only requires a style.
    const hasPureRefMode = !!refImageUrl && customPromptText.trim().length > 0;
    if (isBackgroundOnly && !selectedStyle && !hasPureRefMode) {
      toast.warning('Please select a style, or upload a reference image and enter a prompt');
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

      const allLogoEntries = isBackgroundOnly ? [] : [
        { symbol: networkToUse.toUpperCase(), ...primaryLogoOverrides },
        ...logoSlots
          .filter(l => (l.input || l.network || l.company).trim())
          .map(l => ({ symbol: (l.input || l.network || l.company).trim().toUpperCase(), material: l.material || 'default', baseColor: l.baseColor || '', accentLight: l.accentLight || '' }))
      ];
      const allLogoSymbols = allLogoEntries.map(e => e.symbol);

      const perLogoOverrides = allLogoEntries.map(e => {
        const hasNonDefaultMaterial = e.material && e.material !== 'default';
        const isOg = e.material === 'og_color';
        return {
          symbol: e.symbol,
          logoMaterial: hasNonDefaultMaterial ? e.material : undefined,
          logoBaseColor: isOg ? undefined : (e.baseColor || (hasNonDefaultMaterial ? '#ffffff' : undefined)),
          logoAccentLight: e.accentLight || (hasNonDefaultMaterial && !isOg ? '#8b5cf6' : undefined),
        };
      });
      const hasAnyOverride = perLogoOverrides.some(o => o.logoMaterial || o.logoBaseColor || o.logoAccentLight);

      const body = {
        network: isBackgroundOnly ? '' : allLogoSymbols[0] || '',
        additionalNetworks: allLogoSymbols.slice(1),
        title: articleTitle || undefined,
        customKeyword: customKeyword.trim() || undefined,
        logoTextMode,
        styleId: selectedStyle || undefined,
        bgColor: bgColor || undefined,
        elementColor: elementColor || undefined,
        elementColor2: elementColor2 || undefined,
        accentLightColor: accentLightColor || undefined,
        accentLightColor2: accentLightColor2 || undefined,
        lightingColor: lightingColor || undefined,
        lightingColor2: lightingColor2 || undefined,
        perLogoOverrides: hasAnyOverride ? perLogoOverrides : undefined,
        customSubject: customSubject.trim() || undefined,
        patternId: patternId || undefined,
        patternColor: patternColor || undefined,
        skipWatermark: !showWatermark || undefined,
        // Phase 4: reference image + custom prompt
        // Phase 4-ext3: send full array (up to 14) plus legacy single-URL for back-compat
        referenceImageUrl: refImageUrls[0] || undefined,
        referenceImageUrls: refImageUrls.length > 0 ? refImageUrls : undefined,
        referenceMode: refImageUrls.length > 0 ? refMode : undefined,
        customPrompt: customPromptText.trim() || undefined,
      };

      const response = await fetch(`${API_BASE}/api/cover-generator/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        const imageUrl = data.imageUrl;
        const network = data.network || networkToUse;
        
        setCurrentImage(imageUrl);
        const currentSettings = {
          styleId: selectedStyle || null,
          bgColor: bgColor || '',
          elementColor: elementColor || '',
          elementColor2: elementColor2 || '',
          accentLightColor: accentLightColor || '',
          accentLightColor2: accentLightColor2 || '',
          lightingColor: lightingColor || '',
          lightingColor2: lightingColor2 || '',
          logoTextMode,
          customSubject: customSubject || '',
          customKeyword: customKeyword || '',
          patternId: patternId || '',
          patternColor: patternColor || '',
          primaryLogoOverrides: { ...primaryLogoOverrides },
          showWatermark,
        };
        setCurrentMeta({
          network: network,
          method: data.method,
          duration: data.duration,
          prompt: data.promptUsed,
          settings: currentSettings
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
          saved: saved,
          settings: {
            styleId: selectedStyle || null,
            bgColor: bgColor || '',
            elementColor: elementColor || '',
            elementColor2: elementColor2 || '',
            accentLightColor: accentLightColor || '',
            accentLightColor2: accentLightColor2 || '',
            lightingColor: lightingColor || '',
            lightingColor2: lightingColor2 || '',
            logoTextMode,
            customSubject: customSubject || '',
            customKeyword: customKeyword || '',
            patternId: patternId || '',
            patternColor: patternColor || '',
            primaryLogoOverrides: { ...primaryLogoOverrides },
            showWatermark,
          }
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
      duration: '-',
      settings: item.settings || null
    });
  };

  const handleReuseStyle = (e, item) => {
    e.stopPropagation();
    if (!item.settings) return;
    const s = item.settings;
    if (s.styleId) setSelectedStyle(s.styleId);
    setBgColor(s.bgColor || '');
    setElementColor(s.elementColor || '');
    setElementColor2(s.elementColor2 || '');
    setAccentLightColor(s.accentLightColor || '');
    setAccentLightColor2(s.accentLightColor2 || '');
    setLightingColor(s.lightingColor || '');
    setLightingColor2(s.lightingColor2 || '');
    if (s.logoTextMode) setLogoTextMode(s.logoTextMode);
    setCustomSubject(s.customSubject || '');
    setCustomKeyword(s.customKeyword || '');
    setPatternId(s.patternId || '');
    setPatternColor(s.patternColor || '');
    if (s.primaryLogoOverrides) setPrimaryLogoOverrides({ ...s.primaryLogoOverrides });
    if (s.showWatermark !== undefined) setShowWatermark(s.showWatermark);
    toast.success('Style settings loaded — change the logo and generate!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredStyles = activeCategory === 'all'
    ? styles
    : styles.filter(s => s.category === activeCategory);

  const ratingScale = Array.from({ length: 10 }, (_, i) => i + 1);

  const renderLogoOverrides = (overrides, onChange) => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
      <SmallSelect
        value={overrides.material}
        onChange={(e) => onChange({ ...overrides, material: e.target.value })}
        style={{ flex: 'none', width: '110px', fontSize: '0.7rem', padding: '0.25rem' }}
      >
        <option value="default">Default</option>
        <option value="og_color">OG Color</option>
        <option value="frosted_glass">Frosted Glass</option>
        <option value="crystal_glass">Crystal Glass</option>
        <option value="mirror_chrome">Mirror Chrome</option>
        <option value="matte_ceramic">Matte Ceramic</option>
        <option value="liquid_mercury">Liquid Mercury</option>
        <option value="beveled_crystal">Beveled Crystal</option>
        <option value="edge_lit_glass">Edge-Lit Glass</option>
        <option value="platinum_chrome">Platinum Chrome</option>
        <option value="brushed_metal">Brushed Metal</option>
      </SmallSelect>
      {overrides.material !== 'og_color' && (
        <ColorField style={{ flexDirection: 'row', alignItems: 'center', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.65rem', margin: 0 }}>Color</label>
          <ColorInput type="color" value={overrides.baseColor || '#ffffff'} onChange={(e) => onChange({ ...overrides, baseColor: e.target.value })} style={{ width: 28, height: 22 }} />
        </ColorField>
      )}
      {overrides.material !== 'default' && (
        <ColorField style={{ flexDirection: 'row', alignItems: 'center', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.65rem', margin: 0 }}>Glow</label>
          {overrides.accentLight === 'none' ? (
            <button
              type="button"
              onClick={() => onChange({ ...overrides, accentLight: '' })}
              title="Click to re-enable glow"
              style={{ width: 28, height: 22, borderRadius: 3, border: '1px solid #555', background: 'repeating-linear-gradient(45deg,#222,#222 3px,#444 3px,#444 6px)', color: '#bbb', fontSize: '0.55rem', cursor: 'pointer', padding: 0 }}
            >none</button>
          ) : (
            <ColorInput type="color" value={overrides.accentLight || '#8b5cf6'} onChange={(e) => onChange({ ...overrides, accentLight: e.target.value })} style={{ width: 28, height: 22 }} />
          )}
          <button
            type="button"
            onClick={() => onChange({ ...overrides, accentLight: overrides.accentLight === 'none' ? '' : 'none' })}
            title={overrides.accentLight === 'none' ? 'Re-enable glow' : 'Disable glow (transparent)'}
            style={{ width: 18, height: 22, borderRadius: 3, border: '1px solid #555', background: overrides.accentLight === 'none' ? '#3a3a3a' : 'transparent', color: '#bbb', fontSize: '0.6rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >∅</button>
        </ColorField>
      )}
    </div>
  );

  return (
    <PageContainer>
      <Header>
        <Title>Cover Generator</Title>
        <Subtitle>Create stunning 3D cryptocurrency cover images</Subtitle>
      </Header>

      <MainGrid>
        <div>
          <Card>
            <CardTitle>Networks / Companies (up to 8)</CardTitle>
            
            {networkInput && (
              <LogoPreview>
                <img
                  src={`${API_BASE}/api/cover-generator/logo-preview/${networkInput.toUpperCase()}`}
                  alt={networkInput}
                  onError={(e) => { e.target.style.display = 'none'; }}
                  onLoad={(e) => { e.target.style.display = 'block'; }}
                />
                <div className="logo-info">
                  <div className="logo-name">
                    {(() => {
                      const found = networks.find(n => n.symbol === networkInput) || companies.find(c => c.symbol === networkInput);
                      return found ? found.name : networkInput;
                    })()}
                  </div>
                  <div className="logo-symbol">{networkInput.toUpperCase()}</div>
                </div>
                {logoSlots.length > 0 && (
                  <RemoveLogoBtn onClick={() => { setNetworkInput(''); setSelectedNetwork(''); setSelectedCompany(''); }}>x</RemoveLogoBtn>
                )}
              </LogoPreview>
            )}

            <InputSection>
              <label htmlFor="networkInput">{logoSlots.length > 0 ? 'Logo 1:' : 'Type name or select below:'}</label>
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
            </InputSection>

            <InlineDropdownRow>
              <SmallSelect value={selectedNetwork} onChange={handleNetworkSelect}>
                <option value="">-- Network --</option>
                {networks.map(n => (
                  <option key={n.symbol} value={n.symbol}>
                    {n.name} ({n.symbol})
                  </option>
                ))}
              </SmallSelect>
              <SmallSelect value={selectedCompany} onChange={handleCompanySelect}>
                <option value="">-- Company --</option>
                {companies.map(c => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name}
                  </option>
                ))}
              </SmallSelect>
            </InlineDropdownRow>
            {networkInput && renderLogoOverrides(primaryLogoOverrides, setPrimaryLogoOverrides)}

            {logoSlots.map((logo, idx) => {
              const slotSymbol = (logo.input || logo.network || logo.company).trim();
              return (
                <div key={idx} style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '0.25rem' }}>Logo {idx + 2}:</div>
                  {slotSymbol && (
                    <LogoPreview style={{ padding: '0.5rem', marginBottom: '0.5rem' }}>
                      <img
                        src={`${API_BASE}/api/cover-generator/logo-preview/${slotSymbol.toUpperCase()}`}
                        alt={slotSymbol}
                        style={{ width: 32, height: 32 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        onLoad={(e) => { e.target.style.display = 'block'; }}
                      />
                      <div className="logo-info">
                        <div className="logo-name" style={{ fontSize: '0.85rem' }}>
                          {(() => {
                            const found = networks.find(n => n.symbol === slotSymbol) || companies.find(c => c.symbol === slotSymbol);
                            return found ? found.name : slotSymbol;
                          })()}
                        </div>
                        <div className="logo-symbol" style={{ fontSize: '0.7rem' }}>{slotSymbol.toUpperCase()}</div>
                      </div>
                    </LogoPreview>
                  )}
                  <LogoSlotRow>
                    <SmallSelect
                      value={logo.network}
                      onChange={(e) => handleLogoSlotChange(idx, 'network', e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Network --</option>
                      {networks.map(n => (
                        <option key={n.symbol} value={n.symbol}>{n.name}</option>
                      ))}
                    </SmallSelect>
                    <SmallSelect
                      value={logo.company}
                      onChange={(e) => handleLogoSlotChange(idx, 'company', e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Company --</option>
                      {companies.map(c => (
                        <option key={c.symbol} value={c.symbol}>{c.name}</option>
                      ))}
                    </SmallSelect>
                    <RemoveLogoBtn onClick={() => handleRemoveLogoSlot(idx)}>x</RemoveLogoBtn>
                  </LogoSlotRow>
                  {slotSymbol && renderLogoOverrides(
                    { material: logo.material || 'default', baseColor: logo.baseColor || '', accentLight: logo.accentLight || '' },
                    (updated) => handleLogoSlotChange(idx, '_overrides', updated)
                  )}
                </div>
              );
            })}

            {(logoSlots.length + 1) < 8 && (
              <AddLogoButton onClick={handleAddLogoSlot}>
                + Add Another Logo ({logoSlots.length + 1}/8)
              </AddLogoButton>
            )}

            {isAdmin && (
              <AdminSection>
                <AdminTitle>Admin: Upload New Logo</AdminTitle>
                <UploadRow>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    style={{ fontSize: '0.8rem', color: '#8b949e' }}
                  />
                </UploadRow>
                <UploadRow>
                  <SmallInput
                    placeholder="SYM"
                    value={uploadSymbol}
                    onChange={(e) => setUploadSymbol(e.target.value)}
                    width="70px"
                  />
                  <SmallInput
                    placeholder="Name"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    width="120px"
                  />
                  <TypeToggle
                    active={uploadType === 'network'}
                    onClick={() => setUploadType('network')}
                  >
                    Network
                  </TypeToggle>
                  <TypeToggle
                    active={uploadType === 'company'}
                    onClick={() => setUploadType('company')}
                  >
                    Company
                  </TypeToggle>
                </UploadRow>
                <UploadRow>
                  <TypeToggle
                    active={uploadVariant === 'mark'}
                    onClick={() => setUploadVariant('mark')}
                  >
                    Logo Mark
                  </TypeToggle>
                  <TypeToggle
                    active={uploadVariant === 'full'}
                    onClick={() => setUploadVariant('full')}
                  >
                    Full Logo (text)
                  </TypeToggle>
                  <span style={{ fontSize: '0.7rem', color: '#6e7681' }}>
                    {uploadVariant === 'full' ? 'Wordmark with text' : 'Symbol/icon only'}
                  </span>
                </UploadRow>
                <UploadButton onClick={handleUploadLogo} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </UploadButton>
              </AdminSection>
            )}

            <InputSection style={{ marginTop: '1.5rem' }}>
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

            <RefSection>
              <RefHeader type="button" onClick={() => setRefSectionOpen(o => !o)}>
                <span>
                  {refSectionOpen ? '▾' : '▸'} Reference Image + Prompt {refImageUrls.length > 0 ? `• ${refImageUrls.length} ready` : '(optional)'}
                  <RefCountBadge>up to {MAX_REF_IMAGES}</RefCountBadge>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {refImageUrls.length > 0 ? 'overrides style template' : ''}
                </span>
              </RefHeader>
              <RefBody $open={refSectionOpen}>
                <RefHint style={{ marginBottom: '0.5rem' }}>
                  Upload up to {MAX_REF_IMAGES} reference images (drag-and-drop or click) and/or add a custom prompt. When any reference image is uploaded the named style template is bypassed but your color selectors still apply. The custom prompt is always appended to the final generation prompt.
                </RefHint>
                <RefModeRow>
                  <RefModeChip
                    type="button"
                    $active={refMode === 'style_reference'}
                    onClick={() => setRefMode('style_reference')}
                    title="Mimic the references' aesthetic only — ignore their subjects/composition"
                  >Style Reference</RefModeChip>
                  <RefModeChip
                    type="button"
                    $active={refMode === 'composition_restyle'}
                    onClick={() => setRefMode('composition_restyle')}
                    title="Keep the references' layout/composition but restyle materials and lighting"
                  >Composition Restyle</RefModeChip>
                </RefModeRow>

                <RefDropZone
                  htmlFor="ref-multi-file-input"
                  $dragActive={refDragActive}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setRefDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setRefDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setRefDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRefDragActive(false);
                    if (e.dataTransfer?.files?.length) {
                      handleRefFilesUpload(e.dataTransfer.files);
                    }
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                    {refDragActive ? 'Drop images to upload' : 'Drag & drop images here'}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    or click to browse (PNG / JPEG, multi-select OK) — {refImageUrls.length}/{MAX_REF_IMAGES} used
                  </div>
                </RefDropZone>
                <RefFileInput
                  id="ref-multi-file-input"
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleRefFilesUpload(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                {refUploading && <RefHint>Uploading reference image(s)…</RefHint>}
                {refImageUrls.length > 0 && (
                  <>
                    <RefThumbGrid>
                      {refImageUrls.map((url, idx) => (
                        <RefThumbCell key={`${url}-${idx}`}>
                          <img src={url} alt={`Reference ${idx + 1}`} />
                          <RefThumbRemove
                            type="button"
                            title="Remove this reference"
                            onClick={() => setRefImageUrls(prev => prev.filter((_, i) => i !== idx))}
                          >×</RefThumbRemove>
                        </RefThumbCell>
                      ))}
                    </RefThumbGrid>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <RefClearBtn type="button" onClick={() => setRefImageUrls([])}>
                        remove all references
                      </RefClearBtn>
                    </div>
                  </>
                )}
                <RefPromptTextarea
                  placeholder='Optional custom prompt e.g. "make the background pure black", "add subtle gold rim light", "remove all secondary objects"…'
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                />
                <RefHint>
                  This text is appended verbatim to the generation prompt and takes priority for any conflict. Works with or without reference images.
                </RefHint>
              </RefBody>
            </RefSection>

            <StyleSection>
              <DropdownLabel>Choose a Style</DropdownLabel>
              {categories.length > 0 && (
                <CategoryFilters>
                  <CategoryChip
                    active={activeCategory === 'all'}
                    onClick={() => setActiveCategory('all')}
                  >
                    All
                  </CategoryChip>
                  {categories.map(cat => (
                    <CategoryChip
                      key={cat.id}
                      active={activeCategory === cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {cat.name}
                    </CategoryChip>
                  ))}
                </CategoryFilters>
              )}
              {filteredStyles.length > 0 ? (
                <StyleGrid>
                  {filteredStyles.map(style => (
                    <StyleThumb
                      key={style.id}
                      selected={selectedStyle === style.id}
                      onClick={() => {
                        if (selectedStyle === style.id) {
                          setSelectedStyle(null);
                          setBgColor(''); setElementColor(''); setAccentLightColor(''); setLightingColor('');
                        } else {
                          setSelectedStyle(style.id);
                          if (style.defaultColors) {
                            setBgColor(style.defaultColors.bgColor || '');
                            setElementColor(style.defaultColors.elementColor || '');
                            setAccentLightColor(style.defaultColors.accentLightColor || '');
                            setLightingColor(style.defaultColors.lightingColor || '');
                          }
                        }
                      }}
                      title={style.description}
                    >
                      <img
                        src={style.sampleImageUrl}
                        alt={style.name}
                        onError={(e) => {
                          if (e.target.src !== style.sampleImageUrl) {
                            e.target.src = style.sampleImageUrl;
                          }
                        }}
                      />
                      <StyleLabel>{style.name}</StyleLabel>
                    </StyleThumb>
                  ))}
                </StyleGrid>
              ) : (
                <NoStyleNote>No style selected - will use random composition</NoStyleNote>
              )}

              {selectedStyle && (() => {
                const activeStyle = styles.find(s => s.id === selectedStyle);
                const subjectConfig = activeStyle?.customSubject;
                return (
                <>
                  {subjectConfig?.enabled && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '0.25rem' }}>3D Elements Override</div>
                      <TextInput
                        type="text"
                        placeholder={subjectConfig.placeholder || 'e.g., rockets, skyscrapers...'}
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        style={{ fontSize: '0.9rem', padding: '0.65rem' }}
                      />
                      <div style={{ fontSize: '0.7rem', color: '#6e7681', marginTop: '0.25rem' }}>
                        Default: {subjectConfig.defaultSubject} — type to replace with custom 3D elements
                      </div>
                    </div>
                  )}
                  {activeStyle?.patternOptions?.enabled && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '0.25rem' }}>Pattern Style</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {activeStyle.patternOptions.patterns.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPatternId(p.id === (patternId || activeStyle.patternOptions.defaultPattern) ? '' : p.id)}
                            style={{
                              padding: '0.4rem 0.7rem',
                              borderRadius: '8px',
                              border: `1px solid ${(patternId || activeStyle.patternOptions.defaultPattern) === p.id ? '#00d4ff' : '#1a1a1a'}`,
                              background: (patternId || activeStyle.patternOptions.defaultPattern) === p.id ? 'rgba(0, 212, 255, 0.15)' : '#0a0a0a',
                              color: (patternId || activeStyle.patternOptions.defaultPattern) === p.id ? '#00d4ff' : '#e6edf3',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#6e7681', marginTop: '0.25rem' }}>
                        {(activeStyle.patternOptions.patterns.find(p => p.id === (patternId || activeStyle.patternOptions.defaultPattern)))?.description || ''}
                      </div>
                      {(patternId || activeStyle.patternOptions.defaultPattern) !== 'none' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#8b949e' }}>Pattern Color</span>
                          <ColorInput
                            type="color"
                            value={patternColor || activeStyle.patternOptions.defaultColor}
                            onChange={(e) => setPatternColor(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '0.75rem', marginBottom: '0.15rem' }}>Scene Colors <span style={{ fontSize: '0.65rem', color: '#6e7681' }}>(does not affect logo — use logo dropdown above)</span></div>
                  <ColorRow>
                    <ColorField>
                      <label>BG</label>
                      <ColorInput
                        type="color"
                        value={bgColor || '#0a0a0a'}
                        onChange={(e) => setBgColor(e.target.value)}
                      />
                      <span style={{ fontSize: '0.55rem', color: '#6e7681' }}>Background</span>
                    </ColorField>
                    <ColorField>
                      <label>Elements</label>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <ColorInput
                          type="color"
                          value={elementColor || '#dbff03'}
                          onChange={(e) => setElementColor(e.target.value)}
                        />
                        {elementColor2 ? (
                          <div style={{ position: 'relative' }}>
                            <ColorInput
                              type="color"
                              value={elementColor2}
                              onChange={(e) => setElementColor2(e.target.value)}
                            />
                            <span onClick={() => setElementColor2('')} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#333', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa' }}>×</span>
                          </div>
                        ) : (
                          <button onClick={() => setElementColor2('#1a1a2e')} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed #444', background: 'transparent', color: '#666', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.55rem', color: '#6e7681' }}>3D objects</span>
                    </ColorField>
                    <ColorField>
                      <label>Accent</label>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {accentLightColor === 'none' ? (
                          <button
                            type="button"
                            onClick={() => setAccentLightColor('')}
                            title="Click to re-enable accent/glow"
                            style={{ width: 32, height: 22, borderRadius: 3, border: '1px solid #555', background: 'repeating-linear-gradient(45deg,#222,#222 3px,#444 3px,#444 6px)', color: '#bbb', fontSize: '0.55rem', cursor: 'pointer', padding: 0 }}
                          >none</button>
                        ) : (
                          <ColorInput
                            type="color"
                            value={accentLightColor || '#8b5cf6'}
                            onChange={(e) => setAccentLightColor(e.target.value)}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setAccentLightColor(accentLightColor === 'none' ? '' : 'none')}
                          title={accentLightColor === 'none' ? 'Re-enable accent/glow' : 'Disable accent/glow (transparent)'}
                          style={{ width: 18, height: 22, borderRadius: 3, border: '1px solid #555', background: accentLightColor === 'none' ? '#3a3a3a' : 'transparent', color: '#bbb', fontSize: '0.6rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                        >∅</button>
                        {accentLightColor !== 'none' && (accentLightColor2 ? (
                          <div style={{ position: 'relative' }}>
                            <ColorInput
                              type="color"
                              value={accentLightColor2}
                              onChange={(e) => setAccentLightColor2(e.target.value)}
                            />
                            <span onClick={() => setAccentLightColor2('')} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#333', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa' }}>×</span>
                          </div>
                        ) : (
                          <button onClick={() => setAccentLightColor2('#00d4ff')} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed #444', background: 'transparent', color: '#666', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.55rem', color: '#6e7681' }}>Rim/glow · ∅ = off</span>
                    </ColorField>
                    <ColorField>
                      <label>Lighting</label>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <ColorInput
                          type="color"
                          value={lightingColor || '#6e3cbc'}
                          onChange={(e) => setLightingColor(e.target.value)}
                        />
                        {lightingColor2 ? (
                          <div style={{ position: 'relative' }}>
                            <ColorInput
                              type="color"
                              value={lightingColor2}
                              onChange={(e) => setLightingColor2(e.target.value)}
                            />
                            <span onClick={() => setLightingColor2('')} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#333', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa' }}>×</span>
                          </div>
                        ) : (
                          <button onClick={() => setLightingColor2('#ff6b35')} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed #444', background: 'transparent', color: '#666', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.55rem', color: '#6e7681' }}>Scene light</span>
                    </ColorField>
                  </ColorRow>
                  {(bgColor || elementColor || elementColor2 || accentLightColor || accentLightColor2 || lightingColor || lightingColor2 || patternId || patternColor) && (
                    <button
                      style={{
                        background: 'transparent',
                        border: '1px solid #1a1a1a',
                        borderRadius: '6px',
                        color: '#8b949e',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        marginTop: '0.5rem'
                      }}
                      onClick={() => {
                        setBgColor(''); setElementColor(''); setElementColor2(''); setAccentLightColor(''); setAccentLightColor2(''); setLightingColor(''); setLightingColor2('');
                        setPatternId(''); setPatternColor('');
                      }}
                    >
                      Reset Scene Colors
                    </button>
                  )}
                </>
                );
              })()}
            </StyleSection>

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: '#8b949e' }}>
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  style={{ accentColor: '#00d4ff' }}
                />
                Watermark
              </label>
            </div>
            <GenerateButton
              onClick={handleGenerate}
              disabled={(!networkInput.trim() && !selectedStyle && !(refImageUrl && customPromptText.trim())) || loading}
              loading={loading}
            >
              {loading ? (
                <>
                  <Spinner /> Generating (~45s)...
                </>
              ) : (
                <>{networkInput.trim() ? 'Generate Cover' : 'Generate Background'}</>
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
                  {currentMeta.settings && (
                    <ActionButton onClick={(e) => handleReuseStyle(e, { settings: currentMeta.settings })}>Reuse Style</ActionButton>
                  )}
                  <ActionButton onClick={handleGenerate} disabled={loading}>Regenerate</ActionButton>
                </ActionButtons>
              </GenerationInfo>
            )}

            {currentImage && !ratingSubmitted && (
              <RatingSection>
                <RatingTitle>Rate This Generation (1-10)</RatingTitle>
                
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
                  <label>Additional Feedback (optional):</label>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <NetworkTag>{item.network}</NetworkTag>
                        {item.saved && <SavedBadge>Saved</SavedBadge>}
                      </div>
                      {item.settings && (
                        <button
                          onClick={(e) => handleReuseStyle(e, item)}
                          style={{
                            marginTop: '0.3rem',
                            background: 'rgba(0, 212, 255, 0.15)',
                            border: '1px solid rgba(0, 212, 255, 0.4)',
                            borderRadius: '4px',
                            color: '#00d4ff',
                            fontSize: '0.65rem',
                            padding: '0.2rem 0.5rem',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'center',
                          }}
                        >
                          Reuse This Style
                        </button>
                      )}
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
