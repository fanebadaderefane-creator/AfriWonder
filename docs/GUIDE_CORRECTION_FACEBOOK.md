# ✅ Correction Facebook OAuth - Valeurs à Copier

## 📋 Configuration Générée Automatiquement

Le script a analysé votre configuration et généré les valeurs correctes.

---

## 🔧 À Faire dans Facebook Developer Console

### Étape 1 : Aller dans les Paramètres

1. Allez sur : https://developers.facebook.com/apps
2. Sélectionnez votre application
3. **"Connexion Facebook"** → **"Paramètres"**

---

### Étape 2 : Corriger "URI de redirection OAuth valides"

**Action** :

1. **Supprimez** toutes les URI existantes (surtout celles sans `/api`)

2. **Ajoutez UNIQUEMENT cette URI** :

```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

⚠️ **IMPORTANT** : Facebook autorise automatiquement `http://localhost` en mode développement. Vous n'avez **PAS besoin** d'ajouter `http://localhost:3000/api/auth/facebook/callback` dans la liste.

⚠️ **Points critiques** :
- ✅ Chemin avec `/api` : `/api/auth/facebook/callback`
- ✅ Port `3000` (votre backend)
- ✅ Pas de slash final après `callback`

---

### Étape 3 : Corriger "Domaines autorisés pour le SDK Javascript"

**Action** :

1. **Supprimez** tous les domaines avec `https://` ou slash final

2. **Ajoutez UNIQUEMENT ces 2 domaines** (sans `https://`, sans slash) :

```
localhost
univitrescent-kathleen-encephalitic.ngrok-free.dev
```

⚠️ **Format** :
- ✅ Sans `https://` ou `http://`
- ✅ Sans slash final `/`
- ✅ Juste le domaine

---

### Étape 4 : Sauvegarder

1. **Faites défiler** jusqu'en bas de la page
2. **Cliquez** sur le bouton bleu **"Enregistrer les modifications"**
3. **Attendez** 2-3 minutes pour la propagation

---

## ✅ Vérification

Après avoir sauvegardé, vérifiez que :

- [ ] Les 2 URI sont dans "URI de redirection OAuth valides"
- [ ] Les 2 domaines sont dans "Domaines autorisés"
- [ ] Aucune URI incorrecte (sans `/api`)
- [ ] Aucun domaine avec `https://` ou slash final
- [ ] Les modifications ont été sauvegardées

---

## 🎯 Résumé des Valeurs

### URI de redirection OAuth valides :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

⚠️ **Note** : `http://localhost:3000/api/auth/facebook/callback` est automatiquement autorisé par Facebook en mode développement. Pas besoin de l'ajouter.

### Domaines autorisés pour le SDK Javascript :
```
localhost
univitrescent-kathleen-encephalitic.ngrok-free.dev
```

---

## 🚀 Après la Sauvegarde

1. **Redémarrez le backend** (si nécessaire) :
   ```powershell
   # Arrêtez (Ctrl+C) et redémarrez
   npm run dev
   ```

2. **Testez l'authentification Facebook**

---

## 📝 Note

Si vous redémarrez ngrok et que l'URL change :
1. Relancez le script : `node correct-facebook-config.js`
2. Mettez à jour Facebook avec les nouvelles valeurs
3. Sauvegardez

