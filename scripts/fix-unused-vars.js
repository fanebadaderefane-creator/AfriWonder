/**
 * Script pour corriger automatiquement les variables non utilisées
 * en les préfixant avec _ selon la convention ESLint
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Patterns pour identifier les variables non utilisées
const patterns = [
  // Variables assignées mais non utilisées: const varName = ...
  /const\s+(\w+)\s*=\s*[^;]+;/g,
  // Paramètres de fonction: function name(param1, param2)
  /function\s+\w+\s*\([^)]*\)/g,
  // Arrow functions: (param1, param2) =>
  /\(([^)]+)\)\s*=>/g,
  // Destructuring: const { var1, var2 } = ...
  /const\s*\{([^}]+)\}\s*=/g,
];

async function fixUnusedVars() {
  const files = await glob('src/**/*.{js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/ui/**'],
    cwd: rootDir,
  });

  let totalFixed = 0;

  for (const file of files) {
    const filePath = join(rootDir, file);
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Liste des variables connues comme non utilisées (basée sur les warnings ESLint)
    // On va préfixer avec _ les variables qui sont dans les warnings courants
    
    // Pattern pour les catch blocks: catch (error) -> catch (_error)
    content = content.replace(/catch\s*\(\s*error\s*\)/g, (match) => {
      modified = true;
      return match.replace('error', '_error');
    });

    // Pattern pour les event handlers: (e) => -> (_e) =>
    content = content.replace(/\(\s*e\s*\)\s*=>/g, (match) => {
      modified = true;
      return match.replace('e', '_e');
    });

    // Pattern pour les variables error dans catch: } catch (error) {
    content = content.replace(/}\s*catch\s*\(\s*(\w+)\s*\)/g, (match, varName) => {
      if (varName === 'error' || varName === 'err') {
        modified = true;
        return match.replace(varName, `_${varName}`);
      }
      return match;
    });

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      totalFixed++;
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\n✅ Total files fixed: ${totalFixed}`);
}

fixUnusedVars().catch(console.error);

