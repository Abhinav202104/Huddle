import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import api, { SERVER_URL } from '../services/api.js';

const SocketContext = createContext({ socket: null, status: 'connecting', error: '' });

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return undefined;
    }
    const s = io(SERVER_URL || undefined, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      // Called on every (re)connect: asks the REST API (which already works) for a fresh token.
      auth: (cb) => {
        api.get('/auth/socket-token')
          .then((r) => cb({ token: r.data.token }))
          .catch(() => cb({}));
      },
    });
    let retried = false;
    setStatus('connecting');
    s.on('connect', () => { retried = false; setStatus('connected'); setError(''); });
    s.on('disconnect', () => setStatus('disconnected'));
    s.on('connect_error', async (err) => {
      setStatus('disconnected');
      setError(err.message);
      // Expired access token: refresh the cookies once, then reconnect.
      if (err.message === 'unauthorized' && !retried) {
        retried = true;
        try {
          await api.post('/auth/refresh');
          s.connect();
        } catch { /* signed out */ }
      }
    });
    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  return <SocketContext.Provider value={{ socket, status, error }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
