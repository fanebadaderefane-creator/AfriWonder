#!/bin/bash
# ========================================
# Audit sécurité AfriWonder
# Exécute: npm audit, vérifie les secrets, checklist
# Usage: ./scripts/security-audit.sh
# ========================================
set -e

echo "=== Audit sécurité AfriWonder ===\n"

FAIL=0

# 1. npm audit backend
echo "1. npm audit (backend)..."
cd backend
if npm audit --audit-level=high 2>/dev/null; then
  echo "   ✅ Backend: pas de vulnérabilités high/critical"
else
  echo "   ⚠️ Backend: vulnérabilités détectées - exécuter npm audit fix"
  FAIL=1
fi
cd ..

# 2. npm audit frontend
echo "\n2. npm audit (frontend)..."
if npm audit --audit-level=high 2>/dev/null; then
  echo "   ✅ Frontend: pas de vulnérabilités high/critical"
else
  echo "   ⚠️ Frontend: vulnérabilités détectées"
  FAIL=1
fi

# 3. Vérifier .env pas commité
echo "\n3. Vérification .env..."
if git ls-files --error-unmatch backend/.env 2>/dev/null; then
  echo "   ❌ ERREUR: backend/.env est versionné (ne jamais commiter les secrets)"
  FAIL=1
else
  echo "   ✅ .env non versionné"
fi

# 4. Checklist prod
echo "\n4. Checklist production (docs/SECURITY_AUDIT_CHECKLIST.md)"
echo "   Vérifier manuellement: webhooks, HTTPS, rate limiting, 2FA admins"

echo "\n=== Fin audit ===\n"
[ $FAIL -eq 0 ] && echo "✅ Audit OK" || { echo "⚠️ Des points nécessitent attention"; exit 1; }
