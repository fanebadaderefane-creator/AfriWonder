# Vérification Frontend ↔ CPO (Liste 300+)

Vérification de l’**alignement du frontend** avec `CPO_LISTE_FONCTIONNALITES_SUPER_APP_300+.md`.  
Statut : **✅ Aligné** (écran/flux présent) | **⚠️ Partiel** (API utilisée partiellement ou écran incomplet) | **❌ Absent** (pas d’écran ni d’usage).

---

## 1. Compte utilisateur (35)

| CPO | Fonctionnalité | Frontend | Détail |
|-----|----------------|----------|--------|
| 1.1–1.5 | Création, login, récupération MDP, profil, photo | ✅ | Landing, auth, Profile, Settings, upload avatar |
| 1.6 | Bannière de profil | ⚠️ | Backend `profile_cover_url` ; **pas d’affichage/édition bannière dans Profile/ProfileHeader** |
| 1.7–1.10 | Bio, nom, pseudo, vérification | ✅ | Profile, Settings, UserVerification |
| 1.11–1.12 | Vérif téléphone / email | ⚠️ | Champs/API existent ; **pas de flow dédié « Vérifier mon téléphone » dans Settings** |
| 1.13–1.14 | Badges, niveau/XP | ✅ | BadgesProfile, gamification |
| 1.15 | Historique d’activité | ⚠️ | API `/api/me/activity` ; **pas de page « Mon activité » dédiée** |
| 1.16–1.18 | Confidentialité, compte privé, liste proches | ⚠️ | Settings (private_account) ; **pas d’UI « Liste proches » (close-friends) ni demande de suivi dans le flux** |
| 1.19–1.20 | Blocage, signalement | ✅ | Blocage/signalement présents (profil, messages) |
| 1.21–1.24 | 2FA, sessions, export données, suppression compte | ✅ / ⚠️ | Settings, PrivacySettings (export, delete) ; **sessions : API `/api/me/sessions` — vérifier écran liste sessions** |
| 1.25 | Préférences notification | ✅ | NotificationPreferences |
| 1.26–1.29 | Langue, région, économie données, thème | ✅ | Settings (langue, thème, DataModeToggle) |
| 1.30–1.32 | Parrainage, fidélité, préférences contenu | ✅ | Referrals ; **centres d’intérêt : News.jsx (preferred_categories)** |
| 1.33–1.35 | Adresses, cookies, CGU | ✅ | Addresses, CookieBanner, legal |

---

## 2. Réseau social (45)

| CPO | Fonctionnalité | Frontend | Détail |
|-----|----------------|----------|--------|
| 2.1–2.2 | Abonnements, demande de suivi | ⚠️ | Profile (follow) ; **demande de suivi (compte privé) : API prête, pas d’écran « Demandes reçues » / acceptation dans le flux** |
| 2.3–2.16 | Liste amis, posts, commentaires, likes, partages, hashtags, stories, etc. | ✅ | Home (feed), Create, VideoCard, Stories, Search, Discover |
| 2.17–2.19 | Stories, réponses/réactions stories | ✅ | Stories.jsx |
| 2.20 | Sondages (feed) | ✅ | **FeedPosts** : création post + sondage, vote |
| 2.21 | Sondages dans les stories | ❌ | Non implémenté |
| 2.22–2.28 | Groupes, communautés, événements, feed | ✅ | Inbox/GroupChat, Communities, Events, Home (pour toi / abonnements) |
| 2.29–2.31 | Fil Pour vous, Abonnements, filtres feed | ✅ | Home (onglets), api.feed.list(mediaType) |
| 2.32–2.34 | Recherche, suggestions comptes, archives | ✅ | Search ; **suggestions : API utilisée où ?** ; archives posts/vidéos (API) |
| 2.35–2.36 | Publications programmées, épingler post | ⚠️ | **Backend prêt ; Create (post) : pas d’option « Programmer » ni « Épingler » dans l’UI FeedPosts** |
| 2.37–2.39 | Modifier/supprimer post, signalement | ✅ | FeedPosts (delete si ajouté), modération |
| 2.40–2.42 | Cacher likes, désactiver/limiter commentaires | ⚠️ | **Backend (hide_likes, comments_disabled, comment_visibility) ; Create (vidéo) : pas de toggles dans l’UI** |
| 2.43 | Mots interdits | ✅ | Backend + admin ; pas d’UI créateur dédiée |
| 2.44 | Réactions multiples | ✅ | **VideoCard : like + love + fire ; Home handleReaction** |
| 2.45 | Cercle / liste restreinte | ⚠️ | Backend `close_friends` pour posts ; **pas d’option « Proches uniquement » dans FeedPosts** |

---

## 3. Vidéo (50)

| CPO | Fonctionnalité | Frontend | Détail |
|-----|----------------|----------|--------|
| 3.1–3.12 | Upload, enregistrement, montage, trim, filtres, musique, sous-titres, remix | ✅ | Create, VideoEditor, trim, musique |
| 3.13–3.16 | Live, co-host, chat live, replay | ✅ | LiveStream, LiveView, StartLive |
| 3.17–3.25 | Playlists, chapitres, miniature, titre/description, visibilité, catégorie, téléchargement, premium | ✅ / ⚠️ | Playlists, Create ; **comment_visibility / hide_likes / scheduled_at vidéo non exposés dans Create** |
| 3.26–3.35 | Monétisation, analytics, feed, mini player, qualité, historique, likes/commentaires | ✅ | Home, VideoCard, ViewHistory, Discovery |
| 3.36–3.38 | Partage timestamp, épingler commentaire, réponses | ✅ | VideoView, commentaires (épinglé côté backend) |
| 3.39–3.46 | Gifts live, abo créateur, sondages live, Q&R, live commerce, archives, programmation, shorts | ✅ / ⚠️ | LiveView (gifts, polls) ; **programmation vidéo : backend prêt, pas d’option dans Create** |
| 3.47–3.50 | Vues qualifiées, scroll, préchargement, signalement | ✅ | Backend + métriques ; VideoCard précharge ; signalement |

