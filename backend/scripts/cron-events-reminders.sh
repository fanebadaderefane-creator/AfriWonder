#!/usr/bin/env bash
# Cron : rappels événements (24h et 1h avant)
# Planifier avec crontab, ex. toutes les 15 min : */15 * * * * /path/to/cron-events-reminders.sh

set -e
API_URL="${API_URL:-http://localhost:3000}"
SECRET="${CRON_SECRET:-${EVENTS_REMINDERS_SECRET}}"

if [ -z "$SECRET" ]; then
  echo "CRON_SECRET ou EVENTS_REMINDERS_SECRET requis" >&2
  exit 1
fi

curl -sS -X POST "${API_URL}/api/events/cron/send-reminders" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: ${SECRET}" \
  -w "\nHTTP %{http_code}\n"
