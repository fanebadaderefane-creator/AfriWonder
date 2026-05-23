import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function fixUnusedVars() {
  const files = await glob('src/**/*.{js,jsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/ui/**'],
    cwd: rootDir,
  });

  let totalFixed = 0;

  for (const file of files) {
    const filePath = join(rootDir, file);
    let content = readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Fix catch blocks: catch (e) -> catch (_e), catch (error) -> catch (_error)
    content = content.replace(/catch\s*\(\s*(\w+)\s*\)/g, (match, varName) => {
      if (varName !== '_error' && varName !== '_e' && varName !== '_err') {
        return match.replace(varName, `_${varName}`);
      }
      return match;
    });

    // Fix event handlers in catch that are unused: } catch (e) { -> } catch (_e) {
    // This is already handled above

    // Fix unused event parameters: (e) => { ... } where e is not used
    // We'll be conservative and only fix obvious cases where e is in catch
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      totalFixed++;
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\n✅ Total files fixed: ${totalFixed}`);
}

fixUnusedVars().catch(console.error);

