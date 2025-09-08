import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: white;
`;

const Spinner = styled.div`
  border: 4px solid #333;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default function ProtectedRoute({ children, requireProfile = false }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute render:', { 
    currentUser: !!currentUser, 
    loading, 
    pathname: location.pathname 
  });

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
      </LoadingContainer>
    );
  }

  if (!currentUser) {
    console.log('ProtectedRoute: No currentUser, redirecting to login');
    // Don't redirect if we're already on login page
    if (location.pathname === '/login') {
      return children;
    }
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireProfile && !userProfile) {
    // Redirect to profile setup if profile is required but doesn't exist
    return <Navigate to="/setup-profile" state={{ from: location }} replace />;
  }

  return children;
}