# Rapport d’audit PWA / Mobile — AfriWonder

**Objectif :** Expérience utilisateur type « vraie app » sur Android et iOS.  
**Scan automatique :** configuration PWA, manifest, service worker, viewport, safe areas, touch, orientation.

---

## 1. Ce qui est déjà en place ✅

### 1.1 Manifest & PWA de base
| Élément | Statut |
|--------|--------|
| `display: standalone` | ✅ (Vite + `public/manifest.json`) |
| `orientation: portrait` | ✅ |
| `theme_color` / `background_color` | ✅ (#f97316 / #000) |
| `start_url: /`, `scope: /` | ✅ |
| Icônes 72–1024 (any + maskable) | ✅ |
| `prefer_related_applications: false` | ✅ |

### 1.2 index.html — Mobile & iOS
| Élément | Statut |
|--------|--------|
| `viewport` + `viewport-fit=cover` | ✅ (safe-area pris en compte) |
| `theme-color` (light/dark) | ✅ |
| `mobile-web-app-capable` | ✅ |
| `apple-mobile-web-app-capable` | ✅ |
| `apple-mobile-web-app-status-bar-style: black-translucent` | ✅ |
| `apple-mobile-web-app-title` | ✅ AfriWonder |
| `apple-touch-icon` (plusieurs tailles) | ✅ |
| `screen-orientation: portrait` | ✅ |

### 1.3 Service Worker (`sw-custom.js`)
| Élément | Statut |
|--------|--------|
| Precache (injectManifest) | ✅ |
| Cache média / API / vidéo | ✅ |
| Mise à jour (SKIP_WAITING + toast) | ✅ |
| Pas d’interception proxy/media Range | ✅ (streaming OK) |

### 1.4 Layout & UX mobile
| Élément | Statut |
|--------|--------|
| Verrouillage portrait (`useOrientationLock`) | ✅ (navigateur + standalone) |
| BottomNav avec `safe-area-inset-bottom` | ✅ |
| Classes `.safe-area-pb` / `.safe-area-pt` (Layout) | ✅ |
| Touch: `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent` | ✅ (Layout + globals.css) |
| Boutons min 44px (touch targets) | ✅ (Layout + globals) |
| `-webkit-overflow-scrolling: touch` | ✅ |
| `overscroll-behavior: contain` (pull-to-refresh limité) | ✅ (globals.css) |
| Inputs 16px (éviter zoom iOS) | ✅ |
| `min-height: 100dvh` (mobile) | ✅ (globals) |
| PWAInstallBanner (Android + instructions iOS) | ✅ |
| AppUpdateBanner / PWAUpdateToast | ✅ |

### 1.5 Détection standalone
- `display-mode: standalone` + `navigator.standalone` (iOS) + `android-app://` ✅ (Layout, PWAInstallBanner, useOrientationLock).

---

## 2. Améliorations appliquées (cette session)

1. **Safe area sur le conteneur principal**  
   Le conteneur racine du Layout applique désormais `padding-top/left/right` avec `env(safe-area-inset-*)` pour que tout le contenu (notch, encoches, barre de statut) soit correctement inséré sur iPhone et Android.

2. **Manifest : `display_override`**  
   Ajout de `"display_override": ["standalone", "minimal-ui"]` pour que, sur les navigateurs qui le supportent (Chrome Android), l’UI navigateur soit minimale en mode « app ».

3. **Splash screen iOS**  
   Ajout d’une `apple-touch-startup-image` (une taille courante) pour réduire l’écran blanc au lancement sur iOS. Possibilité d’ajouter d’autres résolutions plus tard.

4. **Corps de page et hauteur**  
   Renforcement de `min-height: 100dvh` et `-webkit-fill-available` sur `html`/`body` pour éviter les « sauts » de hauteur sur mobile (barre d’adresse, barres système).

5. **Cohérence viewport**  
   Vérification que `viewport-fit=cover` est bien utilisé partout où les safe-area sont utilisées.

---

## 3. Recommandations optionnelles (après déploiement)

| Priorité | Action |
|----------|--------|
| Moyenne | Ajouter d’autres `apple-touch-startup-image` pour iPhone SE, 14 Pro Max, iPad (voir tailles Apple). |
| Basse | Tester sur appareils réels (Android 12+, iOS 15+) : notch, gestes, retour arrière. |
| Basse | Si besoin : `meta name="format-detection" content="telephone=no"` pour désactiver la détection automatique de numéros. |

---

## 4. Tests manuels recommandés (Android vs iOS)

| Test | Android | iOS |
|------|--------|-----|
| Ajouter à l’écran d’accueil | Menu Chrome → « Installer l’app » ou « Ajouter à l’écran d’accueil » | Safari → Partager → « Sur l’écran d’accueil » |
| Lancement en plein écran (sans barre d’adresse) | ✅ Doit s’ouvrir en standalone | ✅ Doit s’ouvrir en standalone |
| Encoche / barre de statut | Le contenu ne doit pas passer sous la barre de statut ; barre colorée (theme-color) | Idem ; barre translucide (black-translucent) |
| Barre de navigation (BottomNav) | Au-dessus de la zone gestuelle / boutons système | Au-dessus de l’indicateur d’accueil (safe-area) |
| Orientation | Verrouillage portrait actif | Verrouillage portrait actif |
| Scroll fluide | Pas de saccades, pas de double scroll | Idem ; pas de zoom intempestif sur les champs |
| Splash au lancement | Icône / fond selon le navigateur | Évite l’écran blanc (apple-touch-startup-image) |

---

## 5. Affinements par écran

- **Home :** Conteneur principal avec `env(safe-area-inset-*)` sur les 4 côtés ✅
- **Create :** En-têtes des étapes (Sélection, Prévisualisation, Détails) avec `safe-area-pt` pour ne pas passer sous la encoche ✅
- **Layout :** Conteneur racine avec safe-area top/left/right + `100dvh` ✅

---

## 6. Résumé

- **PWA :** Manifest, SW, install banner et mise à jour sont en place ; `display_override` et safe-area sur le root améliorent le rendu type « vraie app ».
- **Mobile :** Viewport, orientation portrait, touch targets, safe areas, 100dvh et splash iOS sont alignés pour une expérience fluide sur Android et iOS.
- **Prochaine étape :** Tester en « Ajouter à l’écran d’accueil » sur un téléphone réel et valider les encoches / barres système.
