# 🔐 Guide Complet : Configurer Google OAuth

## 📋 Étape par Étape

### Étape 1 : Accéder à Google Cloud Console

1. **Ouvrez votre navigateur** et allez sur :
   ```
   https://console.cloud.google.com
   ```

2. **Connectez-vous** avec votre compte Google (celui qui a créé le projet OAuth)

### Étape 2 : Sélectionner le Projet

1. En haut de la page, à gauche, vous verrez un **menu déroulant avec le nom du projet**
2. Cliquez dessus pour voir la liste des projets
3. **Sélectionnez le projet** qui contient votre OAuth Client ID :
   - Client ID : `443955383706-2rka5q381h06d71lcm3vmbc77q2uiequ.apps.googleusercontent.com`

### Étape 3 : Accéder aux Credentials (Identifiants)

1. Dans le **menu de gauche** (☰), cliquez sur :
   ```
   APIs & Services → Credentials
   ```
   OU
   ```
   APIs & Services → Identifiants
   ```

2. Vous verrez une liste de vos identifiants OAuth

### Étape 4 : Ouvrir votre OAuth Client ID

1. **Cherchez** dans la liste votre OAuth 2.0 Client ID :
   - Nom : Peut être "Web client" ou un nom personnalisé
   - Client ID : `443955383706-2rka5q381h06d71lcm3vmbc77q2uiequ.apps.googleusercontent.com`

2. **Cliquez sur le nom** ou sur l'icône ✏️ (modifier) à droite

### Étape 5 : Ajouter l'URI de Redirection

1. Dans la page qui s'ouvre, **descendez** jusqu'à la section :
   ```
   Authorized redirect URIs
   ```
   OU
   ```
   URI de redirection autorisées
   ```

2. **Cliquez sur "ADD URI"** ou **"+ ADD URI"**

3. **Tapez EXACTEMENT** (copiez-collez) :
   ```
   http://localhost:3000/api/auth/google/callback
   ```

4. **IMPORTANT :**
   - ✅ Pas de guillemets
   - ✅ Pas de slash final
   - ✅ Exactement comme ci-dessus
   - ✅ En minuscules (http, pas HTTP)

### Étape 6 : Sauvegarder

1. **Cliquez sur "SAVE"** ou **"ENREGISTRER"** en bas de la page
2. **Attendez 1-2 minutes** pour que les changements se propagent

### Étape 7 : Vérifier

1. **Revenez** sur la page de votre application
2. **Cliquez** sur "Continuer avec Google"
3. L'erreur `redirect_uri_mismatch` devrait disparaître

---

## 🎯 Chemin Rapide

Si vous connaissez déjà votre projet :

1. **Lien direct** (remplacez `VOTRE_PROJECT_ID` par votre ID de projet) :
   ```
   https://console.cloud.google.com/apis/credentials?project=VOTRE_PROJECT_ID
   ```

2. **Ou allez directement** :
   ```
   https://console.cloud.google.com/apis/credentials
   ```

---

## 📸 À Quoi Ça Ressemble

### Section "Authorized redirect URIs" :

```
┌─────────────────────────────────────────────────┐
│ Authorized redirect URIs                        │
│                                                 │
│ [http://localhost:3000/api/auth/google/callback] │
│                                                 │
│ [+ ADD URI]                                     │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Erreurs Courantes

### ❌ MAUVAIS :
```
"http://localhost:3000/api/auth/google/callback"
http://localhost:3000/api/auth/google/callback/
HTTP://localhost:3000/api/auth/google/callback
http://localhost:3000/api/auth/google/callback (avec espaces)
```

### ✅ BON :
```
http://localhost:3000/api/auth/google/callback
```

---

## 🔄 Pour Facebook

1. **Allez sur** : https://developers.facebook.com/apps
2. **Sélectionnez** votre app (ID: `1461264728859875`)
3. **Menu gauche** → **Settings** → **Basic**
4. **Descendez** jusqu'à **"Valid OAuth Redirect URIs"**
5. **Ajoutez** :
   ```
   http://localhost:3000/api/auth/facebook/callback
   ```
6. **Sauvegardez**

---

## ✅ Checklist

- [ ] J'ai accédé à Google Cloud Console
- [ ] J'ai sélectionné le bon projet
- [ ] J'ai ouvert mon OAuth Client ID
- [ ] J'ai ajouté l'URI : `http://localhost:3000/api/auth/google/callback`
- [ ] J'ai sauvegardé
- [ ] J'ai attendu 1-2 minutes
- [ ] J'ai testé à nouveau

---

## 🆘 Si Vous Ne Trouvez Pas

### Option 1 : Rechercher par Client ID

1. Dans Google Cloud Console, allez dans **APIs & Services → Credentials**
2. Utilisez **Ctrl+F** (recherche) et tapez :
   ```
   443955383706
   ```
3. Cela devrait trouver votre Client ID

### Option 2 : Créer un Nouveau Client ID

Si vous ne trouvez pas l'existant :

1. **APIs & Services → Credentials**
2. **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type** : Web application
4. **Name** : AfriConnect OAuth
5. **Authorized redirect URIs** : 
   ```
   http://localhost:3000/api/auth/google/callback
   ```
6. **CREATE**
7. **Copiez** le nouveau Client ID et Secret
8. **Mettez à jour** votre fichier `.env` avec les nouvelles valeurs

---

## 📞 Besoin d'Aide ?

Si vous êtes bloqué à une étape précise, dites-moi :
- À quelle étape vous êtes
- Ce que vous voyez à l'écran
- Le message d'erreur (s'il y en a)

