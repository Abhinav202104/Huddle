import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { SERVER_URL } from '../services/api.js';

// Open /diagnose to see exactly which layer of the real-time connection is failing.
export default function Diagnose() {
  const [lines, setLines] = useState([]);
  const log = (t) => setLines((l) => [...l, t]);

  useEffect(() => {
    let socket;
    let timer;
    (async () => {
      log(`Page address: ${window.location.origin}`);
      log(`API address: ${SERVER_URL || window.location.origin} (${SERVER_URL ? 'from VITE_SERVER_URL' : 'same origin'})`);

      const health = async (label) => {
        try {
          const r = await api.get('/health');
          log(`${label}: OK, server reports sockets = ${r.data.sockets ?? 'field missing (old server code)'}`);
        } catch (e) {
          log(`${label}: FAILED (${e.response?.status || e.message})`);
        }
      };
      await health('1. Server health');

      try {
        const r = await api.get('/auth/me');
        log(`2. Logged in: YES as ${r.data.user.name}`);
      } catch (e) {
        log(`2. Logged in: NO (status ${e.response?.status || e.message}). Sign in first, then reopen /diagnose.`);
        return;
      }

      let token;
      try {
        token = (await api.get('/auth/socket-token')).data.token;
        log(`3. Socket token: received (${token.length} characters)`);
      } catch (e) {
        log(`3. Socket token: FAILED (status ${e.response?.status || e.message}). Server code is probably outdated.`);
        return;
      }

      log('4. Connecting socket...');
      socket = io(SERVER_URL || undefined, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socket.on('connect', () => {
        log(`4. Socket: CONNECTED using ${socket.io.engine.transport.name}`);
        setTimeout(() => health('5. Health after connecting'), 500);
      });
      socket.on('connect_error', (e) => log(`4. Socket: ERROR "${e.message}"`));
      timer = setTimeout(() => {
        if (!socket.connected) log('4. Socket: still not connected after 10 seconds');
      }, 10000);
    })();
    return () => {
      clearTimeout(timer);
      socket?.disconnect();
    };
  }, []);

  return (
    <pre style={{ padding: 24, whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.7 }}>
      {'Huddle connection check\n\n' + lines.join('\n')}
    </pre>
  );
}
