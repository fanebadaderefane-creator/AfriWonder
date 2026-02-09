# Guide de Contribution

Merci de votre intérêt pour contribuer à AfriConnect ! 🎉

## Développement Local

### Prérequis
- Node.js 20+
- npm ou yarn

### Installation

1. Cloner le repository
```bash
git clone <repository-url>
cd AfriConnect
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer l'environnement
```bash
cp .env.example .env.local
# Remplir les variables dans .env.local
```

4. Lancer le serveur de développement
```bash
npm run dev
```

## Tests

### Lancer les tests
```bash
npm test              # Lancer tous les tests
npm run test:watch    # Mode watch
npm run test:coverage # Avec couverture de code
npm run test:ui       # Interface graphique
```

### Écrire des tests

Les tests doivent être placés à côté des fichiers qu'ils testent :
- `src/lib/logger.js` → `src/lib/__tests__/logger.test.js`
- `src/components/Button.jsx` → `src/components/__tests__/Button.test.jsx`

## Code Style

### Linting
```bash
npm run lint          # Vérifier le code
npm run lint:fix      # Corriger automatiquement
```

### Formatage
```bash
npm run format        # Formater le code
npm run format:check  # Vérifier le formatage
```

### Conventions
- Utiliser des noms de variables descriptifs
- Commenter le code complexe
- Suivre les conventions React (hooks, composants)
- Utiliser le logger centralisé au lieu de `console.log`

## Structure des Commits

Utiliser des messages de commit clairs :
```
feat: Ajouter fonctionnalité de recherche
fix: Corriger bug de pagination
docs: Mettre à jour documentation
test: Ajouter tests pour logger
refactor: Réorganiser structure des composants
```

## Pull Requests

1. Créer une branche depuis `main`
```bash
git checkout -b feature/ma-fonctionnalite
```

2. Faire les modifications
3. Ajouter des tests si nécessaire
4. Vérifier que les tests passent
```bash
npm test
npm run lint
```

5. Pousser la branche
```bash
git push origin feature/ma-fonctionnalite
```

6. Créer la Pull Request sur GitHub avec :
   - Description claire des changements
   - Référence aux issues liées
   - Screenshots si changement UI

## Checklist avant PR

- [ ] Code testé localement
- [ ] Tests passent (`npm test`)
- [ ] Linter passe (`npm run lint`)
- [ ] Formatage correct (`npm run format:check`)
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de `console.log` (utiliser le logger)
- [ ] Variables d'environnement documentées

## Questions ?

N'hésitez pas à ouvrir une issue pour toute question !

