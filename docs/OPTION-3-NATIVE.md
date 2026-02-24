# Option 3 : PWA "native-like" (Capacitor)

AfriWonder peut être compilé en **application native** iOS et Android via **Capacitor**, avec la même codebase React/Vite. Résultat : expérience type TikTok (autoplay vidéo fluide, contrôle matériel, stores).

## Déjà en place

- **Capacitor 6** : `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`
- **Config** : `capacitor.config.ts` (appId `com.afriwonder.app`, webDir `dist`)
- **Détection** : `isCapacitor()` dans `src/lib/utils.js` pour adapter l’UX en contexte natif
- **Scripts** :
  - `npm run build:cap` — build web + sync vers Android/iOS
  - `npm run cap:sync` — copier `dist` dans les projets natifs
  - `npm run cap:open:android` / `npm run cap:open:ios` — ouvrir dans Android Studio / Xcode

## Premier déploiement

1. **Build web**
   ```bash
   npm run build
   ```

2. **Ajouter les plateformes** (une seule fois)
   ```bash
   npx cap add android
   npx cap add ios
   ```

3. **Synchroniser**
   ```bash
   npx cap sync
   ```

4. **Ouvrir et lancer**
   - Android : `npm run cap:open:android` puis Run dans Android Studio
   - iOS : `npm run cap:open:ios` puis Run dans Xcode (Mac requis)

## Dépannage

- **« android platform has not been added yet »**  
  Exécuter à la racine : `npx cap add android`. Sous PowerShell Windows, enchaîner avec `;` (ex. `cd C:\...\AfriWonder; npx cap add android`). Prérequis : [Android Studio](https://developer.android.com/studio) ou SDK Android.
- **iOS** : Mac avec Xcode et CocoaPods requis.

## Comportement vidéo (scroll noir rapide ✅)

En WebView Capacitor, les politiques autoplay sont plus permissives ; le léger passage au noir au scroll reste rapide. Pour aller vers un comportement **exactement comme TikTok** (pas de noir, transition immédiate), deux pistes :

### A. Rester en WebView (améliorations côté web)

- Précharger la vidéo suivante / précédente (déjà en place avec preload et buffer).
- En contexte Capacitor (`isCapacitor()`), on peut augmenter légèrement le preload ou le nombre de vidéos préparées (à brancher dans `VideoCard.jsx` si besoin).

### B. Lecteur vidéo natif (type TikTok)

Pour un rendu 100 % natif du flux vidéo :

1. **Plugin Capacitor** (si disponible) exposant un composant natif type “fullscreen vertical video” (Android ExoPlayer / iOS AVPlayer).
2. **Bridge custom** : une vue native affiche le flux ; la liste reste en React, et on envoie l’URL de la vidéo active au natif via `Capacitor.Plugins` ou un plugin maison.
3. **Expo / React Native** : réécrire uniquement l’écran Accueil (feed) en RN avec un lecteur natif, le reste restant en WebView — plus lourd à maintenir.

Recommandation courte terme : garder le flux actuel en WebView + optimisations (preload, buffer, `isCapacitor()`). Pour un rendu TikTok pur, envisager un plugin ou un bridge natif (B) une fois l’app Capacitor validée sur les stores.

## Bonus

- **Performance** : WebView natif souvent plus fluide que le navigateur PWA.
- **Contrôle matériel** : plein écran, orientation, volume, etc. via plugins Capacitor.
- **Stores** : soumission possible sur App Store et Google Play avec le même code.

## Références

- [Capacitor](https://capacitorjs.com/docs)
- [Adding native platforms](https://capacitorjs.com/docs/getting-started)
