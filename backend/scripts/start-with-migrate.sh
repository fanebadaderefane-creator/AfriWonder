#!/bin/sh
# Exécute les migrations Prisma puis démarre le serveur (déploiement Railway)
set -e
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"
exec node dist/index.js
