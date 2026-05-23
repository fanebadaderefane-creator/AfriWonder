# Reste à faire — message senior (phase 2)

Liste **concrète** de ce qui peut encore être fait par rapport au message du senior (stabilité, performances, simplification, sécurité, UX, montée en charge).  
Ce qui est **déjà fait** est dans `CONSOLIDATION_PHASE2_CHECKLIST.md`.

---

## 1. Stabilité

| Tâche | Priorité | Détail |
|-------|----------|--------|
| **Tests de charge** | Moyenne | Aucun script de load test (k6, artillery, etc.) dans le repo. Créer un scénario qui appelle `/api/feed`, `/api/auth/login`, `/api/videos` avec N utilisateurs virtuels pour valider le comportement sous charge. |
| **Tests E2E critiques** | Basse | Couvrir au moins : inscription → login → feed → like (Playwright/Cypress) pour éviter les régressions. |

---

## 2. Performance / architecture

| Tâche | Priorité | Détail |
|-------|----------|--------|
| **Cache réponse sur GET /api/feed** | Moyenne | Le middleware `responseCache` existe (`backend/src/middleware/responseCache.middleware.ts`) et est utilisé sur les produits. L’appliquer à `GET /api/feed` avec un TTL court (ex. 30–60 s) et `byUser: true` pour ne pas mélanger les feeds entre utilisateurs. |
| **Cache GET /api/videos** (liste) | Basse | Optionnel : cache court (ex. 20 s) sur la liste vidéos pour les requêtes sans auth ou avec les mêmes paramètres (category, page). |
| **Index / requêtes lentes** | Basse | Si des routes sont lentes en prod, analyser les requêtes (logs Prisma, APM) et ajouter des index ou optimiser les `where`/`include`. |

---

## 3. Simplification (fluidité du système)

| Tâche | Priorité | Détail |
|-------|----------|--------|
| **Doublons de logique “liste + loading + error”** | Basse | Plusieurs pages (Wallet, Discover, Inbox, etc.) répètent le même pattern `useQuery` + `isLoading` + rendu conditionnel. Extraire un hook `usePageQuery(key, queryFn, options)` ou un composant `QueryState({ isLoading, isError, error, children })` pour uniformiser et simplifier. |
| **Pages très longues** | Basse | `Profile.jsx`, `Create.jsx`, `Home.jsx` font beaucoup de lignes. Découper en sous-composants ou en hooks (ex. `useProfileData(profileUserId)`) pour rendre le code plus lisible et maintenable. |
| **Duplication validation côté front** | Basse | Les règles mot de passe (8 car., lettre + chiffre) et username (3–30, alphanum+_) sont maintenant côté backend. Ajouter la **même validation côté front** (Landing/Register) pour afficher les erreurs avant l’envoi du formulaire (UX + moins d’appels API inutiles). |

---

## 4. Sécurité

| Tâche | Priorité | Détail |
|-------|----------|--------|
| **Validation front inscription** | Moyenne | Comme ci‑dessus : reprendre les règles du backend (mot de passe, username) dans le formulaire d’inscription pour messages d’erreur immédiats. |
| **Limiter la taille des body** | Basse | `express.json({ limit: '50mb' })` est permissif. Pour les routes qui n’ont pas besoin de gros payloads, un middleware ou une config par route pourrait limiter (ex. 1 Mo pour la plupart des API). |

---

## 5. Expérience utilisateur (UX)

| Tâche | Priorité | Détail |
|-------|----------|--------|
| **Affichage erreur API sur les pages principales** | Moyenne | Plusieurs pages utilisent `useQuery` avec `isError` mais n’affichent pas de message ou de bouton “Réessayer” (ex. Discover, Inbox, Wallet, Leaderboard). Ajouter un bloc du type : “Une erreur s’est produite. [Réessayer]” quand `isError === true`. |
| **Skeletons de chargement** | Basse | Remplacer certains spinners par des skeletons (lignes / cartes grises animées) sur Search, Inbox, Liste de vidéos du profil pour une sensation de fluidité (comportement “type TikTok/Instagram”). |
| **Messages d’erreur formulaires** | Basse | S’assurer que les erreurs renvoyées par l’API (ex. inscription, création de contenu) sont affichées en clair sous le bouton ou en toast, avec le message `error.message` du backend. |
| **Accessibilité (a11y)** | Basse | Vérifier les pages clés (Home, Search, Profile, Inbox) : focus visible, aria-labels sur les boutons icônes, contraste. |

---

## 6. Montée en charge / déploiement

| Tâche | Priorité | Détail |
|-------|----------|--------|
| **Documentation déploiement** | Moyenne | Un court doc “Déploiement production” (ou section dans un README) : variables obligatoires, REDIS_URL, HEALTH_API_KEY, scaling horizontal (plusieurs instances + Redis pour Socket.io et rate limit). Réf. existantes : `RENDER_ENV_CHECKLIST.md`, `OBSERVABILITY.md`. |
| **Script ou doc “load test”** | Basse | Exemple de commande k6/artillery (ou lien vers un script dans `scripts/`) pour tester `/api/feed` et `/api/videos` avec 50–100 utilisateurs virtuels. |
| **Alertes** | Basse | Documenter ou configurer des alertes (ex. Prometheus + Alertmanager, ou outil hébergeur) sur taux d’erreur 5xx, latence p95, indisponibilité `/health/ready`. |

---

## Synthèse par priorité

- **À faire en priorité si tu veux “boucler” la phase 2**  
  - Cache sur GET /api/feed (optionnel mais impactant).  
  - Affichage erreur + “Réessayer” sur les pages principales (Discover, Inbox, Wallet, etc.).  
  - Validation front inscription (mot de passe, username) alignée sur le backend.  
  - Doc déploiement / scaling.

- **Ensuite (optionnel)**  
  - Load test, tests E2E, skeletons, simplification des grosses pages, a11y, limite body par route.

---

*Document généré pour alignement avec le message senior (phase 2 — consolidation).*
