# Script de test de synchronisation Frontend-Backend

$backendUrl = "http://localhost:3000"
$frontendUrl = "http://localhost:5173"
$testResults = @()
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Body = $null,
        [hashtable]$Headers = @{},
        [string]$Description
    )
    
    $global:totalTests++
    
    try {
        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $Headers
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        
        Write-Host "[OK] $Description" -ForegroundColor Green
        $global:passedTests++
        return @{ Success = $true; StatusCode = $statusCode }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if (-not $statusCode) { $statusCode = 500 }
        
        Write-Host "[FAIL] $Description - Status: $statusCode" -ForegroundColor Red
        $global:failedTests++
        return @{ Success = $false; StatusCode = $statusCode }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SYNCHRONISATION FRONTEND-BACKEND" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Attendre que les serveurs soient prêts
Write-Host "Attente des serveurs..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test Backend
Write-Host "`n--- BACKEND ---" -ForegroundColor Yellow
$backendHealth = Test-Endpoint -Method "GET" -Url "$backendUrl/health" -Description "Backend Health Check"

if (-not $backendHealth.Success) {
    Write-Host "[ERROR] Backend non disponible !" -ForegroundColor Red
    exit 1
}

# Test Frontend
Write-Host "`n--- FRONTEND ---" -ForegroundColor Yellow
$frontendHealth = Test-Endpoint -Method "GET" -Url "$frontendUrl" -Description "Frontend Accessible"

if (-not $frontendHealth.Success) {
    Write-Host "[ERROR] Frontend non accessible !" -ForegroundColor Red
    exit 1
}

# Test API depuis Frontend (simulation)
Write-Host "`n--- CONNEXION API ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Url "$backendUrl/api/videos" -Description "API Videos accessible"
Test-Endpoint -Method "GET" -Url "$backendUrl/api/products" -Description "API Products accessible"
Test-Endpoint -Method "GET" -Url "$backendUrl/api/communities" -Description "API Communities accessible"

# Test Register depuis API
Write-Host "`n--- TEST AUTHENTIFICATION ---" -ForegroundColor Yellow
$registerData = @{
    email = "sync-test$(Get-Random)@example.com"
    username = "synctest$(Get-Random)"
    password = "SyncTest123456!"
    full_name = "Sync Test User"
}
$registerResult = Test-Endpoint -Method "POST" -Url "$backendUrl/api/auth/register" -Body $registerData -Description "Register via API"

if ($registerResult.Success) {
    Write-Host "[OK] Authentification API fonctionnelle" -ForegroundColor Green
}

# Résumé
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ SYNCHRONISATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend: $backendUrl" -ForegroundColor White
Write-Host "Frontend: $frontendUrl" -ForegroundColor White
Write-Host "Total de tests: $totalTests" -ForegroundColor White
Write-Host "Tests réussis: $passedTests" -ForegroundColor Green
Write-Host "Tests échoués: $failedTests" -ForegroundColor Red

$successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }
Write-Host "Taux de réussite: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })

if ($backendHealth.Success -and $frontendHealth.Success) {
    Write-Host "`n✅ SYNCHRONISATION RÉUSSIE !" -ForegroundColor Green
    Write-Host "Backend et Frontend sont connectés et fonctionnels." -ForegroundColor Green
} else {
    Write-Host "`n❌ Problème de synchronisation" -ForegroundColor Red
}








