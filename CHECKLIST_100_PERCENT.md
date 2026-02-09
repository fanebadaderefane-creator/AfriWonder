# ✅ CHECKLIST 100% PROPRE - AfriConnect

## 🎯 OBJECTIF : Projet 100% Fonctionnel et Propre

---

## ❌ CE QUI MANQUE ACTUELLEMENT

### 1. CONFIGURATION ENVIRONNEMENT (CRITIQUE) 🔴

#### Backend
```bash
❌ backend/.env n'existe pas
❌ DATABASE_URL non configuré
❌ JWT_SECRET non configuré
```

**Action** :
```bash
# Créer le fichier
node setup-env.js

# Ou manuellement :
cp backend/ENV_TEMPLATE.txt backend/.env

# Puis éditer backend/.env :
DATABASE_URL="postgresql://votre-url-supabase"
JWT_SECRET="votre-secret-genere"
```

#### Frontend
```bash
❌ .env.local n'existe pas
❌ VITE_API_URL non configuré
```

**Action** :
```bash
# Créer le fichier
node setup-env.js

# Ou manuellement :
cp env.local.CONFIGURER .env.local

# Vérifier que contient :
VITE_API_URL=http://localhost:3000/api
```

---

### 2. BASE DE DONNÉES (CRITIQUE) 🔴

```bash
❌ Prisma Client pas généré
❌ Migrations pas exécutées
❌ Tables pas créées dans Supabase
```

**Action** :
```bash
cd backend

# Générer Prisma Client
npm run db:generate

# Exécuter les migrations
npm run db:migrate
# Nom : "init" ou "complete_schema"

# Vérifier dans Supabase :
# → Tables doivent apparaître (37 tables)
```

---

### 3. PAGES FRONTEND (CRITIQUE) 🔴

```bash
❌ 70+ pages utilisent encore Base44
❌ Aucune page migrée vers Express API
```

**Pages Priority 1** (Doivent être migrées en premier) :

#### Pages Simples (1h chacune)
- [ ] `src/pages/Profile.jsx`
- [ ] `src/pages/VideoView.jsx`
- [ ] `src/pages/Marketplace.jsx`
- [ ] `src/pages/Product.jsx`
- [ ] `src/pages/Cart.jsx`
- [ ] `src/pages/Orders.jsx`
- [ ] `src/pages/Wallet.jsx`

#### Pages Moyennes (2h chacune)
- [ ] `src/pages/Checkout.jsx`
- [ ] `src/pages/Search.jsx`
- [ ] `src/pages/Discover.jsx`
- [ ] `src/pages/Create.jsx`

#### Pages Complexes (3-4h chacune)
- [ ] `src/pages/Home.jsx` (la plus complexe - ML recommendations)
- [ ] `src/pages/Lives.jsx`
- [ ] `src/pages/LiveStream.jsx`

**Action pour chaque page** :
```javascript
// 1. Ouvrir la page
// 2. Chercher : base44
// 3. Remplacer :

// AVANT
import { base44 } from '@/api/base44Client';
const data = await base44.entities.Video.list();

// APRÈS
import { api } from '@/api/expressClient';
const result = await api.videos.list();
const data = result.videos;
```

---

### 4. COMPOSANTS (MOYEN) 🟡

```bash
❌ Composants avec appels Base44
```

**Composants à migrer** :

- [ ] `src/components/marketplace/ReturnForm.jsx`
- [ ] `src/components/payment/StripeCheckout.jsx`
- [ ] `src/components/payment/OrangeMoneyIntegration.jsx`
- [ ] `src/components/video/VideoCard.jsx` (si appels API)
- [ ] `src/components/profile/ProfileHeader.jsx` (si appels API)

**Rechercher tous les composants** :
```bash
# Windows PowerShell
Get-ChildItem -Path src/components -Recurse -Filter *.jsx | Select-String -Pattern "base44" | Select-Object -Unique Path

# Résultat : Liste des fichiers à migrer
```

---

### 5. CLÉS API PAIEMENTS (IMPORTANT) 🟡

```bash
❌ Stripe : Clés non configurées
❌ Orange Money : Clés non configurées
```

**Action Stripe** :
1. Aller sur https://dashboard.stripe.com/test/apikeys
2. Copier :
   - Secret key (sk_test_...)
   - Publishable key (pk_test_...)
3. Ajouter dans `backend/.env` :
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. Ajouter dans `.env.local` :
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

**Action Orange Money** :
1. Contacter Orange Money Mali
2. Fournir :
   - MSISDN : 7701901162
   - Agent Code : 102782
3. Obtenir API_KEY
4. Ajouter dans `backend/.env` :
   ```env
   ORANGE_MONEY_API_KEY=votre_cle
   ORANGE_MONEY_CLIENT_ID=votre_client_id
   ORANGE_MONEY_CLIENT_SECRET=votre_secret
   ```

---

### 6. UPLOAD FICHIERS (MOYEN) 🟡

```bash
❌ AWS S3 ou Cloudflare R2 non configuré
❌ Upload d'images/vidéos ne marchera pas
```

