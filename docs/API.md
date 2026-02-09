# Documentation API AfriConnect

## Endpoints Principaux

### Authentification
- `POST /auth/login` - Connexion
- `POST /auth/logout` - Déconnexion
- `POST /auth/register` - Inscription
- `POST /auth/2fa/enable` - Activer 2FA
- `POST /auth/2fa/verify` - Vérifier code 2FA
- `POST /auth/password/reset` - Réinitialiser mot de passe

### Vidéos
- `GET /videos` - Liste des vidéos
- `GET /videos/:id` - Détails d'une vidéo
- `POST /videos` - Créer une vidéo
- `PUT /videos/:id` - Mettre à jour
- `DELETE /videos/:id` - Supprimer
- `POST /videos/:id/like` - Liker une vidéo
- `POST /videos/:id/comment` - Commenter

### Marketplace
- `GET /products` - Liste des produits
- `GET /products/:id` - Détails produit
- `POST /products` - Créer produit
- `POST /orders` - Créer commande
- `GET /orders` - Liste des commandes
- `GET /orders/:id` - Détails commande
- `PUT /orders/:id/status` - Mettre à jour statut

### Paiements
- `POST /payments/stripe` - Paiement Stripe
- `POST /payments/orange-money` - Paiement Orange Money
- `POST /payments/mobile-money` - Paiement Mobile Money
- `GET /payments/:id/status` - Statut du paiement

### Live Streaming
- `POST /live/start` - Démarrer un live
- `GET /live/:id` - Détails du live
- `POST /live/:id/gift` - Envoyer un cadeau
- `POST /live/:id/comment` - Commenter en live

### Gamification
- `GET /badges` - Liste des badges
- `GET /leaderboard` - Classement
- `GET /achievements` - Réalisations utilisateur

## Variables d'Environnement

Voir `.env.example` pour la liste complète des variables nécessaires.

## Authentification

Toutes les requêtes authentifiées nécessitent un token JWT dans le header :
```
Authorization: Bearer <token>
```

## Codes de Réponse

- `200` - Succès
- `201` - Créé
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Non autorisé
- `404` - Non trouvé
- `500` - Erreur serveur

## Rate Limiting

Les APIs sont limitées à :
- 100 requêtes/minute pour les utilisateurs authentifiés
- 20 requêtes/minute pour les utilisateurs non authentifiés

