import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const allowed = new Set(['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'SECURITY.md']);

const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
const rootMarkdown = entries
  .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
  .map((e) => e.name);

const disallowed = rootMarkdown.filter((name) => !allowed.has(name));

if (disallowed.length > 0) {
  console.error('Root markdown files not allowed (move to docs/):');
  for (const name of disallowed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('Root markdown policy OK.');

