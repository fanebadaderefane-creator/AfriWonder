# Paid Video Calls (User ↔ Star) — AfriWonder

> **Module isolé (vague 9).** Ne modifie aucune table existante. Préfixe base de données `Star*`. Préfixe API `/api/stars` (public/user) et `/api/admin/stars` (admin). Écrans sous `/stars/*` (côté fan/star) et `/(admin)/stars` (côté admin).

## 1. Objectif produit

Permettre aux utilisateurs d'AfriWonder (fans) de **réserver et payer** un appel vidéo privé de 5, 10 ou 15 minutes avec un créateur/star. Le paiement est **mis en séquestre** (escrow wallet), l'appel se lance automatiquement à l'heure du créneau via **Agora**, puis l'argent est libéré à la star (minus commission plateforme 20 %) si l'appel s'est bien déroulé, sinon le fan peut ouvrir un **litige**.

## 2. Rôles

| Rôle  | Capacités |
|-------|-----------|
| **Fan** (user) | Découvrir, réserver, payer, rejoindre, prolonger (+5 min), annuler, noter, ouvrir un litige |
| **Star** | Activer le mode, fixer prix 5/10/15 min, définir disponibilités, recevoir appels, retirer ses gains |
| **Admin** | KPIs, vérifier/bannir star, inspecter bookings, résoudre litiges (remboursement total/partiel/rejet), forcer un refund, lancer le reaper |

## 3. Architecture technique

### 3.1 Base de données (Prisma)
Migration `20260424000300_star_calls`:
- `StarProfile` — profil star (prix, bio, tags, compteurs, état)
- `StarAvailabilityRule` — règles récurrentes (par jour de semaine) ou spécifiques (date exacte)
- `StarBooking` — réservation avec statut, escrow, frais plateforme, revenus star
- `StarCallSession` — session d'appel (uids Agora, heartbeats)
- `StarBookingExtension` — extensions +5 min achetées en cours d'appel
- `StarRating` — note + avis post-appel
- `StarDispute` + `StarDisputeMessage` — litiges et discussion

### 3.2 Backend
- `backend/src/services/starCall.service.ts` — toute la logique métier (escrow via `Wallet.locked_balance`, génération de slots, jetons Agora, reaper no-show).
- `backend/src/routes/stars.routes.ts` — API publique + fan + star (monté sur `/api/stars`).
- `backend/src/routes/starsAdmin.routes.ts` — API admin (monté sur `/api/admin/stars`).