---

## 4. Messagerie (40)

| CPO | Fonctionnalité | Frontend | Détail |
|-----|----------------|----------|--------|
| 4.1–4.15 | Chat 1-1, groupes, messages texte/vocaux/vidéo/images/fichiers, stickers/GIF, réactions, réponse, transfert | ✅ | Chat, Inbox, GroupChat, types de messages |
| 4.16–4.24 | Éphémères, suppression pour tous, appels audio/vidéo/groupe, localisation, contact, épinglés, importants | ✅ / ⚠️ | Chat (éphémères, appels) ; **archive / brouillon : API prêtes, pas d’entrées « Archiver » / « Brouillon » visibles dans Inbox/Chat** |
| 4.25–4.32 | Présence, « en train d’écrire », lu, multi-appareils, sauvegarde, recherche, médias partagés | ✅ / ⚠️ | Socket, Chat ; **export/sauvegarde : API export ; pas de bouton « Exporter cette conversation » dans Chat** |
| 4.33–4.36 | Blocage/signalement, bots, entreprises, messages programmés | ⚠️ | Blocage/signalement ; **messages programmés : backend + job ; pas d’option « Programmer l’envoi » dans Chat** |
| 4.37–4.39 | Brouillons, archivage, notifications par conversation | ✅ / ⚠️ | **Mute : Inbox (Bell/BellOff + setConversationNotifications) ✅ ; brouillon/archive : API utilisables, UI à confirmer (Chat/Inbox)** |
| 4.40 | E2E | ❌ | Hors scope |

---

## 5–11. Paiements, Marketplace, Créateurs, Mini-apps, Services, Business, Admin

Alignement **global** (détail dans `VERIFICATION_FONCTIONNALITES_SUPER_APP.md`) :

- **Paiements** : Wallet, RechargeWallet, checkout, tips, historique → ✅ ; quelques items (cartes virtuelles, transferts internationaux) → ❌ ou ⚠️.
- **Marketplace** : Cart, Checkout, Orders, OrderTracking, Marketplace, Product, Wishlist, SellerDashboard → ✅.
- **Créateurs** : CreatorTools, Analytics, LiveStream, abonnements, tips → ✅.
- **Mini-apps** : MiniAppsStore, DeveloperConsole → ✅.
- **Services** : Transport, FoodDelivery, Health, RealEstate, Events, Jobs, etc. → ✅ (pages dédiées).
- **Business** : AdvertiserDashboard, CreateAdCampaign, business page → ✅.
- **Admin** : AdminDashboard, ModerationDashboard → ✅.

---

## Synthèse des écarts frontend principaux

| Écart | Priorité | Action suggérée |
|-------|----------|------------------|
| Bannière de profil (1.6) | Moyenne | Afficher et éditer `profile_cover_url` dans Profile/ProfileHeader. |
| Liste proches / close friends (1.18, 2.45) | Moyenne | Écran ou section « Proches » (liste, ajout) ; option « Proches uniquement » à la création de post (FeedPosts). |
| Demandes de suivi (2.2) | Moyenne | Écran ou drawer « Demandes de suivi » avec acceptation/refus. |
| Options vidéo (2.40–2.42, 3.45) | Moyenne | Dans Create (vidéo) : toggles « Cacher les likes », « Désactiver commentaires », « Limiter commentaires (abonnés/mentionnés) », « Programmer la publication ». |
| Options post (2.35–2.36) | Basse | Dans FeedPosts : « Programmer la publication », « Épingler ce post ». |
| Brouillon / archivage chat (4.37–4.38) | Basse | Boutons ou menu « Archiver », « Brouillon » dans Inbox/Chat ; afficher brouillon dans Chat. |
| Message programmé (4.36) | Basse | Option « Programmer l’envoi » dans Chat (date/heure). |
| Sessions actives (1.22) | Basse | Page ou section Settings listant les sessions (`/api/me/sessions`) avec révoquer. |
| Export conversation (4.30) | Basse | Bouton « Exporter la conversation » dans Chat (appel API export). |

---

## Conclusion

- **Aligné** : La majorité des blocs CPO ont un équivalent **frontend** (pages, composants, flux) : auth, profil, feed vidéo, réactions multiples, sondages posts, mute conversations, messagerie, wallet, marketplace, créateurs, services, admin.
- **Partiel** : Plusieurs fonctionnalités ont le **backend prêt** mais l’UI ne les expose pas ou partiellement : bannière profil, close friends / liste restreinte, demandes de suivi, options vidéo (cacher likes, commentaires, programmation), options post (programmer, épingler), brouillon/archive chat, message programmé, sessions.
- **Absent** : Sondages dans les stories (2.21), E2E (4.40), quelques items niche (cartes virtuelles, etc.).

Pour un alignement **complet** avec la liste CPO, traiter en priorité les lignes du tableau « Synthèse des écarts frontend » ci‑dessus.
