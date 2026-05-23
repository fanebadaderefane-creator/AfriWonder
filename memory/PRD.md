# AfriWonder - PRD & Setup Memory

## Original Problem Statement
Repo: https://github.com/fanebadaderefane-creator/AfriWonder
Clients : Mobile Android/iOS — Mali, Sénégal, Côte d'Ivoire, etc.

## What's Been Implemented (Sessions 1-9)

1. **Session 1** — Connexion repo ✅
2. **Session 2** — Messagerie : transcription Whisper + historique appels ✅
3. **Session 3** — Traduction GPT-5.2 (FR/EN/BM/WO) ✅
4. **Session 4** — Appels WebRTC optimisés Afrique ✅
5. **Session 5** — CallKit iOS + Notifee Android ✅
6. **Session 6** — VoIP Push iOS + FCM hooks ✅
7. **Session 7** — Live floating hearts TikTok ✅
8. **Session 8** — Notif "ami en live" + Swipe-feed + Live Shopping ✅

### Session 9 — Catalogue cadeaux étendu + audit Mobile Money ✅

**Catalogue gifts étendu : 56 → 86 cadeaux**
- `backend/prisma/liveGiftsSeedData.ts` réécrit
- **13 catégories** (vs 9 avant) : ajout `culture`, `vip`
- **5 rarities** (vs 4 avant) : ajout `mythic` (>10000 coins)
- **Cadeaux culturels Afrique de l'Ouest** :
  - 🇲🇱🇸🇳🇨🇮 Drapeaux Mali, Sénégal, Côte d'Ivoire
  - Thiéboudienne, Bissap, Boubou, Mangue, Tabaski (mouton)
  - Tombouctou, Mansa Musa (empire), Caravane Sahara
  - Empire africain, Trône royal, Légende vivante (VIP)
  - Cheval blanc, Djembé, Kora, Balafon, Masque Dogon, Baobab
- **Tier VIP/Mythic** (whales) : 12000-50000 coins / 60000-250000 FCFA
  - Lamborghini, Galaxie, Empire, Trône, Légende, Univers

**Coin Packages étendus : 4 → 10 packs**
- `backend/prisma/seed.ts` updated
- Tiers complets avec bonus % progressif (TikTok-style) :
  - Découverte 50 coins → Légende 50000 coins
  - Bonus de 0% (starter) à 18% (whale)

**UI gifts.tsx améliorée**
- Ajout state `activeCategory` avec filtre
- 14 onglets catégories horizontaux (avec icône + count)
- Tab "Tous" pour voir tout
- Tab actif highlighté orange (Colors.primary)
- Filtrage `filteredCatalog` mémoïsé
- Tri par prix croissant dans chaque catégorie
- Empty state si catégorie vide

**Guide complet créé : `memory/GUIDE_MOBILE_MONEY_GIFTS.md`**
- Tarification (1 coin = 5 FCFA, 70% créateur)
- 10 packs tableau complet
- 86 cadeaux × 13 catégories tableau complet
- Flow vente A à Z (utilisateur + créateur)
- Variables env Render (Orange Money + Wave)
- 5 tests E2E avec curl
- Estimation revenu (1000 users → ~410 EUR/mois plateforme)
- 6 idées pour maximiser revenu (daily login, combos, tiers fan, quêtes, saisons)

## Configuration Render prod requise (CRITIQUE pour activer revenue)

```env
# Coins
LIVE_COIN_RATE_XOF=5
LIVE_GIFT_CREATOR_SHARE=0.7

# Orange Money (https://developer.orange.com/apis/om-webpay)
ORANGE_MONEY_API_URL=https://api.orange.com/orange-money-webpay/dev/v1
ORANGE_MONEY_CLIENT_ID=...
ORANGE_MONEY_CLIENT_SECRET=...
ORANGE_MONEY_MERCHANT_KEY=...
ORANGE_MONEY_RETURN_URL=...
ORANGE_MONEY_NOTIF_URL=...

# Wave (https://docs.wave.com/business)
WAVE_API_KEY=...
WAVE_API_URL=https://api.wave.com/v1
WAVE_WEBHOOK_SECRET=...
WAVE_RETURN_URL=...
```

## Cumul total sessions 1-9
- **20+ fichiers modifiés / 13+ fichiers créés**
- **~2200 lignes ajoutées**
- **9+ fonctionnalités majeures**
- **7 guides détaillés dans `/app/memory/`**

## Files in /app/memory
- `PRD.md`
- `PLAN_LOTS.md`
- `GUIDE_TURN_SERVER.md`
- `GUIDE_TEST_APK.md`
- `GUIDE_LIVE_AGORA.md`
- `PLAN_LIVE_BATTLE.md`
- `GUIDE_MOBILE_MONEY_GIFTS.md` ⭐ NEW

## Next Action Items
1. **User** : Save to GitHub → Render redeploy
2. **User** : Lancer `npx prisma db seed` sur Render Shell pour appliquer le catalogue étendu
3. **User** : Configurer env vars Orange Money + Wave (critique)
4. **User** : Tester flow paiement complet (test 1-5 dans GUIDE_MOBILE_MONEY_GIFTS.md)
5. **User** : EAS Build + tester sur APK
6. **User** : Valider revenu réel avec 5-10 vrais utilisateurs avant scale

## Suggestion business
**Pour démarrer revenu rapidement** :
- Lancer une promo "1er achat coins = +50% bonus" pendant 7 jours
- Identifier 3-5 créateurs ambassadeurs (Mali/Sénégal/CI) → leur faire des lives "tests" avec gifts virtuels offerts par AfriWonder
- Une fois 3-5 lives par jour actifs → activer les notifs "ami en live" → boost organique
