# 📱 PWA — Checklist lancement serein

> **Objectif** : Installable partout, rapide partout, stable partout. Aucun crash critique. Aucun bug bloquant.

---

## ✅ 1. Installation PWA

| Critère | Statut | Détail |
|---------|--------|--------|
| manifest.json valide | ✅ | name, short_name, icons 192/512, maskable, theme_color, background_color |
| display: standalone | ✅ | |
| HTTPS | ⚠️ | Requis en production |
| Service worker actif | ✅ | sw-custom.js, precache + API cache |
| Lighthouse PWA ≥ 90 | ⚠️ | Vérifier avant lancement |

**Fichiers** : `public/manifest.json`, `src/sw-custom.js`, `vite.config.js`

---

## ✅ 2. Prompt installation

| Plateforme | Statut |
|------------|--------|
| Android (beforeinstallprompt) | ✅ `PWAInstallBanner.jsx` |
| iOS (instructions manuelles) | ✅ « Partager → Ajouter à l'écran d'accueil » |
| Desktop Chrome/Edge | ✅ beforeinstallprompt |
| Dismiss 7 jours | ✅ localStorage |

---

## ✅ 3. Mise à jour silencieuse

| Fonction | Statut |
|----------|--------|
| Détection nouvelle version | ✅ updatefound + waiting |
| Toast « Mettre à jour » | ✅ `PWAUpdateToast.jsx` |
| skipWaiting + reload | ✅ message SKIP_WAITING |

---

## ✅ 4. Mode hors ligne

| Fonction | Statut |
|----------|--------|
| Page offline propre | ✅ `Offline.jsx` |
| Bannière reconnectée | ✅ `OfflineIndicator.jsx` |
| Média en cache | ✅ CacheFirst |
| API fallback cache | ✅ NetworkFirst |
| Vidéos téléchargées | ✅ offlineCache.service |

---

## 📋 5. Matrice de test devices

| Device | Android | iOS | Desktop |
|--------|---------|-----|---------|
| Chrome | ✅ | N/A | ✅ |
| Safari | N/A | ✅ | ✅ |
| Edge | ✅ | N/A | ✅ |
| Samsung Browser | ✅ | N/A | - |
| Firefox | ⚠️ | N/A | ✅ |

**Tests obligatoires** :
- [ ] Android bas/milieu/haut de gamme
- [ ] iPhone récents + anciens
- [ ] iPad
- [ ] Desktop Chrome, Edge, Safari

---

## ⚡ 6. Performance mobile

| Métrique | Cible | Vérif |
|----------|-------|-------|
| TTI | < 3s | Lighthouse |
| Lazy loading vidéos | ✅ | loading="lazy" / IntersectionObserver |
| Code splitting | ✅ | manualChunks |
| WebP/AVIF | ⚠️ | Selon assets |

---

## 🔐 7. Sécurité prod

| Élément | Action |
|---------|--------|
| HTTPS strict | Configurer serveur |
| CSP headers | À ajouter (meta ou backend) |
| Tokens | access + refresh, rotation |
| SW versionné | ✅ afriwonder-precache-v1 |
| Kill switch | Changer version cache en SW |

---

## 📊 8. Monitoring jour J

- [ ] Sentry / Crashlytics
- [ ] Uptime monitoring
- [ ] Logs temps réel
- [ ] Alertes
- [ ] Rollback instantané (blue/green)

---

## 🚫 Ne pas lancer si

- Lighthouse PWA < 90
- Installation iOS cassée
- Upload vidéo instable
- Crash critique non résolu
