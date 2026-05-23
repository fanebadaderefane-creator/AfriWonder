#!/bin/bash
# ========================================
# Installation cron backup AfriWonder
# Usage: sudo ./setup-cron-backup.sh
# ========================================
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_SCRIPT="$SCRIPT_DIR/cron-backup-3x-daily.sh"

# Vérifier que le script existe
[ -f "$CRON_SCRIPT" ] || { echo "❌ $CRON_SCRIPT introuvable"; exit 1; }
chmod +x "$CRON_SCRIPT"

# Entrée cron: 3x/jour à 2h, 10h, 18h
CRON_LINE="0 2,10,18 * * * cd $BACKEND_DIR && $CRON_SCRIPT >> $BACKEND_DIR/logs/backup-cron.log 2>&1"

# Créer dossier logs
mkdir -p "$BACKEND_DIR/logs"

# Vérifier si déjà installé
if crontab -l 2>/dev/null | grep -q "cron-backup-3x-daily"; then
  echo "⚠️ Cron backup déjà installé. Pour modifier:"
  echo "   crontab -e"
  exit 0
fi

# Ajouter au crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "✅ Cron backup installé: 3x/jour à 2h, 10h, 18h"
echo "   Logs: $BACKEND_DIR/logs/backup-cron.log"
echo ""
echo "Variables .env requises: DATABASE_URL"
echo "Optionnel R2: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
