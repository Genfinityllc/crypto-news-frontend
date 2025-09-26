import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const Nav = styled.nav`
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  
  @media (max-width: 768px) {
    padding: 1rem 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem 0.75rem;
  }
`;

const NavContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    text-decoration: none;
    color: #0066cc;
  }
`;

// eslint-disable-next-line no-unused-vars
const LogoIcon = styled.span`
  font-size: 1.75rem;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 768px) {
    display: ${props => props.isOpen ? 'flex' : 'none'};
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #1a1a1a;
    border-top: 1px solid #333;
    flex-direction: column;
    padding: 1rem 2rem;
    gap: 1rem;
  }
`;

const NavLink = styled(Link)`
  color: ${props => props.isActive ? '#0066cc' : '#ccc'};
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 0;
  border-bottom: 2px solid ${props => props.isActive ? '#0066cc' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    color: #0066cc;
    text-decoration: none;
  }

  @media (max-width: 768px) {
    border-bottom: none;
    padding: 0.75rem 0;
    width: 100%;
    text-align: center;
  }
`;

const UserMenu = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const UserAvatar = styled.button`
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background: #0052a3;
  }
`;

const UserName = styled.span`
  color: #ccc;
  font-weight: 500;
`;

const AuthButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const AuthButton = styled(Link)`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s;
  
  ${props => props.primary ? `
    background: #0066cc;
    color: white;
    
    &:hover {
      background: #0052a3;
      text-decoration: none;
    }
  ` : `
    background: transparent;
    color: #ccc;
    border: 1px solid #444;
    
    &:hover {
      color: white;
      border-color: #666;
      text-decoration: none;
    }
  `}

  @media (max-width: 768px) {
    width: 100%;
    padding: 0.75rem 1rem;
  }
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: white;
    border-color: #666;
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 0.75rem 1rem;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;

  @media (max-width: 768px) {
    display: block;
  }
`;

export default function Navigation() {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
      setMobileMenuOpen(false);
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const getUserInitials = () => {
    const name = userProfile?.displayName || currentUser?.displayName || currentUser?.email;
    if (!name) return 'U';
    
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Nav>
      <NavContainer>
        <Logo to="/" onClick={closeMobileMenu}>
          CryptoCurator
        </Logo>

        <MobileMenuButton onClick={toggleMobileMenu}>
          ☰
        </MobileMenuButton>

        <NavLinks isOpen={mobileMenuOpen}>
          <NavLink 
            to="/all" 
            isActive={location.pathname === '/' || location.pathname === '/all'}
            onClick={closeMobileMenu}
          >
            🌐 All News
          </NavLink>
          
          <NavLink 
            to="/clients" 
            isActive={location.pathname.startsWith('/clients')}
            onClick={closeMobileMenu}
          >
            🏢 Client News
          </NavLink>
          
          <NavLink 
            to="/dashboard" 
            isActive={location.pathname === '/dashboard'}
            onClick={closeMobileMenu}
          >
            📊 Dashboard
          </NavLink>
          
          {currentUser && (
            <>
              <NavLink 
                to="/bookmarks" 
                isActive={location.pathname === '/bookmarks'}
                onClick={closeMobileMenu}
              >
                🔖 Bookmarks
              </NavLink>
              <NavLink 
                to="/profile" 
                isActive={location.pathname === '/profile'}
                onClick={closeMobileMenu}
              >
                👤 Profile
              </NavLink>
            </>
          )}
        </NavLinks>

        <UserMenu>
          {currentUser ? (
            <>
              <UserName>
                {userProfile?.displayName || currentUser.displayName || 'User'}
              </UserName>
              <UserAvatar title="User Menu">
                {getUserInitials()}
              </UserAvatar>
              <LogoutButton onClick={handleLogout}>
                Logout
              </LogoutButton>
            </>
          ) : (
            <AuthButtons>
              <AuthButton to="/login" onClick={closeMobileMenu}>
                Sign In
              </AuthButton>
              <AuthButton to="/signup" primary="true" onClick={closeMobileMenu}>
                Sign Up
              </AuthButton>
            </AuthButtons>
          )}
        </UserMenu>
      </NavContainer>
    </Nav>
  );
}