# Tester l'app mobile avec le vrai backend

## 1. Démarrer le backend (sur ton PC)

Dans un terminal, à la racine du repo :

```bash
cd backend
npm install
```

Configure un fichier `backend/.env` avec au minimum :

- `DATABASE_URL` : connexion PostgreSQL (ex. `postgresql://user:pass@localhost:5432/afriwonder`)
- `JWT_SECRET` et `JWT_REFRESH_SECRET` : chaînes aléatoires pour les tokens
- Optionnel : `PORT=3000` (c’est le défaut)

Puis lance le serveur :

```bash
npm run dev
```

Tu dois voir : `Server running on port 3000` (ou le port configuré).

## 2. Configurer l’URL de l’API dans l’app mobile

Dans `mobile-afriwonder/.env` :

| Où tourne l’app | EXPO_PUBLIC_API_URL |
|-----------------|----------------------|
| **Émulateur Android** | `http://10.0.2.2:3000` |
| **Téléphone réel (même Wi‑Fi que le PC)** | `http://IP_DU_PC:3000` (ex. `http://192.168.1.10:3000`) |

Pour connaître l’IP du PC sous Windows : `ipconfig` → regarde « Adresse IPv4 » de la carte Wi‑Fi.

Ne mets **pas** `/api` à la fin : le client l’ajoute tout seul.

## 3. Redémarrer Expo pour prendre en compte le .env

Les variables d’environnement sont lues au démarrage de Metro. Après avoir modifié `.env` :

```bash
cd mobile-afriwonder
npx expo start --clear
```

Puis ouvre l’app sur l’émulateur ou le téléphone.

## 4. Vérifier que ça marche

- **Accueil** : le fil doit se charger (ou afficher une erreur claire après ~12 s si le backend est injoignable).
- **Connexion** : créer un compte ou se connecter via l’écran Auth.

Si tu vois « Impossible de joindre le serveur » : même réseau Wi‑Fi, backend bien lancé, et `EXPO_PUBLIC_API_URL` égal à `http://IP_PC:3000` (sans `/api`).
