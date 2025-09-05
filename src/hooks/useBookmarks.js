import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBookmarks } from '../services/api';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const fetchBookmarks = async () => {
    if (!currentUser) {
      setBookmarks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getBookmarks();
      setBookmarks(response.bookmarks || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch bookmarks');
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [currentUser, fetchBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    refetch: fetchBookmarks
  };
}