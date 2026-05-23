import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');
const port = 8080;

// Détecter l'adresse IP locale
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

// Servir les fichiers
const server = createServer((req, res) => {
  let filePath;
  
  // Déterminer le dossier source (dist en priorité, sinon public)
  const sourceDir = existsSync(distDir) ? distDir : publicDir;
  
  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(__dirname, '..', 'index.html');
  } else if (req.url.startsWith('/assets/')) {
    filePath = path.join(distDir, req.url);
  } else {
    // Chercher dans public ou dist
    filePath = path.join(sourceDir, req.url.replace(/^\//, ''));
    
    // Si pas trouvé, essayer dans public
    if (!existsSync(filePath)) {
      filePath = path.join(publicDir, req.url.replace(/^\//, ''));
    }
  }
  
  // Déterminer le type MIME
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.css': 'text/css',
    '.xml': 'application/xml'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(500);
      res.end('Erreur serveur');
    }
  } else {
    res.writeHead(404);
    res.end('Fichier non trouvé');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('\n🚀 SERVEUR DE TEST PWA DÉMARRÉ\n');
  console.log('='.repeat(60));
  console.log(`📱 Accès local:    http://localhost:${port}`);
  console.log(`📱 Accès réseau:   http://${localIP}:${port}`);
  console.log('='.repeat(60));
  console.log('\n📋 Instructions pour tester:');
  console.log('\n1️⃣  Sur votre téléphone Android:');
  console.log('   - Ouvrez Chrome');
  console.log('   - Allez sur: http://' + localIP + ':' + port);
  console.log('   - Menu (⋮) → "Installer l\'application"');
  console.log('\n2️⃣  Sur votre iPhone/iPad:');
  console.log('   - Ouvrez Safari');
  console.log('   - Allez sur: http://' + localIP + ':' + port);
  console.log('   - Partager (□↑) → "Sur l\'écran d\'accueil"');
  console.log('\n3️⃣  Vérifications dans DevTools (F12):');
  console.log('   - Application → Manifest (vérifier les erreurs)');
  console.log('   - Application → Service Workers (vérifier l\'enregistrement)');
  console.log('   - Application → Storage (vérifier le cache)');
  console.log('\n⚠️  Appuyez sur Ctrl+C pour arrêter le serveur\n');
});

