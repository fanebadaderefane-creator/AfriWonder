# Matrice navigation — Menu Plus PWA ↔ Expo

Source PWA : [src/components/navigation/MenuPlus.jsx](../src/components/navigation/MenuPlus.jsx) (`MENU_SECTIONS`).  
Source Expo : [frontend/app/menu-plus.tsx](../frontend/app/menu-plus.tsx).

Légende **Statut v1** : **OK** = données API ou écran informatif assumé ; **Partiel** = fonctionnel mais UX simplifiée ; **Hors scope v1** = voir [EXPO_FIXED_V1_SCOPE.md](./EXPO_FIXED_V1_SCOPE.md).

| Label PWA | Page PWA | Route Expo | Statut v1 |
|-----------|----------|------------|-----------|
| Mon Wallet | Wallet | `/wallet` | OK |
| Marketplace | Marketplace | `/(tabs)/market` | OK |
| Événements | Events | `/services/events` | OK |
| Transport | Transport | `/services/transport` | OK |
| Restauration | FoodDelivery | `/services/food` | OK |
| Services | Utilities | `/services` | OK |
| Santé | Telemedicine | `/services/health` | OK |
| Immobilier | RealEstate | `/services/realestate` | OK |
| Assurances | Insurance | `/services/insurance` | OK (API) |
| Prestataires | Marketplace | `/seller` | Partiel |
| Actualités | News | `/news` | OK |
| Microcrédit | Microcredit | `/wallet/microcredit` | OK |
| Crowdfunding | Crowdfunding | `/crowdfunding` | OK |
| Emplois | Jobs | `/services/jobs` | OK |
| Mini-Apps | MiniAppsStore | `/miniapps` | OK |
| Publications & Sondages | FeedPosts | `/feed` | OK |
| Créer | Create | `/(tabs)/create` | OK |
| Outils créateurs | CreatorTools | `/creator/earnings` | OK |
| Parrainage | Referrals | `/referrals` | OK |
| Mes campagnes pub | AdvertiserDashboard | `/creator/ads` | OK |
| Formations | Courses | `/courses` | OK |
| Mes Badges | BadgesProfile | `/badges-profile` | OK (API) |
| Classement | Leaderboard | `/leaderboard` | OK (API) |
| Gamification | GamificationHub | `/gamification-hub` | OK (API) |
| Parcours Intelligent | MatchingCenter | `/assistant` | Partiel |
| Paramètres | Settings | `/settings` | OK |
| Statistiques | Analytics | `/creator/earnings` | Partiel (proxy créateur) |
| Notifications | Notifications | `/notifications` | OK |
| Langue | Language | `/settings/language` | OK |
| Aide & Support | Help | `/faq` | OK |
| Mes tickets support | Support | `/support-page` | OK |
| À propos | About | `/about` | OK |
| Admin | AdminDashboard | `/admin-dashboard` | Hors scope v1 (web) |
| Politique de confidentialité | PrivacyPolicy | `/privacy-policy` | OK |
| Protection des données | DataProtection | `/data-protection` | Partiel (texte + lien) |

## Onglets non dans le menu Plus

| Zone | Route |
|------|--------|
| Accueil | `/(tabs)/index` |
| Découvrir | `/(tabs)/explore` |
| Créer | `/(tabs)/create` |
| Market | `/(tabs)/market` |
| Profil | `/(tabs)/profile` (+ icône apps → `/menu-plus`) |
