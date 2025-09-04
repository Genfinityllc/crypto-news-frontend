import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/api';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const ProfileContainer = styled.div`
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #333;
`;

const Title = styled.h2`
  color: white;
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
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #0052a3;
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

export default function ProfileManager() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
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

  if (!currentUser) {
    return <div>Please sign in to view your profile.</div>;
  }

  return (
    <ProfileContainer>
      <Title>User Profile</Title>
      
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

        <FormGroup>
          <Label>Notification Preferences</Label>
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
        </FormGroup>

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

        <FormGroup>
          <Label>Favorite Networks</Label>
          <CheckboxGroup>
            {['Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Polygon', 'Chainlink'].map(network => (
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
        </FormGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </Button>
      </Form>
    </ProfileContainer>
  );
}