# AfriWonder — Admin Revenue Tracking + Catalogue Mega-Gifts

## 👨‍💼 Admin Revenue Dashboard (NOUVEAU)

### Accès
Comme admin de la plateforme, ouvrez l'app → onglet Admin → "Revenus Live par créateur 💰"

### Ce que vous voyez

**3 KPIs en haut** :
1. **Revenu brut** — Total coins reçus sur la période, converti en FCFA
2. **Aux créateurs** — 70% des coins → ce que vous devez payer aux créateurs (cashout)
3. **Commission AfriWonder** — 30% que la plateforme garde

**Filtres** :
- Période : 7 jours / 30 jours / 90 jours / Tout
- Recherche par nom de créateur

**Liste des créateurs (top → bas par revenu)** :
- Rang #1, #2, #3...
- Avatar + nom + @username
- 🎁 nb cadeaux · 💸 nb tips
- Part créateur (FCFA) en vert
- Tap → détails complets (cadeaux, tips, commissions)

**Export CSV** :
- Bouton ⬇️ en haut à droite
- Colonnes : Créateur, Username, ID, Gifts coins, Tips coins, Part créateur, Commission, Nb cadeaux, Nb tips
- Sert pour vos paiements mensuels par virement / Mobile Money

### Données techniques

Endpoint : `GET /api/admin/live-revenue-by-creator?from=...&to=...&page=1&limit=100`

Aggregation depuis :
- Table `LiveGift` (cadeaux virtuels avec `creator_id`, `total_amount`, `creator_earnings`, `platform_commission`)
- Table `LiveTip` (pourboires directs avec `creator_id`, `amount`, `creator_earnings`, `platform_commission`)

Tri par `creator_earnings` décroissant.

### Workflow paiement créateurs

1. **Lun matin** : Ouvrir admin → Revenus Live → Période "7 jours"
2. **Exporter CSV** → ouvrir dans Excel/Google Sheets
3. **Pour chaque créateur** avec earnings > 5000 FCFA :
   - Récupérer son numéro Orange Money / Wave (depuis sa fiche profil)
   - Envoyer le montant en utilisant l'API marchand
   - OU faire un retrait manuel depuis le wallet
4. **Marquer payés** dans votre suivi (Notion / Sheet)

**TODO futur** : Bouton "Payer ce créateur" dans le détail → POST automatique vers wallet.withdraw → exécute Orange Money payout API.

---

## 🎁 Catalogue Cadeaux MEGA : 86 → 212 cadeaux

### Stats du catalogue final

| Catégorie | Nb cadeaux | Plage prix |
|-----------|------------|------------|
| **Animaux** 🐘 (NOUVEAU) | ~50 | 115-720 coins |
| **Culture** 🇲🇱 | 22 | 28-7200 coins |
| **Luxe** 💎 | 32 | 120-10000 coins |
| **Fantastique** 🐉 | 18 | 750-9500 coins |
| **Afrique** 🦁 | 14 | 50-3300 coins |
| **Food** 🍕 | 23 | 7-105 coins |
| **VIP/Mythic** 🔱 | 16 | 12000-100000 coins |
| **Music** 🎵 | 4 | 15-2400 coins |
| **Party** 🎆 | 6 | 40-205 coins |
| **Sport** ⚽ | 5 | 35-420 coins |
| **Nature** 🌈 | 7 | 41-1900 coins |
| **Reaction** 👏 | 10 | 9-96 coins |
| **Classic** 🌹 | 11 | 1-1800 coins |
| **Gaming** 🎮 | 2 | 45-55 coins |

**Total : 212 cadeaux** ✓

### Highlights du nouveau catalogue

#### 🌍 Cadeaux culturels Afrique de l'Ouest étendus
- **Drapeaux** : Mali, Sénégal, Côte d'Ivoire, Burkina, Guinée, Niger, Mauritanie, Togo, Bénin (9 pays)
- **Plats** : Thiéboudienne, Bissap, Mangue
- **Tradition** : Tabaski (mouton), Boubou, Caravane Sahara
- **Monuments** : Mausolée Tombouctou, Mosquée Djenné, Empire Mansa Musa, Trésor de Mali
- **Instruments** : Djembé, Kora, Balafon, Masque Dogon

