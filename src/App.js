import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styled, { createGlobalStyle } from 'styled-components';

import { AuthProvider } from './contexts/AuthContext';
import { NewsPreloadProvider } from './contexts/NewsPreloadContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navigation from './components/common/Navigation';

// Pages
import Dashboard from './pages/Dashboard';
import AllNews from './pages/AllNews';
import ClientNews from './pages/ClientNews';
import CoverGenerator from './pages/CoverGenerator';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import ProfileManager from './components/auth/ProfileManager';
import Bookmarks from './pages/Bookmarks';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #1a1a1a;
    color: #f0f0f0;
    min-height: 100vh;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  a {
    color: #00aaff;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
`;

const Footer = styled.footer`
  background: #202020;
  border-top: 1px solid #333;
  padding: 2rem;
  text-align: center;
  color: #888;
  margin-top: auto;
  font-family: Arial, Helvetica, sans-serif;

  p {
    margin: 0;
  }

  a {
    color: #00aaff;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

function App() {
  return (
    <Router>
      <AuthProvider>
        <NewsPreloadProvider>
        <GlobalStyle />
        <AppContainer>
          <Navigation />
          <MainContent>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignupForm />} />
              
                {/* Cover Generator - Always accessible (landing page) */}
                <Route path="/" element={<CoverGenerator />} />
                <Route path="/cover-generator" element={<CoverGenerator />} />
                
                {/* Protected routes - only visible when logged in */}
                <Route 
                  path="/all" 
                  element={
                    <ProtectedRoute>
                      <AllNews />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/clients" 
                  element={
                    <ProtectedRoute>
                      <ClientNews />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/clients/:client" 
                  element={
                    <ProtectedRoute>
                      <ClientNews />
                    </ProtectedRoute>
                  } 
                />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfileManager />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bookmarks" 
                element={
                  <ProtectedRoute>
                    <Bookmarks />
                  </ProtectedRoute>
                } 
              />
              
                {/* Redirect unknown routes to landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainContent>
          
          <Footer>
            <p>
              Crypto News Curator &copy; 2024 | 
              Powered by <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase</a> & 
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>
            </p>
          </Footer>
        </AppContainer>
        
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        </NewsPreloadProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
