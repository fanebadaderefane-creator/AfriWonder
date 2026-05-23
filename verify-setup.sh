#!/bin/bash

# ========================================
# SCRIPT DE VÉRIFICATION SETUP AFRICONNECT
# Vérifie que tous les fichiers critiques sont en place
# ========================================

echo "🔍 VÉRIFICATION SETUP AFRICONNECT LANCEMENT"
echo ""

ERRORS=0
WARNINGS=0

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction check
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
    else
        echo -e "${RED}❌${NC} $1 MANQUANT"
        ((ERRORS++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
    else
        echo -e "${YELLOW}⚠️${NC} $1 manquant"
        ((WARNINGS++))
    fi
}

check_env_var() {
    if grep -q "^$1=" backend/.env 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $1 configuré"
    else
        echo -e "${YELLOW}⚠️${NC} $1 non configuré dans .env"
        ((WARNINGS++))
    fi
}

# ========================================
# 1. FICHIERS CRITIQUES
# ========================================
echo "📁 1. FICHIERS CRITIQUES"

check_file "PLAN_LANCEMENT_26_FEVRIER_2026.md"
check_file "CHECKLIST_LANCEMENT.md"
check_file "ACTION_IMMEDIATE.md"
check_file "RESUME_EXECUTIF.md"
check_file "LANCEMENT_README.md"

echo ""

# ========================================
# 2. MIDDLEWARE SÉCURITÉ
# ========================================
echo "🛡️ 2. MIDDLEWARE SÉCURITÉ"

check_file "backend/src/middleware/rateLimiting.ts"
check_file "backend/src/middleware/antiBot.ts"
check_file "backend/src/utils/encryption.ts"

echo ""

# ========================================
# 3. SCRIPTS OPÉRATIONNELS
# ========================================
echo "🔧 3. SCRIPTS OPÉRATIONNELS"

check_file "backend/scripts/backup-db.sh"
check_file "backend/scripts/rollback.sh"
check_file "backend/scripts/health-monitor.sh"

# Vérifier permissions
if [ -x "backend/scripts/backup-db.sh" ]; then
    echo -e "${GREEN}✅${NC} backup-db.sh exécutable"
else
    echo -e "${YELLOW}⚠️${NC} backup-db.sh non exécutable (chmod +x)"
    ((WARNINGS++))
fi

echo ""

# ========================================
# 4. INFRASTRUCTURE
# ========================================
echo "🏗️ 4. INFRASTRUCTURE"

check_file "docker-compose.prod.yml"
check_file "backend/Dockerfile"
check_file "backend/ecosystem.config.js"

echo ""

# ========================================
# 5. DATABASE MIGRATIONS
# ========================================
echo "🗄️ 5. DATABASE MIGRATIONS"

check_dir "backend/prisma/migrations/20260210_add_performance_indexes"
check_file "backend/prisma/migrations/20260210_add_performance_indexes/migration.sql"

echo ""

# ========================================
# 6. CI/CD
# ========================================
echo "⚙️ 6. CI/CD"

check_file ".github/workflows/ci.yml"

# Vérifier si CI/CD mis à jour
if grep -q "test-backend:" .github/workflows/ci.yml 2>/dev/null; then
    echo -e "${GREEN}✅${NC} CI/CD mis à jour (backend + frontend)"
else
    echo -e "${YELLOW}⚠️${NC} CI/CD ancienne version"
    ((WARNINGS++))
fi

echo ""

# ========================================
# 7. DÉPENDANCES NPM
# ========================================
echo "📦 7. DÉPENDANCES NPM"

cd backend

if npm list rate-limit-redis &>/dev/null; then
    echo -e "${GREEN}✅${NC} rate-limit-redis installé"
else
    echo -e "${RED}❌${NC} rate-limit-redis MANQUANT"
    echo "   → npm install rate-limit-redis"
    ((ERRORS++))
fi

if npm list redis &>/dev/null; then
    echo -e "${GREEN}✅${NC} redis installé"
else
    echo -e "${RED}❌${NC} redis MANQUANT"
    echo "   → npm install redis"
    ((ERRORS++))
fi

if npm list @sentry/node &>/dev/null; then
    echo -e "${GREEN}✅${NC} @sentry/node installé"
else
    echo -e "${YELLOW}⚠️${NC} @sentry/node non installé"
    echo "   → npm install @sentry/node @sentry/profiling-node"
    ((WARNINGS++))
fi

if npm list sharp &>/dev/null; then
    echo -e "${GREEN}✅${NC} sharp installé"
else
    echo -e "${YELLOW}⚠️${NC} sharp non installé"
    echo "   → npm install sharp"
    ((WARNINGS++))
fi

cd ..

echo ""

# ========================================
# 8. VARIABLES ENVIRONNEMENT
# ========================================
echo "🔐 8. VARIABLES ENVIRONNEMENT"

if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅${NC} backend/.env existe"
    
    check_env_var "DATABASE_URL"
    check_env_var "JWT_SECRET"
    check_env_var "ENCRYPTION_SECRET"
    check_env_var "WALLET_PIN_SALT"
    
    # Optionnels mais recommandés
    if grep -q "^SENTRY_DSN=" backend/.env 2>/dev/null; then
        echo -e "${GREEN}✅${NC} SENTRY_DSN configuré"
    else
        echo -e "${YELLOW}⚠️${NC} SENTRY_DSN non configuré (monitoring)"
        ((WARNINGS++))
    fi
    
    if grep -q "^REDIS_URL=" backend/.env 2>/dev/null; then
        echo -e "${GREEN}✅${NC} REDIS_URL configuré"
    else
        echo -e "${YELLOW}⚠️${NC} REDIS_URL non configuré (cache)"
        ((WARNINGS++))
    fi
    
else
    echo -e "${RED}❌${NC} backend/.env MANQUANT"
    echo "   → Copier .env.example vers .env"
    ((ERRORS++))
fi

echo ""

# ========================================
# 9. DOSSIERS REQUIS
# ========================================
echo "📂 9. DOSSIERS REQUIS"

check_dir "backend/backups"

if [ ! -d "backend/backups" ]; then
    echo "   → mkdir -p backend/backups"
fi

check_dir "backend/logs"

if [ ! -d "backend/logs" ]; then
    echo "   → mkdir -p backend/logs"
fi

echo ""

# ========================================
# 10. TESTS
# ========================================
echo "🧪 10. TESTS"

if [ -d "backend/src/__tests__" ]; then
    TEST_COUNT=$(find backend/src/__tests__ -name "*.test.ts" 2>/dev/null | wc -l)
    if [ $TEST_COUNT -gt 0 ]; then
        echo -e "${GREEN}✅${NC} $TEST_COUNT fichiers de tests trouvés"
    else
        echo -e "${YELLOW}⚠️${NC} Aucun fichier de test trouvé"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️${NC} Dossier __tests__ manquant"
    echo "   → mkdir -p backend/src/__tests__"
    ((WARNINGS++))
fi

echo ""

# ========================================
# RÉSUMÉ
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ PARFAIT ! Setup complet${NC}"
    echo ""
    echo "👉 Prochaine étape: Lisez ACTION_IMMEDIATE.md"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️ $WARNINGS avertissements${NC}"
    echo ""
    echo "Setup fonctionnel mais améliorable."
    echo "Consultez les avertissements ci-dessus."
    echo ""
    echo "👉 Prochaine étape: Lisez ACTION_IMMEDIATE.md"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erreurs critiques${NC}"
    echo -e "${YELLOW}⚠️ $WARNINGS avertissements${NC}"
    echo ""
    echo "Corrigez les erreurs avant de continuer."
    echo ""
    echo "👉 Commandes rapides:"
    echo "   cd backend"
    echo "   npm install rate-limit-redis redis @sentry/node sharp"
    echo "   mkdir -p backups logs"
    echo "   chmod +x scripts/*.sh"
    exit 1
fi
