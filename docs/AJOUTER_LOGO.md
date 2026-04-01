# 🎨 Guide Simple : Ajouter Votre Logo

## Méthode Simple (Recommandée)

### Étape 1 : Trouvez votre fichier logo
- Localisez votre fichier logo sur votre ordinateur
- Formats acceptés : `.png`, `.jpg`, `.svg`, `.webp`
- Nom recommandé : `logo.png`

### Étape 2 : Copiez le fichier dans le dossier public

**Option A : Via l'Explorateur Windows**
1. Ouvrez l'Explorateur de fichiers Windows
2. Allez dans : `C:\Users\Hp\Downloads\AfriConnect\public\`
3. Copiez votre fichier logo dans ce dossier
4. Renommez-le en `logo.png` (si ce n'est pas déjà le cas)

**Option B : Via la ligne de commande**
```powershell
# Remplacez "CHEMIN_VERS_VOTRE_LOGO" par le chemin complet de votre logo
Copy-Item "CHEMIN_VERS_VOTRE_LOGO" -Destination "public\logo.png"
```

### Étape 3 : Vérifiez que le fichier est bien là
Le fichier devrait être ici :
```
C:\Users\Hp\Downloads\AfriConnect\public\logo.png
```

### Étape 4 : Redémarrez le serveur (si nécessaire)
Si votre serveur de développement tourne, il devrait détecter automatiquement le nouveau fichier.
Sinon, redémarrez avec :
```bash
npm run dev
```

## Si votre logo a un nom différent

Si votre fichier s'appelle autrement (ex: `mon-logo.png`, `logo.jpg`), vous devez modifier le code :

1. Ouvrez le fichier : `src/components/common/AfriconnectLogo.jsx`
2. Trouvez la ligne 14 qui contient :
   ```jsx
   const logoUrl = '/logo.png';
   ```
3. Remplacez par le nom de votre fichier :
   ```jsx
   const logoUrl = '/mon-logo.png';  // Remplacez par votre nom de fichier
   ```

## Structure finale attendue

```
AfriConnect/
└── public/
    ├── logo.png          ← Votre logo ici ✨
    ├── icon-192.png
    ├── icon-512.png
    ├── manifest.json
    └── service-worker.js
```

## Besoin d'aide supplémentaire ?

Si vous avez des difficultés, dites-moi :
- Le nom de votre fichier logo
- Où se trouve actuellement votre fichier logo
- Le format de votre fichier (PNG, JPG, SVG, etc.)

