# AfriWonder — Production Readiness

Document de référence pour la **stabilité**, la **persistance** et la **robustesse** en production.  
Priorité : **fiabilité > fonctionnalités**, **stabilité > rapidité**.

---

## 1. Persistance des données

### Déjà en place
- **Tokens & session** : `access_token`, `refresh_token`, `afriwonder_auth_user` via `safeStorage` (localStorage sécurisé, tolérant mode privé / quota).
- **Préférences** : `afw_preferences` (isMuted, language) — `src/lib/preferences.js` + `PreferencesContext`.
- **Cache React Query** : `afw_react_query_cache` — feed, vidéos, user, etc. persistés 24 h via `PersistQueryClientProvider` (offline-first).
- **Cache métier** : `afw_hidden_ads`, `afw_device_id`, `recent_searches`, `cookie_consent`, etc. via `safeStorage` / `getJSON` / `setJSON`.
- **IndexedDB** : `afriwonder-offline` — métadonnées téléchargements offline (offlineStorage.service.js).

### Registre
Voir `src/lib/persistence-registry.js` pour la liste centralisée des clés de stockage.

### Bonnes pratiques
- Utiliser `usePreferences()` pour mute / langue afin que l’état survive au rechargement.
- Ne pas stocker de données sensibles en clair dans le localStorage (tokens uniquement, pas de mots de passe).

---

## 2. Gestion des états

- **Serveur** : React Query (cache, retry, refetch) — source de vérité pour feed, vidéos, user, etc. Cache persisté 24 h (offline-first).
- **Auth** : `AuthContext` (user, checkAuth, refresh token).
- **Préférences** : `PreferencesContext` (persistées).
- **UI globale** : `AppMenuContext`, `FeatureFlagsContext`, `MarketplaceCurrencyContext`.

Règle : éviter les états temporaires non sauvegardés pour tout ce qui doit survivre à un refresh (préférences, session).

---

## 3. Gestion des erreurs

### Côté frontend
- **ErrorBoundary** : capture les erreurs React, affiche un écran de repli avec « Réessayer » / « Recharger », envoie à Sentry si `VITE_SENTRY_DSN` est défini.
- **API** : intercepteur Axios — message utilisateur dans `error.apiMessage` (timeout, réseau, 4xx/5xx) ; pas de stack technique affichée.
- **Timeout** : 30 s par défaut sur les requêtes API (réseaux lents).
- **Rejets non gérés** : `unhandledrejection` — log en dev, envoi à Sentry en prod (si `VITE_SENTRY_DSN` défini).

### Côté backend
- Sentry (si configuré), logs structurés, CORS et rate limiting déjà en place.

---

## 4. Réseau et offline

- **Offline** : bannière « Vous êtes hors ligne » (`OfflineBanner` + `useNetworkStatus`).
- **Connexion lente** : `getCacheStrategy(isSlowConnection)` — cache plus long, plus de retries.
- **React Query** : `refetchOnWindowFocus`, `refetchOnReconnect`, retry avec backoff (sauf 401/403/404).

---

## 5. Tests recommandés (scénarios réels)

### Cold start
- Fermer l’onglet ou l’app, rouvrir : session et préférences doivent être restaurées (connexion, mute, langue).

### Réseau instable
- Throttling 3G / offline dans les DevTools : pas de crash, messages clairs (timeout / « Connexion impossible »), retry automatique après reconnexion.

### Déconnexion / expiration
- Supprimer le token ou laisser expirer : redirection propre vers Landing, pas d’écran blanc.

### Données persistées
- Masquer une pub, accepter les cookies, changer la langue : après refresh, les choix sont conservés.

### Erreur fatale React
- Provoquer une erreur dans un composant (dev) : l’ErrorBoundary affiche l’écran de repli et permet de réessayer sans recharger tout le site.

---

## 6. Fluidité et performance

