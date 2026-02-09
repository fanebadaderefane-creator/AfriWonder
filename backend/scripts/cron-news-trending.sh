#!/bin/sh
# Calcul du score trending des articles (à planifier ex. toutes les heures)
# score = views*0.4 + likes*0.3 + comments*0.2 + shares*0.1

API_URL="${API_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

curl -s -X POST "${API_URL}/api/news/cron/calculate-trending" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: ${CRON_SECRET}"

echo ""
