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

const PasswordHelp = styled.div`
  font-size: 12px;
  color: #888;
  margin-top: -0.5rem;
`;

export default function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const { signup, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) clearError();
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signup(
        formData.email,
        formData.password,
        formData.displayName,
        formData.username || formData.displayName
      );
      toast.success('Account created successfully! Please check your email to verify your account.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>Create Account</Title>
      
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      <Form onSubmit={handleSubmit}>
        <Input
          type="text"
          name="displayName"
          placeholder="Full Name *"
          value={formData.displayName}
          onChange={handleChange}
          required
          autoComplete="name"
        />
        
        <Input
          type="text"
          name="username"
          placeholder="Username (optional)"
          value={formData.username}
          onChange={handleChange}
          autoComplete="username"
        />
        
        <Input
          type="email"
          name="email"
          placeholder="Email *"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
        
        <Input
          type="password"
          name="password"
          placeholder="Password *"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />
        <PasswordHelp>Password must be at least 6 characters long</PasswordHelp>
        
        <Input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password *"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </Form>

      <LinkText>
        Already have an account? <Link to="/login">Sign in here</Link>
      </LinkText>
    </FormContainer>
  );
}