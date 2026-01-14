import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/api';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const API_BASE = 'https://crypto-news-curator-backend-production.up.railway.app';

const ProfileContainer = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Title = styled.h2`
  color: white;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: white;
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #333;
`;

const Card = styled.div`
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #333;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: #ccc;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a2a;
  color: white;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
  }

  &:disabled {
    background: #333;
    color: #888;
  }
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a2a;
  color: white;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
  }

  option {
    background: #2a2a2a;
    color: white;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 6px;
  border: 1px solid #444;
  max-height: 300px;
  overflow-y: auto;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ccc;
  cursor: pointer;

  input[type="checkbox"] {
    margin: 0;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  background: ${props => props.secondary ? 'transparent' : '#0066cc'};
  color: white;
  border: ${props => props.secondary ? '1px solid #444' : 'none'};
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.secondary ? '#333' : '#0052a3'};
  }

  &:disabled {
    background: #444;
    cursor: not-allowed;
  }
`;

const UserInfo = styled.div`
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #444;
  margin-bottom: 1rem;

  h3 {
    color: white;
    margin: 0 0 0.5rem 0;
  }

  p {
    color: #ccc;
    margin: 0.25rem 0;
  }
`;

const GenerationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const GenerationItem = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #2a2a2a;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 102, 204, 0.3);
  }
  
  img {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
  }
`;

const GenerationOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NetworkTag = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #0066cc;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
`;