- **PageLoader** : chargement auth et Suspense unifié.
- **Code splitting** : chunks séparés (react, query, ui, framer, charts, video, stripe, axios).
- **Scroll** : `content-visibility` pour listes longues, `getCacheStrategy` pour réseau lent.

---

## 7. Vérification fonctionnalités Live et flux critiques (pré-production)

### Live (streaming)
- **Routes backend** : `/api/live`, `/api/live/:id`, `/api/live/:id/token`, `/api/live/start`, `/api/live/:id/end`, chat, gift, join/leave — tous exposés et alignés avec le client.
- **Frontend** : `LiveStream.jsx` (créateur), `LiveView.jsx` (spectateur), `Lives.jsx` (liste) — flèche Retour présente sur toutes les pages Live.
- **Agora** : si non configuré côté backend, le live peut afficher un message ; vérifier `AGORA_*` en production pour le vrai streaming vidéo/audio.

### Flux récemment corrigés (à re-tester avant mise en prod)
- **Recherche** : page Search — soumission du formulaire (Entrée + bouton « Rechercher »), onglets Tous/Vidéos/Utilisateurs/Produits, lien vers une vidéo utilise `?id=` (ouverture correcte de VideoView).
- **VideoView** : accepte `?id=` et `?_videoId=` ; normalise l’URL en `?id=`.
- **Create** : upload image vs vidéo (boutons Photo / Vidéo), prévisualisation image dans l’éditeur, écran Détails avec libellés « image » quand c’est une image, message de succès « Image publiée » / « Vidéo publiée ».
- **Profil** : grille et vidéo à la une — affichage des **images** (media_type === 'image') via `thumbnail_url` ou `video_url`, pas seulement les frames vidéo.
- **Upload** : timeout client 5 min (`UPLOAD_TIMEOUT_MS`), timeout serveur 5 min (`httpServer.timeout`, `keepAliveTimeout`, `headersTimeout`) pour éviter « timeout 30000ms exceeded » sur gros fichiers.
- **Musique (Create)** : sélection fichier musique avec `FILE_ACCEPT_MUSIC` pour que le picker mobile affiche les fichiers audio.

### Points à valider manuellement
- [ ] Recherche : taper un mot-clé, cliquer « Rechercher » ou Entrée → résultats affichés ; cliquer sur une vidéo → ouverture de la lecture.
- [ ] Create : choisir Photo → prévisualisation image ; choisir Vidéo → prévisualisation vidéo ; publier → bon message (Image/Vidéo publiée).
- [ ] Profil : publications image et vidéo affichent bien une miniature (pas de cadre vide pour les images).
- [ ] Upload vidéo lourd : pas de timeout avant 5 min (ou augmenter si besoin).
- [ ] Live : démarrer un live (si Agora configuré), rejoindre en spectateur, chat, dons (si wallet/paiement configurés).

---

## 8. Checklist avant mise en production

### Automatique
`npm run pre-production-checklist`  
`npm run pre-launch-check` (backend + frontend + env)

### Manuelle
- [ ] `VITE_API_URL` défini (frontend pointe vers l’API réelle).
- [ ] `VITE_SENTRY_DSN` défini pour le suivi des erreurs (recommandé).
- [ ] Backend : variables d’environnement (DB, JWT, R2, CORS, Agora si live, etc.) configurées sur l’hébergeur.
- [ ] Proxy / hébergeur : timeout ≥ 5 min pour les routes d’upload si vous utilisez un reverse proxy (nginx, Vercel, etc.).
- [ ] Tests manuels : cold start, offline, timeout, déconnexion (voir §5) + flux §7.
- [ ] Aucune clé API ou secret dans le code source ou le bundle client.

---

## 9. Vision produit

> Une application instable détruit la confiance ; une application stable construit un écosystème.

Objectif : une app qui fonctionne de façon fiable même dans des conditions difficiles (réseau instable, appareils modestes). Les nouvelles fonctionnalités passent après la stabilité et la persistance.
