#!/bin/bash

# ========================================
# BACKUP DATABASE AUTOMATIQUE
# Exécuter via cron quotidien
# ========================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="afriwonder_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=7

# Créer dossier backups
mkdir -p "$BACKUP_DIR"

# Charger DATABASE_URL depuis .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL non défini"
  exit 1
fi

echo "🔄 Backup database en cours..."

# Backup complet avec pg_dump
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"

# Compresser
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup créé: $BACKUP_DIR/$BACKUP_FILE.gz"

# Supprimer backups > 7 jours
find "$BACKUP_DIR" -name "afriwonder_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "🧹 Anciens backups supprimés (> $RETENTION_DAYS jours)"

# Upload vers S3/R2 (optionnel) - AWS CLI ou rclone requis
BACKUP_GZ="${BACKUP_FILE}.gz"
if [ -n "$R2_ENDPOINT" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_BUCKET_NAME" ]; then
  echo "☁️ Upload vers Cloudflare R2..."
  if command -v aws &>/dev/null; then
    AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
      aws s3 cp "$BACKUP_DIR/$BACKUP_GZ" "s3://$R2_BUCKET_NAME/backups/$BACKUP_GZ" \
      --endpoint-url="$R2_ENDPOINT" --region auto && echo "✅ Backup uploadé vers R2" || echo "⚠️ Échec upload R2"
  else
    echo "⚠️ AWS CLI non installé - backup local uniquement (pip install awscli)"
  fi
fi

# Notifier admin (optionnel)
if [ -n "$ADMIN_EMAIL" ]; then
  echo "Backup database réussi: $BACKUP_FILE.gz" | \
    mail -s "[AfriWonder] Backup quotidien OK" "$ADMIN_EMAIL"
fi

echo "✅ Backup terminé avec succès"
