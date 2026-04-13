# AfriWonder — tests E2E avec Maestro

Maestro cible les **builds natifs** (iOS / Android), en complément des E2E **Playwright** dans `tests/e2e/*.spec.ts`.

## Installation

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Exécution

Depuis la racine du dépôt :

```bash
maestro test tests/e2e/maestro/
```

Pour un flux précis :

```bash
maestro test tests/e2e/maestro/flow_auth.yaml
```

> Les flux **déjà présents** pour l’app Expo se trouvent aussi sous `frontend/maestro/` (`smoke.yaml`, etc.). Les fichiers listés ci-dessous sont la **cible produit** à implémenter sous `tests/e2e/maestro/`.

## Tests E2E critiques

| Fichier | Description |
|--------|-------------|
| `flow_auth.yaml` | Inscription (email) + déconnexion + connexion + erreur login (voir en-tête du YAML pour prérequis) |
| `flow_feed.yaml` | Feed vidéo (swipe, double-tap, commentaires, onglets, notif, recherche, profil, partage, pull) |
| `flow_live.yaml` | Hub Live, Go Live → setup stream (titre, catégorie), retour, section Replays |
| `flow_payment.yaml` | Portefeuille / recharge (Orange Money + Wave), sans soumission réelle |
| `flow_marketplace.yaml` | Market → recherche (mock « Bogolan ») → 1re carte → fiche (FCFA) → Ajouter au panier → panier (`cart-button`) |
| `flow_messaging.yaml` | Découvrir → messages-entry → AfriChat → FAB nouveau → 1er contact → message-input / send-button → messages-new-group (« groupe ») |
| `flow_offline.yaml` | Feed en ligne → Profil → grille `/watch` → `save-button` (téléchargement) optionnel → Paramètres (`profile-settings-button`, « Parametres ») |
| `flow_subscriptions.yaml` | Profil → `profile-subscriptions-entry` → AfriWonder+ / tarifs → avantages → onglets `subscription-tab-fanclubs` / `subscription-tab-my` |
