# Référence API Mini-Apps et Développeurs — AfriWonder

Documentation complète des endpoints utilisés par le **SDK développeur mini-apps** et par les intégrations directes (API REST).

---

## Authentification

### 1. JWT Bearer (mini-apps et developer)

Toutes les routes sous `/api/mini-apps` (install, transaction, boost, création) et `/api/developer` exigent un **token JWT** dans l’en-tête :

```
Authorization: Bearer <access_token>
```

- **Utilisateur** : token obtenu après `POST /api/auth/login` (pour installer une mini-app, créer une transaction).
- **Développeur** : même mécanisme ; le développeur est un utilisateur avec des mini-apps (pour créer une app, gérer abonnement, revenus, retraits).

### 2. Clé API publique (Public API)

Les routes sous `/api/public/v1/*` exigent une **clé API** dans l’en-tête :

```
X-API-Key: <votre_clé_api>
```

La clé est fournie après inscription au programme développeur (portail AfriWonder). En environnement de développement, une clé de test peut être utilisée (voir configuration backend).

**Limites** : taux par minute et quota journalier configurables (ex. 60 req/min, 2000/jour). Réponses `429` en cas de dépassement.

---

## Base URL

- **Production** : `https://api.afriwonder.com`
- **Sandbox / Dev** : selon déploiement (ex. `https://staging.afriwonder.com` ou variable d’environnement).

---

## Mini-Apps

### GET /api/mini-apps

Liste du catalogue de mini-apps (public, pas d’auth).

**Query**

| Paramètre  | Type    | Description                    |
|-----------|---------|--------------------------------|
| category  | string  | Filtre catégorie               |
| search    | string  | Recherche texte                |
| page      | number  | Page (défaut 1)                |
| limit     | number  | Par page (défaut 20)           |
| featured  | boolean | Mettre en avant (true/false)   |

**Réponse** : `{ success: true, data: { miniApps?, pagination? } }` ou tableau selon implémentation.

---

### GET /api/mini-apps/:id

Détail d’une mini-app (public).

**Réponse** : `{ success: true, data: <MiniApp> }` avec champs (id, name, description, icon_url, category, developer, _count.installs, _count.transactions, etc.).

**Erreurs** : 404 si mini-app introuvable ou non publiée.

---

### POST /api/mini-apps

Créer une mini-app (développeur, JWT requis).

**Body**

- `name` (string, requis)
- `description` (string, requis)
- `category` (string, requis)
- `icon_url` (string, optionnel)
- `permissions` (array de strings, optionnel)
- `screenshots` (array, optionnel)
- `bundle_url`, `bundle_hash` (optionnel)

**Réponse** : `{ success: true, data: <MiniApp> }`.

---

### POST /api/mini-apps/:id/install

Installer une mini-app pour l’utilisateur connecté (JWT requis).

**Réponse** : `{ success: true, data: <Install> }`.

---

### POST /api/mini-apps/:id/transaction

Créer une transaction (achat in-app). JWT utilisateur requis.

**Body**

- `amount` (number, requis) — montant en FCFA
- `payment_method` (string, optionnel, défaut `orange_money`)
- `description` (string, optionnel)

**Réponse** : `{ success: true, data: <Transaction>, message?: string }`.

---

### POST /api/mini-apps/:id/boost

Acheter un boost pour la mini-app (développeur propriétaire, JWT requis).

**Body**

- `boost_type` (string)
- `price` (number)
- `duration_days` (number, optionnel)
- `payment_reference` (string, optionnel)

**Réponse** : `{ success: true, data: <Boost> }`. **Erreurs** : 403 si l’utilisateur n’est pas le développeur de l’app.

---

## Developer

Toutes les routes ci-dessous nécessitent un **JWT développeur** (`Authorization: Bearer <token>`).

### GET /api/developer/subscription

Abonnement développeur actuel (starter, pro, enterprise). Si aucun abonnement, un abonnement « starter » par défaut peut être créé.

**Réponse** : `{ success: true, data: <DeveloperSubscription> }`.

---

### POST /api/developer/subscription

Souscrire ou changer d’abonnement.

**Body**

- `plan_type` (string, requis) : `starter` | `pro` | `enterprise`
- `payment_method` (string, optionnel)

**Réponse** : `{ success: true, data: <Subscription>, message?: string }`.

---

### GET /api/developer/apps

Liste des mini-apps du développeur connecté.

**Réponse** : `{ success: true, data: <MiniApp[]> }`.

---

### GET /api/developer/revenue

Revenus du développeur.

**Query** : `time_range` (optionnel) : `day` | `week` | `month` | `year` (défaut `month`).

**Réponse** : `{ success: true, data: <Revenue> }`.

---

### POST /api/developer/revenue/withdraw

Demande de retrait de revenus.

**Body**

- `amount` (number, requis)
- `payment_method` (string, requis) : ex. `orange_money`, `mtn_money`, `wave`, `bank`
- `phone_number` (string, requis pour mobile money)
- `bank_account` (string, optionnel pour virement bancaire)

**Réponse** : `{ success: true, data: <Withdrawal>, message?: string }`. **Erreurs** : 400 si montant invalide ou méthode / numéro manquant.

---

### GET /api/developer/analytics

Analytics agrégés (GMV, commissions, installations, etc.).

**Query** : `time_range` (optionnel) : `day` | `week` | `month` | `year` (défaut `month`).

**Réponse** : `{ success: true, data: { gmv, commission, earnings, transactions_count, installs_count, revenue } }`.

---

## Public API (X-API-Key)

Toutes les routes ci-dessous exigent l’en-tête **X-API-Key**.

### GET /api/public/v1/health

Santé de l’API publique.

**Réponse** : `{ success: true, data: { status, api, version, timestamp } }`.

---

### GET /api/public/v1/matching/opportunities

Opportunités du moteur de matching (prévisualisation).

**Query**

- `goal` : `earn_money` | `learn` | `find_job` | `entrepreneur`
- `location` : string
- `level` : `beginner` | `intermediate` | `advanced`
- `skills` : chaîne CSV
- `interests` : chaîne CSV
- `limit` : nombre (max 30)

**Réponse** : `{ success: true, data: <OpportunityPreview[]> }`.

---

### GET /api/public/v1/usage

Usage de l’API (appels par endpoint, par statut, sur une période).

**Query** : `sinceHours` (optionnel, défaut 24, max 168).

**Réponse** : `{ success: true, data: { byEndpoint, byStatus, ... } }` (structure selon implémentation).

---

## Codes d’erreur courants

| Code | Signification        |
|------|----------------------|
| 400  | Paramètres invalides |
| 401  | Non authentifié (JWT manquant ou invalide, ou clé API invalide) |
| 403  | Accès refusé (ex. pas le développeur de l’app) |
| 404  | Ressource introuvable |
| 429  | Trop de requêtes (rate limit ou quota dépassé) |
| 500  | Erreur serveur       |

Les réponses d’erreur ont typiquement la forme : `{ success: false, error: string }` ou `{ message: string }`.

---

## Sandbox

- Utiliser la **même API** avec une base URL de sandbox si fournie.
- En dev, le backend peut accepter une clé publique de test (ex. `PUBLIC_API_DEV_KEY`) pour éviter de bloquer les appels.
- Les JWT de test s’obtiennent en se connectant sur l’environnement de sandbox/staging.

Cette référence couvre l’ensemble des endpoints utilisés par le SDK **@afriwonder/miniapp-sdk** et permet une intégration directe par HTTP.