**Option 1 : AWS S3**
```env
# backend/.env
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=africonnect-uploads
```

**Option 2 : Cloudflare R2** (moins cher)
```env
# backend/.env
R2_ACCOUNT_ID=votre_account_id
R2_ACCESS_KEY_ID=votre_access_key
R2_SECRET_ACCESS_KEY=votre_secret_key
R2_BUCKET_NAME=africonnect
```

**Option 3 : Temporaire - Stockage local** (dev seulement)
```javascript
// backend/src/routes/upload.routes.ts
// Modifier pour sauvegarder localement
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Sauvegarder le fichier
const fileName = `${Date.now()}-${req.file.originalname}`;
const filePath = path.join(uploadDir, fileName);
fs.writeFileSync(filePath, req.file.buffer);

const fileUrl = `http://localhost:3000/uploads/${fileName}`;
```

---

### 7. WEBSOCKET (OPTIONNEL) 🟢

```bash
⚠️ WebSocket utilise encore connexion séparée
```

**Action** :
```bash
npm install socket.io-client
```

```javascript
// src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function useSocket(userId) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('access_token'),
      },
    });

    socket.on('connect', () => {
      socket.emit('user:join', userId);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return socketRef.current;
}
```

---

### 8. TESTS (OPTIONNEL) 🟢

```bash
❌ Aucun test backend
⚠️ Tests frontend incomplets
```

**Action Backend** :
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Créer backend/src/__tests__/auth.test.ts
# Créer backend/src/__tests__/videos.test.ts
```

**Action Frontend** :
```bash
# Tests déjà configurés (Vitest)
npm run test
# Ajouter tests pour les nouvelles fonctionnalités
```

---

### 9. CODE CLEANUP (FAIBLE PRIORITÉ) 🟢

```bash
⚠️ Ancien code Base44 encore présent
```

**Après migration complète** :
```bash
# Supprimer les fichiers Base44 inutiles
rm src/api/base44Client.js
rm src/lib/app-params.js

# Désinstaller dépendances Base44
npm uninstall @base44/sdk @base44/vite-plugin

# Nettoyer package.json
```

---

## ✅ CHECKLIST COMPLÈTE ORDONNÉE

### PHASE 1 : Configuration (1 heure) 🔴 CRITIQUE

- [ ] 1.1 Créer `backend/.env` (5 min)
- [ ] 1.2 Configurer DATABASE_URL dans backend/.env (5 min)
- [ ] 1.3 Configurer JWT secrets (déjà générés) (1 min)
- [ ] 1.4 Créer `.env.local` (2 min)
- [ ] 1.5 Générer Prisma Client : `npm run db:generate` (5 min)
- [ ] 1.6 Migrer base de données : `npm run db:migrate` (10 min)
- [ ] 1.7 Démarrer backend : `npm run dev` (2 min)
- [ ] 1.8 Démarrer frontend : `npm run dev` (2 min)
- [ ] 1.9 Tester authentification (10 min)

### PHASE 2 : Migration Pages Essentielles (8-12 heures) 🔴 CRITIQUE

#### Jour 1 (4h)
- [ ] 2.1 Profile.jsx (1h)
- [ ] 2.2 VideoView.jsx (1h)
- [ ] 2.3 Marketplace.jsx (1h)
- [ ] 2.4 Product.jsx (1h)

#### Jour 2 (4h)
- [ ] 2.5 Cart.jsx (30min)
- [ ] 2.6 Checkout.jsx (1h30)
- [ ] 2.7 Orders.jsx (1h)
- [ ] 2.8 Wallet.jsx (1h)

#### Jour 3 (4h)
- [ ] 2.9 Search.jsx (1h)
- [ ] 2.10 Discover.jsx (1h)
- [ ] 2.11 Create.jsx (2h)

### PHASE 3 : Migration Pages Complexes (8-10 heures) 🟡 IMPORTANT

#### Jour 4-5
- [ ] 3.1 Home.jsx (4h) - La plus complexe
- [ ] 3.2 Lives.jsx (2h)
- [ ] 3.3 LiveStream.jsx (2h)
- [ ] 3.4 Autres pages (2h)

### PHASE 4 : Migration Composants (4 heures) 🟡 IMPORTANT

- [ ] 4.1 ReturnForm.jsx (30min)
- [ ] 4.2 StripeCheckout.jsx (1h)
- [ ] 4.3 OrangeMoneyIntegration.jsx (1h)
- [ ] 4.4 Autres composants (1h30)

### PHASE 5 : Configuration Paiements (2-4 heures) 🟡 IMPORTANT

- [ ] 5.1 Obtenir clés Stripe (30min)
- [ ] 5.2 Configurer Stripe (30min)
- [ ] 5.3 Tester Stripe mode test (30min)
- [ ] 5.4 Obtenir clés Orange Money (1-2h attente)
- [ ] 5.5 Configurer Orange Money (30min)
- [ ] 5.6 Tester Orange Money mode test (30min)

### PHASE 6 : Configuration Upload (2 heures) 🟡 IMPORTANT

- [ ] 6.1 Choisir solution (S3, R2, ou local) (30min)
- [ ] 6.2 Configurer clés API (30min)
- [ ] 6.3 Tester upload image (30min)
- [ ] 6.4 Tester upload vidéo (30min)

### PHASE 7 : Tests & Cleanup (4 heures) 🟢 OPTIONNEL

- [ ] 7.1 Tests end-to-end (2h)
- [ ] 7.2 Tests paiements (1h)
- [ ] 7.3 Cleanup code Base44 (30min)
- [ ] 7.4 Désinstaller dépendances (30min)

### PHASE 8 : WebSocket (2 heures) 🟢 OPTIONNEL

- [ ] 8.1 Installer socket.io-client (5min)
- [ ] 8.2 Créer hook useSocket (1h)
- [ ] 8.3 Migrer composants realtime (1h)

### PHASE 9 : Documentation (1 heure) 🟢 OPTIONNEL

- [ ] 9.1 Mettre à jour README (30min)
- [ ] 9.2 Documenter nouvelles API (30min)

---

## 📊 TEMPS TOTAL ESTIMÉ

| Phase | Temps | Priorité |
|-------|-------|----------|
| Configuration | 1h | 🔴 CRITIQUE |
| Pages Essentielles | 12h | 🔴 CRITIQUE |
| Pages Complexes | 10h | 🟡 IMPORTANT |
| Composants | 4h | 🟡 IMPORTANT |
| Paiements | 4h | 🟡 IMPORTANT |
| Upload | 2h | 🟡 IMPORTANT |
| Tests & Cleanup | 4h | 🟢 OPTIONNEL |
| WebSocket | 2h | 🟢 OPTIONNEL |
| Documentation | 1h | 🟢 OPTIONNEL |
| **TOTAL** | **40h** | |

**MVP (Minimum Viable)** : Phases 1-2 = 13h (1.5 jours)
**Production Ready** : Phases 1-6 = 33h (4-5 jours)
**100% Parfait** : Tout = 40h (5-6 jours)

---

## 🎯 PRIORITÉS POUR "100% PROPRE"

### Must-Have (Obligatoire pour fonctionner)
1. ✅ Backend infrastructure (FAIT)
2. ✅ Client API (FAIT)
3. ✅ AuthContext (FAIT)
4. ❌ Configuration .env (À FAIRE - 15 min)
5. ❌ Migration base de données (À FAIRE - 10 min)
6. ❌ Migration pages critiques (À FAIRE - 12h)

### Should-Have (Important pour production)
7. ❌ Clés API paiements (À FAIRE - 2-4h)
8. ❌ Configuration upload (À FAIRE - 2h)
9. ❌ Migration toutes pages (À FAIRE - 10h)
10. ❌ Migration composants (À FAIRE - 4h)

### Nice-to-Have (Amélioration)
11. Tests complets
12. WebSocket migré
13. Documentation à jour
14. Code cleanup

---

## 🚀 DÉMARRAGE RAPIDE (30 min)

Pour avoir un projet qui **démarre** :

```bash
# 1. Configuration (5 min)
node setup-env.js
# Éditer backend/.env → Ajouter DATABASE_URL

# 2. Base de données (5 min)
cd backend
npm run db:generate
npm run db:migrate

# 3. Démarrer (2 min)
npm run dev  # Backend (terminal 1)
cd .. && npm run dev  # Frontend (terminal 2)

# 4. Tester (5 min)
# Ouvrir http://localhost:5173
# Créer compte + Login

# ✅ SI ÇA MARCHE = BASE SOLIDE !
```

Ensuite : Migrer les pages une par une (12h total).

---

## 📝 RÉSUMÉ : CE QUI MANQUE

```
┌─────────────────────────────────────────────────┐
│  CE QUI MANQUE POUR 100% PROPRE                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔴 CRITIQUE (Bloquant)                         │
│  ❌ backend/.env                    (5 min)     │
│  ❌ .env.local                      (2 min)     │
│  ❌ DATABASE_URL configuré          (3 min)     │
│  ❌ Migrations DB exécutées         (10 min)    │
│  ❌ Pages frontend migrées          (12h)       │
│                                                 │
│  🟡 IMPORTANT (Production)                      │
│  ❌ Clés Stripe                     (2h)        │
│  ❌ Clés Orange Money               (2h)        │
│  ❌ Configuration upload            (2h)        │
│  ❌ Toutes pages migrées            (10h)       │
│  ❌ Composants migrés               (4h)        │
│                                                 │
│  🟢 OPTIONNEL (Nice-to-have)                    │
│  ⚠️  Tests backend                  (4h)        │
│  ⚠️  WebSocket migré                (2h)        │
│  ⚠️  Cleanup Base44                 (1h)        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pour "100% Propre" il faut** : 33-40h de travail

**Vous avez déjà fait** : ~10h (infrastructure)

**Il reste** : 23-30h (migration pages + config)

---

## ✅ PROCHAINE ACTION IMMÉDIATE

```bash
node setup-env.js
```

Puis suivre **PHASE 1** de cette checklist ! 🚀

