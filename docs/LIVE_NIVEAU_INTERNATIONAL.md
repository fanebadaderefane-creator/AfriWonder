# Live AfriWonder — Niveau international

## État actuel (déjà en place)

Le module live est **déjà solide** et couvre l’essentiel d’un produit type TikTok Live / Instagram Live :

| Fonctionnalité | Statut |
|----------------|--------|
| **Agora RTC** (low-latency, host + audience) | ✅ Token, join/leave, rôle host/audience |
| **Spectateurs** | ✅ Compteur en temps réel, heartbeat, nettoyage inactifs |
| **Chat** | ✅ Messages, rate limit, messages épinglés (dons) |
| **Dons / Cadeaux** | ✅ Portefeuille, tips, gifts avec animations, commission CDC 85/15 |
| **Modération** | ✅ Ban, modérateurs, slow mode, followers only |
| **Replay** | ✅ Chapitres, rétention 14j (90j premium), lecture HLS |
| **Découverte** | ✅ Liste, tri (spectateurs, récent, popularité), catégories, langues |
| **Recommandations** | ✅ Basées sur abonnements + popularité |
| **Sondages** | ✅ Création, vote, fin de sondage |
| **Co-host** | ✅ Invitation, acceptation |
| **Programmation** | ✅ Créneaux programmés |
| **Multilingue** | ✅ Traduction chat FR ↔ Bambara, TTS |
| **Export créateur** | ✅ CSV/JSON analytics |
| **Sécurité** | ✅ Rate limit dons/chat, wallet FK corrigé, balance cohérente |

Donc : **le socle est déjà au niveau “pro live”** (monétisation, modération, replay, découverte).

---

## Améliorations pour viser le “niveau international” (optionnel)

Ces points ne sont pas bloquants pour le 26 février ; ils rapprochent du niveau TikTok/YouTube Live à grande échelle.

### 1. UX connexion spectateur
- **Connexion au flux** : états clairs (Connexion… / Réessayer / Erreur) avec bouton « Réessayer » et message d’erreur explicite (réseau, stream terminé, etc.).
- **Reconnexion auto** : en cas de coupure réseau courte, réessayer 1–2 fois avant d’afficher une erreur.

### 2. Qualité vidéo (côté spectateur)
- **Sélecteur de qualité** dans le player (Auto / 720p / 480p) si Agora le permet (qualité adaptive déjà gérée par Agora ; exposer un choix manuel améliore la perception).
- **Indicateur de qualité** (icône réseau / “Qualité faible”) quand la connexion se dégrade.

### 3. Scale très grand audience (10k+ spectateurs)
- Aujourd’hui : Agora RTC (idéal pour latence faible, typiquement &lt; 10k viewers).
- Pour du “très gros” : **fallback HLS** (ou CDN) pour les spectateurs quand le nombre dépasse un seuil (ex. 5k), avec message “Mode diffusion” pour expliquer un léger délai. Non critique pour un lancement 26 février.

### 4. Notifications “en direct”
- **Push / in-app** : “X est en direct” quand un créateur suivi démarre un live (backend : événement + envoi push ou polling léger). Améliore la découverte et la fidélité.

### 5. Créateur : santé du stream
- **Indicateur host** : débit (bitrate), FPS, avertissement “Connexion instable” pour aider le créateur à corriger (réseau, qualité d’envoi).

### 6. Clips / highlights
- **Création de clips** à partir du replay (découpage 15–60 s) pour partage sur le feed ou les réseaux. Souvent présent sur les plateformes “internationales”.

### 7. “Go live” depuis le feed
- **Un tap** depuis l’onglet Accueil ou le “+” pour ouvrir directement “Démarrer un live” (titre + catégorie pré-remplis ou récents), comme sur TikTok.

---

## Conclusion

- **Aujourd’hui** : le live est déjà **au niveau “pro” / international** pour les fonctions cœur (stream, chat, dons, modération, replay, découverte, multilingue).
- **Pour le 26 février** : le module est **prêt pour la prod** ; les corrections récentes (wallet FK, balance, UX cadeaux) renforcent la robustesse.
- **Après lancement** : les points listés ci‑dessus (UX connexion, qualité, notifications, santé stream, clips, go live rapide) permettront de se rapprocher encore plus du niveau TikTok/YouTube Live à l’international.
