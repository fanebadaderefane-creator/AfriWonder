import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

for (const name of ['client.js', 'index.js']) {
  const content = fs.readFileSync(path.join(srcDir, name), 'utf8');
  fs.writeFileSync(path.join(distDir, name), content, 'utf8');
}

console.log('Build done: dist/client.js, dist/index.js (ESM)');