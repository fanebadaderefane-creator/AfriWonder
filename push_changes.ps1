# Script pour commit et push des modifications AfriWonder
# Executez: .\push_changes.ps1

Set-Location $PSScriptRoot

Write-Host "=== Etat Git ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Ajout des fichiers ===" -ForegroundColor Cyan
git add -A

Write-Host "`n=== Commit ===" -ForegroundColor Cyan
git commit -m "fix(tests): unify Prisma, admin whitelist, test corrections - all 468 tests passing"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Push vers origin main ===" -ForegroundColor Cyan
    git push origin main
    Write-Host "`nTermine!" -ForegroundColor Green
} else {
    Write-Host "`nCommit a echoue (peut-etre rien a committer)" -ForegroundColor Yellow
}
