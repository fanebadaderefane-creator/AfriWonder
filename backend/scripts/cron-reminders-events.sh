#!/bin/sh
# Rappels événements (24h et 1h avant) — à planifier en cron
# Ex: toutes les heures : 0 * * * * /path/to/cron-reminders-events.sh

API_URL="${API_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "CRON_SECRET non défini, utilisation de X-Cron-Secret vide (à protéger en prod)"
fi

curl -s -X POST "${API_URL}/api/events/cron/send-reminders" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  -d '{}'

echo ""
