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

# Upload vers S3/R2 (optionnel)
if [ -n "$R2_ENDPOINT" ] && [ -n "$R2_ACCESS_KEY_ID" ]; then
  echo "☁️ Upload vers Cloudflare R2..."
  
  # Utiliser rclone ou aws cli
  aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" \
    "s3://$R2_BUCKET_NAME/backups/$BACKUP_FILE.gz" \
    --endpoint-url="$R2_ENDPOINT"
  
  echo "✅ Backup uploadé vers cloud"
fi

# Notifier admin (optionnel)
if [ -n "$ADMIN_EMAIL" ]; then
  echo "Backup database réussi: $BACKUP_FILE.gz" | \
    mail -s "[AfriWonder] Backup quotidien OK" "$ADMIN_EMAIL"
fi

echo "✅ Backup terminé avec succès"
