#!/bin/bash

set -e

echo "⏪ ROLLBACK AfriWonder"

# Lister versions disponibles
echo "Versions disponibles:"
git tag -l "v*" | tail -5

read -p "Version à restaurer (ex: v1.2.3): " TARGET_VERSION

if [ -z "$TARGET_VERSION" ]; then
  echo "❌ Version invalide"
  exit 1
fi

echo "⚠️ Rollback vers $TARGET_VERSION"
read -p "Confirmer? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Rollback annulé"
  exit 1
fi

# 1. Backup actuel
echo "💾 Backup version actuelle..."
./scripts/backup-db.sh

# 2. Checkout version
echo "🔄 Checkout $TARGET_VERSION..."
git checkout "$TARGET_VERSION"

# 3. Restore dependencies
echo "📦 Installation dépendances..."
npm ci

# 4. Rebuild
echo "🔨 Build..."
npm run build

# 5. Migrations database (rollback si nécessaire)
echo "🗄️ Vérification migrations..."
npx prisma migrate deploy

# 6. Restart
echo "🔄 Redémarrage serveur..."
pm2 restart afriwonder-backend || npm run start

echo "✅ Rollback terminé vers $TARGET_VERSION"
