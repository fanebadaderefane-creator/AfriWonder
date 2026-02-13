#!/bin/bash
# ========================================
# Test de restauration backup AfriWonder
# Usage: ./restore-backup-test.sh [fichier_backup.sql.gz]
# Vérifie que les backups sont restaurables
# ========================================
set -e
cd "$(dirname "$0")/.."

BACKUP_FILE="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TEST_DB="${TEST_DB:-afriwonder_restore_test}"

if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL non défini"
  exit 1
fi

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/afriwonder_backup_*.sql.gz 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Aucun fichier backup trouvé. Créer un backup: ./scripts/cron-backup-3x-daily.sh"
  exit 1
fi

# URL vers DB de test (remplacer nom DB dans DATABASE_URL)
TEST_URL=$(echo "$DATABASE_URL" | sed "s|/afriwonder[^?]*|/$TEST_DB|" | sed "s|/afriwonder$|/$TEST_DB|")
BASE_URL=$(echo "$DATABASE_URL" | sed "s|/afriwonder[^?]*|/postgres|" | sed "s|/afriwonder$|/postgres|")

echo "🔄 Test restauration depuis: $BACKUP_FILE"

# Créer DB de test (connexion à postgres)
psql "$BASE_URL" -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true
psql "$BASE_URL" -c "CREATE DATABASE $TEST_DB;"

# Restaurer
gunzip -c "$BACKUP_FILE" | psql "$TEST_URL" || { psql "$BASE_URL" -c "DROP DATABASE IF EXISTS $TEST_DB;"; exit 1; }

# Vérifier tables
TABLES=$(psql "$TEST_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")
echo "   Tables restaurées: $TABLES"

# Nettoyer
psql "$BASE_URL" -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true

echo "✅ Test de restauration réussi"
exit 0
