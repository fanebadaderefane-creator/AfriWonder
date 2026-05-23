# AfriWonder — Mobile Money + Catalogue Cadeaux (Revenue #1)

## 💰 Économie des cadeaux : flux complet

```
[Utilisateur Mali]  →  [Orange Money / Wave]  →  [Backend Render]  →  [Wallet coins]  →  [Cadeau Live]  →  [Créateur]
   5 000 FCFA          Payment URL                Webhook OK           +1075 coins       -500 coins         350 FCFA
                                                                                                          (70% × 500 × 5×0.7×0.2)
```

### Tarification (configurable via env / DB)
- **1 coin = 5 FCFA** (taux de vente aux utilisateurs)
- **Part créateur = 70%** des coins reçus
- **Cashout créateur** : conversion coins → FCFA → retrait Orange Money / Wave

### 10 Packs Coins disponibles (avec bonus progressif TikTok-style)

| Slug | Prix FCFA | Coins | Bonus | Total | Popular |
|------|-----------|-------|-------|-------|---------|
| coins-50 | 250 | 50 | 0 | 50 | — Découverte |
| coins-100 | 500 | 100 | 0 | 100 | — Starter |
| coins-300 | 1 500 | 300 | 15 (5%) | 315 | — |
| coins-500 | 2 500 | 500 | 25 (5%) | 525 | ⭐ Populaire |
| coins-1000 | 5 000 | 1 000 | 75 (7.5%) | 1 075 | — Pro |
| coins-2500 | 12 500 | 2 500 | 250 (10%) | 2 750 | — Premium |
| coins-5000 | 25 000 | 5 000 | 500 (10%) | 5 500 | — Power |
| coins-10000 | 50 000 | 10 000 | 1 200 (12%) | 11 200 | — VIP |
| coins-25000 | 125 000 | 25 000 | 3 750 (15%) | 28 750 | — Whale |
| coins-50000 | 250 000 | 50 000 | 9 000 (18%) | 59 000 | — Légende |

## 🎁 Catalogue Cadeaux : 86 cadeaux × 13 catégories × 5 rarities

### Rarities (couleur visuelle dans l'UI)
- **Common** (gris) : 1-100 coins (5-500 FCFA) — usage massif
- **Rare** (bleu) : 51-300 coins (250-1500 FCFA) — usage moyen
- **Epic** (violet) : 350-2000 coins (1750-10000 FCFA) — moments forts
- **Legendary** (orange) : 2200-10000 coins (11000-50000 FCFA) — gros supporters
- **Mythic** (rouge néon) : 12000-50000 coins (60000-250000 FCFA) — whales / superfans

### Catégories (tabs UI horizontaux TikTok-style)

| Catégorie | Icône | Nb cadeaux | Exemples |
|-----------|-------|------------|----------|
| Classic | 🌹 | 8 | Rose, Cœur, Étoile, Sparkle |
| Afrique | 🦁 | 14 | Djembé, Kora, Baobab, Lion, Éléphant |
| Culture | 🇲🇱 | 11 | Thiéboudienne, Bissap, Boubou, Tabaski, Drapeaux Mali/Sénégal/CI |
| Luxe | 💎 | 13 | Champagne, Yacht, Ferrari, Jet privé, Palais |
| Fantastique | 🐉 | 8 | Dragon, Phoenix, Météore, Galaxie, Fusée |
| Fête | 🎆 | 3 | Ballon, Feu d'artifice |
| Musique | 🎵 | 4 | Micro, Note, Concert privé |
| Resto | 🍕 | 7 | Pizza, Sushi, Gâteau, Café, Cupcake |
| Sport | ⚽ | 3 | Football, Basket, Trophée |
| Gaming | 🎮 | 2 | Manette, Casque VR |
| Nature | 🌈 | 3 | Arc-en-ciel, Volcan, Aurora |
| Réaction | 👏 | 3 | Applaudissements, Éclair, Sparkle |
| **VIP** | 🔱 | 6 | **Lamborghini, Empire, Trône, Légende, Univers** |

### 🌍 Cadeaux locaux Afrique de l'Ouest (NOUVEAU)
- 🇲🇱 Drapeau Mali, 🇸🇳 Drapeau Sénégal, 🇨🇮 Drapeau Côte d'Ivoire (850 coins)
- Thiéboudienne, Bissap, Boubou, Tabaski (mouton fête), Mangue (28-140 coins)
- Tombouctou, Mansa Musa, Caravane Sahara (3300-7000 coins)
- Empire africain, Trône royal (20000-25000 coins — Whales)

Ces cadeaux culturels créent un **lien émotionnel fort** avec votre cible.

## 🛒 Flow de vente complet

### Côté utilisateur (mobile app)
1. Dans live → tap 🎁 → ouvre `LiveGiftsPanel`
2. Tab "Cadeaux" : 13 catégories à choisir, 86 cadeaux total
3. Si pas assez de coins → tab "Recharger"
4. Choisir pack (10 options) → choisir Orange Money OU Wave
5. Entrer numéro de téléphone (format +223XX OU +221XX OU +225XX)
6. Bouton "Payer" → ouvre Orange Money / Wave app via deep link
7. User valide paiement → callback retour vers AfriWonder
8. Backend webhook confirme → coins crédités au wallet
9. Toast "✓ +1075 coins" → user revient au tab "Cadeaux" → envoie son cadeau

