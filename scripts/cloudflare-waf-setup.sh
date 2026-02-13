#!/bin/bash
# ========================================
# Configuration WAF Cloudflare - AfriWonder
# Prérequis: CF_API_TOKEN, CF_ZONE_ID, jq
# Voir: docs/WAF_CLOUDFLARE_SETUP.md
# Usage: ./scripts/cloudflare-waf-setup.sh
# ========================================
set -e

[ -z "$CF_API_TOKEN" ] && { echo "CF_API_TOKEN requis"; exit 1; }
[ -z "$CF_ZONE_ID" ] && { echo "CF_ZONE_ID requis"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq requis (apt install jq)"; exit 1; }

echo "=== Configuration WAF Cloudflare AfriWonder ==="
echo ""

# 1. Security Level = Medium (ou High en cas d'attaque)
echo "1. Security Level = Medium..."
curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/security_level" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"medium"}' | jq -r '.success' && echo "   OK" || echo "   Échec"

# 2. SSL = Full (strict)
echo ""
echo "2. SSL Mode = Full (strict)..."
curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"full"}' | jq -r '.success' && echo "   OK" || echo "   Échec"

# 3. Always Use HTTPS
echo ""
echo "3. Always Use HTTPS..."
curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/always_use_https" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}' | jq -r '.success' && echo "   OK" || echo "   Échec"

# 4. Min TLS 1.2
echo ""
echo "4. Min TLS Version = 1.2..."
curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/min_tls_version" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"1.2"}' | jq -r '.success' && echo "   OK" || echo "   Échec"

# 5. Bot Fight Mode (gratuit)
echo ""
echo "5. Bot Fight Mode..."
curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/bot_fight_mode" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}' 2>/dev/null | jq -r '.success' && echo "   OK" || echo "   (Pro/Business uniquement ou déjà configuré)"

echo ""
echo "=== WAF Cloudflare configuré ==="
echo "Règles avancées (rate limit, geo-block): docs/WAF_CLOUDFLARE_SETUP.md"
echo ""
