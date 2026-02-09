#!/bin/sh
# Désactivation des breaking news expirées (breaking_expiry_at < now)

API_URL="${API_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

curl -s -X POST "${API_URL}/api/news/cron/expire-breaking" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: ${CRON_SECRET}"

echo ""
