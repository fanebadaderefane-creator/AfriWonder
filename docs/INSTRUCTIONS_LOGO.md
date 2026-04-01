# 📸 Instructions pour Ajouter Votre Logo

## Méthode 1 : Logo dans le dossier `public` (Recommandé)

### Étapes :

1. **Placez votre fichier logo** dans le dossier `public` :
   ```
   AfriConnect/
   └── public/
       └── logo.png  (ou logo.jpg, logo.svg, etc.)
   ```

2. **Format recommandé** :
   - **PNG** avec fond transparent (recommandé)
   - **SVG** pour une meilleure qualité
   - **JPG** si nécessaire
   - Taille recommandée : **512x512 pixels** ou plus

3. **Le composant est déjà configuré** pour utiliser `/logo.png`
   - Si votre fichier s'appelle différemment, modifiez la ligne dans `src/components/common/AfriconnectLogo.jsx` :
   ```jsx
   const logoUrl = '/logo.png';  // Changez 'logo.png' par votre nom de fichier
   ```

## Méthode 2 : Logo dans le dossier `src/assets`

Si vous préférez utiliser le dossier `src/assets` :

1. **Créez le dossier** (s'il n'existe pas) :
   ```
   AfriConnect/
   └── src/
       └── assets/
           └── logo.png
   ```

2. **Modifiez** `src/components/common/AfriconnectLogo.jsx` :
   ```jsx
   import logoImage from '@/assets/logo.png';
   
   // Puis dans le composant :
   const logoUrl = logoImage;
   ```

## Formats de fichier supportés

- ✅ **PNG** (recommandé avec fond transparent)
- ✅ **SVG** (meilleure qualité, scalable)
- ✅ **JPG/JPEG**
- ✅ **WebP** (meilleure compression)

## Taille recommandée

- **Minimum** : 256x256 pixels
- **Recommandé** : 512x512 pixels
- **Optimal** : 1024x1024 pixels (pour les écrans haute résolution)

## Après avoir ajouté votre logo

1. **Redémarrez le serveur de développement** si nécessaire :
   ```bash
   npm run dev
   ```

2. **Vérifiez** que le logo s'affiche correctement dans l'application

3. Si le logo ne s'affiche pas, vérifiez :
   - Le nom du fichier correspond exactement (respectez la casse)
   - Le fichier est bien dans le bon dossier
   - Le format du fichier est supporté
   - La console du navigateur pour les erreurs

## Exemple de structure finale

```
AfriConnect/
├── public/
│   ├── logo.png          ← Votre logo ici
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json
└── src/
    └── components/
        └── common/
            └── AfriconnectLogo.jsx  ← Déjà configuré pour /logo.png
```

## Personnalisation supplémentaire

Si vous voulez modifier le style du logo (taille, bordure, etc.), éditez `src/components/common/AfriconnectLogo.jsx` :

- **Taille** : Utilisez les props `size="sm"`, `size="md"`, `size="lg"`, `size="xl"`
- **Style** : Modifiez les classes CSS dans le composant
- **Fond** : Le fond dégradé orange-rouge peut être modifié dans la classe `bg-gradient-to-br from-orange-500 to-red-500`

