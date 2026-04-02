# 📱 Plan Beta — Distribution WhatsApp + Tests utilisateurs

> **Objectif** : Envoyer l'app à des vrais utilisateurs via WhatsApp, recevoir les retours, corriger et pousser — **sans réinstaller ni renvoyer de lien**.

---

## 1. Vue d'ensemble du projet AfriWonder

### Stack technique
| Couche | Techno | Rôle |
|--------|--------|------|
| Frontend | React + Vite | PWA installable, vidéos, marketplace, live |
| Backend | Node.js + Express | API REST, auth, paiements, websockets |
| BDD | PostgreSQL (Prisma) | Données persistantes |
| Cache | Redis | Rate limiting, sessions |
| Stockage | S3 / R2 | Vidéos, images |
| Paiements | Stripe, Orange Money, Wave, MTN | Tips, marketplace |
| Live | Agora | Streaming vidéo temps réel |

### Architecture de déploiement
```
[Utilisateur] → [PWA / Navigateur] → [Nginx + HTTPS] → [Backend API]
                                           ↓
                                    [PostgreSQL] [Redis]
```

---

## 2. ✅ Mises à jour automatiques — *OUI, c'est possible*

**Votre PWA est déjà configurée pour ça.**

### Comment ça marche
1. Vous déployez une nouvelle version (ex: correction d'un bug)
2. L'utilisateur ouvre l'app (ou la garde ouverte)
3. Le Service Worker détecte la nouvelle version
4. Un toast s'affiche : **« Nouvelle version disponible »** + bouton **« Mettre à jour »**
5. L'utilisateur clique → l'app se recharge avec la nouvelle version
6. **Aucune réinstallation, aucun nouveau lien à envoyer**

### Fichiers concernés
- `src/components/pwa/PWAUpdateToast.jsx` — affiche le toast
- `src/sw-custom.js` — Service Worker avec `skipWaiting`
- `vite.config.js` — `registerType: 'autoUpdate'`

### Point important
- L'utilisateur doit **revenir sur l'app** (ou la garder ouverte) pour que le SW détecte la mise à jour
- S'il n'a pas ouvert l'app depuis des jours, il peut ne pas voir le toast immédiatement
- **Conseil** : quand vous poussez un correctif, dites dans le groupe : « Correction faite, ouvrez l'app et cliquez sur "Mettre à jour" si le message s'affiche »

---

## 3. Plan de tests avant envoi

### Phase 1 — Tests locaux (avant déploiement)

```bash
# Backend
cd backend && npm run test:smoke

# Frontend
cd .. && npm run test

# E2E (optionnel, Playwright)
npm run test:e2e
```

### Phase 2 — Tests manuels critiques

| Parcours | À vérifier |
|----------|------------|
| **Inscription / Connexion** | Email, Google, Facebook |
| **Feed vidéo** | Scroll, like, commentaire, partage, **Soutenir (tip)** |
| **Création vidéo** | Upload, enregistrement |
| **Marketplace** | Recherche, ajout panier, checkout |
| **Live** | Démarrer un live, regarder |
| **Profil** | Modifier, Wonder, abonnements |
| **Paiements** | Add to wallet, tip (en mode test) |

### Phase 3 — Matrice devices (PWA)

| Device | Android | iOS | Desktop |
|--------|---------|-----|---------|
| Chrome | ✅ | N/A | ✅ |
| Safari | N/A | ✅ | ✅ |
| Edge | ✅ | N/A | ✅ |

**Tests obligatoires** : au moins 1 Android + 1 iPhone + 1 desktop avant envoi au groupe.

---

## 4. Déploiement pour beta

### Option A — Hébergement simple (Render + Vercel)

1. **Frontend** : Vercel ou Netlify
   - Build : `npm run build`
   - Output : `dist`
   - Variables : `VITE_API_URL=https://votre-api.com`

2. **Backend** : Render (recommandé)
   - Build : `npm run build` (dans `backend/`)
   - Start : `npm start`
   - Variables : tout le `.env` depuis `backend/ENV_TEMPLATE.txt`

3. **Base de données** : Supabase (PostgreSQL) ou PostgreSQL sur Render

### Option B — VPS + Docker (production typique)

```bash
# Sur le serveur
git clone <votre-repo>
cd AfriWonder

# Créer .env avec les vraies valeurs
cp backend/ENV_TEMPLATE.txt backend/.env
# Éditer backend/.env

# Déployer
docker compose -f docker-compose.prod.yml up -d --build

# Premier certificat Let's Encrypt (voir docs/HTTPS_LETSENCRYPT_PRODUCTION.md)
```

### Variables indispensables pour la beta

| Variable | Obligatoire | Comment l'obtenir |
|----------|-------------|-------------------|
| `DATABASE_URL` | ✅ | Supabase, Render PostgreSQL, etc. |
| `JWT_SECRET` | ✅ | Générer 32+ caractères |
| `CORS_ORIGIN` | ✅ | URL du frontend (ex: `https://app.afriwonder.com`) |
| `VITE_API_URL` | ✅ | URL du backend (ex: `https://api.afriwonder.com`) |
| `R2_*` ou `AWS_*` | ✅ | Store vidéos/images (R2 ou S3) |
| `AGORA_APP_ID` | Si live | [Agora Console](https://console.agora.io) |
| `STRIPE_*` | Si paiements | [Stripe Dashboard](https://dashboard.stripe.com) |
| `SENTRY_DSN` | Recommandé | [Sentry](https://sentry.io) — pour voir les crashes |

---

## 5. Envoyer l'app via WhatsApp

### Option 1 — Lien (recommandé)

1. Déployez le frontend sur HTTPS (ex: `https://app.afriwonder.com`)
2. Envoyez le lien dans le groupe : **« Testez l'app : https://app.afriwonder.com »**
3. Sur mobile : **« Ouvrir dans le navigateur »** ou **« Ajouter à l'écran d'accueil »**
4. Sur Android : le prompt « Installer l'app » peut s'afficher automatiquement

### Option 2 — QR Code (optionnel)

- Créez un QR code pointant vers votre URL
- Les utilisateurs scannent pour ouvrir directement

### Message type pour le groupe

```
🟠 Beta AfriWonder

Lien : https://app.afriwonder.com

Sur Android : ouvrez le lien, puis « Ajouter à l'écran d'accueil » pour installer.
Sur iPhone : ouvrez dans Safari → Partager → « Sur l'écran d'accueil ».

Si vous voyez « Nouvelle version disponible », cliquez sur « Mettre à jour ».

Merci de signaler les bugs ici (avec capture d'écran si possible) 🙏
```

---

## 6. Capturer les erreurs (centre de notifications)

### Sentry (recommandé)

1. Créez un compte sur [sentry.io](https://sentry.io)
2. Créez un projet **JavaScript (React)**
3. Récupérez le **DSN**
4. Installez :

```bash
npm install @sentry/react
```

5. Dans `src/main.jsx` (en début de fichier) :

```jsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
  });
}
```

6. Variable d'environnement : `VITE_SENTRY_DSN=...`

**Résultat** : quand un utilisateur a un crash, vous voyez l’erreur dans le dashboard Sentry (pile, navigateur, URL, etc.).

### Backend — webhook erreurs

Dans `backend/ENV_TEMPLATE.txt` :

```
ERROR_WEBHOOK_URL=https://hooks.slack.com/...  # ou Discord
```

Quand une erreur 5xx se produit, une alerte peut être envoyée sur Slack/Discord.

---

## 7. Workflow : retours → correction → push

```
1. Utilisateur signale un bug dans le groupe WhatsApp
2. Vous corrigez le code
3. git add . && git commit -m "fix: ..." && git push
4. Votre CI/CD (ou déploiement manuel) rebuild et déploie
5. Les utilisateurs voient « Nouvelle version disponible » à la prochaine ouverture
6. Ils cliquent « Mettre à jour » → correction appliquée
```

**Pas besoin de** :
- Renvoyer un lien
- Réinstaller l'app
- Envoyer un nouvel APK

---

## 8. Clés et configuration — récap

| Service | Lien | Variables à créer |
|---------|------|-------------------|
| **Base de données** | [Supabase](https://supabase.com) | `DATABASE_URL` |
| **Storage vidéos** | [Cloudflare R2](https://dash.cloudflare.com) ou AWS S3 | `R2_*` ou `AWS_*` |
| **Auth sociale** | [Google Cloud](https://console.cloud.google.com) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Auth sociale** | [Facebook Developers](https://developers.facebook.com) | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| **Paiements** | [Stripe](https://dashboard.stripe.com) | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` |
| **Live** | [Agora](https://console.agora.io) | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |
| **Erreurs** | [Sentry](https://sentry.io) | `VITE_SENTRY_DSN` (frontend), `SENTRY_DSN` (backend) |

---

## 9. Checklist avant envoi au groupe

- [ ] Backend déployé + base de données migrée
- [ ] Frontend déployé en HTTPS
- [ ] Inscription / connexion fonctionnent
- [ ] Au moins 1 vidéo visible sur le feed
- [ ] Bouton Soutenir ouvre le modal
- [ ] Sentry configuré (ou équivalent)
- [ ] Message type pour le groupe rédigé
- [ ] Lien court ou QR prêt

---

## 10. Ressources existantes dans le projet

| Fichier | Contenu |
|---------|---------|
| `docs/PWA_LAUNCH_CHECKLIST.md` | Checklist PWA, installation, mise à jour |
| `docs/HTTPS_LETSENCRYPT_PRODUCTION.md` | HTTPS + Let's Encrypt |
| `backend/ENV_TEMPLATE.txt` | Liste complète des variables d'environnement |
| `docs/AGORA_SETUP.md` | Configuration live streaming |
| `00_START_HERE.md` | Vue d'ensemble du projet |

---

**En résumé** : oui, vous pouvez déployer, envoyer le lien sur WhatsApp, et chaque fois que vous corrigez et poussez, les utilisateurs verront « Nouvelle version disponible » et n’auront qu’à cliquer pour mettre à jour. Pas de réinstallation ni de nouveau lien.
