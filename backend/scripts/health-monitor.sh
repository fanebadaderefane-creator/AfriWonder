#!/bin/bash

# Monitoring continu (via cron toutes les 5 minutes)

API_URL="${API_URL:-http://localhost:3000}"

# Check health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")

if [ "$HEALTH" != "200" ]; then
  echo "❌ Health check failed: $HEALTH"
  
  # Trigger alert
  curl -X POST "$API_URL/api/internal/alert-server-down" \
    -H "X-Internal-Secret: $INTERNAL_SECRET"
  
  exit 1
fi

# Check CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
  echo "⚠️ CPU élevé: $CPU_USAGE%"
  
  curl -X POST "$API_URL/api/internal/alert-high-cpu" \
    -H "X-Internal-Secret: $INTERNAL_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"usage\": $CPU_USAGE}"
fi

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)

if [ "$DISK_USAGE" -gt 85 ]; then
  echo "⚠️ Disque plein: $DISK_USAGE%"
  
  curl -X POST "$API_URL/api/internal/alert-disk-full" \
    -H "X-Internal-Secret: $INTERNAL_SECRET" \
    -d "{\"usage\": $DISK_USAGE}"
fi

echo "✅ Health monitor OK"
