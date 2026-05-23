# AfriConnect — Fonctionnalités, UX et QA

Suivi des fonctionnalités, améliorations UX/UI et tests.

---

## ✅ Réalisé récemment

### Replay des lives
- **Backend** : `replay_url` déjà supporté dans `endStream(streamId, userId, { replay_url })` et en base (Prisma).
- **LiveView.jsx** : Si le live est terminé et `replay_url` est renseigné, affichage du replay en iframe plein écran. Badge "Replay" ou "Terminé" dans la barre.
- **LiveStream.jsx** : À la fin du live, dialogue « Terminer le live ? » avec champ optionnel **URL du replay**. Envoi de `replay_url` à `api.live.end(id, { replay_url })`.

### Cadeaux — AfriConnect 10 %
- **Backend** : Part déjà appliquée dans `live.service.ts` (`CREATOR_SHARE = 0.9`, `PLATFORM_SHARE = 0.1`). Créateur 90 %, plateforme 10 %.
- **LiveView.jsx** : Dans le panneau des cadeaux, mention : « AfriConnect prélève 10% sur les cadeaux. »
- **GiftPurchaseModal / Checkout** : Commission 10 % déjà indiquée côté checkout / paiement.

### Agora (flux vidéo réel)
- Intégration complète : **LiveStream.jsx** (host, caméra/micro) et **LiveView.jsx** (audience, flux distant). Indicateurs de chargement pendant la connexion.

---

## À faire / à renforcer

### 1. Notifications
- **Push** : Vérifier que FCM (backend) et VAPID (frontend) sont branchés pour « live started » aux followers.
- **In-app** : S’assurer que les notifs (commandes, événements, lives) s’affichent bien dans l’UI (cloche, liste).
- **Rappels événements** : Cron `POST /api/events/cron/send-reminders` + script `backend/scripts/cron-reminders-events.sh` documentés.

### 2. UX / UI
- **Formulaires** : Validation côté client (longueur, format) et messages d’erreur par champ (ex. création événement, inscription).
- **Messages d’erreur** : Messages utilisateur clairs pour erreurs API (auth, paiement, live, events).
- **Responsive** : Vérifier les écrans clés (LiveView, LiveStream, Events, Checkout) sur mobile et tablette.
- **Chargement** : États de chargement cohérents (squelettes ou spinners) sur les listes et détails.

### 3. Bugs / incohérences
- Tester les parcours critiques (auth, création event, réservation, live start/end/replay, cadeau, commande).
- Vérifier que les listes (lives, events, commandes) reflètent bien le statut (live / terminé, replay disponible, etc.).

### 4. Tests et robustesse
- **Backend** :
  - **Auth** : `backend/__tests__/auth.test.ts` (ou .js) — à exécuter et compléter si besoin.
  - **Orders** : `backend/src/__tests__/order.service.test.ts` — commandes, litiges.
  - **Live** : Ajouter des tests pour `sendGift` (répartition 90/10), `getStream` (présence de `replay_url`), `endStream` avec `replay_url`.
  - **Events** : Tests pour création, mise en avant, rappels, analytics.
- **Frontend** : Tests E2E ou scénarios critiques (login, réservation event, live + cadeau) si outil en place (ex. Playwright/Cypress).
- **Scénarios critiques** : Documenter et exécuter manuellement : auth, paiement (Orange Money / Stripe), live (start → viewer → cadeau → end → replay), événement (création → mise en avant → réservation).

---

## Résumé des commissions / part plateforme

| Module        | Part plateforme | Fichier / constante |
|---------------|-----------------|----------------------|
| Live (cadeaux)| 10 %            | `live.service.ts` — `PLATFORM_SHARE = 0.1` |
| Events        | 12 % (ou config)| `event.service.ts` — `PLATFORM_FEE_PCT` / `platform_fee_pct` |
| Gifts (hors live) | 12 %        | `gift.service.ts` — `PLATFORM_COMMISSION_RATE` |
| Services / booking | 10 %     | `booking.service.ts`, `service.service.ts` |
| Cart / marketplace | 10 %   | `cart.service.ts` — `PLATFORM_FEE_RATE` |
| Tips vidéo    | 10 %            | `videoTip.service.ts` |
| Autres        | Voir `platformRevenue.service.ts` et services métier |

---

Pour le déploiement et les variables d’environnement : **DEPLOIEMENT.md**, **PRODUCTION_READY.md**, **docs/ENV_REFERENCE.md**.
