import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function signup(email, password, displayName, username) {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(result.user, {
        displayName: displayName
      });

      // Create profile in Firestore
      const profileData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        username: username || displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'profiles', result.user.uid), profileData);
      setUserProfile(profileData);
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  async function signin(email, password) {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Set currentUser immediately to prevent race condition
      setCurrentUser(result.user);
      
      // Get fresh token and store it
      const token = await result.user.getIdToken();
      localStorage.setItem('firebaseToken', token);
      
      // Fetch profile from Firestore
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', result.user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        } else {
          console.warn('Profile not found, user may need to complete registration');
          setUserProfile(null);
        }
      } catch (profileError) {
        console.warn('Error fetching profile:', profileError);
        setUserProfile(null);
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      setError(null);
      await signOut(auth);
      setUserProfile(null);
      localStorage.removeItem('firebaseToken');
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  async function refreshProfile() {
    if (currentUser) {
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Get fresh token and store it
        const token = await user.getIdToken();
        localStorage.setItem('firebaseToken', token);
        
        // Fetch user profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data());
          } else {
            console.warn('Profile not found');
            setUserProfile(null);
          }
        } catch (error) {
          console.warn('Error fetching profile:', error);
          setUserProfile(null);
        }
      } else {
        localStorage.removeItem('firebaseToken');
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signup,
    signin,
    logout,
    refreshProfile,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}