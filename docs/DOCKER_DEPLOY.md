# Déploiement Docker — AfriWonder

## Prérequis

1. **Docker Desktop** doit être **démarré** (sous Windows, lancer Docker Desktop avant toute commande)
2. Erreur courante : `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` → Docker Desktop n'est pas lancé

## Variables d'environnement

Créer un fichier `.env` à la racine du projet (copier depuis `docker-compose.env.example`) :

```bash
cp docker-compose.env.example .env
# Éditer .env avec vos valeurs réelles
```

Variables obligatoires :
- `DATABASE_URL` : connexion PostgreSQL (ex: `postgresql://postgres:motdepasse@postgres:5432/afriwonder`)
- `JWT_SECRET` : secret JWT (min 32 caractères)
- `DOMAIN` : domaine (ex: afriwonder.com)
- `DB_USER`, `DB_PASSWORD` : identifiants PostgreSQL

## Commandes

```bash
# Déploiement standard (3 replicas)
docker compose -f docker-compose.prod.yml up -d

# Déploiement 1M (10 replicas backend)
docker compose -f docker-compose.prod.yml -f docker-compose.prod-1m.yml up -d
```

## Vulnérabilités npm

Avant déploiement, corriger les vulnérabilités :

```bash
npm run security-audit-fix
# ou manuellement :
cd backend && npm audit fix
cd .. && npm audit fix
```

Les vulnérabilités restantes (Prisma, hono, etc.) peuvent nécessiter `npm audit fix --force` — à faire avec précaution car des changements majeurs peuvent casser le build.
