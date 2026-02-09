# 🔒 Solution : Facebook OAuth avec HTTPS Local

## ❌ Problème

Facebook exige HTTPS, mais "Imposer le HTTPS" n'est pas désactivable.

## ✅ Solution : Utiliser ngrok (Tunnel HTTPS)

### Option 1 : ngrok (Recommandé - Gratuit)

#### Étape 1 : Installer ngrok

1. **Allez sur** : https://ngrok.com/download
2. **Téléchargez** ngrok pour Windows
3. **Extrayez** le fichier `ngrok.exe` dans un dossier (ex: `C:\ngrok\`)

#### Étape 2 : Créer un compte ngrok (Gratuit)

1. **Allez sur** : https://dashboard.ngrok.com/signup
2. **Créez un compte gratuit**
3. **Copiez votre "Authtoken"** depuis le dashboard

#### Étape 3 : Configurer ngrok

1. **Ouvrez PowerShell** ou **Invite de commandes**
2. **Exécutez** :
   ```powershell
   ngrok config add-authtoken VOTRE_AUTHTOKEN
   ```

#### Étape 4 : Démarrer le tunnel

1. **Assurez-vous** que votre backend tourne sur `http://localhost:3000`
2. **Dans un nouveau terminal**, exécutez :
   ```powershell
   ngrok http 3000
   ```
3. **Vous verrez** quelque chose comme :
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
   ```
4. **Copiez l'URL HTTPS** (ex: `https://abc123.ngrok-free.app`)

#### Étape 5 : Configurer Facebook

⚠️ **IMPORTANT** : Facebook redirige vers le **BACKEND**, jamais le frontend !

1. **Copiez l'URL exacte depuis `backend/.env`** :
   - Ouvrez `backend/.env`
   - Trouvez `FACEBOOK_REDIRECT_URI`
   - Copiez la valeur (sans les guillemets)

2. **Dans Facebook Developer Console**, ajoutez ces URI :
   - Allez dans "Connexion Facebook" → "Paramètres"
   - Dans "URI de redirection OAuth valides", ajoutez **2 URI** :
     ```
     https://abc123.ngrok-free.app/api/auth/facebook/callback
     http://localhost:3000/api/auth/facebook/callback
     ```
   - ⚠️ **Points critiques** :
     - ✅ Chemin avec `/api` : `/api/auth/facebook/callback`
     - ✅ Port du backend : `3000` (pas le frontend)
     - ✅ Pas de slash final après `callback`
     - ❌ **NE PAS** ajouter : `http://localhost:3000/auth/facebook/callback` (sans `/api`)

3. **Ajoutez les domaines autorisés** :
   - Dans "Domaines autorisés pour le SDK Javascript", ajoutez :
     ```
     localhost
     abc123.ngrok-free.app
     ```
   - ⚠️ **Format** :
     - ✅ Sans `https://` ou `http://`
     - ✅ Sans slash final `/`
     - ✅ Juste le domaine : `abc123.ngrok-free.app`

4. **Vérifiez la correspondance exacte** :
   - Comparez caractère par caractère
   - Même protocole (`https://` pour ngrok, `http://` pour localhost)
   - Même domaine
   - Même chemin (`/api/auth/facebook/callback`)
   - Pas de faute de frappe dans le domaine

5. **Sauvegardez** en cliquant sur "Enregistrer les modifications"

#### Étape 6 : Mettre à jour le backend

1. **Ouvrez** `backend/.env`
2. **Modifiez** `FACEBOOK_REDIRECT_URI` :
   ```env
   FACEBOOK_REDIRECT_URI="https://abc123.ngrok-free.app/api/auth/facebook/callback"
   ```
   (Remplacez par votre URL ngrok exacte)

3. **⚠️ VÉRIFIEZ** que l'URL dans `.env` correspond **EXACTEMENT** à celle dans Facebook :
   - Même protocole
   - Même domaine
   - Même chemin
   - Pas de différences

4. **Redémarrez** le backend pour charger la nouvelle configuration

---

### Option 2 : Utiliser localhost avec HTTPS (Plus complexe)

Si vous préférez utiliser `localhost` directement avec HTTPS, vous devrez :
1. Générer un certificat SSL auto-signé
2. Configurer votre serveur Express pour utiliser HTTPS
3. Accepter le certificat dans votre navigateur

Cette option est plus complexe et ngrok est généralement plus simple.

---

## 🎯 Résumé Rapide

1. **Installer ngrok** : https://ngrok.com/download
2. **Créer un compte** : https://dashboard.ngrok.com/signup
3. **Configurer** : `ngrok config add-authtoken VOTRE_TOKEN`
4. **Démarrer** : `ngrok http 3000`
5. **Copier l'URL HTTPS** générée
6. **Ajouter dans Facebook** : `https://VOTRE-URL.ngrok-free.app/api/auth/facebook/callback`
7. **Mettre à jour** `backend/.env` avec la nouvelle URI

---

## ⚠️ Notes Importantes

### Configuration Backend vs Frontend

- ✅ **Facebook redirige vers le BACKEND** : `http://localhost:3000/api/auth/facebook/callback`
- ❌ **PAS vers le frontend** : `http://localhost:5173/auth/facebook/callback`
- 📌 **Logique** : Facebook → Backend → Frontend

### Chemin du Callback

- ✅ **Correct** : `/api/auth/facebook/callback` (avec `/api`)
- ❌ **Incorrect** : `/auth/facebook/callback` (sans `/api`)

### URL ngrok

- L'URL ngrok **change à chaque redémarrage** (sauf avec un compte payant)
- Si vous redémarrez ngrok, **mettez à jour** :
  1. `backend/.env` avec la nouvelle URL
  2. Facebook Developer Console avec la nouvelle URL
  3. Redémarrez le backend

### Mode Strict

- Si "Utiliser le mode strict" est activé, l'URL doit être **PARFAITEMENT identique**
- Vérifiez caractère par caractère
- Même protocole, même domaine, même chemin, même port

---

## 🆘 Dépannage

### Erreur : "authentication failed: The authtoken you specified is properly formed, but it is invalid"

**Problème** : Votre authtoken ngrok est invalide ou a été révoqué.

**Solution** :

1. **Connectez-vous** à votre dashboard ngrok : https://dashboard.ngrok.com/get-started/your-authtoken
2. **Copiez votre nouveau authtoken** depuis la page
3. **Configurez le nouveau token** dans PowerShell :
   ```powershell
   ngrok config add-authtoken VOTRE_NOUVEAU_AUTHTOKEN
   ```
4. **Vérifiez** que la configuration est correcte :
   ```powershell
   ngrok config check
   ```
5. **Redémarrez** votre tunnel :
   ```powershell
   ngrok http 3000
   ```

**Causes possibles** :
- Le token a été réinitialisé depuis le dashboard
- Le token était associé à un compte d'équipe dont vous avez été retiré
- Le token a été explicitement révoqué

---

### Erreur Facebook : "Ceci n'est pas un URI de redirection valide pour cette application"

**Problème** : L'URI est dans la liste mais le validateur indique une erreur.

**Solutions** :

1. **Vérifier le format exact** :
   - L'URI doit être sur une seule ligne, sans espaces avant/après
   - Format exact : `https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback`
   - Pas de slash final
   - Pas de guillemets
   - ⚠️ **Important** : Vérifiez qu'il n'y a pas de différence entre l'URI dans le validateur et celle dans la liste (même une lettre peut causer une erreur)

2. **Sauvegarder les changements** :
   - Assurez-vous d'avoir cliqué sur le bouton **"Enregistrer les modifications"** (Save changes) en bas de la page
   - Attendez quelques secondes pour la propagation

3. **Vérifier le mode strict** :
   - Si "Utiliser le mode strict pour les URI de redirection" est activé (recommandé)
   - L'URI doit correspondre **exactement** à celle dans la liste
   - Vérifiez qu'il n'y a pas de différences (majuscules/minuscules, espaces, etc.)

4. **Réessayer après sauvegarde** :
   - Après avoir sauvegardé, cliquez à nouveau sur **"Vérifier l'URI"** dans le validateur
   - Si l'erreur persiste, supprimez l'URI de la liste et réajoutez-la
   - **Astuce** : Copiez l'URI directement depuis la liste des URI valides et collez-la dans le validateur pour éviter les erreurs de frappe

5. **Vérifier la correspondance exacte** :
   - L'URI dans le validateur doit être **identique** à celle dans la liste
   - Copiez-collez depuis la liste pour garantir l'exactitude
   - Vérifiez caractère par caractère s'il le faut

6. **Vérifier que "Imposer le HTTPS" est activé** :
   - C'est normalement activé par défaut
   - Assurez-vous que le toggle est sur "Oui"

7. **Si rien ne fonctionne** :
   - Déconnectez-vous et reconnectez-vous à Facebook Developer Console
   - Attendez 5-10 minutes pour la propagation complète
   - Réessayez ensuite

---

### Erreur Facebook : "URL bloquée - La redirection a échoué car l'URI redirigée n'est pas approuvée"

**Problème** : Facebook bloque l'URI même si elle est dans la liste des URI valides.

**⚠️ CAUSE PRINCIPALE : L'URL dans votre code ne correspond PAS EXACTEMENT à celle dans Facebook**

**Vérification CRUCIALE** :

1. **Vérifier l'URL dans votre backend** :
   - Ouvrez `backend/.env`
   - Vérifiez la valeur de `FACEBOOK_REDIRECT_URI`
   - Exemple actuel : `https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback`

2. **Vérifier l'URL dans Facebook Developer Console** :
   - Allez dans "Connexion Facebook" → "Paramètres"
   - Regardez "URI de redirection OAuth valides"
   - L'URL doit être **EXACTEMENT la même** :
     - ✅ Même protocole (`https://` ou `http://`)
     - ✅ Même domaine (exactement les mêmes caractères)
     - ✅ Même chemin (`/api/auth/facebook/callback`)
     - ✅ Pas de slash final
     - ✅ Pas de différences de casse (majuscules/minuscules)

3. **Si elles ne correspondent pas** :
   - Copiez l'URL depuis `backend/.env`
   - Collez-la dans Facebook Developer Console
   - Sauvegardez
   - Redémarrez le backend

**Solutions (dans l'ordre)** :

1. **Vérifier que les modifications ont été sauvegardées** :
   - Retournez dans Facebook Developer Console
   - Allez dans "Connexion Facebook" → "Paramètres"
   - Vérifiez que l'URI est toujours dans la liste
   - **Cliquez sur "Enregistrer les modifications"** si vous ne l'avez pas fait
   - Attendez 2-3 minutes après la sauvegarde

2. **Vérifier tous les paramètres OAuth** :
   - ✅ "Connexion OAuth Web" : doit être sur **"Oui"**
   - ✅ "Connexion OAuth cliente" : doit être sur **"Oui"**
   - ✅ "Utiliser le mode strict" : peut être sur "Oui" ou "Non" (essayez les deux)
   - ✅ "Imposer le HTTPS" : doit être sur **"Oui"**
   - Sauvegardez après chaque modification

3. **Ajouter le domaine ngrok dans "Domaines autorisés"** ⚠️ **IMPORTANT** :
   - Dans la même page "Paramètres"
   - Trouvez "Domaines autorisés pour le SDK Javascript"
   - **Ajoutez le domaine** : `univitrescent-kathleen-encephalitic.ngrok-free.dev`
   - ⚠️ **Format important** :
     - ✅ **Correct** : `univitrescent-kathleen-encephalitic.ngrok-free.dev`
     - ❌ **Incorrect** : `https://univitrescent-kathleen-encephalitic.ngrok-free.dev` (pas de https://)
     - ❌ **Incorrect** : `univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback` (pas de chemin)
   - Cliquez sur "Ajouter" ou appuyez sur Entrée
   - **Sauvegardez les modifications** en bas de la page

4. **Vérifier dans "Settings" → "Basic"** :
   - Allez dans "Paramètres" → "Général" (Basic)
   - Cherchez "Valid OAuth Redirect URIs"
   - Vérifiez que l'URI y est aussi : `https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback`
   - Si elle n'y est pas, ajoutez-la et sauvegardez

5. **Redémarrer le backend** :
   - Arrêtez le backend (Ctrl+C)
   - Redémarrez-le pour recharger les variables d'environnement :
     ```powershell
     npm run dev
     ```

6. **Vérifier que ngrok est toujours actif** :
   - Assurez-vous que ngrok tourne toujours
   - L'URL doit être la même : `https://univitrescent-kathleen-encephalitic.ngrok-free.dev`
   - Si ngrok a été redémarré, l'URL a changé et il faut tout reconfigurer

7. **Désactiver temporairement le mode strict** :
   - Dans "Paramètres OAuth client"
   - Mettez "Utiliser le mode strict" sur **"Non"**
   - Sauvegardez
   - Testez à nouveau
   - Si ça fonctionne, réactivez le mode strict après

8. **Vérifier l'URI exacte utilisée** :
   - Ouvrez la console du navigateur (F12)
   - Regardez les requêtes réseau
   - Vérifiez l'URI exacte envoyée à Facebook
   - Elle doit correspondre **exactement** à celle dans Facebook Developer Console

9. **Erreur "Vous devez spécifier au moins un domaine hôte JSSDK"** :
   - Le domaine est ajouté mais l'erreur persiste ?
   - **Solution 1** : Sauvegarder les modifications (bouton "Enregistrer les modifications" en bas)
   - **Solution 2** : Si vous n'utilisez pas le SDK JavaScript directement, désactivez "Se connecter avec le SDK JavaScript"
   - **Solution 3** : Vérifier que le domaine est bien formaté (sans https://, sans chemin)
   - Attendre 2-3 minutes après sauvegarde pour la propagation

---

## ✅ Configuration Actuelle

**URL ngrok active** : `https://unvitrescent-kathleen-encephalitic.ngrok-free.dev` (sans "i" dans "unvitrescent")

⚠️ **IMPORTANT** : L'URL ngrok change à chaque redémarrage (version gratuite). Vérifiez toujours l'URL actuelle avec :
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:4040/api/tunnels" -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
$httpsTunnel = $data.tunnels | Where-Object { $_.proto -eq 'https' }
$httpsTunnel.public_url
```

**Configuration backend** : ✅ **Mise à jour automatique effectuée**
- `backend/.env` a été mis à jour avec :
  ```env
  FACEBOOK_REDIRECT_URI="https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback"
  ```

**Configuration Facebook** : ⚠️ **Action requise**
- ✅ L'URI est dans la liste "URI de redirection OAuth valides"
- ✅ Tous les paramètres OAuth sont activés
- ✅ Le domaine est ajouté dans "Domaines autorisés pour le SDK Javascript"
- ⚠️ **IMPORTANT - Action requise** :
  1. **Sauvegarder les modifications** :
     - Faites défiler jusqu'en bas de la page
     - Cliquez sur le bouton bleu **"Enregistrer les modifications"**
     - ⚠️ **C'est crucial** - sans sauvegarde, les changements ne sont pas appliqués
  2. **Si l'erreur JSSDK persiste après sauvegarde** :
     - Option A : Attendre 2-3 minutes pour la propagation
     - Option B : Désactiver "Se connecter avec le SDK JavaScript" si vous n'utilisez pas le SDK JavaScript directement
  3. Attendre 2-3 minutes après la sauvegarde avant de tester

**Après configuration Facebook** :
- Redémarrez votre backend pour que les changements prennent effet
- Testez l'authentification Facebook

---

## 🆘 Besoin d'Aide ?

Si vous avez des difficultés avec ngrok, dites-moi à quelle étape vous êtes bloqué.