#### 🐘 Animaux (catégorie complète NOUVELLE)
50+ animaux : Lapin, Chien, Chat, Souris, Singe, Loup, Cheval, Ours, Panda, Pingouin, Hibou, Aigle, Cygne, Pieuvre, Poisson, Méduse, Crabe, Crevette, Calamar, Tortue, Serpent, Gorille, Orang-outan, Crocodile, Hippopotame, Rhinocéros, Buffle, Renard, Raton laveur, Hérisson, Tigre, Léopard, Lion, Zèbre, Girafe, Éléphant, Pégase, Phoenix, Phoenix d'or...

#### 🔱 Tier VIP/Mythic (whales)
16 cadeaux de 12 000 à 100 000 coins (60 000 à 500 000 FCFA) :
- Lamborghini, Bugatti, Ferrari
- Galaxie complète, Voie lactée, Multivers, Univers
- Royaume africain, Empire continental, Trône royal
- Dieu africain, Big Bang, Trou noir, Création, Au-delà

Ces gifts sont conçus pour vos **superfans** qui dépensent 100 000+ FCFA par mois et veulent un statut visible.

#### Animations différenciées par rarity
- **Common** (gris) : animation simple 1-2s
- **Rare** (bleu) : animation moyenne 3s + effet sonore
- **Epic** (violet) : animation grande 4s + sound + particles
- **Legendary** (orange) : animation full-screen 5s + lottie complexe
- **Mythic** (rouge néon) : animation full-screen 6s + son spécial + screen shake + tous viewers voient

### Comment ça se compare à TikTok

| Plateforme | Nb gifts | Tiers prix | Notre coverage |
|-----------|----------|------------|----------------|
| TikTok Live (global) | ~120-150 | $0.01 - $500 | Nous : 212 ✅ |
| Bigo Live | ~80 | $0.01 - $1000 | Nous : 212 ✅ |
| Twitch Bits | ~30 | $0.01 - $25 | Nous : 212 ✅ |

**Nous avons MAINTENANT plus de cadeaux que TikTok Live.** 🎉

Pourquoi c'est important pour vos cibles Afrique de l'Ouest :
1. **Couverture prix locale** : du Pack 50 FCFA (équivalent 1 sachet de cacahuète) au Pack 250 000 FCFA (whale)
2. **Symboles culturels** : créateurs et fans se reconnaissent dans des drapeaux/plats/monuments locaux → engagement émotionnel
3. **Diversité par occasion** : Tabaski (fête religieuse), drapeaux (foot/coupe d'Afrique), instruments (artistes musicaux)

## ⚙️ Actions à appliquer maintenant

### 1. Re-seed après push (CRITIQUE)
```bash
# Sur Render Shell après git push :
cd /opt/render/project/src/backend
npx prisma db seed
```
Cela va upsert les 212 cadeaux + 10 packs coins. Les anciens cadeaux gardent leur ID (stable hash), donc pas de cassure de transactions historiques.

### 2. Tester admin dashboard
- Login admin → ouvrir `/(admin)/live-revenue`
- Vérifier que les KPIs affichent vos chiffres réels
- Tester export CSV

### 3. Vérifier l'UI gifts mobile
- Ouvrir un live → tap 🎁
- Vérifier que les 15 onglets catégories apparaissent (avec count)
- Filtrer par "Animaux" → 50+ cadeaux apparaissent
- Filtrer par "VIP" → 16 cadeaux mythic apparaissent

## 🚀 Suite logique

**Lot 5 (futur)** :
- Bouton "Payer ce créateur" dans admin → exécute Orange Money payout API automatiquement
- Suivi paiements (status : pending / paid / failed)
- Notifications créateur : "Vos 12 350 FCFA viennent d'être envoyés sur votre Orange Money"
- Export comptable mensuel pour votre comptable / fisc