### 3.3 Frontend (Expo React Native)
- `frontend/src/api/starsApi.ts` — client API fan/star.
- `frontend/src/api/adminStarsApi.ts` — client API admin.
- `frontend/src/hooks/useStarCallRtc.native.tsx` — hook Agora (profil `Communication`, 1-à-1, fallback audio).
- `frontend/src/hooks/useStarCallRtc.web.tsx` — placeholder web (pas d'appel vidéo natif sur le web).
- Écrans :
  - `frontend/app/stars/index.tsx` — découverte avec recherche/filtre vérifié.
  - `frontend/app/stars/[id].tsx` — profil + réservation.
  - `frontend/app/stars/call/[bookingId].tsx` — **écran appel actif** (timer + extension +5 min + raccrocher).
  - `frontend/app/stars/bookings.tsx` — mes réservations (onglets fan / côté star).
  - `frontend/app/stars/rate/[bookingId].tsx` — note 1-5 + avis ou ouverture de litige.
  - `frontend/app/stars/become.tsx` — activer le mode star (bio, langues, tags).
  - `frontend/app/stars/dashboard.tsx` — paramétrage star (prix, max/j, disponibilités).
  - `frontend/app/(admin)/stars.tsx` — hub admin (KPIs, onglets Stars / Bookings / Litiges).

**CdC mobile (notifications & paiement)**  
- Push Expo / tap depuis la liste **Notifications** : si `reference_type === star_booking`, alors `star_call_reminder_10min` ou `star_call_ready` → `/stars/call/[bookingId]` ; les autres `star_call_*` → `/stars/bookings`. Implémenté via `frontend/src/utils/starBookingPushNavigation.ts` (+ données enrichies dans `notification.service.ts`).  
- **Solde insuffisant (HTTP 402)** à la réservation : alerte explicite + CTA **Recharger** vers `/wallet/recharge` (`stars/[id].tsx`). Bandeau **Portefeuille** sur l’étape 1 du wizard pour rappeler le séquestre wallet avant confirmation.

### 3.4 Feature flag
- `EXPO_PUBLIC_ENABLE_STAR_CALLS` (default `false`). Active l'entrée Menu+ « Appels vidéo » et ouvre les écrans. Lorsqu'il est à `false`, l'écran de découverte affiche un état « bientôt disponible ».
- `STAR_CALL_PLATFORM_COMMISSION` (default `0.20`). Taux de commission plateforme côté backend.
- `STAR_CALL_EXTENSION_PRICE_FCFA` (default `500`). Prix unitaire d'une extension +5 min.
- `STAR_CALL_SLOT_STEP_MINUTES` (default `10`). Pas entre débuts de créneaux affichés.
- `STAR_CALL_FAN_LATE_CANCEL_REFUND_RATE` (default `0.5`). Part remboursée au fan en annulation tardive (reste = frais).
- `STAR_CALL_WORKER_SECRET`. Secret pour appeler `/api/stars/_internal/reaper` depuis un cron externe.
- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE`. Obligatoires pour la génération de jetons RTC.

## 4. Flow utilisateur

### 4.1 Réservation
1. Fan ouvre `/stars`, parcourt la liste, sélectionne une star.
2. Écran `[id].tsx` : choisir durée (5/10/15 min), jour, créneau.
3. POST `/api/stars/bookings` :
   - **`payment_method` absent ou `wallet`** : booking `confirmed`, débit `available_balance` + séquestre `locked_balance`, session Agora créée, redirection `/stars/call/[bookingId]`.
   - **`payment_method: orange_money`** + `payment_phone` : booking `pending_payment`, initiation Orange Money (`order_id` = `StarBooking.id`, `transaction.type = star_call_booking`, sans `OrderPayment`). Réponse inclut `payment.paymentUrl`. Après SUCCESS (webhook ou `/api/payments/orange-money/verify`), `confirmBookingAfterOrangeMoney` aligne le wallet (crédit externe + escrow) et passe en `confirmed`.
4. Fan est redirigé vers `/stars/call/[bookingId]` lorsque `confirmed` (wallet tout de suite ; Orange Money après paiement).

### 4.1 bis Grille CdC → implémentation (extrait)

| Exigence CdC (résumé) | Statut | Emplacement principal |
|----------------------|--------|------------------------|
| Créneaux / pas / anti-chevauchement | OK | `STAR_CALL_SLOT_STEP_MINUTES`, `listSlots`, tests |
| Séquestre jusqu’à l’appel | OK | Wallet + ledger ; OM après webhook |
| Annulation fan (anticipée / tardive) | OK | `cancelByFan`, env `STAR_CALL_*` |
| No-show / reaper | OK | `starCall.service` + job interne |
| Paiement **sans** solde wallet préalable | OK | `orange_money` + Expo `[id].tsx` |
| MTN / Moov / Wave sur booking star | Partiel / à brancher | Même pattern que OM (`confirm*` + init provider) |
| Appel vidéo Web PWA | Placeholder | `useStarCallRtc.web.tsx` |

**Créneaux (CdC §6)** — Génération avec **pas fixe entre débuts** (`STAR_CALL_SLOT_STEP_MINUTES`, défaut **10** min), aligné sur l’exemple 18:00 / 18:10 / 18:20. Un filtre évite deux créneaux proposés qui se chevauchent pour la durée choisie (5 / 10 / 15 min).

### 4.2 Appel
1. Chaque participant obtient un jeton Agora via POST `/bookings/:id/agora-token`.
2. `useStarCallRtc` initialise `react-native-agora` en profil `Communication`, publie micro + caméra.
3. Dès que `onUserJoined` se déclenche côté fan **et** côté star, le **timer démarre** (côté client).
4. Toutes les 10 s, POST `/heartbeat` pour marquer la session vivante (anti-freeze).
5. Bouton « +5 min » (fan uniquement) → POST `/extend` → déduit XOF supplémentaires du wallet fan, incrémente `extra_minutes`.
6. Raccrocher → POST `/end`. Backend libère l'escrow à la star (80 %) et conserve la commission (20 %).

### 4.3 Cancellations & no-shows
- Fan annule **plus de `STAR_CALL_REFUND_CANCEL_WINDOW_MIN` minutes** avant le créneau (défaut **30**) → remboursement **intégral**.
- Fan annule **à l’intérieur** de cette fenêtre → remboursement **partiel** au fan (`STAR_CALL_FAN_LATE_CANCEL_REFUND_RATE`, défaut **0,5**), le montant restant quitte l’escrow selon la même répartition commission / star que `computePlatformFee`.
- Star annule → remboursement total fan + pénalité (incrément `calls_no_show`).
- Reaper (cron ou manuel) :
  - Booking `confirmed` > `scheduled_end_at + 2 min` sans session démarrée → annulé + refund total.
  - Booking `ongoing` > `scheduled_end_at + 30 s` → `completed` automatique.

### 4.4 Litiges
1. Fan ouvre litige depuis `/stars/rate/[bookingId]` (bouton « Signaler un problème »).
2. Admin décide via `/(admin)/stars` :
   - Remboursement total (`resolved_refund_full`) — tout revient au fan.
   - Partiel (`resolved_refund_partial`) — montant paramétrable.
   - Rejeté (`resolved_rejected`) — statut initial préservé.
3. Actions auditées via `adminAuditService`.

## 5. Sécurité

- Toutes les routes wallet utilisent `prisma.$transaction` (atomique, pas d'état inconsistant).
- Escrow : l'argent ne quitte jamais le wallet fan (locked_balance) tant que l'appel n'est pas fini.
- Jeton Agora signé (HMAC), TTL 10 min, UID unique par booking + rôle.
- `/_internal/reaper` protégé par `X-Worker-Secret`.
- Admin : toutes les actions critiques (verify, ban, resolve dispute, force refund) passent par `requireAnyAdmin` et `adminAuditService`.

## 6. QA check-list (cartes par scénario)

| # | Scénario | Outcome attendu |
|---|----------|----------------|
| S-01 | Activer mode star (bio + langues) | Profil créé, inactif par défaut |
| S-02 | Définir prix 5/10/15 + disponibilités Lun-Ven 18-22h | Slots générés uniquement à ces heures |
| S-03 | Fan sans solde tente de réserver | Message « Solde insuffisant », aucune ligne Transaction créée |
| S-04 | Fan réserve 10 min @ 18:00, wallet débité, star recevoir notification | Booking `confirmed` + Notification envoyée |
| S-05 | Les deux participants rejoignent à 18:00 | Timer démarre à 10:00, vidéo visible |
| S-06 | Fan clique +5 min à 18:04 | Wallet re-débité, `extra_minutes = 5`, timer prolongé |
| S-07 | Fan raccroche à 18:06 | Booking `completed`, 80% → star, 20% → plateforme |
| S-08 | Fan ne se connecte pas pendant 2 min | Reaper → statut `no_show_fan`, aucun remboursement |
| S-09 | Star absente 2 min | Reaper → `cancelled`, fan remboursé en totalité |
| S-10 | Fan note 5/5 | Rating créé, `rating_avg` mis à jour |
| S-11 | Fan ouvre un litige | Dispute `open`, admin notifié |
| S-12 | Admin résout en refund total | Fan crédité, booking `refunded` |
| S-13 | Admin bannit une star | `is_banned=true`, `is_active=false` forcé, n'apparaît plus en discovery |
| S-14 | Réseau 3G dégradé | Fallback audio détecté, timer continue, pas de crash |
| S-15 | Expiration jeton Agora en plein appel | Heartbeat renvoie erreur, reconnect silencieux ; si échec, message humain |

## 7. Déploiement

### Phase 1 — Internal only (pilot)
1. `npx prisma migrate deploy` (migration `20260424000300_star_calls`).
2. Déployer backend (routes déjà montées).
3. Ajouter secrets EAS : `EXPO_PUBLIC_ENABLE_STAR_CALLS=0` (off pour le grand public), backend `STAR_CALL_WORKER_SECRET`, vérifier `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE`.
4. Onboarder 3-5 stars manuellement via `POST /api/stars/me/star/activate` (compte interne).
5. Vérifier les 15 cartes QA avec comptes tests internes.

### Phase 2 — Créateurs sélectionnés
1. Ouvrir le flag à un sous-ensemble d'utilisateurs via server-driven flag ou EAS preview channel.
2. Monitorer : taux de no-show, temps moyen d'appel, litiges ouverts, CA.

### Phase 3 — Ouverture publique
1. `EXPO_PUBLIC_ENABLE_STAR_CALLS=1` en production.
2. Communication produit (banner in-app, push notifications aux créateurs existants).
3. Ajouter le cron reaper (ex. toutes les minutes via Workers/ECS) → `POST /api/stars/_internal/reaper`.

## 8. Monitoring

- Compteurs exposés via `/api/admin/stars/kpis` : profils, bookings, revenus, commission, refunds, litiges ouverts.
- Tous les appels logs via `logger` (Sentry + console).
- Actions admin → `adminAuditService` (table `AdminAuditLog`).

## 9. Limites V1 connues (à suivre)

- UI admin Alert.prompt seulement sur iOS — pour Android/web, la V2 aura un modal dédié pour saisir les montants de partial refund.
- Le paiement utilise **uniquement le wallet interne** (escrow via `Wallet.locked_balance`). Intégration Stripe/MoMo directe **post-V1** (actuel : le fan alimente son wallet via les canaux existants d'AfriWonder).
- L'extension est calculée sur un **prix plat** (`STAR_CALL_EXTENSION_PRICE_FCFA`). Si la star veut un tarif progressif, on ajoutera `price_fcfa_extension` dans `StarProfile` en V2.
- Pas encore de retrait automatique vers Mobile Money pour la star — elle utilise le flux `Withdrawal` existant.
