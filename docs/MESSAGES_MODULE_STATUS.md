# Module Messages — État d’implémentation vs prompt « 100% production ready »

## ✅ Ce qui est implémenté

### Backend
- **Conversation** : `last_message_id`, `last_message_text`, `unread_count_map`, `is_group`, `group_name`, `group_avatar`
- **Message** : `type`, `status` (sent/delivered/read), `read_by`, `media_url`, `thumbnail_url`, `reply_to_message_id`, `is_edited`, `is_deleted`
- **Vues réelles** : `unread_count_map` par utilisateur, incrément à l’envoi, reset à l’ouverture de la conversation
- **Pagination** : cursor-based pour les messages (backend), première page utilisée côté frontend
- **Statut message** : sent → read (marquage lu à l’ouverture)
- **WebSocket (Socket.io)** : `message:join-conversation`, `message:leave-conversation`, `message:typing-start`, `message:typing-stop` ; émission `message:new`, `message:unread`, `message:read`
- **Sécurité** : rate limit 20 messages / 10 s, blocage utilisateur (`UserBlock`), signalement (`MessageReport`), suppression soft (`is_deleted`)
- **Tables** : `UserPresence`, `UserBlock`, `MessageReport` (schéma + migration appliquée)

### Frontend
- **API** : `api.messages` (getConversations, getConversation, getMessages, send, markAsRead, getUnreadCount, block, report, deleteMessage)
- **BottomNav** : badge Messages = **unread count réel** (rafraîchi toutes les 30 s)
- **Inbox** : liste des conversations avec dernier message, date, **unread_count** par conversation ; lien vers Chat avec `_userId`
- **Chat** : récupération/création conversation, envoi/réception messages, marquage lu à l’ouverture, affichage statut « Lu »

### Routes / Accès
- **Inbox** : accessible via `/Inbox` et l’icône Messages dans la barre du bas
- **Chat** : accessible via `/Chat?_userId=...` (depuis Inbox) ou `/Chat?userId=...`

---

## ✅ Complété (100 % cœur métier)

| Point du prompt | État |
|-----------------|------|
| **Typing indicator** | Backend socket ✅ — Frontend : `useConversationSocket` + affichage « X est en train d'écrire... » ✅ |
| **Online / Offline** | `UserPresence` + `setPresenceOnline`/`setPresenceOffline` sur user:join/disconnect ✅ — GET `/messages/presence/:userId` ✅ — Chat affiche « En ligne » / « Vu il y a X » ✅ |
| **Pagination cursor** | Backend ✅ — Chat : « Charger les anciens messages » + état `olderMessages` / `cursorForOlder` ✅ |
| **Rich media (image)** | Backend type + media_url ✅ — Chat : bouton image, upload via `api.upload.image`, envoi `type: 'image'`, affichage image dans la bulle ✅ |

## ⏳ Optionnel / non implémenté

| Point du prompt | État |
|-----------------|------|
| **Chiffrement** (E2E ou serveur) | Non implémenté |
| **Rich media** (audio, fichier, GIF) | Champs backend prêts ; frontend : image uniquement |
| **Groupes** | Schéma prêt ; pas de logique multi-participants |
| **Mode low network** (IndexedDB, retry) | Non implémenté |
| **UX avancée** : swipe delete, mute, pin, archivage | Non implémenté |
| **Dashboard admin** messages | Non implémenté |
| **Notifications push** « Nouveau message » | Dépend config push globale |

---

## Frontend — Écrans et fonctionnalités

### Accessibles et branchés
- **Inbox** (`/Inbox`) : liste des conversations, recherche, unread par conversation, lien vers Chat.
- **Chat** (`/Chat?_userId=...`) : conversation 1-1, envoi message, marquage lu, compteur unread mis à jour.
- **BottomNav** : icône Messages avec badge unread (compteur global).

### À tester
1. Se connecter, aller sur **Messages** (Inbox).
2. Si aucune conversation : en aller vers un profil / une page qui permet d’« envoyer un message » (si un lien existe) pour créer une conversation ; sinon la première conversation peut être créée en ouvrant Chat avec l’ID d’un autre utilisateur (ex. `/Chat?_userId=<id_autre_user>`).
3. Envoyer des messages, ouvrir la conversation : le badge Inbox doit diminuer, et le badge dans la barre du bas aussi.

### Points d’attention
- **Création de conversation** : aujourd’hui une conversation se crée quand on envoie un message (backend `getOrCreateConversation`). Il faut donc un moyen d’arriver sur Chat avec un `userId` (lien depuis un profil, depuis Search, etc.). Si aucun lien « Envoyer un message » n’existe vers `/Chat?_userId=...`, il faudra en ajouter (ex. sur les profils utilisateur ou les fiches vendeur).
- **Chat sans `userId`** : si on ouvre `/Chat` sans paramètre, la page affiche « Sélectionnez une conversation depuis Messages » et un bouton vers Inbox.

---

## Résumé

- **Backend** : base « production ready » en place (unread, cursor, statuts, socket, blocage, report, soft delete).
- **Frontend** : Inbox + Chat + badge unread sont branchés et accessibles ; typing, présence en ligne, rich media, groupes et UX avancée restent à faire pour coller à 100 % au prompt.
