#!/bin/bash
# ========================================
# BACKUP 3x/JOUR (checklist production)
# Cron: 0 2,10,18 * * * /chemin/backend/scripts/cron-backup-3x-daily.sh
# ========================================
set -e
cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi
[ -z "$DATABASE_URL" ] && { echo "DATABASE_URL manquant"; exit 1; }
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE="afriwonder_backup_${TIMESTAMP}.sql"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILE.gz"
find "$BACKUP_DIR" -name "afriwonder_backup_*.sql.gz" -mtime +14 -delete
echo "OK $FILE.gz"
