# 📦 DÉPENDANCES REQUISES - SYSTÈME LÉGAL & SÉCURITÉ

## Installation

```bash
cd backend
npm install speakeasy
```

## Dépendances utilisées

### 🔐 Sécurité & 2FA

#### **speakeasy** (TOTP pour 2FA)
```bash
npm install speakeasy
```
- Génération de secrets TOTP
- Vérification codes Google Authenticator
- Codes de backup

**Utilisation dans:**
- `src/services/privacy.service.ts` (enable2FA, verify2FA)

---

### ✅ Dépendances déjà installées

Ces dépendances sont normalement déjà présentes dans votre projet :

#### **@prisma/client**
- ORM pour base de données
- Déjà installé ✓

#### **bcryptjs**
- Hash des mots de passe
- Utilisé dans disable2FA
- Déjà installé ✓

#### **crypto** (Node.js built-in)
- Génération tokens
- Génération backup codes
- Natif Node.js ✓

#### **axios** (frontend)
- Client HTTP
- Déjà installé ✓

---

## Vérification des dépendances

### Backend
Vérifiez votre `package.json`:

```json
{
  "dependencies": {
    "@prisma/client": "^5.x.x",
    "bcryptjs": "^2.4.3",
    "express": "^4.x.x",
    "speakeasy": "^2.0.0"
  }
}
```

### Frontend
Vérifiez votre `package.json`:

```json
{
  "dependencies": {
    "react": "^18.x.x",
    "react-router-dom": "^6.x.x",
    "axios": "^1.x.x",
    "lucide-react": "^0.x.x"
  }
}
```

---

## Installation complète

Si vous partez de zéro:

### Backend
```bash
cd backend

# Dépendances principales
npm install express cors helmet express-rate-limit
npm install @prisma/client
npm install prisma --save-dev

# Sécurité
npm install bcryptjs
npm install jsonwebtoken
npm install speakeasy

# Développement
npm install typescript ts-node @types/node @types/express --save-dev
npm install nodemon --save-dev
```

### Frontend
```bash
# Dépendances principales
npm install react react-dom react-router-dom
npm install axios

# UI
npm install lucide-react
npm install @radix-ui/react-toast
npm install class-variance-authority clsx tailwind-merge

# Développement
npm install vite @vitejs/plugin-react --save-dev
```

---

## Optionnel (mais recommandé)

### Pour emails (notifications)
```bash
cd backend
npm install nodemailer
npm install @types/nodemailer --save-dev
```

### Pour QR codes (si vous voulez les générer côté serveur)
```bash
cd backend
npm install qrcode
npm install @types/qrcode --save-dev
```

### Pour géolocalisation IP
```bash
cd backend
npm install maxmind
# OU
npm install geoip-lite
```

---

## Scripts de vérification

### Vérifier que tout est installé (backend)
```bash
cd backend
npm list speakeasy
npm list bcryptjs
npm list @prisma/client
```

### Vérifier que tout est installé (frontend)
```bash
npm list axios
npm list react-router-dom
npm list lucide-react
```

---

## En cas d'erreur

### "Module not found: speakeasy"
```bash
cd backend
npm install speakeasy
npm run build
```

### "Cannot find module '@prisma/client'"
```bash
cd backend
npx prisma generate
```

### "Module not found: axios"
```bash
npm install axios
```

---

## Version minimales requises

- **Node.js:** >= 18.0.0
- **npm:** >= 9.0.0
- **PostgreSQL:** >= 14.0

Vérifiez vos versions:
```bash
node --version
npm --version
psql --version
```

---

## Package.json minimal backend

Créez ou mettez à jour `backend/package.json`:

```json
{
  "name": "africonnect-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.8.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "speakeasy": "^2.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.6",
    "nodemon": "^3.0.2",
    "prisma": "^5.8.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

---

## 🚀 Installation rapide tout-en-un

Copiez-collez dans votre terminal:

```bash
# Backend
cd backend
npm install speakeasy bcryptjs @prisma/client
npx prisma generate

# Frontend (depuis la racine)
cd ..
npm install axios

# Vérification
echo "✅ Installation terminée!"
echo "Backend dépendances:"
cd backend && npm list speakeasy bcryptjs
echo ""
echo "Frontend dépendances:"
cd .. && npm list axios
```

---

## Résolution de problèmes

### Erreur TypeScript "Cannot find module"
```bash
cd backend
npm install --save-dev @types/speakeasy
```

### Erreur Prisma "Schema not found"
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### Cache npm corrompu
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

**✅ Après installation, vous êtes prêt à exécuter le système légal !**

Suivez le guide: `LEGAL_SYSTEM_QUICKSTART.md`
