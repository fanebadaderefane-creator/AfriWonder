import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl, getSocketIoTransports } from '@/lib/getSocketBaseUrl';

const MessageSocketContext = createContext(null);

/**
 * Une seule connexion Socket.IO pour la messagerie (audit) : join utilisateur ici,
 * les conversations font join/leave sans recréer le client.
 */
export function MessageSocketProvider({ userId, children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) {
      setSocket(null);
      return undefined;
    }

    const base = getSocketBaseUrl();
    const s = io(base, {
      path: '/socket.io',
      transports: getSocketIoTransports(),
      withCredentials: true,
    });

    const onConnect = () => {
      s.emit('user:join', userId);
    };

    s.on('connect', onConnect);
    if (s.connected) onConnect();

    setSocket(s);

    return () => {
      s.off('connect', onConnect);
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
    };
  }, [userId]);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <MessageSocketContext.Provider value={value}>{children}</MessageSocketContext.Provider>
  );
}

export function useMessageSocketContext() {
  return useContext(MessageSocketContext);
}
