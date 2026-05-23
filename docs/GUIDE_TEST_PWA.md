# 📱 Guide de Test PWA - AfriConnect

## ✅ Vérification Complète Effectuée

Tous les fichiers PWA ont été vérifiés et sont correctement configurés :

### Fichiers PWA Créés ✅

1. **`/public/manifest.json`** ✅
   - Configuration complète avec toutes les métadonnées
   - Icônes référencées correctement
   - Theme color et background color définis

2. **`/public/service-worker.js`** ✅
   - Cache configuré pour les fichiers essentiels
   - Gestion des événements install, activate, fetch
   - Stratégie de cache network-first avec fallback

3. **`/public/icon-192.png`** ✅
   - Icône 192x192px générée depuis le logo
   - Format PNG valide

4. **`/public/icon-512.png`** ✅
   - Icône 512x512px générée depuis le logo
   - Format PNG valide

### Configuration Vérifiée ✅

- ✅ `index.html` référence le manifest.json
- ✅ Meta tags iOS présents (apple-mobile-web-app-capable)
- ✅ Theme color défini dans les meta tags
- ✅ Service worker enregistré dans `main.jsx` (production uniquement)
- ✅ Build fonctionne correctement
- ✅ Tous les fichiers PWA copiés dans `/dist`

## 🧪 Comment Tester l'Installation PWA

### Méthode 1 : Test Local avec Serveur de Production

1. **Construire l'application** :
   ```bash
   npm run build
   ```

2. **Servir les fichiers en production** :
   ```bash
   npm run preview
   ```
   Ou utilisez un serveur HTTP local :
   ```bash
   # Avec Python
   cd dist
   python -m http.server 8080
   
   # Avec Node.js (http-server)
   npx http-server dist -p 8080
   ```

3. **Tester sur mobile** :
   - Ouvrez l'application sur votre téléphone via l'URL (ex: `http://VOTRE_IP:8080`)
   - Sur Android Chrome : Menu → "Ajouter à l'écran d'accueil"
   - Sur iOS Safari : Partager → "Sur l'écran d'accueil"

### Méthode 2 : Test avec ngrok (pour tester depuis mobile)

1. **Installer ngrok** (si pas déjà installé) :
   ```bash
   npm install -g ngrok
   ```

2. **Lancer le serveur de prévisualisation** :
   ```bash
   npm run build
   npm run preview
   ```

3. **Dans un autre terminal, créer un tunnel** :
   ```bash
   ngrok http 4173
   ```

4. **Utiliser l'URL ngrok** sur votre téléphone mobile

### Méthode 3 : Test en Production Réelle

1. **Déployer l'application** sur votre serveur de production
2. **Accéder via HTTPS** (requis pour PWA)
3. **Tester l'installation** sur mobile

## 🔍 Vérification Manuelle

### Dans Chrome DevTools (Desktop)

1. Ouvrez l'application dans Chrome
2. Ouvrez DevTools (F12)
3. Allez dans l'onglet **Application**
4. Vérifiez :
   - ✅ Manifest : Le manifest.json doit être chargé
   - ✅ Service Workers : Le service worker doit être enregistré (en production)
   - ✅ Storage : Le cache doit être créé

### Tests à Effectuer

- [ ] Le manifest.json se charge sans erreur
- [ ] Les icônes s'affichent correctement
- [ ] Le service worker s'enregistre en production
- [ ] L'application fonctionne hors ligne (après première visite)
- [ ] L'icône apparaît sur l'écran d'accueil après installation
- [ ] L'application s'ouvre en mode standalone (sans barre d'adresse)

## 📋 Commandes Utiles

```bash
# Générer les icônes PWA
npm run generate-icons

# Vérifier la configuration PWA
npm run verify-pwa

# Construire l'application
npm run build

# Prévisualiser le build
npm run preview
```

## ⚠️ Notes Importantes

1. **HTTPS Requis** : Les PWA nécessitent HTTPS en production (sauf localhost)
2. **Service Worker** : Désactivé en développement pour éviter les conflits avec Vite
3. **Cache** : Le service worker met en cache les fichiers pour le mode hors ligne
4. **Mise à Jour** : Changez `CACHE_NAME` dans `service-worker.js` pour forcer une mise à jour

## 🐛 Dépannage

### Le service worker ne s'enregistre pas
- Vérifiez que vous êtes en production (pas sur localhost)
- Vérifiez la console pour les erreurs
- Vérifiez que `/service-worker.js` est accessible

### Les icônes ne s'affichent pas
- Vérifiez que les fichiers existent dans `/public`
- Vérifiez les chemins dans `manifest.json`
- Régénérez les icônes : `npm run generate-icons`

### L'application ne s'installe pas
- Vérifiez que vous êtes en HTTPS (ou localhost)
- Vérifiez que le manifest.json est valide
- Vérifiez la console pour les erreurs

## ✅ Statut Actuel

**Tous les fichiers PWA sont correctement configurés et prêts pour l'installation !**

🎉 L'application AfriConnect peut maintenant être installée comme PWA sur mobile.

