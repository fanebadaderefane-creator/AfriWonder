import { io } from 'socket.io-client';

const STREAM_ID = process.argv[2] || 'test-stream';
const VIEWER_COUNT = Number.parseInt(process.argv[3] || '100', 10);
const BASE_URL = (process.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

console.log(`\nTest de charge: ${VIEWER_COUNT} viewers sur le live ${STREAM_ID}`);
console.log(`Serveur: ${BASE_URL}\n`);

const stats = {
  connected: 0,
  disconnected: 0,
  errors: 0,
  messages: 0,
  startTime: Date.now(),
};

const sockets = [];

for (let i = 0; i < VIEWER_COUNT; i += 1) {
  setTimeout(() => {
    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
    });

    socket.on('connect', () => {
      stats.connected += 1;
      socket.emit('live:join-room', STREAM_ID);
      if (stats.connected % 50 === 0) {
        console.log(`${stats.connected}/${VIEWER_COUNT} viewers connectés`);
      }
    });

    socket.on('live:chat', () => {
      stats.messages += 1;
    });

    socket.on('live:viewers', (data) => {
      if (stats.connected === VIEWER_COUNT) {
        process.stdout.write(`\rViewers serveur: ${data.count} | Messages reçus: ${stats.messages}`);
      }
    });

    socket.on('disconnect', () => {
      stats.disconnected += 1;
    });

    socket.on('connect_error', (err) => {
      stats.errors += 1;
      if (stats.errors <= 5) {
        console.error(`Erreur connexion: ${err.message}`);
      }
    });

    sockets.push(socket);
  }, i * 20);
}

setTimeout(() => {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('\n\n=== RAPPORT FINAL ===');
  console.log(`Durée du test : ${elapsed}s`);
  console.log(`Viewers connectés : ${stats.connected}/${VIEWER_COUNT}`);
  console.log(`Viewers déconnectés : ${stats.disconnected}`);
  console.log(`Erreurs : ${stats.errors}`);
  console.log(`Messages chat reçus : ${stats.messages}`);
  console.log(`Taux succès : ${((stats.connected / VIEWER_COUNT) * 100).toFixed(1)}%`);

  if (stats.connected / VIEWER_COUNT >= 0.99) {
    console.log('\nPASS — Le serveur tient la charge');
  } else if (stats.connected / VIEWER_COUNT >= 0.95) {
    console.log('\nWARN — Quelques pertes, optimiser Redis Adapter');
  } else {
    console.log('\nFAIL — Augmenter les ressources serveur ou activer Redis Cluster');
  }

  sockets.forEach((socket) => socket.disconnect());
  process.exit(0);
}, 60_000);
