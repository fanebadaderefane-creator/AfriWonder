# Tests Backend - AfriConnect

## Installation

Les dépendances de test sont déjà installées :
- Jest
- Supertest
- ts-jest

## Configuration

Le fichier `jest.config.js` configure Jest pour TypeScript et ESM.

## Exécution des tests

```bash
# Tous les tests
npm test

# Mode watch
npm run test:watch

# Avec couverture
npm run test:coverage
```

## Structure des tests

- `__tests__/setup.ts` - Configuration et nettoyage de la base de données
- `__tests__/auth.test.ts` - Tests d'authentification
- `__tests__/videos.test.ts` - Tests des vidéos
- `__tests__/users.test.ts` - Tests des utilisateurs
- `__tests__/products.test.ts` - Tests des produits

## Base de données de test

Les tests utilisent la même base de données que le développement.
Assurez-vous que `DATABASE_URL` est configuré dans `.env`.

⚠️ **Attention** : Les tests nettoient la base de données après chaque test.
Ne pas utiliser la base de données de production !

## Exemples de tests

### Test d'authentification
```typescript
it('devrait créer un nouvel utilisateur', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'newuser@example.com',
      password: 'NewPass123!@#',
      username: 'newuser',
      full_name: 'New User'
    });

  expect(response.status).toBe(201);
});
```

### Test avec authentification
```typescript
it('devrait créer une vidéo', async () => {
  const response = await request(app)
    .post('/api/videos')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      title: 'New Video',
      video_url: 'https://cdn.africonnect.com/video.mp4'
    });

  expect(response.status).toBe(201);
});
```

