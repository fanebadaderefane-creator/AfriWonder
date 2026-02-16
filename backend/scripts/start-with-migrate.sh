#!/bin/sh
# Exécute les migrations Prisma puis démarre le serveur (déploiement Railway)
# Si les migrations échouent (DB pas prête, etc.), on démarre quand même pour éviter blocage healthcheck
echo "🔄 Running Prisma migrations..."
for i in 1 2 3 4 5; do
  if npx prisma migrate deploy 2>&1; then
    echo "✅ Migrations applied"
    break
  fi
  if [ "$i" = "5" ]; then
    echo "⚠️ Migrations failed after 5 attempts - starting app anyway (check DB connection)"
  else
    echo "Retry in 5s... (attempt $i/5)"
    sleep 5
  fi
done
exec node dist/index.js
