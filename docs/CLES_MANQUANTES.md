# Clés manquantes — récapitulatif (sans secrets réels)

> **Sécurité :** ce fichier ne doit **jamais** contenir d’identifiants, MSISDN, codes marchands ou clés d’API réels. Toute valeur sensible appartient uniquement à des variables d’environnement locales ou à un gestionnaire de secrets (Doppler, vault hébergeur, etc.), pas au dépôt Git.

## Ancien service / intégrations (exemples de noms de variables)

- `VITE_BASE44_APP_ID` — identifiant d’app (à obtenir dans le tableau de bord du fournisseur)
- `VITE_BASE44_APP_BASE_URL` — URL de base API
- `VITE_BASE44_FUNCTIONS_VERSION` — ex. `v1`

**Statut typique :** à vérifier dans votre environnement ; ne pas commiter de valeurs.

## Orange Money (paiements)

Variables souvent attendues côté front (noms indicatifs) :

- `VITE_ORANGE_MERCHANT_ID` / `VITE_REACT_APP_ORANGE_MERCHANT_ID` — identifiants marchand **fournis par Orange** (sandbox / prod)
- `VITE_ORANGE_API_KEY` / `VITE_REACT_APP_ORANGE_API_KEY` — clé API **à obtenir auprès du support Orange Money** du pays concerné

**Procédure indicative :**

1. Contacter le support API Orange Money pour votre pays (Mali, Sénégal, etc.).
2. Fournir les informations demandées par le contrat marchand (MSISDN professionnel, code agent, etc.) **hors dépôt**.
3. Renseigner les clés uniquement dans `.env` / secrets hébergeur, jamais dans un fichier Markdown du repo.

**Sans clé API :** les paiements Orange Money peuvent rester désactivés ou en échec — à valider en **sandbox** avec tests automatisés avant production.

## Clés optionnelles (exemples)

- Stripe : `VITE_STRIPE_PUBLISHABLE_KEY` (clé **publique** uniquement côté front ; les secrets restent serveur)
- Push : `VITE_REACT_APP_VAPID_PUBLIC_KEY`
- WebSocket : `VITE_REACT_APP_WS_URL`
- API custom : `VITE_REACT_APP_API_URL`

## Récapitulatif par priorité (indicatif)

| Priorité   | Sujet              | Impact              |
| ---------- | ------------------ | ------------------- |
| Haute      | Orange Money API   | Paiements mobile    |
| Faible     | Stripe, push, etc. | Selon produit       |

## Action immédiate

1. Retirer du dépôt toute valeur réelle déjà commitée (rotation des clés exposées si nécessaire).
2. Activer le **secret scanning** sur la forge (GitHub/GitLab).
3. Maintenir ce document comme **checklist** uniquement, sans données sensibles.
