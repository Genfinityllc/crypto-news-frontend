import { useState, useEffect } from 'react';
import { getCryptoMarketData, getCryptoDropdownOptions } from '../services/api';

export function useCryptoMarket() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCryptos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCryptoMarketData();
      setCryptos(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching crypto market data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptos();
  }, []);

  return {
    cryptos,
    loading,
    error,
    refetch: fetchCryptos
  };
}

export function useCryptoDropdown() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCryptoDropdownOptions();
      setOptions(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching crypto dropdown options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  return {
    options,
    loading,
    error,
    refetch: fetchOptions
  };
}