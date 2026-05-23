# Suivi d’implémentation CPO — Liste 300+

Ce document relie la **liste CPO** (`CPO_LISTE_FONCTIONNALITES_SUPER_APP_300+.md`) à l’état d’implémentation dans AfriWonder.  
Statut : **✅ Fait** | **🔶 Backend seul** | **⬜ À faire**.

---

## Vague 1 (implémentée)

| CPO # | Fonctionnalité | Statut | Détail technique |
|-------|----------------|--------|-------------------|
| 1.6 | Bannière de profil | ✅ | `User.profile_cover_url`, `PUT /api/users/me` |
| 1.17 | Compte public / privé | ✅ | `User.is_private`, profil et follow à respecter côté front |
| 1.18 | Liste de contacts proches | ✅ | `CloseFriend`, `GET/POST/DELETE /api/me/close-friends` |
| 1.25 | Préférences de notification | ✅ | `GET/PUT /api/notifications/preferences` |
| 2.35 | Publications programmées | ✅ | `Post.scheduled_at`, créa/MAJ post ; filtre « publié » (scheduled_at null ou ≤ now) |
| 2.36 | Épingler un post | ✅ | `Post.is_pinned`, tri par is_pinned puis created_at |

---

## Vague 2 (alignement CPO — implémentée)

| CPO # | Fonctionnalité | Statut | Détail technique |
|-------|----------------|--------|-------------------|
| 2.2 | Demande de suivi (compte privé) | ✅ | `FollowRequest`, `toggleFollow` crée une demande si cible privée ; `GET/POST /api/me/follow-requests`, accept/reject |
| 1.26–1.27, 1.29 | Langue, timezone, thème | ✅ | `User.preferred_language`, `timezone`, `theme` ; `PUT /api/users/me` |
| 2.40, 2.41 | Désactiver commentaires / cacher likes (vidéo) | ✅ | `Video.comments_disabled`, `hide_likes` ; créa/MAJ vidéo ; addComment rejet si comments_disabled |
| 3.37 | Épingler un commentaire | ✅ | `Comment.is_pinned` ; seul le créateur peut épingler ; tri commentaires par is_pinned puis created_at |
| 2.45 | Publication « proches » uniquement | ✅ | `Post.visibility` = `close_friends` ; listPosts/getPost filtrés selon CloseFriend |
| 4.36 | Message programmé | ✅ | `Message.scheduled_at`, status `scheduled` ; création sans envoi immédiat (cron à prévoir) |
| 4.37, 4.38 | Archiver chat / brouillon | ✅ | `Conversation.is_archived_user1/2`, `draft_content` ; PATCH archive, GET/PUT draft ; liste avec includeArchived |
| 2.31 | Filtre feed par type | ✅ | `GET /api/feed?mediaType=video|image` |
| 2.43 | Mots interdits (commentaires) | ✅ | `BannedWord` ; rejet à la création de commentaire si contenu contient un mot interdit |
| 2.33 | Suggestions de comptes à suivre | ✅ | `GET /api/me/suggested-follows` |
| 1.15 | Historique d’activité récente | ✅ | `GET /api/me/activity` |

---

## Vague 3 (implémentée)

| CPO # | Fonctionnalité | Statut | Détail technique |
|-------|----------------|--------|-------------------|
| 2.20 | Sondages dans le feed | ✅ | `PostPoll`, `PostPollVote` ; `POST /api/posts` avec `poll` ; `POST /api/posts/polls/:pollId/vote` |
| 2.42 | Limiter commentaires (abonnés / mentionnés) | ✅ | `Video.comment_visibility` ; addComment selon followers/mentions |
| 2.44 | Réactions multiples (like, love, fire…) | ✅ | `Like.type` ; `POST/DELETE /api/videos/:id/reaction` ; getById avec `reaction_counts`, `current_user_reaction` |
| 1.32 | Préférences contenu / centres d'intérêt | ✅ | `User.preferred_categories` ; `PUT /api/users/me` |
| 4.39 | Mute notifications par conversation | ✅ | `Conversation.muted_user1/2` ; `PATCH /api/messages/conversations/:id/notifications` { muted } ; liste avec `muted` |
| 3.45 | Feed sans vidéos programmées | ✅ | `OR: [ { scheduled_at: null }, { scheduled_at: { lte: now } } ]` dans recommendation.service + fallback SQL |

