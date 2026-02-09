import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const replacements = [
  // Auth redirects
  { from: /base44\.auth\.redirectToLogin\(\)/g, to: "window.location.href = '/'" },
  { from: /base44\.auth\.logout\(\)/g, to: 'api.auth.logout()' },
  
  // Entities - Replace with proper API calls or comments
  { from: /await base44\.entities\.(\w+)\.filter\([^)]*\)/g, to: 'await api.entities.$1.list()  // TODO: Adapt params' },
  { from: /base44\.entities\.(\w+)\.filter\([^)]*\)/g, to: 'api.entities.$1.list()  // TODO: Adapt params' },
  { from: /base44\.entities\.(\w+)\.list\([^)]*\)/g, to: 'api.entities.$1.list()  // TODO: Adapt params' },
  { from: /base44\.entities\.(\w+)\.create\(/g, to: 'api.entities.$1.create(' },
  { from: /base44\.entities\.(\w+)\.update\(/g, to: 'api.entities.$1.update(' },
  { from: /base44\.entities\.(\w+)\.delete\(/g, to: 'api.entities.$1.delete(' },
  { from: /base44\.entities\.(\w+)\.getById\(/g, to: 'api.entities.$1.getById(' },
  
  // Integrations
  { from: /base44\.integrations\.Core\.UploadFile\(/g, to: 'api.upload.file(' },
  
  // SDK references
  { from: /from '@base44\/sdk'/g, to: "// Base44 SDK removed" },
];

function cleanFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;
  let count = 0;

  replacements.forEach(({ from, to }) => {
    const before = content;
    content = content.replace(from, to);
    if (content !== before) {
      modified = true;
      count++;
    }
  });

  if (modified) {
    fs.writeFileSync(filepath, content);
    return count;
  }
  return 0;
}

function cleanDirectory(dir, prefix = '') {
  let total = 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });

  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.includes('node_modules')) {
      total += cleanDirectory(fullPath, prefix + item.name + '/');
    } else if (item.name.endsWith('.jsx') || item.name.endsWith('.js')) {
      const count = cleanFile(fullPath);
      if (count > 0) {
        console.log(`✅ ${prefix}${item.name}`);
        total += count;
      }
    }
  });

  return total;
}

console.log('🧹 Nettoyage complet des références Base44...\n');

const total = cleanDirectory(path.join(__dirname, 'src'));

console.log(`\n✅ ${total} patterns nettoyés\n`);

