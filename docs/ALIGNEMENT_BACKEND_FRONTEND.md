# Alignement Backend / Frontend (AfriWonder)

État des lieux après les vagues CPO (vidéos, posts, messages, utilisateur).

---

## ✅ Déjà aligné

| Domaine | Backend | Frontend | Remarque |
|--------|---------|----------|----------|
| **Auth / Profil** | `PUT /api/users/me` (dont `preferred_categories`) | `api.auth.updateMe(userData)` | News.jsx envoie déjà `preferred_categories`. |
| **Feed vidéo** | `GET /api/feed` (items avec `video.likes`, `scheduled_at` filtré) | `api.feed.list()` → `result.items` | Home utilise `items` ; vidéos programmées exclues côté backend. |
| **Vidéos** | `GET/POST/PUT/DELETE /api/videos`, `POST /videos/:id/like`, `getById` avec `reaction_counts`, `comment_visibility`, `hide_likes` | `api.videos.*`, `api.videos.like(id)` | VideoCard utilise `video.likes` ; backend garde `likes` + nouveaux champs pour évolution. |
| **Conversations** | `GET /api/messages/conversations` (avec `muted`), `PATCH .../notifications` `{ muted }` | `api.messages.getConversations()`, **`api.messages.setConversationNotifications(conversationId, { muted })`** (ajouté) | Réponse contient `muted` ; client peut maintenant appeler le mute. |
| **Posts + Sondages** | `POST/GET/PUT/DELETE /api/posts`, `POST /api/posts/polls/:pollId/vote` | **`api.posts.create/list/getById/update/delete/votePoll`** (ajouté) | Client prêt pour écrans « feed post » / « créer post avec sondage ». |

---

## Implémenté côté UI (alignement complet)

- **Réactions multiples (vidéo)** : VideoCard affiche like + love (HeartCrack) + fire (Flame) ; `onReaction(video, type)` et `api.videos.setReaction` / `deleteReaction` ; Home gère `handleReaction` et met à jour le cache.
- **Mute conversation** : Inbox affiche une icône cloche (Bell / BellOff) par conversation ; clic appelle `setConversationNotifications(conv.id, { muted })` et invalide la liste.
- **Sondages dans les posts** : page **FeedPosts** (route `/FeedPosts`, menu « Publications & Sondages ») : liste des posts, création avec texte + option sondage (question, 2–4 options), vote sur les sondages ; backend `listPosts` enrichi avec `poll_results` et `my_poll_vote`.

---

## Résumé

- **Backend et frontend sont alignés** et les trois blocs UI optionnels sont implémentés : mute Inbox, réactions multiples vidéo, feed publications avec sondages (création + vote).
