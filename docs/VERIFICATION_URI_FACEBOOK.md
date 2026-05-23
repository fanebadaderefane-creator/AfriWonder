# ✅ Vérification : Correspondance Exacte de l'URI Facebook

## ⚠️ RÈGLE D'OR

**L'URL dans votre code backend DOIT être EXACTEMENT la même que celle dans Facebook Developer Console.**

Même une petite différence (un caractère, un slash, une majuscule) causera l'erreur "URL bloquée".

---

## 🔍 Vérification Étape par Étape

### 1. Vérifier l'URL dans le Backend

**Fichier** : `backend/.env`

**Ligne à vérifier** :
```env
FACEBOOK_REDIRECT_URI="https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback"
```

**URL extraite** (sans les guillemets) :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**✅ Vérifiez** :
- [ ] Protocole : `https://` (pas `http://`)
- [ ] Domaine : `univitrescent-kathleen-encephalitic.ngrok-free.dev`
- [ ] Chemin : `/api/auth/facebook/callback`
- [ ] Pas de slash final après `callback`
- [ ] Pas d'espaces avant ou après

---

### 2. Vérifier l'URL dans Facebook Developer Console

**Où aller** :
1. Facebook Developer Console → Votre application
2. "Connexion Facebook" → "Paramètres"
3. Section "URI de redirection OAuth valides"

**URL qui DOIT être présente** :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**✅ Vérifiez** :
- [ ] L'URL est dans la liste
- [ ] Protocole : `https://` (exactement comme dans `.env`)
- [ ] Domaine : `univitrescent-kathleen-encephalitic.ngrok-free.dev` (exactement identique)
- [ ] Chemin : `/api/auth/facebook/callback` (exactement identique)
- [ ] Pas de slash final
- [ ] Pas d'espaces

---

### 3. Comparaison Caractère par Caractère

**Backend (.env)** :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**Facebook Developer Console** :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**✅ Elles doivent être IDENTIQUES** :
- Même nombre de caractères
- Même casse (majuscules/minuscules)
- Même ordre des caractères
- Aucune différence

---

## 🔧 Si Elles Ne Correspondent Pas

### Solution 1 : Copier depuis le Backend

1. **Ouvrez** `backend/.env`
2. **Copiez** la valeur de `FACEBOOK_REDIRECT_URI` (sans les guillemets)
3. **Allez** dans Facebook Developer Console
4. **Supprimez** l'ancienne URI de la liste
5. **Collez** la nouvelle URI exacte
6. **Sauvegardez** les modifications
7. **Redémarrez** le backend

### Solution 2 : Vérifier les Guillemets

Dans `backend/.env`, l'URI peut être avec ou sans guillemets :
```env
# Format 1 (avec guillemets) - RECOMMANDÉ
FACEBOOK_REDIRECT_URI="https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback"

# Format 2 (sans guillemets) - Fonctionne aussi
FACEBOOK_REDIRECT_URI=https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**Important** : Le code backend enlève automatiquement les guillemets, donc les deux formats fonctionnent.

---

## ✅ Checklist Finale

Avant de tester l'authentification Facebook, vérifiez :

- [ ] L'URL dans `backend/.env` est correcte
- [ ] L'URL dans Facebook Developer Console est **EXACTEMENT la même**
- [ ] Les modifications dans Facebook ont été **sauvegardées**
- [ ] Le backend a été **redémarré** après modification de `.env`
- [ ] ngrok est **actif** et utilise la même URL
- [ ] Le domaine est ajouté dans "Domaines autorisés pour le SDK Javascript"
- [ ] Tous les paramètres OAuth sont activés dans Facebook

---

## 🎯 URL Actuelle (Exemple)

**Backend** :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**Facebook** :
```
https://univitrescent-kathleen-encephalitic.ngrok-free.dev/api/auth/facebook/callback
```

**✅ Correspondance** : Parfaite ✓

---

## 🆘 Si l'Erreur Persiste

1. **Vérifiez** que ngrok utilise toujours la même URL
2. **Vérifiez** dans la console du navigateur (F12) quelle URL est envoyée à Facebook
3. **Comparez** cette URL avec celle dans Facebook Developer Console
4. **Assurez-vous** que toutes les modifications ont été sauvegardées

---

## 📝 Note Importante

Si vous redémarrez ngrok, l'URL changera. Dans ce cas :
1. Mettez à jour `backend/.env` avec la nouvelle URL
2. Mettez à jour Facebook Developer Console avec la nouvelle URL
3. Redémarrez le backend
4. Testez à nouveau

