# 🔵 Guide : Configurer Facebook OAuth Redirect URI

## 📍 Où Trouver le Champ "Valid OAuth Redirect URIs"

### ❌ Vous êtes actuellement dans : "Avancé" (Advanced)
Ce n'est **PAS** le bon endroit pour les URI OAuth.

### ✅ Le Bon Endroit : "Général" (Basic)

## 🎯 Étapes pour Trouver le Bon Endroit

### Étape 1 : Aller dans "Général" (Basic)

1. **Dans le menu de gauche**, sous "Paramètres de l'app" (App Settings)
2. **Cliquez sur "Général"** (General) - PAS "Avancé"
3. Vous verrez la page "Paramètres de base" (Basic Settings)

### Étape 2 : Trouver "Valid OAuth Redirect URIs"

1. **Descendez** dans la page "Général"
2. **Cherchez** la section qui s'appelle :
   - **"Valid OAuth Redirect URIs"** (en anglais)
   - OU **"URI de redirection OAuth valides"** (en français)
3. C'est généralement vers le **milieu ou bas** de la page

### Étape 3 : Ajouter l'URI

1. **Cliquez** dans le champ "Valid OAuth Redirect URIs"
2. **Tapez** (ou collez) :
   ```
   http://localhost:3000/api/auth/facebook/callback
   ```
3. **Cliquez sur "Enregistrer les modifications"** (Save changes) en bas

## 📸 À Quoi Ça Ressemble

La section devrait ressembler à ceci :

```
┌─────────────────────────────────────────────────┐
│ Valid OAuth Redirect URIs                       │
│                                                 │
│ [http://localhost:3000/api/auth/facebook/callback] │
│                                                 │
│ [+ Add URI]                                     │
└─────────────────────────────────────────────────┘
```

## 🗺️ Chemin Complet

```
Facebook Developers Console
  → Mes applications
    → Africonnect (votre app)
      → Paramètres de l'app
        → Général (General) ← ICI !
          → Descendre jusqu'à "Valid OAuth Redirect URIs"
```

## ⚠️ Si Vous Ne Trouvez Pas

### Option 1 : Vérifier le Type d'Application

1. Dans "Général", vérifiez le **"Type d'application"** (App Type)
2. Il doit être **"Web"** ou **"Website"**
3. Si c'est "Mobile" ou autre, vous devrez peut-être changer le type

### Option 2 : Utiliser le Lien Direct

Essayez d'aller directement sur :
```
https://developers.facebook.com/apps/1461264728859875/settings/basic/
```

### Option 3 : Chercher "OAuth"

1. Dans la page "Général"
2. Utilisez **Ctrl+F** (recherche)
3. Tapez : **"OAuth"** ou **"redirect"**
4. Cela devrait vous amener directement à la section

## ✅ Checklist

- [ ] J'ai cliqué sur "Général" (pas "Avancé")
- [ ] J'ai trouvé "Valid OAuth Redirect URIs"
- [ ] J'ai ajouté : `http://localhost:3000/api/auth/facebook/callback`
- [ ] J'ai cliqué sur "Enregistrer les modifications"
- [ ] J'ai attendu la confirmation de sauvegarde

## 🆘 Si Toujours Perdu

Dites-moi :
1. Que voyez-vous dans la page "Général" ?
2. Y a-t-il une section "OAuth" ou "Redirect" ?
3. Pouvez-vous faire une capture d'écran de la page "Général" ?