### Côté créateur
1. Reçoit notif push "Fatou vous a offert un Diamant 💎 (+105 FCFA)"
2. Animation grandiose côté broadcaster ET viewers
3. Wallet créateur crédité (70% × coin_value × FCFA_per_coin)
4. Top fans mis à jour temps réel
5. Cashout via `/wallet/withdraw` → choix Orange Money / Wave → retrait sur sa propre carte SIM

## ⚙️ Configuration Render requise

```env
# === Coins/Wallet ===
LIVE_COIN_RATE_XOF=5              # 1 coin = 5 FCFA (vente)
LIVE_GIFT_CREATOR_SHARE=0.7       # 70% pour créateur, 30% plateforme

# === Orange Money (Sandbox + Prod) ===
ORANGE_MONEY_API_URL=https://api.orange.com/orange-money-webpay/dev/v1
ORANGE_MONEY_CLIENT_ID=...
ORANGE_MONEY_CLIENT_SECRET=...
ORANGE_MONEY_MERCHANT_KEY=...
ORANGE_MONEY_RETURN_URL=https://afriwonder.onrender.com/api/payments/orange-money/return
ORANGE_MONEY_CANCEL_URL=https://afriwonder.onrender.com/api/payments/orange-money/cancel
ORANGE_MONEY_NOTIF_URL=https://afriwonder.onrender.com/api/payments/orange-money/webhook

# Format téléphone par pays
ORANGE_MONEY_COUNTRY_DEFAULT=ML  # ML / SN / CI

# === Wave ===
WAVE_API_KEY=...
WAVE_API_URL=https://api.wave.com/v1
WAVE_WEBHOOK_SECRET=...
WAVE_RETURN_URL=https://afriwonder.onrender.com/api/payments/wave/return
```

### Obtenir les credentials
- **Orange Money** : https://developer.orange.com/apis/om-webpay (compte développeur — gratuit, prod après vérification ID)
- **Wave** : https://docs.wave.com/business (créer compte business Wave Sénégal — vérification commerce requise)

## 🧪 Tests à faire (étape par étape)

### Test 1 — Récupérer la liste de coin packs
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://afriwonder.onrender.com/api/coins/packages
```
Doit retourner 10 packs.

### Test 2 — Initier un achat
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"packageId":"coins-500","payment_method":"orange_money","phone":"+22370000000"}' \
  https://afriwonder.onrender.com/api/coins/initiate-purchase
```
Doit retourner `payment_url` + `reference_id`.

### Test 3 — Catalog gifts complet
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://afriwonder.onrender.com/api/live/gifts
```
Doit retourner 86 cadeaux avec catégorie + rarity.

### Test 4 — Envoyer un cadeau (après recharge)
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"giftId":"<id-rose>","quantity":1,"liveId":"<live-id>"}' \
  https://afriwonder.onrender.com/api/live/<live-id>/gift
```
Doit décrémenter wallet, créer GiftTransaction, émettre socket `live:gift` aux viewers.

### Test 5 — Sur device : flow complet
1. Login dans l'app
2. Ouvrir un live
3. Tap 🎁 → Tab "Recharger" → Pack 500
4. Choisir Orange Money → entrer +22370... → Payer
5. **Confirmation Orange Money sur device** (PIN OM)
6. Retour app → balance coins +525
7. Tap "Rose" 1× → confirmer envoi
8. Vérifier animation rose + balance -1 coin

## 💸 Estimation revenu

Hypothèses prudentes pour 1000 utilisateurs actifs Mali/Sénégal/CI :
- 30% font des achats coins (300 users)
- ARPU moyen : 3 000 FCFA/mois
- Revenu brut : 900 000 FCFA/mois = ~1370 EUR
- Part plateforme (30%) : 270 000 FCFA = ~410 EUR/mois

**Avec battles + scaling** : ARPU peut ×3 → ~1200 EUR/mois plateforme à 1000 utilisateurs.

## ✅ Validation finale du flow

Pour valider en prod, vous devez :
1. ✅ Catalogue gifts seed appliqué (86 cadeaux) — DONE (modifié `liveGiftsSeedData.ts`)
2. ✅ Coin packages seed étendu (10 packs) — DONE (modifié `seed.ts`)
3. ✅ Migration Prisma exécutée (`prisma migrate deploy` sur Render au déploiement)
4. ⏳ Re-seed Render après push (commande à lancer ou automatique selon votre setup)
5. ⏳ Variables env Orange Money + Wave configurées sur Render
6. ⏳ Webhooks testés (tester end-to-end avec un vrai compte)
7. ⏳ Cashout créateur testé (le retrait, pas juste l'envoi)

## 🚀 Comment relancer le seed après push

Sur Render Shell :
```bash
cd /opt/render/project/src/backend
npx prisma db seed
```

Ou via une commande Render Job ponctuelle.

## Bonus : Idées pour maximiser le revenu

1. **Daily login coins** : 5-10 coins gratuits/jour = engagement
2. **First gift = 10% bonus** sur le créateur ciblé
3. **Combos** : 99 roses d'affilée → animation spéciale "fan #1"
4. **Tiers fan** : Bronze (>1000 coins envoyés à 1 créateur), Silver (5000), Gold (25000), Diamond (100000) — affichés en chat
5. **Quêtes hebdo** : "Envoie 3 cadeaux différents cette semaine → +50 coins"
6. **Saisons** : pendant Tabaski, cadeau "Mouton 🐏" boosté ×2 valeur
