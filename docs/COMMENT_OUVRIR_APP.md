# 🌐 Comment Ouvrir et Vérifier l'Application

## 🚀 Méthode 1 : Via le Terminal (Recommandé)

### Si le serveur n'est pas déjà lancé :

```bash
npm run dev
```

### Une fois lancé, vous verrez :

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Ouvrir dans le navigateur :

1. **Copiez l'URL** : `http://localhost:5173/`
2. **Ouvrez votre navigateur** (Chrome, Firefox, Edge)
3. **Collez l'URL** dans la barre d'adresse
4. **Appuyez sur Entrée**

## 🌐 Méthode 2 : Ouvrir Directement

### Windows :
1. Appuyez sur `Windows + R`
2. Tapez : `http://localhost:5173`
3. Appuyez sur Entrée

### Ou directement dans le navigateur :
- Ouvrez Chrome/Firefox/Edge
- Tapez dans la barre d'adresse : `localhost:5173`
- Appuyez sur Entrée

## ✅ Vérifications à Faire

### 1. Page d'Accueil
- [ ] La page se charge
- [ ] Pas d'erreurs dans la console (F12)
- [ ] Le design s'affiche correctement

### 2. Navigation
- [ ] Cliquer sur les liens fonctionne
- [ ] Les pages se chargent
- [ ] Pas d'erreurs 404

### 3. Console du Navigateur
- Appuyez sur `F12` pour ouvrir les outils développeur
- Onglet "Console" : Vérifier qu'il n'y a pas d'erreurs rouges
- Onglet "Network" : Vérifier que les ressources se chargent

## 🔧 Si l'Application ne S'ouvre Pas

### Problème : Port déjà utilisé
```bash
# Arrêter le serveur (Ctrl + C)
# Relancer
npm run dev
```

### Problème : Erreur de connexion
1. Vérifiez que le serveur tourne (vous devriez voir "VITE ready")
2. Vérifiez l'URL exacte dans le terminal
3. Essayez `http://127.0.0.1:5173` au lieu de `localhost:5173`

### Problème : Page blanche
1. Ouvrez la console (F12)
2. Regardez les erreurs
3. Vérifiez que `.env.local` est configuré (si nécessaire)

## 📱 Tester sur Mobile (Même Réseau)

1. Trouvez votre IP locale :
```bash
ipconfig
# Cherchez "IPv4 Address" (ex: 192.168.1.100)
```

2. Lancez Vite avec --host :
```bash
npm run dev -- --host
```

3. Sur votre téléphone, ouvrez :
```
http://192.168.1.100:5173
```

## 🎯 Pages à Tester

Une fois l'application ouverte, testez :

1. **Page d'accueil** (`/`) - Vidéos
2. **Marketplace** (`/Marketplace`) - Produits
3. **Profil** (`/Profile`) - Informations utilisateur
4. **Créer** (`/Create`) - Upload de contenu
5. **Live** (`/Lives`) - Streams en direct

## ✅ Checklist de Vérification

- [ ] Application s'ouvre dans le navigateur
- [ ] Pas d'erreurs dans la console (F12)
- [ ] Les pages se chargent
- [ ] Le design est correct
- [ ] Les boutons fonctionnent
- [ ] La navigation fonctionne

---

**L'application devrait être accessible sur : `http://localhost:5173`** 🚀

