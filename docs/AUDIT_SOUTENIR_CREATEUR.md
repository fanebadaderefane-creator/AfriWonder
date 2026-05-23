# 📋 Audit « Soutenir un créateur » — Existant avant implémentation

> **Date** : 11 février 2025  
> **Objectif** : Noter l'existant avant toute modification selon le prompt complet Afrofounder

---

## 1. Bouton « Soutenir » — visibilité & logique

| Exigence | État | Détail |
|----------|------|--------|
| Bouton visible pour tous | ⚠️ À vérifier | `TipModal` existe, `onTip` dans VideoCard — le créateur se donne-t-il un tip ? |
| Cliquer ouvre modal de don | ✅ | `TipModal.jsx` avec montants présets (100, 500, 1K, 2.5K, 5K F) |
| Aucune valeur financière au clic | ✅ | Création VideoTip `pending` + Transaction `pending` ; crédit **uniquement** après webhook |

**Fichiers** : `src/components/video/TipModal.jsx`, `src/components/video/VideoCard.jsx`, `backend/src/services/videoTip.service.ts`  
**Règle existante** : `if (senderId === video.creator_id)` → erreur 400 "Vous ne pouvez pas vous donner un tip à vous-même"

---

## 2. Paiement — source de vérité

| Exigence | État | Détail |
|----------|------|--------|
| Confirmation serveur Orange Money (webhook) uniquement | ⚠️ Partiel | Webhook `/api/payments/orange-money/webhook` appelle `videoTipService.completeTip()` |
| Signature webhook vérifiée | ❌ | Commentaire : "Vérifier la signature du webhook (à implémenter selon Orange Money)" |
| Création transaction SUCCESS | ✅ | `completeTip()` met `status: 'completed'` |
| Débit utilisateur | ⚠️ | Pas de débit explicite — Orange Money gère le prélèvement côté opérateur |
| Crédit wallet créateur | ✅ | `SellerWallet` + `creator_earnings` |
| Commission plateforme | ✅ | `platformRevenueService.addRevenue(afriwonder_fee)` |
| Écriture comptable | ✅ | `Transaction` créée pour le créateur |

**Flux actuel** :
1. Frontend → `POST /videos/:id/tip` → `videoTip.createTip()` → `initiateOrangeMoneyPayment()`
2. `notify_url` = `/api/payments/orange-money/webhook`
3. Webhook reçoit `{ orderId, status, pay_token }` — `orderId` = `tip.id`
4. Si `status === 'SUCCESS'` → `completeTip(orderId, status)`

**Manques critiques** :
- ❌ Vérification signature webhook Orange Money
- ❌ Idempotence explicite (blocage double callback)
- ⚠️ `verifyOrangeMoneyPayment` appelle l’API Orange — pas utilisé dans le webhook actuel

---

## 3. Commission plateforme

| Exigence | État | Détail |
|----------|------|--------|
| Commission configurable | ⚠️ | `commissions.ts` → `video_social.tips_platform_pct: 0.30` (30 %) |
| `platform_fee_percent` | ❌ | Pas de variable d’env, taux codé en dur |
| montant_brut, commission, net_créateur | ✅ | `afriwonder_fee`, `creator_earnings` dans VideoTip |
| wallet_creator += net | ✅ | `SellerWallet.balance` += `creator_earnings` |
| wallet_platform += commission | ✅ | `platformRevenueService.addRevenue()` |
| Traçabilité | ✅ | VideoTip, Transaction, PlatformRevenue |

**Fichiers** : `backend/src/config/commissions.ts`, `backend/src/services/commission.service.ts`, `backend/src/services/videoTip.service.ts`

---

## 4. Wallet créateur

| Exigence | État | Détail |
|----------|------|--------|
| balance_available | ⚠️ | `SellerWallet` a `balance` (pas de séparation available/pending) |
| balance_pending | ❌ | Non implémenté |
| balance_withdrawn | ❌ | Non implémenté (Withdrawal existe mais pas agrégé) |
| Crédit après webhook | ✅ | `completeTip()` crédite `SellerWallet` |

**Schéma** : `SellerWallet { id, user_id, balance, currency }`

---

## 5. Retrait créateur

| Exigence | État | Détail |
|----------|------|--------|
| Ajout numéro Orange Money | ✅ | `orange_money_phone` dans `requestWithdrawal` |
| Vérification OTP | ❌ | Non implémentée |
| Demande retrait | ✅ | `withdrawal.service.requestWithdrawal()` |
| Admin auto-approve / manuel | ⚠️ | Modèle `Withdrawal` avec statut ; logique admin à confirmer |
| Log payout séparé | ✅ | Table `Withdrawal` |