---

## Référence rapide par catégorie

### 1. Compte utilisateur (35)
- 1.1–1.5, 1.8–1.10 : ✅ (auth, profil, username, vérification)
- 1.6 Bannière : ✅ (Wave 1)
- 1.7 Bio : ✅
- 1.11–1.12 Vérif téléphone/email : ✅ (champs + flows existants)
- 1.13 Badges : ✅ (UserBadge, gamification)
- 1.14 Niveau/XP : ✅ (UserLevel)
- 1.15 Historique activité : ✅ (Wave 2 — GET /api/me/activity) (logs existants ; pas d’API dédiée « journal »)
- 1.16 Confidentialité : ✅ (paramètres profil)
- 1.17 Compte privé : ✅ (Wave 1)
- 1.18 Liste proches : ✅ (Wave 1)
- 1.19–1.20 Blocage / signalement : ✅
- 1.21 2FA : ✅
- 1.22 Sessions : ✅ (`/api/me/sessions`)
- 1.23 Export données : ✅ (`/api/privacy/export-data`)
- 1.24 Suppression compte : ✅ (`/api/privacy/delete-account`)
- 1.25 Préférences notification : ✅ (Wave 1)
- 1.26–1.29 Langue, timezone, thème : ✅ (Wave 2 — `PUT /api/users/me`)
- 1.30 Parrainage : ✅
- 1.31 Fidélité : ✅ (UserPoints, etc.)
- 1.32 Préférences contenu : ✅ (`User.preferred_categories`, `PUT /api/users/me` ; reco algo)
- 1.33 Adresses : ✅ (`/api/addresses`)
- 1.34–1.35 Cookies / CGU : ✅ (privacy, legal)

### 2. Réseau social (45)
- 2.1 Followers, 2.4–2.16, 2.22–2.34, 2.37–2.39 : ✅ ou déjà couverts
- 2.35 Programmation post : ✅ (Wave 1)
- 2.36 Épingler post : ✅ (Wave 1)
- 2.2 Demande de suivi (compte privé) : ✅ (Wave 2). 2.20 Sondages feed : ✅ (`PostPoll`, `PostPollVote`, `POST /api/posts` avec `poll`, `POST /api/posts/polls/:pollId/vote`). 2.31 Filtre feed par type : ✅ (Wave 2). 2.33 Suggestions comptes : ✅ (Wave 2). 2.40–2.41, 2.42 Limiter commentaires (abonnés/mentionnés) : ✅ (`Video.comment_visibility`). 2.43, 2.45 : ✅ (Wave 2). 2.44 Réactions multiples : ✅ (`Like.type`, `POST/DELETE /api/videos/:id/reaction`, `getById` avec `reaction_counts`, `current_user_reaction`)

### 3–11. Autres catégories
- Voir `VERIFICATION_FONCTIONNALITES_SUPER_APP.md` pour le détail par bloc (vidéo, messagerie, paiements, marketplace, créateurs, mini-apps, services, business, admin).
- La plupart des items CPO ont un équivalent déjà marqué ✅ ou 🔶 dans la vérification.

---

## Prochaines vagues suggérées

- **Vague 2** : Demande de suivi (compte privé) ; sondages feed ; filtre feed par type ; réactions multiples ; brouillons messages.
- **Vague 3** : Historique d’activité (API journal) ; préférences langue/région/thème (API + front) ; liste de mots interdits commentaires.
- **Vague 4** : Cercle / liste restreinte pour publication ; messages programmés.

Ce fichier peut être mis à jour à chaque vague d’implémentation.
