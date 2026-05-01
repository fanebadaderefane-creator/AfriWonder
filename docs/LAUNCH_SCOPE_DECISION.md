# Décision de scope — lancement public v1 Mali

**Date :** 2026-04-24  
**Décision :** **tous les modules sont activés**. Aucun écran "Bientôt" en production.

---

## 1. Scope v1 — TOUS les modules activés

Conformément à la directive produit (« pas de feature partielle, pas de placeholder »), **l'ensemble des modules de l'application est en production** dès le lancement :

| Catégorie | Modules |
|---|---|
| **Core social** | Auth, Profil, Feed, Stories, Posts, Commentaires, Likes, Saves, Partages, Signalement |
| **Vidéo / Live** | Lecteur vidéo, Watch, Playlists, Live (démarrer, rejoindre, replay, gifts, STT, enregistrement) |
| **Messagerie** | Messages 1-1 (E2EE), Groupes, Demandes, Stickers, Appels audio/vidéo |
| **Paiements** | Wallet, Recharge, Transfert P2P, Withdraw, Micro-crédit, Orange Money, Wave, Stripe, Coins IAP |
| **AfriCoin / Loyalty** | Coins, Cashback, Parrainage, Loyalty, Support |
| **Marketplace** | Produits, Panier, Checkout, Commandes, Avis, Questions, Retours, Litiges, Seller dashboard |
| **Services locaux** | Transport, Covoiturage, Location véhicule, Food delivery, Voyage, Immobilier, Santé, Événements, Emplois, Garde d'enfants, Assurance |
| **Recharges** | Airtime, Bills |
| **Crowdfunding** | Découverte, Création, Contribution, Dashboard, Historique |
| **Communautés** | Communities, Find friends, Sync contacts, Suggestions créateurs, Referrals |
| **Learn / Info** | News, Courses, Assistant IA, Mini-apps, Chatbot, Map places |
| **Créateur** | Dashboard, Earnings, Revenue share, Withdraw, Ads, Brand deals, Abonnements |
| **Gamification** | Hub, Leaderboard, Missions, Challenges, Badges |
| **Notifications / Recherche / Settings / Admin** | Tous actifs |

## 2. Implémentation

### 2.1 Feature flags — tous à `true` par défaut

Tous les flags dans `frontend/src/config/featureFlags.ts` sont à `true` par défaut. Ils restent disponibles comme **coupe-circuit d'urgence** : en cas de régression produit, un flag peut être passé à `0` via EAS secret ou `.env.production` sans re-build nécessaire.

### 2.2 Écrans `ComingSoonScreen` — fallback défensif uniquement

Le composant `ComingSoonScreen` reste présent comme **dernière ligne de défense** si un flag est explicitement désactivé en prod. En fonctionnement normal, **il n'est jamais affiché**.

### 2.3 Liens "à venir" retirés

Tous les `Alert('Bientôt disponible', ...)` et textes placeholder pointant vers un avenir incertain ont été :
- **soit connectés** à leur vraie logique (recherche Moments → `/search`, coins notifications → `/notifications`, wallet transfer → API réelle),
- **soit retirés** du menu (l'édition de post est remplacée par supprimer+reposter),
- **soit réécrits** en messages d'état vide honnêtes (`"Aucune leçon publiée"`, `"Aucune mise à jour publiée par le porteur de projet"`).

## 3. Exigences backend pour le lancement

Chaque route backend utilisée par ces modules doit répondre correctement en prod. Le catalogue est documenté dans `docs/QA_COVERAGE.md` (224 cartes). Les services Mali (restaurants, doctors, drivers, events, properties, etc.) dépendent de **la qualité des données** en base — il faut donc :

1. **Seeder les catégories initiales** (au moins 1 restaurant, 1 médecin, 1 trajet actif par ville majeure au jour J).
2. **Avoir un pipeline de création** : UI seller / provider / landlord / doctor pour que les utilisateurs pros alimentent eux-mêmes.
3. Sinon l'écran s'affiche mais l'utilisateur voit "Aucun résultat" — acceptable mais à remplir vite.

## 4. Obligations humaines avant Play Store (inchangées)

Ces 4 items restent **OBLIGATOIRES** et ne peuvent pas être automatisés :

1. **Beta interne 48 h** sur device Android bas de gamme + 3G réel (FPS > 50, chargement < 2 s, API p95 < 500 ms, crash rate < 0,5 %).
2. **Test paiement réel** Orange Money + Wave + Stripe (sandbox **et** production).
3. **Signature de la grille** `docs/QA_COVERAGE.md` feature par feature par l'équipe QA.
4. **Plan de rollback** formalisé dans README de release (track Play + feature flags d'urgence).

## 5. Kill-switch d'urgence

Si un module est découvert cassé en production après lancement, on peut le **désactiver sans republier** :

```bash
# EAS
eas secret:create --name EXPO_PUBLIC_ENABLE_SERVICES_HUB --value 0 --scope project
eas update --branch production --message "Hotfix: disable services hub"
```

Aucun utilisateur ne voit d'écran cassé — le `ComingSoonScreen` prend le relais jusqu'au correctif.
