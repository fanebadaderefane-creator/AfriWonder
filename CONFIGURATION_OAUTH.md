# 🔐 Configuration OAuth - Google et Facebook

## ⚠️ Erreur : redirect_uri_mismatch

Cette erreur signifie que l'URI de redirection dans votre code ne correspond **PAS EXACTEMENT** à celle configurée dans les consoles Google/Facebook.

## ✅ Solution : Configurer les URI de redirection

### Google OAuth

1. **Allez sur Google Cloud Console :**
   - https://console.cloud.google.com/apis/credentials
   - Connectez-vous avec votre compte Google

2. **Sélectionnez votre projet** (ou créez-en un)

3. **Ouvrez votre OAuth 2.0 Client ID :**
   - Cliquez sur le Client ID : `443955383706-2rka5q381h06d71lcm3vmbc77q2uiequ.apps.googleusercontent.com`

4. **Dans "Authorized redirect URIs", ajoutez EXACTEMENT :**
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   ⚠️ **IMPORTANT :**
   - Pas de slash final
   - Pas de guillemets
   - Exactement comme ci-dessus
   - Pour la production, ajoutez aussi : `https://votre-domaine.com/api/auth/google/callback`

5. **Sauvegardez** et attendez 1-2 minutes pour la propagation

### Facebook OAuth

1. **Allez sur Facebook Developers :**
   - https://developers.facebook.com/apps
   - Connectez-vous avec votre compte Facebook

2. **Sélectionnez votre application :**
   - App ID : `1461264728859875`

3. **Allez dans "Settings" → "Basic"**

4. **Dans "Valid OAuth Redirect URIs", ajoutez EXACTEMENT :**
   ```
   http://localhost:3000/api/auth/facebook/callback
   ```
   ⚠️ **IMPORTANT :**
   - Pas de slash final
   - Pas de guillemets
   - Exactement comme ci-dessus
   - Pour la production, ajoutez aussi : `https://votre-domaine.com/api/auth/facebook/callback`

5. **Sauvegardez**

## 📝 Vérification

### Vérifier que les URI correspondent

**Dans votre code backend :**
- `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`
- `FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback`

**Dans Google Cloud Console :**
- Doit être EXACTEMENT : `http://localhost:3000/api/auth/google/callback`

**Dans Facebook Developers :**
- Doit être EXACTEMENT : `http://localhost:3000/api/auth/facebook/callback`

## 🔄 Après configuration

1. **Redémarrez le serveur backend** pour charger les nouvelles configurations
2. **Testez à nouveau** les boutons Google/Facebook
3. **Vérifiez la console** pour voir si l'erreur persiste

## 🐛 Dépannage

### Si l'erreur persiste :

1. **Vérifiez les guillemets dans .env :**
   ```env
   # ❌ MAUVAIS
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
   
   # ✅ BON
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

2. **Vérifiez qu'il n'y a pas d'espaces :**
   ```env
   # ❌ MAUVAIS
   GOOGLE_REDIRECT_URI = http://localhost:3000/api/auth/google/callback
   
   # ✅ BON
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

3. **Vérifiez la casse (minuscules/majuscules) :**
   - L'URI doit être en minuscules : `http://` (pas `HTTP://`)

4. **Attendez 1-2 minutes** après avoir sauvegardé dans les consoles

## 📞 Support

Si le problème persiste après avoir vérifié tout ce qui précède, vérifiez :
- Les logs du backend pour voir l'URI exacte utilisée
- La console du navigateur pour les erreurs réseau
- Les paramètres OAuth dans les consoles Google/Facebook

