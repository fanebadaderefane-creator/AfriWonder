# ✅ Ajouter l'URI de Redirection pour le Développement Local

## 📋 Situation Actuelle

Vous avez déjà ces URI configurées (pour la production Firebase) :
- ✅ `https://africonnect.uk/__/auth/handler`
- ✅ `https://africonnect.firebaseapp.com/__/auth/handler`
- ✅ `https://africonnect.web.app/__/auth/handler`
- ✅ `https://africonnect-23165.firebaseapp.com/__/auth/handler`

## ➕ Action Requise : Ajouter l'URI de Développement

Vous devez **AJOUTER** une nouvelle URI pour le développement local.

### Étapes :

1. **Dans la section "Authorized redirect URIs"**, vous verrez vos 4 URI existantes

2. **Cliquez sur "+ ADD URI"** ou **"ADD URI"** (il y a probablement un bouton pour ajouter une 5ème URI)

3. **Dans le nouveau champ**, tapez EXACTEMENT :
   ```
   http://localhost:3000/api/auth/google/callback
   ```

4. **Cliquez sur "SAVE"** ou **"ENREGISTRER"**

5. **Résultat** : Vous aurez maintenant **5 URI** au total :
   - Les 4 URI Firebase (production)
   - La nouvelle URI localhost (développement)

## ⚠️ Important

- **Ne supprimez PAS** les URI Firebase existantes
- **Ajoutez simplement** la nouvelle URI localhost
- L'URI localhost est uniquement pour le développement sur votre machine

## 🎯 Après Ajout

Une fois ajouté, vous devriez voir :

```
Authorized redirect URIs

URI 1: https://africonnect.uk/__/auth/handler
URI 2: https://africonnect.firebaseapp.com/__/auth/handler
URI 3: https://africonnect.web.app/__/auth/handler
URI 4: https://africonnect-23165.firebaseapp.com/__/auth/handler
URI 5: http://localhost:3000/api/auth/google/callback  ← NOUVELLE
```

## ✅ Vérification

1. Sauvegardez les changements
2. Attendez 1-2 minutes
3. Testez le bouton "Continuer avec Google" dans votre application
4. L'erreur `redirect_uri_mismatch` devrait disparaître

