import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const FormContainer = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #333;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
`;

const Button = styled.button`
  padding: 12px;
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

const Title = styled.h2`
  color: white;
  text-align: center;
  margin-bottom: 1.5rem;
`;

const LinkText = styled.p`
  color: #ccc;
  text-align: center;
  margin-top: 1rem;

  a {
    color: #0066cc;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  background: #ff4444;
  color: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { signin, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signin(formData.email, formData.password);
      toast.success('Successfully signed in!');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>Sign In</Title>
      
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      <Form onSubmit={handleSubmit}>
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
        
        <Input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </Form>

      <LinkText>
        Don't have an account? <Link to="/signup">Sign up here</Link>
      </LinkText>
    </FormContainer>
  );
}