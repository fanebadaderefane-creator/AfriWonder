# Architecture AfriConnect

## Vue d'ensemble

AfriConnect est une super-app vidéo africaine construite avec React, Vite, et Base44 comme backend-as-a-service.

## Stack Technique

### Frontend
- **React 18** - Bibliothèque UI
- **Vite** - Build tool et dev server
- **React Router** - Routing
- **TanStack Query** - Gestion d'état serveur
- **Tailwind CSS** - Styling
- **Radix UI** - Composants accessibles
- **Framer Motion** - Animations

### Backend
- **Base44** - Backend-as-a-Service
- **Functions TypeScript** - Logique métier serveur

## Structure du Projet

```
src/
├── api/              # Clients API
├── components/       # Composants React réutilisables
│   ├── ui/          # Composants UI de base (shadcn)
│   ├── common/      # Composants communs
│   ├── video/       # Composants vidéo
│   └── ...
├── pages/           # Pages de l'application
├── lib/             # Utilitaires et helpers
│   ├── logger.js    # Service de logging centralisé
│   ├── validators.js # Schémas de validation Zod
│   └── ...
├── hooks/           # Hooks React personnalisés
└── utils/           # Fonctions utilitaires

functions/           # Backend functions (TypeScript)
├── authentication.ts
├── payments.ts
├── videoEncoding.ts
└── ...
```

## Flux de Données

1. **Authentification** : `AuthContext` gère l'état d'authentification
2. **Requêtes API** : TanStack Query pour le cache et la synchronisation
3. **État Local** : React hooks (useState, useReducer)
4. **Temps Réel** : WebSockets pour les notifications et chat

## Sécurité

- Authentification via Base44
- RBAC (Role-Based Access Control)
- Validation des entrées avec Zod
- Chiffrement des données sensibles
- Rate limiting sur les APIs

## Performance

- Code splitting automatique avec Vite
- Lazy loading des routes
- Cache avec React Query
- Optimisation pour connexions lentes
- Mode offline avec Service Workers

## Logging

Le système de logging centralisé (`src/lib/logger.js`) remplace tous les `console.log/error/warn` :
- Structure des logs avec contexte
- Intégration Sentry en production
- Logs conditionnels selon l'environnement

## Tests

- **Vitest** - Framework de test
- **Testing Library** - Tests de composants React
- **Coverage** - Couverture de code avec v8

## Déploiement

- Build avec Vite : `npm run build`
- Preview : `npm run preview`
- CI/CD via GitHub Actions

