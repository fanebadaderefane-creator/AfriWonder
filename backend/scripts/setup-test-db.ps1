# Script PowerShell pour configurer la base de données de test
# Usage: .\scripts\setup-test-db.ps1

Write-Host "🔧 Configuration de la base de données de test..." -ForegroundColor Cyan

# Charger les variables d'environnement depuis .env.test
if (Test-Path .env.test) {
    Get-Content .env.test | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "❌ Fichier .env.test non trouvé!" -ForegroundColor Red
    Write-Host "📝 Créez .env.test à partir de .env.test.example" -ForegroundColor Yellow
    exit 1
}

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL non défini dans .env.test" -ForegroundColor Red
    exit 1
}

Write-Host "📋 DATABASE_URL configuré" -ForegroundColor Green

# Exécuter les migrations Prisma sur la DB de test
Write-Host "🔄 Exécution des migrations Prisma..." -ForegroundColor Cyan
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations appliquées avec succès!" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de l'application des migrations" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Base de données de test configurée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Vous pouvez maintenant exécuter les tests:" -ForegroundColor Cyan
Write-Host "   npm test" -ForegroundColor Yellow
