# Vérification des modules — AfriConnect

Résumé de l’état des principaux modules (Orders, Events, Live) pour priorisation et déploiement.

---

## Module Commandes (Orders)

| Élément | Statut |
|--------|--------|
| Liste commandes (acheteur / vendeur) | ✅ |
| Détail commande + suivi | ✅ |
| Bouton « Signaler un problème » → dispute | ✅ |
| Lien chat avec orderId | ✅ |
| Téléchargement facture PDF | ✅ |
| Profil vendeur + getStats | ✅ |

---

## Module Événements (Events)

| Élément | Statut |
|--------|--------|
| CRUD événements (create, update, list, getById) | ✅ |
| Billetterie (book, confirm payment, Wallet/SellerWallet) | ✅ |
| Rate limit réservation (5/10s) | ✅ |
| Export CSV participants | ✅ |
| Dashboard organisateur (stats, check-in, message à tous, clôture) | ✅ |
| Téléchargement PDF billet | ✅ |
| Rappels 24h / 1h (cron) | ✅ |
| Carte Leaflet (lat/long) | ✅ |
| Section Intervenants + Sponsors | ✅ |
| FAQ, countdown | ✅ |
| Mise en avant payante (is_featured + paiement) | ✅ |
| Analytics (villes, source, inscriptions par jour) | ✅ |
| Chat pendant l’événement (inscrits, fenêtre horaire) | ✅ |
| Amis inscrits | ✅ |
| Logs actions sensibles | ✅ |

---

## Module Live Streaming

| Élément | Statut |
|--------|--------|
| Viewers réels (LiveViewer, join/leave/heartbeat, cleanup 60s) | ✅ |
| Wallet + cadeaux atomiques (90 % créateur / 10 % plateforme) | ✅ |
| Rate limit cadeaux (5/10s) + anti-spam chat (1/2s) | ✅ |
| Modération (slow mode, banned words, followers only, modérateurs, ban) | ✅ |
| Like, Top donateurs, CreatorLevel | ✅ |
| Analytics en fin de live | ✅ |
| Token stream (Agora RTC si configuré, sinon HMAC) | ✅ |
| Recharge portefeuille (Orange Money + confirmation) | ✅ |
| Notification push « Live started » aux followers | ✅ |
| Replay (replay_url optionnel à la fin du live) | ✅ |
| Page RechargeWallet (montant, presets, callback) | ✅ |

---

## Priorités techniques restantes

- **Streaming vidéo réel** : brancher SDK Agora (ou LiveKit/100ms) côté front (preview créateur + player viewer) avec `appId` / `channel` / `uid` renvoyés par le backend.
- **Webhook Orange Money** : pour confirmer automatiquement les recharges wallet (au lieu du seul retour navigateur).
- **Cron** : rappels Events + cleanup viewers Live (si pas déjà planifié).

---

*Dernière mise à jour : selon implémentation A→F (streaming, recharge, notif, replay, audit, déploiement).*