const DownloadBtn = styled.button`
  padding: 0.25rem 0.5rem;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const ImageModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  
  img {
    max-width: 90%;
    max-height: 70vh;
    border-radius: 8px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ModalButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.primary ? `
    background: #0066cc;
    border: none;
    color: white;
    &:hover { background: #0052a3; }
  ` : `
    background: transparent;
    border: 1px solid #666;
    color: white;
    &:hover { background: rgba(255,255,255,0.1); }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #888;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid #ff4444;
  color: #ff6666;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  color: #4ade80;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

export default function ProfileManager() {
  const { currentUser, userProfile, refreshProfile, changePassword } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
        categories: ['breaking', 'market']
      },
      favoriteNetworks: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || '',
        displayName: userProfile.displayName || '',
        preferences: {
          theme: userProfile.preferences?.theme || 'dark',
          notifications: {
            email: userProfile.preferences?.notifications?.email ?? true,
            push: userProfile.preferences?.notifications?.push ?? false,
            categories: userProfile.preferences?.notifications?.categories || ['breaking', 'market']
          },
          favoriteNetworks: userProfile.preferences?.favoriteNetworks || []
        }
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (currentUser) {
      fetchUserGenerations();
    }
  }, [currentUser]);

  const fetchUserGenerations = async () => {
    try {
      // Get fresh token
      const freshToken = await currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', freshToken);
      
      const response = await fetch(`${API_BASE}/api/cover-generator/my-covers`, {
        headers: {
          'Authorization': `Bearer ${freshToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Normalize the image URL field (API returns image_url, we use imageUrl)
          const normalized = (data.covers || []).map(cover => ({
            ...cover,
            imageUrl: cover.image_url || cover.imageUrl
          }));
          setGenerations(normalized);
        }
      }
    } catch (error) {
      console.error('Failed to fetch generations:', error);
    } finally {
      setLoadingGenerations(false);
    }
  };

  const handleImageClick = (gen) => {
    setSelectedImage(gen);
  };

  const handleDownload = (imageUrl, network) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${network || 'cover'}-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('notifications.')) {
      const notificationKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          notifications: {
            ...prev.preferences.notifications,
            [notificationKey]: type === 'checkbox' ? checked : value
          }
        }
      }));
    } else if (name === 'theme') {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          theme: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => {
      const categories = prev.preferences.notifications.categories;
      const updatedCategories = categories.includes(category)
        ? categories.filter(c => c !== category)
        : [...categories, category];
      
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          notifications: {
            ...prev.preferences.notifications,
            categories: updatedCategories
          }
        }
      };
    });
  };

  const handleNetworkChange = (network) => {
    setFormData(prev => {
      const networks = prev.preferences.favoriteNetworks;
      const updatedNetworks = networks.includes(network)
        ? networks.filter(n => n !== network)
        : [...networks, network];
      
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          favoriteNetworks: updatedNetworks
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await updateUserProfile(formData);
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else {
        setPasswordError(error.message || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!currentUser) {
    return <div>Please sign in to view your profile.</div>;
  }

  return (
    <ProfileContainer>
      <Title>User Profile</Title>
      
      {/* Account Information */}
      <Card>
      <UserInfo>
        <h3>Account Information</h3>
        <p><strong>Email:</strong> {currentUser.email}</p>
        <p><strong>Email Verified:</strong> {currentUser.emailVerified ? 'Yes' : 'No'}</p>
        <p><strong>Account Created:</strong> {new Date(currentUser.metadata.creationTime).toLocaleDateString()}</p>
      </UserInfo>

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            value={formData.displayName}
            onChange={handleChange}
            placeholder="Your display name"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Your username"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="theme">Theme</Label>
          <Select
            id="theme"
            name="theme"
            value={formData.preferences.theme}
            onChange={handleChange}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </Select>
        </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </Form>
      </Card>

      {/* Password Change Section */}
      <SectionTitle>Change Password</SectionTitle>
      <Card>
        {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
        {passwordSuccess && <SuccessMessage>{passwordSuccess}</SuccessMessage>}
        
        <Form onSubmit={handlePasswordSubmit}>
          <FormGroup>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              autoComplete="new-password"
            />
          </FormGroup>

        <FormGroup>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </FormGroup>

          <Button type="submit" disabled={passwordLoading}>
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </Form>
      </Card>

      {/* Cover Generations Section */}
      <SectionTitle>My Cover Generations</SectionTitle>
      <Card>
        {loadingGenerations ? (
          <EmptyState>Loading generations...</EmptyState>
        ) : generations.length === 0 ? (
          <EmptyState>
            <p>No saved cover generations yet.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Generate covers from the Cover Generator page and they'll appear here.
            </p>
          </EmptyState>
        ) : (
          <>
            <p style={{ color: '#888', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Click any image to view full size and download. {generations.length} cover{generations.length !== 1 ? 's' : ''} saved.
            </p>
            <GenerationsGrid>
              {generations.map((gen, index) => (
                <GenerationItem key={gen.id || index} onClick={() => handleImageClick(gen)}>
                  <img 
                    src={gen.imageUrl} 
                    alt={gen.network || 'Cover'} 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <GenerationOverlay>
                    <NetworkTag>{gen.network || 'Cover'}</NetworkTag>
                    <DownloadBtn onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(gen.imageUrl, gen.network);
                    }}>
                      Download
                    </DownloadBtn>
                  </GenerationOverlay>
                </GenerationItem>
              ))}
            </GenerationsGrid>
          </>
        )}
      </Card>

      {/* Full Image Modal */}
      {selectedImage && (
        <ImageModal onClick={closeModal}>
          <img 
            src={selectedImage.imageUrl} 
            alt={selectedImage.network || 'Cover'} 
            onClick={(e) => e.stopPropagation()}
          />
          <ModalActions onClick={(e) => e.stopPropagation()}>
            <ModalButton primary onClick={() => handleDownload(selectedImage.imageUrl, selectedImage.network)}>
              Download Image
            </ModalButton>
            <ModalButton onClick={closeModal}>
              Close
            </ModalButton>
          </ModalActions>
          <p style={{ color: '#888', marginTop: '1rem', fontSize: '0.9rem' }}>
            {selectedImage.network} • {selectedImage.created_at ? new Date(selectedImage.created_at).toLocaleDateString() : 'Recently created'}
          </p>
        </ImageModal>
      )}

      {/* Notification Preferences */}
      <SectionTitle>Notification Preferences</SectionTitle>
      <Card>
        <Form onSubmit={handleSubmit}>
          <CheckboxGroup>
            <CheckboxItem>
              <input
                type="checkbox"
                name="notifications.email"
                checked={formData.preferences.notifications.email}
                onChange={handleChange}
              />
              Email Notifications
            </CheckboxItem>
            <CheckboxItem>
              <input
                type="checkbox"
                name="notifications.push"
                checked={formData.preferences.notifications.push}
                onChange={handleChange}
              />
              Push Notifications
            </CheckboxItem>
          </CheckboxGroup>

        <FormGroup>
          <Label>Notification Categories</Label>
          <CheckboxGroup>
            {['breaking', 'market', 'technology', 'regulation', 'analysis'].map(category => (
              <CheckboxItem key={category}>
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications.categories.includes(category)}
                  onChange={() => handleCategoryChange(category)}
                />
                {category.charAt(0).toUpperCase() + category.slice(1)} News
              </CheckboxItem>
            ))}
          </CheckboxGroup>
        </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Preferences'}
          </Button>
        </Form>
      </Card>

      {/* Favorite Networks */}
      <SectionTitle>Favorite Networks</SectionTitle>
      <Card>
        <Form onSubmit={handleSubmit}>
          <CheckboxGroup>
            {/* Client Networks - Priority */}
            <CheckboxItem style={{ backgroundColor: '#1f2937', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#22d3ee', fontSize: '0.9rem' }}>CLIENT NETWORKS</strong>
            </CheckboxItem>
            {['XRP', 'XDC Network', 'Hedera', 'Constellation', 'Algorand'].map(network => (
              <CheckboxItem key={network}>
                <input
                  type="checkbox"
                  checked={formData.preferences.favoriteNetworks.includes(network)}
                  onChange={() => handleNetworkChange(network)}
                />
                <span style={{ fontWeight: '500', color: '#22d3ee' }}>{network}</span>
              </CheckboxItem>
            ))}
            
            {/* Popular Networks */}
            <CheckboxItem style={{ backgroundColor: '#1f2937', padding: '0.5rem', borderRadius: '4px', margin: '1rem 0 0.5rem 0' }}>
              <strong style={{ color: '#fbbf24', fontSize: '0.9rem' }}>POPULAR NETWORKS</strong>
            </CheckboxItem>
            {[
              'Bitcoin', 'Ethereum', 'BNB', 'Solana', 'Cardano', 'Dogecoin', 'Avalanche', 'Polygon', 
              'Chainlink', 'Toncoin', 'Shiba Inu', 'Polkadot', 'Bitcoin Cash', 'TRON', 'Near Protocol', 
              'Uniswap', 'Litecoin', 'Pepe', 'Kaspa', 'Aptos', 'Stellar', 'Cronos', 'Arbitrum',
              'VeChain', 'Filecoin', 'Cosmos', 'Maker', 'Optimism', 'Injective', 'Render',
              'Sei', 'Theta Network', 'Immutable', 'Fantom', 'The Graph', 'Aave', 'Bonk', 
              'Flow', 'MultiversX', 'Arweave', 'Flare', 'Sandbox', 'Quant', 'Sui', 'Mina'
            ].map(network => (
              <CheckboxItem key={network}>
                <input
                  type="checkbox"
                  checked={formData.preferences.favoriteNetworks.includes(network)}
                  onChange={() => handleNetworkChange(network)}
                />
                {network}
              </CheckboxItem>
            ))}
          </CheckboxGroup>

        <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Networks'}
        </Button>
      </Form>
      </Card>
    </ProfileContainer>
  );
}
