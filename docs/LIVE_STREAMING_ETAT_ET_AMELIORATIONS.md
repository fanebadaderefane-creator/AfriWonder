# Module Live Streaming – État actuel et améliorations

**Date :** 14 février 2026

---

## 1. Déclenchement du live (immédiat ou programmé)

### État actuel

| Scénario | Comportement | Statut |
|----------|--------------|--------|
| **Live immédiat** | Créateur va sur **Lives** → "Démarrer un live" → configure titre, catégorie → démarre. Redirigé vers `LiveStream` qui appelle `api.live.start()`. | ✅ OK |
| **Live programmé** | Créateur crée un live avec `scheduled_at` (ex: demain 10h). **15 min avant** : job `liveScheduledReminder.job.ts` envoie une notification push aux abonnés. | ⚠️ Partiel |
| **Démarrage du live programmé** | Le créateur doit **manuellement** ouvrir `LiveStream?id=XXX` (depuis la page Lives ou la notif). La page appelle `api.live.startScheduled(streamId)` qui passe le statut de `scheduled` à `live`. | ✅ OK |

### Point à clarifier

Le live programmé **ne se lance pas tout seul** à l’heure prévue. Le créateur doit être présent et cliquer pour démarrer. C’est voulu : un live nécessite une diffusion active (caméra, micro, etc.).

**Amélioration possible :** ajouter un lien direct "Démarrer mon live" dans la notification de rappel (15 min avant) pour faciliter le démarrage.

---

## 2. Comment les gens voient les lives et participent

### Découverte

- **Page Lives** (`Lives.jsx`) : liste des lives en cours, programmés, replays.
- **Sections** : Populaires, Tendances, Créateurs suivis, Catégories.
- **Filtres** : catégorie, région, tri (spectateurs, récent, popularité, durée).

### Participation en temps réel

| Fonctionnalité | Implémentation | Temps réel |
|----------------|---------------|------------|
| **Chat** | Socket.IO `live:chat` | ✅ < 2 s |
| **Spectateurs** | Socket.IO `live:viewers` | ✅ Temps réel |
| **Likes** | Socket.IO `live:like` | ✅ Temps réel |
| **Réactions** (❤️ 👍 🔥) | API `POST /api/live/:id/reaction` + Socket | ✅ Temps réel |
| **Cadeaux** | Socket.IO `live:gift` | ✅ Temps réel |
| **Dons** | Socket.IO `live:tip` | ✅ Temps réel |

Le hook `useLiveSocket` écoute ces événements et met à jour l’interface en direct.

---

## 3. Achat de cadeaux et distribution

### Flux actuel

1. **Portefeuille** : l’utilisateur doit avoir un solde (recharge via Orange Money).
2. **Pendant le live** : bouton 🎁 → choix parmi 6 cadeaux (100 à 25 000 FCFA).
3. **Envoi** : `api.live.sendGift(liveId, { giftId, giftName, giftIcon, amount, quantity })`.
4. **Débit** : solde wallet diminué.
5. **Crédit** : 85 % au créateur (SellerWallet), 15 % à la plateforme.
6. **Animation** : `GiftAnimation` affiche le cadeau à l’écran.
7. **Chat** : message "🎁 Cœur x1" (ou équivalent) dans le chat.

### Dons directs (tips)

- Bouton 💵 → modal avec montant (100–1 000 000 FCFA), message optionnel, option anonyme.
- Même répartition : 85 % créateur, 15 % plateforme.
- Tiers visuels : standard, featured, super, premium, VIP (épinglage 30 s ou 2 min).

---

## 4. Admin : revenus par créateur et partage

### État actuel

| Donnée | Disponible | Où |
|--------|------------|-----|
| **Revenus live globaux 30j** | ✅ | `AnalyticsPanel` : `giftsTipsRevenue30d` (tips vidéo + gifts live) |
| **Revenus par créateur** | ❌ | Non implémenté |
| **Détail par live** | ❌ | Non dans l’admin |

### Répartition des revenus (CDC Mali)

- **Dons / cadeaux live** : 85 % créateur, 15 % plateforme.
- Config : `backend/src/config/commissions.ts` → `video_social.live_gift_creator_pct` / `live_gift_platform_pct`.
- Application : `commissionService.videoSocialLiveGift(amount)` dans `live.service.ts`.

### À ajouter pour l’admin

1. **Rapport revenus live par créateur** : total gifts + tips par créateur sur une période.
2. **Liste des lives avec revenus** : pour chaque live, montant total, part créateur, part plateforme.
3. **Export CSV** : pour comptabilité et partage des revenus.

---

## 5. Réactions en temps réel

| Type | API | Socket | Statut |
|------|-----|--------|--------|
| Like | `POST /api/live/:id/like` | `live:like` | ✅ |
| Réactions (❤️ 👍 🔥) | `POST /api/live/:id/reaction` | Émise par le backend | ✅ |

Les réactions sont bien prises en compte en temps réel via Socket.IO.

---

## 6. Plan d’améliorations proposé

### Priorité 1 – Admin : revenus live par créateur

- [ ] Endpoint `GET /api/admin/live-revenue-by-creator?from=&to=`.
- [ ] Panneau admin "Revenus Live" avec tableau créateur / total / part plateforme.
- [ ] Export CSV.

### Priorité 2 – UX live programmé

- [ ] Lien "Démarrer mon live" dans la notification de rappel (15 min avant).
- [ ] Sur la page Lives, bouton "Démarrer" visible sur les lives programmés du créateur.

### Priorité 3 – Vérifications

- [ ] Tester le flux complet : création live → envoi gift → vérifier crédit créateur + commission plateforme.
- [ ] Vérifier que Socket.IO est bien connecté en production (CORS, path).

---

## Fichiers clés

| Rôle | Fichiers |
|------|----------|
| Démarrage live | `LiveStream.jsx`, `live.service.ts` (start, startScheduledStream) |
| Rappel programmé | `liveScheduledReminder.job.ts` |
| Découverte | `Lives.jsx`, `live.service.ts` (getDiscovery, listStreams) |
| Visionnage | `LiveView.jsx`, `useAgora.js` (audience) |
| Cadeaux / dons | `LiveView.jsx` (sendGiftMutation, sendTipMutation), `live.service.ts` (sendGift, sendTip) |
| Temps réel | `useLiveSocket.jsx`, `backend/src/index.ts` (Socket.IO) |
| Commissions | `commissions.ts`, `commission.service.ts` |
| Revenus plateforme | `platformRevenue.service.ts`, `admin.service.ts` (getStrategicAnalytics) |
