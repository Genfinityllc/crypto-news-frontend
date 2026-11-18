import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientNews } from '../services/api';

// Client News: the clients and their articles, from the server's one client
// list (backend src/data/clients.js). The site holds no client list of its
// own any more: who the clients are, their logos, their counts and their
// articles all come from this one request, so they always agree.
//
// Every article carries `clients` (the ids of the clients it names), so one
// request serves "All clients" and each client's own filter.

const REFRESH_MS = 5 * 60 * 1000;

export function useClientNews() {
  const [clients, setClients] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const response = await getClientNews();
      if (!alive.current) return;
      setClients(response.clients || []);
      setArticles(response.data || []);
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      setError((e && e.message) || 'Client news could not be loaded.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  // articles for one client id, or all of them
  const forClient = useCallback(
    (id) => (!id || id === 'all' ? articles : articles.filter((a) => (a.clients || []).includes(id))),
    [articles]
  );

  return { clients, articles, forClient, loading, error, refresh };
}
