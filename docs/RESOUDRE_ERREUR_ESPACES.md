# 🔧 Résoudre l'Erreur "Le domaine autorisé ne peut pas contenir d'espace"

## ❌ Problème Actuel

L'URI `http://localhost:3000/api/auth/google/callback` affiche une erreur rouge :
> "Redirection non valide : le domaine autorisé ne peut pas contenir d'espace."

Cela signifie qu'il y a des **espaces invisibles** dans l'URI.

## ✅ Solution : Retaper l'URI Manuellement

### Étape 1 : Supprimer l'URI avec Erreur

1. **Cliquez sur l'icône poubelle** 🗑️ à droite de l'URI 5 (celle en rouge)
2. L'URI sera supprimée

### Étape 2 : Ajouter une Nouvelle URI (Sans Espaces)

1. **Cliquez sur "+ Ajouter un URI"** (bouton bleu en bas)
2. Un nouveau champ vide apparaîtra

3. **IMPORTANT : Ne copiez PAS l'URI !**
   - ❌ Ne copiez pas depuis un document
   - ❌ Ne copiez pas depuis le navigateur
   - ✅ **Tapez manuellement** caractère par caractère

4. **Tapez EXACTEMENT** (sans espaces avant/après) :
   ```
   http://localhost:3000/api/auth/google/callback
   ```

5. **Vérifiez qu'il n'y a pas d'espaces** :
   - Pas d'espace avant `http`
   - Pas d'espace après `callback`
   - Pas d'espaces au milieu

### Étape 3 : Vérifier et Sauvegarder

1. **Regardez le champ** : il ne doit pas avoir de bordure rouge
2. Si c'est bon, **cliquez sur "Enregistrer"** (bouton en bas à gauche)
3. Le bouton "Enregistrer" devrait devenir actif (bleu)

## 🎯 Méthode Alternative : Copier-Coller Propre

Si vous voulez copier-coller, suivez ces étapes :

1. **Supprimez** l'URI avec erreur (icône poubelle)
2. **Cliquez** dans le nouveau champ vide
3. **Sélectionnez TOUT le texte** dans le champ (Ctrl+A)
4. **Supprimez** (Delete ou Backspace)
5. **Tapez manuellement** :
   ```
   http://localhost:3000/api/auth/google/callback
   ```
6. **Vérifiez** qu'il n'y a pas de bordure rouge
7. **Sauvegardez**

## ⚠️ Caractères à Éviter

- ❌ Espaces normaux : ` `
- ❌ Espaces insécables : ` ` (invisible mais présent)
- ❌ Tabulations : `	`
- ❌ Retours à la ligne : `\n`
- ❌ Caractères spéciaux invisibles

## ✅ Caractères Valides

- ✅ Lettres : `a-z`, `A-Z`
- ✅ Chiffres : `0-9`
- ✅ Points : `.`
- ✅ Slashes : `/`
- ✅ Deux-points : `:`

## 🔍 Vérification Visuelle

L'URI correcte doit ressembler exactement à ceci (sans espaces) :

```
http://localhost:3000/api/auth/google/callback
```

**Longueur attendue** : 47 caractères

## 📝 Checklist

- [ ] J'ai supprimé l'URI avec l'erreur rouge
- [ ] J'ai cliqué sur "+ Ajouter un URI"
- [ ] J'ai tapé l'URI **manuellement** (pas copier-coller)
- [ ] Il n'y a **pas de bordure rouge** autour du champ
- [ ] Le bouton "Enregistrer" est **actif** (bleu, pas gris)
- [ ] J'ai cliqué sur "Enregistrer"
- [ ] J'ai attendu la confirmation de sauvegarde

## 🆘 Si l'Erreur Persiste

1. **Videz complètement le champ** (Ctrl+A puis Delete)
2. **Fermez et rouvrez** la page Google Cloud Console
3. **Réessayez** de taper l'URI manuellement
4. **Utilisez un autre navigateur** (Chrome, Edge, Firefox)

