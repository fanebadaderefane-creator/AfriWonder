#!/usr/bin/env node
/**
 * Répare les imports après apply-json-object-zod-routes.mjs (bug addImports si schéma déjà dans le fichier).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../backend/src/routes');

const V = "import { validateBody } from '../utils/zodValidation.js';";
const J = "import { jsonObjectBodySchema } from '../schemas/jsonObjectBody.js';";

function fixFile(p) {
  let s = fs.readFileSync(p, 'utf8');
  const usesValidate = /validateBody\(/.test(s);
  const usesJson = s.includes('jsonObjectBodySchema');
  if (!usesValidate && !usesJson) return false;

  const hasV = s.includes("from '../utils/zodValidation.js'");
  const hasJ = s.includes("from '../schemas/jsonObjectBody.js'");
  let changed = false;

  if (usesValidate && !hasV) {
    const anchor = s.indexOf('const router = Router()');
    if (anchor === -1) return false;
    s = s.slice(0, anchor) + V + '\n' + (usesJson && !hasJ ? J + '\n' : '') + '\n' + s.slice(anchor);
    changed = true;
  }

  if (usesJson && !s.includes("from '../schemas/jsonObjectBody.js'")) {
    const re = /(from '\.\.\/utils\/zodValidation\.js';)/;
    if (re.test(s)) {
      s = s.replace(re, `$1\n${J}`);
      changed = true;
    } else if (!changed) {
      const anchor = s.indexOf('const router = Router()');
      if (anchor === -1) return false;
      s = s.slice(0, anchor) + J + '\n\n' + s.slice(anchor);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(p, s);
    return true;
  }
  return false;
}

let n = 0;
for (const f of fs.readdirSync(routesDir)) {
  if (!f.endsWith('.ts')) continue;
  if (fixFile(path.join(routesDir, f))) {
    console.log('fixed', f);
    n++;
  }
}
console.log(`Done. ${n} file(s).`);
