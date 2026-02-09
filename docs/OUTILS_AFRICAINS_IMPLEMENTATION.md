# Implémentation — Outils africains (production)

## Résumé

Les fonctionnalités **Mode hors-ligne**, **Téléchargements**, **QR Code** et **Partage local** ont été portées au niveau production : Service Worker réel, cache média, IndexedDB, QR dynamique, Web Share.

---

## 1. Mode hors-ligne (réel)

### Service Worker (vite-plugin-pwa + custom)

- **Config** : `vite.config.js` — plugin `VitePWA` en stratégie `injectManifest`, fichier custom `src/sw-custom.js`.
- **Precache** : assets critiques (injection `self.__WB_MANIFEST` par le plugin).
- **Runtime** :
  - **Média téléchargés** : CacheFirst sur le cache `africonnect-media-v1` (vidéos enregistrées par l’app).
  - **API** : NetworkFirst avec fallback cache `africonnect-api-v1`.
  - **Reste** : Network puis fallback precache / index.html.

### Téléchargement réel

- Le bouton **Télécharger** (ShareSheet sur une vidéo) appelle `offlineCacheService.downloadMedia()` :
  - `fetch(video_url)` puis mise en cache dans `caches.open('africonnect-media-v1')`.
  - Métadonnées enregistrées en IndexedDB via `offlineStorage.service.js`.
- En lecture, la même URL est utilisée : le SW sert la réponse depuis le cache si elle existe (consultation hors ligne).

### Indicateur et sync

- **OfflineIndicator** (dans `Layout`) : bannière « Mode hors ligne » / « Vous êtes de nouveau en ligne » avec bouton Actualiser.
- Pas de sync automatique des données métier (à brancher côté API si besoin).

---

## 2. Système de téléchargements

- **IndexedDB** : base `africonnect-offline`, store `downloads` (id, mediaUrl, title, creator, sizeBytes, downloadedAt).
- **Service** : `src/services/offlineStorage.service.js` (CRUD métadonnées, `getTotalStorageUsed`, `getStorageQuota`).
- **Page Téléchargements** (`Downloads.jsx`) :
  - Liste depuis IndexedDB.
  - Taille totale + quota (Storage Manager API si dispo).
  - Suppression : `offlineCacheService.removeMedia()` (cache + IndexedDB).
- **Quota** : affichage et vérification via `navigator.storage.estimate()`.

---

## 3. QR Code dynamique

- **Lib** : `qrcode.react` (QRCodeSVG).
- **Page** : `QRCode.jsx` — QR basé sur l’ID utilisateur (profil, paiement, boutique) avec URL dynamique.
- **Export PNG** : rendu SVG → canvas → `toDataURL('image/png')` → téléchargement.
- **Copie** : `navigator.clipboard.writeText(profileUrl)`.
- **Partage** : Web Share API avec fallback copie.

---

## 4. Partage local

- **Bluetooth** : non disponible en navigateur ; explication affichée sur la page.
- **Partage** : Web Share API + raccourcis WhatsApp / Telegram + copie de lien.
- **Page** : `ShareOffline.jsx` — champs titre/URL, bouton « Partager » (natif ou copie), options rapides.

---

## 5. Fichiers créés / modifiés

| Fichier | Rôle |
|--------|------|
| `src/services/offlineStorage.service.js` | IndexedDB (métadonnées, quota) |
| `src/services/offlineCache.service.js` | Cache Storage + téléchargement média |
| `src/sw-custom.js` | Service Worker (precache, CacheFirst média, NetworkFirst API) |
| `src/components/common/OfflineIndicator.jsx` | Bannière en ligne / hors ligne |
| `src/pages/Offline.jsx` | Page mode hors-ligne (état + infos cache) |
| `src/pages/Downloads.jsx` | Liste, taille, quota, suppression |
| `src/pages/QRCode.jsx` | QR dynamique, PNG, partage |
| `src/pages/ShareOffline.jsx` | Web Share + raccourcis, sans Bluetooth |
| `src/components/video/ShareSheet.jsx` | Bouton Télécharger → cache réel |
| `vite.config.js` | VitePWA (injectManifest, manifest) |
| `src/main.jsx` | Enregistrement SW `/sw-custom.js` (prod) |
| `src/Layout.jsx` | Intégration OfflineIndicator |
| `package.json` | Dépendances : qrcode.react, idb, vite-plugin-pwa, workbox-window |

---

## 6. Commandes

```bash
# Installer les dépendances
npm install

# Build (génère le SW et le precache)
npm run build

# Preview build (tester le SW en local)
npm run preview
```

En **production**, le SW est enregistré sur `/sw-custom.js` (fichier émis par le build). En **développement** (localhost), le SW est désenregistré pour éviter les conflits avec Vite.

---

## 7. Priorité et qualité

- Ordre respecté : 1) Service Worker + cache, 2) Téléchargements (IndexedDB + UI), 3) QR Code, 4) Partage.
- Logique métier dans des services (`offlineStorage`, `offlineCache`), UI dans les pages.
- Gestion d’erreurs et toasts sur les actions critiques (téléchargement, suppression, partage).

---

## 8. Tests manuels recommandés

1. **Offline** : build + preview, couper le réseau, recharger → bannière hors ligne, lecture d’une vidéo déjà téléchargée.
2. **Téléchargement** : sur une vidéo, « Télécharger » → vérifier la présence dans Téléchargements et la taille.
3. **Suppression** : supprimer un élément dans Téléchargements → plus présent, taille mise à jour.
4. **QR** : génération, téléchargement PNG, partage (natif ou copie).
5. **Partage** : lien + partage natif ou WhatsApp/Telegram.
