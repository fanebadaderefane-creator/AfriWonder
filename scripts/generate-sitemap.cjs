#!/usr/bin/env node
/**
 * Génère public/sitemap.xml à partir des fichiers src/pages/*.{jsx,js}
 * (hors tests). Ajoute des alias SEO courants (/blog, /articles, etc.).
 *
 * SITE_URL=https://votre-domaine.com node scripts/generate-sitemap.cjs
 */
const fs = require('fs');
const path = require('path');

const SITE = (process.env.SITE_URL || 'https://afriwonder.com').replace(/\/$/, '');
const pagesDir = path.join(process.cwd(), 'src', 'pages');

const skipFile = (name) =>
  /\.test\.(jsx|js)$/i.test(name) ||
  /^Offline\.test\./i.test(name) ||
  name.startsWith('__');

function collectPageNames() {
  if (!fs.existsSync(pagesDir)) {
    console.warn('Dossier pages absent:', pagesDir);
    return [];
  }
  const names = new Set();
  for (const f of fs.readdirSync(pagesDir)) {
    if (!/\.(jsx|js)$/i.test(f)) continue;
    if (skipFile(f)) continue;
    const base = f.replace(/\.(jsx|js)$/i, '');
    names.add(base);
  }
  return [...names].sort();
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const pageNames = collectPageNames();

/** @type {{ loc: string, changefreq: string, priority: string }[]} */
const entries = [];

entries.push({ loc: `${SITE}/`, changefreq: 'hourly', priority: '1.0' });

const seoAliases = [
  { path: '/blog', changefreq: 'daily', priority: '0.85' },
  { path: '/articles', changefreq: 'daily', priority: '0.85' },
  { path: '/dashboard', changefreq: 'weekly', priority: '0.75' },
  { path: '/features', changefreq: 'weekly', priority: '0.7' },
];

for (const a of seoAliases) {
  entries.push({ loc: `${SITE}${a.path}`, changefreq: a.changefreq, priority: a.priority });
}

const highPriority = new Set(['Home', 'Landing', 'Marketplace', 'Discover', 'News', 'FeedPosts', 'Create', 'Lives']);

for (const name of pageNames) {
  const changefreq = highPriority.has(name) ? 'daily' : 'weekly';
  const priority = highPriority.has(name) ? '0.9' : '0.65';
  entries.push({ loc: `${SITE}/${name}`, changefreq, priority });
}

const seen = new Set();
const unique = entries.filter((e) => {
  if (seen.has(e.loc)) return false;
  seen.add(e.loc);
  return true;
});

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

for (const u of unique) {
  xml += `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>
`;
}

xml += '</urlset>\n';

const outFile = path.join(process.cwd(), 'public', 'sitemap.xml');
fs.writeFileSync(outFile, xml, 'utf8');
console.log(`sitemap.xml → ${unique.length} URL(s) écrites dans ${outFile}`);
