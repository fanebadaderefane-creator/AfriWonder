# Règles messages d'erreur utilisateur — AfriWonder

Toute erreur visible par l'utilisateur **doit** respecter ces règles. Audit initial dans `AUDIT_QA_LAUNCH_READY.md`.

---

## 1. Règle d'or

> **Si l'utilisateur doit réfléchir pour comprendre, c'est une erreur UX.**

Aucun message technique ne doit fuiter : ni stack, ni `undefined`, ni nom d'exception, ni code HTTP brut, ni nom de route.

## 2. Côté backend

Chaque réponse d'erreur doit suivre ce format :

```json
{
  "success": false,
  "error": "Message court en français, humain, actionnable"
}
```

- **Langue** : français (marché v1 Mali) — pas d'anglais côté API.
- **Longueur** : ≤ 200 caractères.
- **Ton** : neutre, factuel, sans jargon. Exemples :
  - ✅ `"Ce numéro est déjà utilisé par un autre compte."`
  - ✅ `"Solde insuffisant pour effectuer ce transfert."`
  - ❌ `"Prisma error P2002 unique constraint violated on field phone_number"`
  - ❌ `"500 Internal Server Error"` / `"undefined"`
- **Pas de leak** : jamais de requête SQL, trace, chemin de fichier, nom de variable, clé d'env.
- Pour les erreurs internes (`next(err)` non gérées), le handler global doit renvoyer un message **générique** (`"Une erreur est survenue, réessayez dans un instant."`) tout en loguant la vraie erreur côté Sentry.

## 3. Côté frontend

Pattern recommandé pour un `Alert.alert` :

```ts
try {
  await apiCall();
} catch (err) {
  const msg =
    (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
    || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (err as { message?: string })?.message
    || 'Action impossible pour le moment. Réessayez dans quelques instants.';
  Alert.alert('Titre fonctionnel en FR', String(msg).slice(0, 200));
}
```

Règles dérivées :

- **Titre** : court, en français, décrivant le contexte (`"Paiement"`, `"Inscription"`, `"Partage"`), jamais `"Error"`.
- **Fallback final** : toujours un message humain français.
- **Filtrage** : si le message contient `undefined`, `null`, `[object`, une regex type `/^Error:/`, remplacer par le fallback.
- **Taille** : tronquer à 200 chars pour éviter une fenêtre illisible.
- **Composant `ErrorState`** : pour les erreurs plein écran (liste indisponible, etc.), utiliser le composant standard — pas d'Alert.

## 4. Checklist QA

Pour chaque feature, tester :

- [ ] Backend down (timeout) → message humain
- [ ] 500 inattendu → message générique + Sentry loggé
- [ ] 400 validation → le message backend est affiché tel quel (donc il doit être humain)
- [ ] 401 / 403 → "Reconnectez-vous" ou "Action non autorisée"
- [ ] 404 → "Contenu introuvable"
- [ ] Mode avion / offline → message clair + bouton "Réessayer"
- [ ] 3G très lente → spinner + message si > 10 s, pas un crash

## 5. À éviter

- `Alert.alert('Error', ...)` ou `Alert.alert('error', ...)`
- `Alert.alert('undefined', ...)`
- `Alert.alert(String(err), ...)`
- Stack complète dans l'UI
- Codes HTTP bruts (`"401"`, `"Network Error"`)
- Texte anglais dans une app FR

Toute PR qui introduit l'un de ces patterns doit être bloquée en review.
