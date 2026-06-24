/** Accès lazy à Socket.IO (évite import circulaire index ↔ services). */
export function getSocketIo(): import('socket.io').Server | null {
  try {
    const { io } = require('../index.js') as { io?: import('socket.io').Server };
    return io ?? null;
  } catch {
    return null;
  }
}
