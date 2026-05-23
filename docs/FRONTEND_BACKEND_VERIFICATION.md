# Vérification écrans et connexion Frontend / Backend

## Corrections effectuées

### 1. **Certificats (page "Mes certificats")**
- **Problème** : La page utilisait `api.entities.Certificate.filter()` (entité non connectée au backend).
- **Correction** :
  - Backend : `certificateService.listByUser(userId)` + **GET /api/certificates** (authentifié).
  - Client : `api.certificates.list()` qui appelle GET /api/certificates et retourne le tableau.
  - **Certificates.jsx** : utilise `api.certificates.list()` et affiche `course_title`, `instructor_name`, `issued_at`, `verification_token`, `certificate_url`.

### 2. **Leaderboard**
- **Problème** : Le composant attendait `leaderboard.leaderboard` alors que l’API retourne `{ leaderboard: [], period }`.
- **Correction** : Utilisation de `leaderboardData.leaderboard` comme tableau ; affichage avec `leaderboard.length` et `leaderboard.map()`.

### 3. **Messages (Inbox / Chat)**
- **Problème** : Les routes messages n’étaient pas montées dans l’app Express.
- **Correction** : `app.use('/api/messages', messageRoutes)` ajouté dans **backend/src/app.ts**.
- Les appels `api.messages.getConversations()`, `getConversation()`, `getMessages()`, `send()`, `markAsRead()`, `getUnreadCount()`, `getPresence()` pointent bien vers **/api/messages/...**.

---

## Correspondance routes Backend ↔ Client

| Domaine        | Routes backend (préfixe /api) | Client (api.*) |
|----------------|--------------------------------|----------------|
| Auth           | /auth (login, register, me, refresh) | api.auth.* |
| Users          | /users (me, etc.)             | api.auth.updateMe → PUT /users/me |
| Videos         | /videos                       | api.videos.* |
| Products       | /products                     | api.products.* |
| Orders         | /orders                       | api.orders.* |
| Payments       | /payments                     | api.payments.* |
| Courses        | /courses                      | api.courses.* |
| Certificates   | /certificates (GET liste + verify/:token) | api.certificates.list(), verify() |
| Leaderboard    | /leaderboard                  | api.leaderboard.get({ range }) |
| Live           | /live                         | api.live.* |
| Events         | /events                       | api.events.* |
| Messages       | /messages                     | api.messages.* |
| Notifications  | /notifications                | (api.entities.Notification ou autre selon écran) |
| Support        | /support                      | api.support.* (si utilisé) |

---

## Écrans utilisant `api.entities.*`

Certains écrans utilisent encore **api.entities** (stubs ou ancienne couche). Pour une connexion complète au backend Express :

- **Certificates** : migré vers **api.certificates.list()**.
- **Courses** : liste/détails/reviews/wishlist/enroll via **api.courses.*** (connecté).
- **Lives** : **api.live.*** + **api.entities.LiveStream** (create/update) pour partie création.
- Autres (Wishlist produits, Notifications, Communities, etc.) : à migrer au besoin vers des endpoints dédiés sous /api/*.

---

## Vérification rapide

1. **Backend** : `cd backend && npm run dev` (ou `node dist/index.js` après build).
2. **Frontend** : `npm run dev` — vérifier que `VITE_API_URL` pointe vers l’API (ex. `http://localhost:3000/api`).
3. Tester :
   - Connexion (auth/me).
   - Liste des cours (courses).
   - Inbox puis Chat (messages).
   - Mes certificats (certificates).
   - Classement (leaderboard).
