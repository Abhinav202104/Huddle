import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import api, { SERVER_URL } from '../services/api.js';

const SocketContext = createContext({ socket: null });

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return undefined;
    }
    const s = io(SERVER_URL || undefined, { withCredentials: true });
    let retried = false;
    s.on('connect', () => { retried = false; });
    // Expired access token: refresh the cookies once, then reconnect.
    s.on('connect_error', async (err) => {
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

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