**Fichiers** : `backend/src/services/withdrawal.service.ts`, `backend/src/routes/withdrawals.routes.ts`  
**Validation** : format `77XXXXXXXX` (Mali)

---

## 6. Anti-fraude & intégrité

| Exigence | État | Détail |
|----------|------|--------|
| Argent uniquement via webhook | ✅ | Pas de crédit sans `completeTip` appelé par webhook |
| Transaction idempotente | ⚠️ | Aucune protection explicite contre double callback |
| Blocage double callback | ❌ | Pas de clé unique ou de verrou |
| Vérification signature Orange Money | ❌ | Non implémentée |
| Rate limit | ✅ | `webhookLimiter` 120 req/min |
| Logs complets | ⚠️ | `logger.info` présents, pas de table dédiée webhook_logs |

---

## 7. Comptage des vues

| Exigence | État | Détail |
|----------|------|--------|
| Vue = utilisateur ≠ auteur | ❌ | `video.service.getById()` incrémente `views` **sans** vérifier `userId !== creator_id` |
| Créateur regarde sa vidéo → ne compte pas | ❌ | Non implémenté |
| Vue unique / fenêtre temps (ex. 30 s) | ❌ | Incrément à chaque `getById` |
| Backend seul incrémente | ✅ | Incrément dans `video.service.getById()` |

**Fichier** : `backend/src/services/video.service.ts` lignes 238-246

---

## 8. Admin dashboard

| Exigence | État | Détail |
|----------|------|--------|
| Voir toutes transactions | ⚠️ | `adminFinance.service`, routes admin — à vérifier |
| Voir wallets | ⚠️ | À vérifier |
| Voir commissions | ⚠️ | `platformRevenue` — à vérifier |
| Voir retraits | ⚠️ | `withdrawals` — à vérifier |
| Bloquer créateur | ⚠️ | Champs `account_suspended` sur User — à vérifier |
| Forcer remboursements | ⚠️ | À vérifier |
| Statistiques globales | ⚠️ | À vérifier |
| Logs webhook | ❌ | Pas de table dédiée |
| Filtrer par statut | ⚠️ | À vérifier |

**Fichiers** : `backend/src/routes/admin.routes.ts`, `backend/src/services/adminFinance.service.ts`, `src/components/admin/FinancePanel.jsx`

---

## 9. Mode test / sandbox

| Exigence | État | Détail |
|----------|------|--------|
| Orange Money sandbox | ❌ | Pas de flag `ORANGE_MONEY_SANDBOX` ou équivalent |
| Transactions marquées `environment` | ❌ | Pas de champ `environment = test \| production` |
| Dashboards séparés | ❌ | Non implémenté |

---

## 10. Sécurité, scaling, monitoring

| Thème | État |
|-------|------|
| Sécurité & conformité | ⚠️ Signature webhook manquante |
| Audit flux paiement | ⚠️ Logs basiques, pas d’audit trail structuré |
| Scaling | ⚠️ Non évalué |
| Monitoring prod | `errorMonitoring.service` existe |
| Alertes temps réel | `ERROR_WEBHOOK_URL` pour erreurs |
| SLA & rollback | Non documenté |

---

## Résumé actions prioritaires

1. **Critique** : Vérification signature webhook Orange Money  
2. **Critique** : Exclure les vues du créateur sur ses propres vidéos  
3. **Important** : Idempotence webhook (éviter double traitement)  
4. **Important** : Commission configurable via `platform_fee_percent`  
5. **Important** : Séparation balance (available / pending / withdrawn)  
6. **Moyen** : Vérification OTP pour numéro Orange Money  
7. **Moyen** : Mode sandbox / `environment` sur les transactions  
8. **Moyen** : Logs webhook dédiés  

---

## Fichiers clés référencés

| Fichier | Rôle |
|---------|------|
| `backend/src/services/videoTip.service.ts` | Création tip, `completeTip` |
| `backend/src/services/payment.service.ts` | `initiateOrangeMoneyPayment`, `verifyOrangeMoneyPayment` |
| `backend/src/routes/payments.routes.ts` | Webhook Orange Money |
| `backend/src/config/commissions.ts` | Taux commission |
| `backend/src/services/commission.service.ts` | `videoSocialTips()` |
| `backend/src/services/withdrawal.service.ts` | Retraits créateur |
| `backend/src/services/video.service.ts` | Incrément vues |
| `src/components/video/TipModal.jsx` | Modal don |
| `src/components/video/VideoCard.jsx` | Bouton Soutenir |
