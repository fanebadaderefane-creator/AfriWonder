#!/usr/bin/env bash
# ==============================================================================
# AfriWonder — Script PRE-LAUNCH (J-1)
#
# Orchestre les 4 etapes de mise en production. Chaque etape s'arrete sur la
# premiere erreur. Peut etre relancee (idempotent pour les checks).
#
# Usage :
#   bash scripts/PRE_LAUNCH.sh [step]
#
#   sans argument     -> toutes les etapes (1, 2, 3, 4)
#   step=1            -> rotation secrets (genere le fichier local)
#   step=2            -> migration DB prod + smoke backend
#   step=3            -> push EAS secrets
#   step=4            -> build preview EAS + checklist manuelle
#
# Variables attendues dans l'environnement du shell :
#   DATABASE_URL_PROD         (obligatoire pour step 2)
#   EXPO_PUBLIC_BACKEND_URL   (par defaut : https://afriwonder-api.onrender.com)
#   EXPO_PUBLIC_SENTRY_DSN    (recommande pour crash reports mobile)
# ==============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STEP="${1:-all}"
TS="$(date +%Y-%m-%d)"

color()  { local c="$1"; shift; printf "\033[${c}m%s\033[0m\n" "$*"; }
title()  { echo; color "1;36" "==[ $* ]=="; }
ok()     { color "1;32" "  [OK]  $*"; }
warn()   { color "1;33" "  [!!]  $*"; }
fail()   { color "1;31" "  [X]   $*"; exit 1; }

step_1_rotate_secrets () {
  title "Etape 1 — Rotation des secrets"
  if [[ -f "scripts/SECRETS_PROD_${TS}.env" ]]; then
    ok "Fichier secrets deja genere ce jour : scripts/SECRETS_PROD_${TS}.env"
  else
    node -e "const c=require('crypto');
      const out = [
        'JWT_SECRET=' + c.randomBytes(64).toString('hex'),
        'JWT_REFRESH_SECRET=' + c.randomBytes(64).toString('hex'),
        'WALLET_PIN_SALT=' + c.randomBytes(32).toString('hex'),
        'ORANGE_MONEY_WEBHOOK_SECRET=' + c.randomBytes(32).toString('hex'),
        'MOOV_MONEY_WEBHOOK_SECRET=' + c.randomBytes(32).toString('hex'),
        'PAYMENT_WEBHOOK_SECRET=' + c.randomBytes(32).toString('hex'),
        'HEALTH_API_KEY=' + c.randomBytes(32).toString('hex'),
        'CRON_SECRET=' + c.randomBytes(32).toString('hex'),
        'LIVE_CLEANUP_SECRET=' + c.randomBytes(32).toString('hex')
      ].join('\\n');
      require('fs').writeFileSync('scripts/SECRETS_PROD_${TS}.env', out + '\\n');
      console.log(out);"
    ok "Nouveaux secrets generes -> scripts/SECRETS_PROD_${TS}.env"
  fi

  warn "ACTION MANUELLE requise : pousse ces secrets dans Render + Doppler."
  warn "Guide complet : scripts/ROTATE_SECRETS.md"
  warn "Puis rotate le mot de passe Supabase dans le dashboard."
  echo
}

step_2_migrate_db () {
  title "Etape 2 — Migration DB production + smoke test"

  if [[ -z "${DATABASE_URL_PROD:-}" ]]; then
    warn "DATABASE_URL_PROD non defini. Exporte-le avant de relancer :"
    echo "  export DATABASE_URL_PROD='postgresql://...:...@db-host/postgres'"
    return 1
  fi

  cd "$ROOT/backend"
  ok "Application des migrations Prisma sur la DB prod..."
  DATABASE_URL="$DATABASE_URL_PROD" npx prisma migrate deploy

  ok "Generation du client Prisma..."
  npx prisma generate

  ok "Smoke test backend sur la DB prod..."
  DATABASE_URL="$DATABASE_URL_PROD" \
  JWT_SECRET="$(grep ^JWT_SECRET= "$ROOT/scripts/SECRETS_PROD_${TS}.env" | cut -d= -f2)" \
  JWT_REFRESH_SECRET="$(grep ^JWT_REFRESH_SECRET= "$ROOT/scripts/SECRETS_PROD_${TS}.env" | cut -d= -f2)" \
    npm run test:smoke

  cd "$ROOT"
  ok "DB prod alignee avec schema.prisma."
  echo
}

step_3_eas_secrets () {
  title "Etape 3 — Push des EAS secrets"

  if ! command -v eas >/dev/null 2>&1; then
    warn "eas-cli non installe. Installation :"
    echo "  npm install -g eas-cli"
    return 1
  fi

  bash "$ROOT/scripts/push-eas-secrets.sh"
  ok "Secrets EAS pousses pour profile production."
  echo
}

step_4_preview_build () {
  title "Etape 4 — Build preview EAS + checklist E2E"

  if ! command -v eas >/dev/null 2>&1; then
    warn "eas-cli non installe."
    return 1
  fi

  cd "$ROOT/frontend"
  ok "Lancement du build preview (interne, APK Android + simulator iOS)..."
  eas build --profile preview --platform all --non-interactive --wait || {
    fail "Build preview echoue. Consulter les logs EAS."
  }
  cd "$ROOT"

  cat <<EOF

==[ CHECKLIST MANUELLE SUR DEVICE (pre-GO final) ]==

Scanner le QR code envoye par EAS, installer la preview, puis valider :

  [ ] 1. Login email + password -> accueil charge, feed visible
  [ ] 2. Socket : envoie-toi un DM -> arrivee temps reel (sans refresh)
  [ ] 3. Upload video courte -> apparait dans ton profil
  [ ] 4. Paiement Orange Money sandbox 500 FCFA -> webhook vert
  [ ] 5. Wallet : transfert @username 200 FCFA a un autre compte test
         -> nouveau solde affiche + notification recue cote destinataire
  [ ] 6. Airtime recharge 500 FCFA -> apparait dans historique
  [ ] 7. Deep link afriwonder://u/<username> depuis WhatsApp -> ouvre l'app
  [ ] 8. Live : rejoindre un live test -> cadeau envoye -> compteur update
  [ ] 9. Logout / login avec le *nouveau* JWT_SECRET -> OK
  [ ] 10. Test offline (mode avion 10s puis reconnexion) -> feed retente

Si les 10 cases sont cochees -> GO pour le build production :
    eas build --profile production --platform all
    eas submit --platform ios --latest
    eas submit --platform android --latest

EOF
}

case "$STEP" in
  1) step_1_rotate_secrets ;;
  2) step_2_migrate_db ;;
  3) step_3_eas_secrets ;;
  4) step_4_preview_build ;;
  all)
    step_1_rotate_secrets
    step_2_migrate_db || warn "Etape 2 sautee (DATABASE_URL_PROD manquant)"
    step_3_eas_secrets || warn "Etape 3 sautee (eas-cli manquant)"
    step_4_preview_build || warn "Etape 4 sautee (eas-cli manquant)"
    ;;
  *) fail "Usage : $0 [1|2|3|4|all]" ;;
esac

title "PRE_LAUNCH termine"
