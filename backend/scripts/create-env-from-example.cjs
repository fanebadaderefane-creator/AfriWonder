const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const examplePath = path.join(root, '.env.example');
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  console.log('backend/.env existe deja. On ne l\'ecrase pas. Supprimez-le manuellement si vous voulez le recree.');
  process.exit(0);
}

let example = fs.readFileSync(examplePath, 'utf8');
const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefresh = crypto.randomBytes(32).toString('hex');

example = example.replace(/^JWT_SECRET=.*/m, 'JWT_SECRET="' + jwtSecret + '"');
example = example.replace(/^JWT_REFRESH_SECRET=.*/m, 'JWT_REFRESH_SECRET="' + jwtRefresh + '"');

fs.writeFileSync(envPath, example);
console.log('backend/.env cree avec JWT_SECRET et JWT_REFRESH_SECRET generes.');
console.log('Renseignez DATABASE_URL dans backend/.env (votre URL PostgreSQL).');
