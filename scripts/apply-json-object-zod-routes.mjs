#!/usr/bin/env node
/**
 * Ajoute validateBody(jsonObjectBodySchema) sur les routes router.post|put|patch
 * qui n’en ont pas encore (fichiers backend/src/routes/*.ts).
 *
 * Exclut : upload/cloud (multer), et routes dont le path contient "webhook" (corps brut Buffer).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../backend/src/routes');
const SKIP_FILES = new Set(['upload.routes.ts', 'cloud.routes.ts']);

function addImports(content) {
  const jImport = "import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';";
  if (content.includes("from '../schemas/jsonObjectBody.js'")) {
    return content;
  }
  if (content.includes("from '../utils/zodValidation.js'")) {
    return content.replace(
      /(from '\.\.\/utils\/zodValidation\.js';)/,
      `$1\n${jImport}`
    );
  }

  const vImport = "import { validateBody } from '../utils/zodValidation.js';";
  const anchor = content.indexOf('const router = Router()');
  if (anchor === -1) return content;
  return content.slice(0, anchor) + vImport + '\n' + jImport + '\n\n' + content.slice(anchor);
}

function shouldSkipLine(line) {
  if (!/router\.(post|put|patch)\(/.test(line)) return true;
  if (/validateBody\(/.test(line)) return true;
  if (/upload\.|\.single\(|\.array\(|multer/.test(line)) return true;
  if (!/async\s*\(req/.test(line)) return true;
  // Webhooks paiements / autres : corps possible Buffer (express.raw)
  if (/'[^']*webhook[^']*'/.test(line)) return true;
  if (/`[^`]*webhook[^`]*`/.test(line)) return true;
  return false;
}

function processLine(line) {
  if (shouldSkipLine(line)) return line;
  if (/, validateBody\(jsonObjectBodySchema\), async \(req/.test(line)) return line;
  return line.replace(/,\s*async\s*\(req/, ', validateBody(jsonObjectBodySchema), async (req');
}

function processFile(filePath) {
  const base = path.basename(filePath);
  if (SKIP_FILES.has(base)) return false;

  let c = fs.readFileSync(filePath, 'utf8');
  if (!/router\.(post|put|patch)\(/.test(c)) return false;

  const lines = c.split('\n');
  const next = lines.map(processLine).join('\n');
  if (next === c) return false;

  fs.writeFileSync(filePath, addImports(next));
  return true;
}

const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));
let n = 0;
for (const f of files) {
  if (processFile(path.join(routesDir, f))) {
    console.log('updated', f);
    n++;
  }
}
console.log(`Done. ${n} file(s) modified.`);
