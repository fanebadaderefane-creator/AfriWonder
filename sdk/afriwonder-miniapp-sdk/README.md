# @afriwonder/miniapp-sdk

SDK officiel **AfriWonder** pour les développeurs de mini-apps. Permet d’interagir avec le catalogue mini-apps, les installations, les transactions, l’API développeur (abonnements, revenus, analytics) et l’API publique (matching, opportunités).

## Installation

```bash
npm install @afriwonder/miniapp-sdk
```

Ou depuis le monorepo AfriWonder :

```bash
cd sdk/afriwonder-miniapp-sdk && npm run build
```

Puis dans votre projet : `import { createClient, AfriWonderClient } from '@afriwonder/miniapp-sdk'` (en précisant le chemin si besoin).

## Configuration

```javascript
import { createClient } from '@afriwonder/miniapp-sdk';

const client = createClient({
  baseUrl: 'https://api.afriwonder.com',  // ou votre URL (sandbox, etc.)
  token: 'eyJhbGc...',                     // JWT utilisateur ou développeur
  apiKey: 'afw_xxx',                       // Clé API publique (pour /api/public)
});
```

- **Token (JWT)** : requis pour les routes **mini-apps** (install, transaction, boost) et **developer** (apps, subscription, revenue, withdraw, analytics). Obtenu après connexion utilisateur ou développeur sur AfriWonder.
- **API Key** : requis pour l’**API publique** (`/api/public/v1/*`) : matching/opportunities, usage. Créée depuis le portail développeur AfriWonder.

## Utilisation

### Catalogue et mini-apps

```javascript
// Liste des mini-apps (public, pas d’auth)
const result = await client.listApps({ category: 'all', search: 'taxi', limit: 20 });

// Détail d’une mini-app
const app = await client.getApp('app-uuid');

// Installer une mini-app (JWT utilisateur requis)
client.setToken(userJwt);
await client.installApp('app-uuid');

// Créer une transaction (achat in-app, JWT utilisateur)
await client.createTransaction('app-uuid', 5000, {
  payment_method: 'orange_money',
  description: 'Achat premium',
});
```

### API développeur (JWT développeur)

```javascript
client.setToken(developerJwt);

const apps = await client.getMyApps();
const subscription = await client.getSubscription();
await client.updateSubscription('pro', 'orange_money');

const revenue = await client.getRevenue('month');
const analytics = await client.getAnalytics('month');

await client.withdrawRevenue(50000, 'orange_money', { phone_number: '221771234567' });
```

### API publique (clé API)

```javascript
client.setApiKey('afw_xxx');

const opportunities = await client.getMatchingOpportunities({
  goal: 'earn_money',
  location: 'Dakar',
  limit: 10,
});
const usage = await client.getPublicUsage(24);
const health = await client.getPublicHealth();
```

## Sandbox

Pour les tests, utilisez la même API avec une URL de sandbox (si fournie) ou la clé de développement. En développement, le backend accepte la clé `PUBLIC_API_DEV_KEY` (ex. `afw_public_dev_key`) pour l’API publique.

## Documentation API complète

Voir [API_MINIAPPS_DEVELOPERS.md](../../docs/API_MINIAPPS_DEVELOPERS.md) dans le dépôt pour la référence complète des endpoints, paramètres, réponses et codes d’erreur.

## Licence

MIT.
