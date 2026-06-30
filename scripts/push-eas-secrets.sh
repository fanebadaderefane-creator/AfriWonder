#!/usr/bin/env bash
# ==============================================================================
# AfriWonder — Push des secrets EAS pour le build mobile production
#
# Prerequis :
#   npm install -g eas-cli
#   eas login       # compte membre de l’org « videovocalafriwonder »
#
# Lance depuis la racine du depot :
#   bash scripts/push-eas-secrets.sh
#
# Les secrets sont stockes dans EAS (pas dans Git) et sont injectes au build
# via `EXPO_PUBLIC_*` exposes par le config.js / eas.json.
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/../frontend"

# Valeurs PUBLIQUES (prefixees EXPO_PUBLIC_, embarquees dans le bundle mobile)
BACKEND_URL="${EXPO_PUBLIC_BACKEND_URL:-https://afriwonder-api.onrender.com}"
SOCKET_URL="${EXPO_PUBLIC_SOCKET_URL:-wss://afriwonder-api.onrender.com}"
EAS_PROJECT_ID="${EXPO_PUBLIC_EAS_PROJECT_ID:-$(node -e "const a=require('./app.json');process.stdout.write(a.expo?.extra?.eas?.projectId||'')")}"
if [[ -z "$EAS_PROJECT_ID" ]]; then
  echo "EXPO_PUBLIC_EAS_PROJECT_ID manquant — cd frontend && eas init --force && npm run sync:eas-project-env"
  exit 1
fi

# Valeurs optionnelles : renseigner avant execution
SENTRY_DSN="${EXPO_PUBLIC_SENTRY_DSN:-}"
FACEBOOK_APP_ID="${EXPO_PUBLIC_FACEBOOK_APP_ID:-}"
GOOGLE_WEB_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-}"
PUBLIC_WEB_ORIGIN="${EXPO_PUBLIC_PUBLIC_WEB_ORIGIN:-https://afri-wonder.vercel.app}"
SUPER_ADMIN_EMAIL="${EXPO_PUBLIC_SUPER_ADMIN_EMAIL:-}"

push_secret () {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "  [skip]  $name  (valeur vide — renseigner manuellement plus tard)"
    return 0
  fi
  echo "  [push]  $name"
  eas secret:create --scope project --name "$name" --value "$value" --force >/dev/null 2>&1 || true
}

echo "==> Push des EAS secrets (profil production)"
push_secret "EXPO_PUBLIC_APP_ENV"              "production"
push_secret "EXPO_PUBLIC_BACKEND_URL"          "$BACKEND_URL"
push_secret "EXPO_PUBLIC_SOCKET_URL"           "$SOCKET_URL"
push_secret "EXPO_PUBLIC_EAS_PROJECT_ID"       "$EAS_PROJECT_ID"
push_secret "EXPO_PUBLIC_PUBLIC_WEB_ORIGIN"    "$PUBLIC_WEB_ORIGIN"
push_secret "EXPO_PUBLIC_SENTRY_DSN"           "$SENTRY_DSN"
push_secret "EXPO_PUBLIC_FACEBOOK_APP_ID"      "$FACEBOOK_APP_ID"
push_secret "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" "$GOOGLE_WEB_CLIENT_ID"
push_secret "EXPO_PUBLIC_SUPER_ADMIN_EMAIL"    "$SUPER_ADMIN_EMAIL"

# Features activees par defaut (coherence avec featureFlags.ts)
push_secret "EXPO_PUBLIC_ENABLE_MARKETPLACE"          "1"
push_secret "EXPO_PUBLIC_ENABLE_CROWDFUNDING_CONTRIBUTE" "1"
push_secret "EXPO_PUBLIC_ENABLE_COURSES"              "1"
push_secret "EXPO_PUBLIC_ENABLE_NEWS"                 "1"
push_secret "EXPO_PUBLIC_ENABLE_SERVICES_HUB"         "1"
push_secret "EXPO_PUBLIC_ENABLE_WALLET_P2P"           "1"
push_secret "EXPO_PUBLIC_ENABLE_STRIPE"               "1"

echo ""
echo "==> Liste des secrets EAS stockes :"
eas secret:list || true

echo ""
echo "==> Termine. Lance ensuite :"
echo "    eas build --profile production --platform all"
