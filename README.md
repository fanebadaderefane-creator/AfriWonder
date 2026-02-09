# AfriConnect 🌍

La première super-app vidéo africaine - Connectant créateurs, commerçants et communauté.

## 🚀 Fonctionnalités

- 📹 **Super-app vidéo** (style TikTok) avec algorithmes de recommandation ML
- 🛒 **Marketplace e-commerce** complet avec gestion de commandes
- 📺 **Live streaming** avec système de dons et cadeaux
- 🎮 **Gamification** (badges, points, leaderboard, challenges)
- 💰 **Microcrédit et finance** intégrés
- 👥 **Communautés** et événements
- 💼 **Jobs et services**
- 🗳️ **Civic** (pétitions, campagnes)
- 💳 **Paiements mobiles** (Orange Money, MTN Money, Wave, Moov Money)
- 🌐 **Multilingue** avec support des langues locales africaines
- 📱 **Optimisé pour connexions lentes** avec mode offline

## 🛠️ Stack Technique

### Frontend
- **React 18** - Bibliothèque UI moderne
- **Vite** - Build tool ultra-rapide
- **React Router** - Routing
- **TanStack Query** - Gestion d'état serveur avec cache
- **Tailwind CSS** - Styling utility-first
- **Radix UI** - Composants accessibles
- **Framer Motion** - Animations fluides

### Backend
- **Base44** - Backend-as-a-Service
- **TypeScript Functions** - Logique métier serveur
- **WebSockets** - Communication temps réel

### Outils de Développement
- **Vitest** - Framework de test
- **Testing Library** - Tests de composants React
- **ESLint** - Linting
- **Prettier** - Formatage de code

## 📦 Installation

### Prérequis
- Node.js 20+
- npm ou yarn

### Étapes

1. **Cloner le repository**
```bash
git clone <repository-url>
cd AfriConnect
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
# Créer .env.local à partir de .env.example
cp .env.example .env.local

# Remplir les variables dans .env.local
# VITE_BASE44_APP_ID=your_app_id
# VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🧪 Tests

```bash
npm test              # Lancer tous les tests
npm run test:watch    # Mode watch (re-exécute les tests à chaque changement)
npm run test:coverage # Avec couverture de code
npm run test:ui       # Interface graphique pour les tests
```

## 🏗️ Build

```bash
npm run build         # Build de production
npm run preview       # Prévisualiser le build
```

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md) - Architecture du projet
- [API Documentation](./docs/API.md) - Documentation des endpoints API
- [Contributing](./docs/CONTRIBUTING.md) - Guide de contribution
- [Security](./docs/SECURITY.md) - Politique de sécurité

## 🔧 Scripts Disponibles

```bash
npm run dev           # Serveur de développement
npm run build         # Build de production
npm run preview       # Prévisualiser le build
npm run lint          # Vérifier le code avec ESLint
npm run lint:fix      # Corriger automatiquement les erreurs ESLint
npm run format        # Formater le code avec Prettier
npm run format:check  # Vérifier le formatage
npm test              # Lancer les tests
npm run typecheck     # Vérifier les types TypeScript
```

## 🏗️ Structure du Projet

```
AfriConnect/
├── src/
│   ├── api/              # Clients API
│   ├── components/       # Composants React
│   │   ├── ui/          # Composants UI de base (shadcn)
│   │   ├── common/      # Composants communs
│   │   ├── video/       # Composants vidéo
│   │   └── ...
│   ├── pages/           # Pages de l'application
│   ├── lib/             # Utilitaires
│   │   ├── logger.js    # Service de logging centralisé
│   │   ├── validators.js # Schémas de validation Zod
│   │   └── ...
│   ├── hooks/           # Hooks React personnalisés
│   └── utils/           # Fonctions utilitaires
├── functions/           # Backend functions (TypeScript)
├── docs/               # Documentation
├── .github/            # GitHub Actions (CI/CD)
└── tests/              # Tests
```

## 🔒 Sécurité

- Authentification JWT via Base44
- RBAC (Role-Based Access Control)
- Validation des entrées avec Zod
- Chiffrement des données sensibles
- Conformité PCI DSS pour les paiements

Voir [SECURITY.md](./docs/SECURITY.md) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./docs/CONTRIBUTING.md) pour les guidelines.

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'feat: Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Conventions de Code

- Utiliser le logger centralisé (`src/lib/logger.js`) au lieu de `console.log`
- Valider les entrées avec les schémas Zod (`src/lib/validators.js`)
- Suivre les conventions React (hooks, composants)
- Écrire des tests pour les nouvelles fonctionnalités
- Documenter le code complexe

## 🚀 Déploiement

Le projet est configuré pour être déployé via Base44. Les changements pushés sur la branche `main` sont automatiquement déployés.

### CI/CD

Le projet utilise GitHub Actions pour :
- ✅ Linting automatique
- ✅ Tests automatiques
- ✅ Build de vérification
- ✅ Coverage de code

## 📊 Performance

- Code splitting automatique avec Vite
- Lazy loading des routes
- Cache avec React Query
- Optimisation pour connexions lentes
- Mode offline avec Service Workers

## 🌍 Support Multilingue

AfriConnect supporte plusieurs langues locales africaines. La sélection de langue est sauvegardée et synchronisée sur tous les appareils.

## 💳 Paiements

Intégration avec :
- Stripe (cartes bancaires internationales)
- Orange Money
- MTN Money
- Wave
- Moov Money

## 📄 Licence

Propriétaire - AfriConnect © 2026

## 📧 Contact

- Email : support@africonnect.app
- Documentation : [docs.base44.com](https://docs.base44.com)

---

**Fabriqué avec ❤️ en Afrique 🌍**
