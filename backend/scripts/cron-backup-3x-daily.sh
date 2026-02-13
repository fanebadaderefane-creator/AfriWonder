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
# Upload R2 (optionnel)
if [ -n "$R2_ENDPOINT" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_BUCKET_NAME" ] && command -v aws &>/dev/null; then
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3 cp "$BACKUP_DIR/$FILE.gz" "s3://$R2_BUCKET_NAME/backups/$FILE.gz" \
    --endpoint-url="$R2_ENDPOINT" --region auto 2>/dev/null || true
fi
echo "OK $FILE.gz"
