# Guide de vérification et tests — AfriWonder

Ce document permet de **vérifier et tester** toutes les fonctionnalités implémentées (CDC).

---

## 1. Prérequis

- **Backend** : démarré sur le port 3000 (`cd backend && npm run dev`)
- **Frontend PWA** : démarré sur le port 5173 (`npm run dev`) — le proxy doit pointer vers `http://localhost:3000`
- **Base de données** : migrations appliquées (`cd backend && npx prisma migrate deploy` ou `npm run db:migrate`)
- **Variables d’environnement** : `.env` dans `backend/` (DATABASE_URL, JWT_SECRET, etc.) et éventuellement `.env` à la racine pour Vite

---

## 2. Vérification automatique (routes et pages CDC)

Depuis la **racine du projet** :

```bash
node scripts/verify-cdc-functionality.cjs
```

- Vérifie que les **routes backend** (auth, videos, feed, messages, search, etc.) existent.
- Vérifie que les **pages frontend** (Home, Search, Inbox, GroupChat, etc.) sont déclarées et présentes.
- Affiche un résumé en % et quitte avec code 1 si des éléments manquent.

---

## 3. Tests unitaires / intégration backend

```bash
cd backend
npm test
```

Pour un sous-ensemble de tests (ex. smoke) :

```bash
cd backend
npm run test:smoke
```

---

## 4. Checklist manuelle — fonctionnalités clés

Cocher au fur et à mesure en testant dans le navigateur (PWA) ou l’app mobile.

### Authentification
- [ ] **Inscription** : créer un compte
- [ ] **Connexion** : se connecter (email / mot de passe)
- [ ] **Déconnexion** : se déconnecter
- [ ] **Profil** : voir et modifier son profil

### Feed et vidéos
- [ ] **Home** : feed vertical type TikTok, défilement
- [ ] **Lecture vidéo** : lecture, pause, son, like
- [ ] **Recherche** : barre de recherche → résultats (vidéos, utilisateurs, produits) — **recherche globale**
- [ ] **Création** : upload d’une vidéo (Create)

### Messagerie
- [ ] **Inbox** : liste des conversations 1:1
- [ ] **Chat 1:1** : ouvrir une conversation, envoyer un message
- [ ] **Groupes** : section « Groupes » dans Inbox
- [ ] **Créer un groupe** : bouton « Créer un groupe », nom + membres → groupe créé
- [ ] **Chat groupe** : ouvrir un groupe, envoyer des messages

### Paiements et wallet
- [ ] **Wallet** : page Mon Wallet, solde
- [ ] **Recharge** : flux de recharge (Orange Money / Stripe selon config)

### Marketplace
- [ ] **Catalogue** : liste des produits
- [ ] **Panier** : ajouter au panier, voir le panier
- [ ] **Commande** : passer une commande (test)

### Mini-apps et développeur
- [ ] **Store mini-apps** : liste des mini-apps
- [ ] **Portail développeur** : accès au dashboard développeur (si compte dev)

### Internationalisation (i18n)
- [ ] **Changer de langue** : sélecteur de langue (fr, en, ar, pt, bm) — textes mis à jour

### Observabilité et santé
- [ ] **Health** : `curl http://localhost:3000/health` → `{"status":"ok",...}`
- [ ] **Ready** : `curl http://localhost:3000/health/ready` → DB connectée
- [ ] **Métriques Prometheus** : `curl http://localhost:3000/metrics` → texte type Prometheus (ou 401 si HEALTH_API_KEY requis)

### Transcodage vidéo (optionnel)
- [ ] **Enqueue** : en tant que créateur, `POST /api/videos/:id/transcode` (ou bouton dédié si ajouté)
- [ ] **Statut** : `GET /api/videos/:id/transcode/status` → pending / processing / completed
- [ ] **Worker** : `cd backend && npm run transcode:one` (avec FFmpeg installé) pour traiter un job

---

## 5. Tests API rapides (curl)

Backend sur `http://localhost:3000` :

```bash
# Santé
curl -s http://localhost:3000/health | jq .

# Readiness (DB)
curl -s http://localhost:3000/health/ready | jq .

# Recherche globale (sans auth)
curl -s "http://localhost:3000/api/search?q=test&type=all&limit=5" | jq .

# Connexion (remplacer email/password)
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"votre@email.com","password":"votremotdepasse"}' | jq .
```

Après connexion, utiliser le `accessToken` dans `Authorization: Bearer <token>` pour les routes protégées (messages, groupes, etc.).

---

## 6. Mobile (Expo)

- Démarrer : `cd flutter_app && flutter run`
- Configurer `EXPO_PUBLIC_API_URL` (ex. `http://localhost:3000` ou l’IP de la machine pour appareil réel)
- Tester : Inbox, Groupes, Créer un groupe, GroupChat, Search, lecture vidéo (hls_url si disponible)

---

## 7. Résumé

| Action | Commande / Où |
|--------|----------------|
| Vérif. automatique CDC | `node scripts/verify-cdc-functionality.cjs` |
| Tests backend | `cd backend && npm test` |
| Santé API | `curl http://localhost:3000/health` |
| Recherche globale | Page Search PWA ou `GET /api/search?q=...` |
| Groupes | Inbox → Groupes → Créer / Ouvrir groupe |
| Métriques | `curl http://localhost:3000/metrics` |
| Transcodage | `cd backend && npm run transcode:one` (FFmpeg requis) |

En suivant ce guide, vous pouvez vérifier et tester l’ensemble des fonctionnalités implémentées.
