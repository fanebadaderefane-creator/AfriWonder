# AfriConnect — Plan de tests critiques

Scénarios à couvrir pour **auth**, **paiement**, **live** et **events**, en manuel ou via tests automatisés.

---

## 1. Auth

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Connexion email/mot de passe | Saisir identifiants valides → Login | Redirection, tokens en cookie/localStorage, utilisateur affiché |
| Connexion invalide | Mauvais email ou mot de passe | Message d’erreur (ex. `err.apiMessage`), pas de redirection |
| Refresh token | Laisser la session expirer (ou supprimer access_token), puis faire une action API | Renouvellement silencieux du token, requête réussie |
| Déconnexion | Cliquer Déconnexion | Tokens supprimés, redirection vers accueil / landing |
| OAuth Google / Facebook | Cliquer « Se connecter avec Google/Facebook » (si configuré) | Callback, cookies définis, utilisateur connecté |

---

## 2. Paiement

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Recharge wallet (Orange Money) | Montant → Initier paiement → Simuler callback `?transactionId=...` | Wallet crédité, statut « completed » |
| Cadeau pendant un live | Rejoindre un live → Ouvrir cadeaux → Choisir un cadeau (solde suffisant) | Débit wallet viewer, crédit créateur (90 %) + plateforme (10 %), message dans le chat |
| Cadeau solde insuffisant | Tenter un cadeau avec solde < montant | Erreur claire (ex. « Solde insuffisant »), pas de débit |
| Réservation événement payante | Choisir un billet payant → Payer (Orange/Stripe selon config) | Billet créé, paiement confirmé, PDF téléchargeable |
| Commande marketplace | Panier → Checkout → Paiement | Commande créée, statut mis à jour, facture disponible |

---

## 3. Live

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Démarrer un live | Titre + catégorie → Commencer le live | Stream créé, statut « live », preview caméra si Agora configuré |
| Rejoindre en tant que viewer | Ouvrir la page LiveView?id=... | Compteur viewers incrémenté, flux vidéo si Agora, chat actif |
| Quitter la page viewer | Fermer l’onglet ou naviguer ailleurs | Compteur viewers décrémenté (heartbeat/cleanup) |
| Envoyer un message chat | Saisir un message → Envoyer | Message affiché dans la liste, rate limit respecté (1 msg / 2 s) |
| Envoyer un cadeau | Ouvrir cadeaux → Sélectionner → Envoyer | Animation cadeau, solde débité, créateur crédité 90 %, plateforme 10 % |
| Terminer le live (avec replay) | Terminer → Saisir URL replay (optionnel) → Confirmer | Statut « ended », `replay_url` enregistré |
| Voir un replay | Aller sur Lives → Section Replays → Cliquer un replay | LiveView en mode « Replay », iframe avec `replay_url` |

---

## 4. Events

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Réserver un billet (gratuit) | EventDetails → Réserver | Billet créé, pas de paiement |
| Réserver un billet (payant) | EventDetails → Réserver → Payer | Paiement initié puis confirmé, billet créé |
| Mise en avant payante | Dashboard organisateur → Mettre en avant (5 000 FCFA) | Paiement, événement `is_featured`, `featured_until` renseigné |
| Chat pendant l’événement | Ouvrir l’onglet Discussion (si inscrit + fenêtre horaire) | Envoyer un message → Affiché dans la liste |
| Amis inscrits | EventDetails → Section « Vos amis inscrits » | Liste des amis ayant un billet pour l’événement |
| Rappels (cron) | Déclencher `POST /api/events/cron/send-reminders` avec secret | Envoi des rappels 24h et 1h (selon config backend) |

---

## 5. Commandes (Orders)

| Scénario | Étapes | Résultat attendu |
|----------|--------|-------------------|
| Voir une commande | Liste commandes → Détail | Infos commande, suivi, bouton « Signaler un problème » |
| Signaler un problème | Détail commande → Signaler → Décrire | Dispute créée, lien vers chat |
| Télécharger facture | Détail commande → Télécharger facture | PDF généré et téléchargé |

---

## 6. Utilisation des tests

- **Manuel** : suivre les scénarios ci‑dessus avant une release ou après un changement important.
- **Automatisé** : pour Vitest/Playwright, prioriser :
  1. Auth (login, refresh, logout),
  2. Live (start, join, gift, end avec replay),
  3. Events (book, feature, chat),
  4. Paiement (recharge callback, cadeau).

Les erreurs API peuvent être vérifiées via `error.apiMessage` (voir `expressClient.js`) pour afficher un message cohérent dans les toasts.
