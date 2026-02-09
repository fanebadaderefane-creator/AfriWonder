# 🔄 Guide : Mise à jour de l'URI Facebook après changement ngrok

## ⚠️ Problème

L'URL ngrok change à chaque redémarrage (version gratuite). Si vous redémarrez ngrok, vous devez mettre à jour :
1. Le fichier `.env` du backend
2. La configuration dans Facebook Developer Console

## ✅ Solution Rapide

### Étape 1 : Vérifier l'URL ngrok actuelle

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:4040/api/tunnels" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
$httpsTunnel = $data.tunnels | Where-Object { $_.proto -eq 'https' }
Write-Host "URL ngrok actuelle: $($httpsTunnel.public_url)"
```

### Étape 2 : Mettre à jour le fichier .env

Exécutez cette commande (remplacez `VOTRE_URL_NGROK` par l'URL obtenue à l'étape 1) :

```powershell
cd backend
$content = Get-Content .env -Raw
$newUri = 'VOTRE_URL_NGROK/api/auth/facebook/callback'
$content = $content -replace 'FACEBOOK_REDIRECT_URI="[^"]*"', "FACEBOOK_REDIRECT_URI=`"$newUri`""
Set-Content .env -Value $content -NoNewline
Write-Host "✅ FACEBOOK_REDIRECT_URI mis à jour"
```

**OU** utilisez le script de diagnostic :

```powershell
cd backend
node diagnostic-facebook.js
```

### Étape 3 : Mettre à jour Facebook Developer Console

1. **Allez sur** : https://developers.facebook.com/apps
2. **Sélectionnez votre application**
3. **Allez dans** : Connexion Facebook → Paramètres
4. **Dans "URI de redirection OAuth valides"** :
   - Supprimez l'ancienne URI
   - Ajoutez la nouvelle URI : `https://VOTRE_URL_NGROK/api/auth/facebook/callback`
   - ⚠️ **Copiez-collez exactement** l'URL depuis votre `.env` (sans les guillemets)
5. **Dans "Domaines autorisés pour le SDK Javascript"** :
   - Supprimez l'ancien domaine
   - Ajoutez le nouveau domaine : `VOTRE_URL_NGROK` (sans `https://`, sans chemin)
6. **Cliquez sur "Enregistrer les modifications"** en bas de la page
7. **Attendez 2-3 minutes** pour la propagation

### Étape 4 : Redémarrer le backend

```powershell
# Arrêtez le backend (Ctrl+C)
# Puis redémarrez-le
npm run dev
```

## 🔍 Vérification

Après la mise à jour, testez l'authentification Facebook. Si cela ne fonctionne pas :

1. **Vérifiez que l'URI correspond exactement** :
   - Comparez caractère par caractère entre `.env` et Facebook Developer Console
   - Même protocole (`https://`)
   - Même domaine (exactement les mêmes caractères)
   - Même chemin (`/api/auth/facebook/callback`)
   - Pas de slash final

2. **Vérifiez que vous avez sauvegardé** dans Facebook Developer Console

3. **Attendez 2-3 minutes** après la sauvegarde

4. **Vérifiez les logs du backend** pour voir l'URI utilisée

## 💡 Astuce : Utiliser une URL ngrok fixe

Pour éviter de devoir mettre à jour à chaque redémarrage, vous pouvez :
- Utiliser un compte ngrok payant avec une URL fixe
- Ou créer un script qui met à jour automatiquement Facebook via l'API (plus complexe)

