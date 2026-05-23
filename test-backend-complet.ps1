# Script de test complet pour toutes les routes backend AfriConnect
# Test de toutes les 30 routes

$baseUrl = "http://localhost:3000"
# $testResults = @()  # Variable déclarée mais non utilisée - commentée pour éviter l'avertissement
$totalTests = 0
$passedTests = 0
$failedTests = 0

# Fonction pour tester un endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [hashtable]$Headers = @{},
        [string]$Description
    )
    
    $global:totalTests++
    $url = "$baseUrl$Endpoint"
    
    try {
        $params = @{
            Method = $Method
            Uri = $url
            Headers = $Headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        $statusCode = 200
        
        Write-Host "[OK] $Description" -ForegroundColor Green
        $global:passedTests++
        return @{ Success = $true; Response = $response; StatusCode = $statusCode }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if (-not $statusCode) { $statusCode = 500 }
        
        # 401 est attendu pour les routes protégées sans auth
        if ($statusCode -eq 401 -and $Description -like "*401 expected*") {
            Write-Host "[OK] $Description - Status: $statusCode (attendu)" -ForegroundColor Green
            $global:passedTests++
            return @{ Success = $true; Response = $null; StatusCode = $statusCode }
        }
        
        Write-Host "[FAIL] $Description - Status: $statusCode" -ForegroundColor Red
        $global:failedTests++
        return @{ Success = $false; Error = $_.Exception.Message; StatusCode = $statusCode }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLET BACKEND AFRICONNECT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Attendre que le serveur soit prêt
Write-Host "Attente du serveur backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test Health Check
Write-Host "`n--- HEALTH CHECK ---" -ForegroundColor Yellow
$null = Test-Endpoint -Method "GET" -Endpoint "/health" -Description "Health Check"

# Test Register
Write-Host "`n--- AUTHENTIFICATION ---" -ForegroundColor Yellow
$registerData = @{
    email = "test$(Get-Random)@example.com"
    username = "testuser$(Get-Random)"
    password = "Test123456!"
    full_name = "Test User"
}
$registerResult = Test-Endpoint -Method "POST" -Endpoint "/api/auth/register" -Body $registerData -Description "Register User"

$authHeaders = @{}
$userId = "test-user-id"

if ($registerResult.Success -and $registerResult.Response.data) {
    $userId = $registerResult.Response.data.user.id
    $token = $registerResult.Response.data.token
    
    if (-not $token) {
        Write-Host "[WARN] Token non reçu, tentative de login..." -ForegroundColor Yellow
        $loginData = @{
            email = $registerData.email
            password = $registerData.password
        }
        $loginResult = Test-Endpoint -Method "POST" -Endpoint "/api/auth/login" -Body $loginData -Description "Login User"
        if ($loginResult.Success -and $loginResult.Response.data) {
            $token = $loginResult.Response.data.token
            $userId = $loginResult.Response.data.user.id
        }
    }
    
    if ($token) {
        $authHeaders = @{
            "Authorization" = "Bearer $token"
        }
    } else {
        Write-Host "[ERROR] Impossible d'obtenir un token d'authentification" -ForegroundColor Red
    }
} else {
    Write-Host "[WARN] Register a échoué, utilisation sans authentification" -ForegroundColor Yellow
}

# Test Login
$loginData = @{
    email = $registerData.email
    password = $registerData.password
}
Test-Endpoint -Method "POST" -Endpoint "/api/auth/login" -Body $loginData -Description "Login User"

# Test Get Me
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/auth/me" -Headers $authHeaders -Description "Get Current User"
}

# Test Users
Write-Host "`n--- USERS ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/users" -Headers $authHeaders -Description "List Users"
    Test-Endpoint -Method "GET" -Endpoint "/api/users/$userId" -Headers $authHeaders -Description "Get User by ID"
}

# Test Videos
Write-Host "`n--- VIDEOS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/videos" -Description "List Videos"

# Test Products
Write-Host "`n--- PRODUCTS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/products" -Description "List Products"

# Test Cart
Write-Host "`n--- CART ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/cart" -Headers $authHeaders -Description "Get Cart"
}

# Test Wishlist
Write-Host "`n--- WISHLIST ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/wishlist" -Headers $authHeaders -Description "Get Wishlist"
}

# Test Reviews
Write-Host "`n--- REVIEWS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/reviews/product/test-product-id" -Description "Get Product Reviews"

# Test Shipping
Write-Host "`n--- SHIPPING ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/shipping/rates?destinationCountry=Mali&weight=1" -Description "Get Shipping Rates"

# Test Live
Write-Host "`n--- LIVE STREAMING ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/live" -Description "List Live Streams"

# Test Messages
Write-Host "`n--- MESSAGES ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/messages/conversations" -Headers $authHeaders -Description "Get Conversations"
    Test-Endpoint -Method "GET" -Endpoint "/api/messages/unread/count" -Headers $authHeaders -Description "Get Unread Count"
}

# Test Communities
Write-Host "`n--- COMMUNITIES ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/communities" -Description "List Communities"

# Test Stories
Write-Host "`n--- STORIES ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/stories/user/$userId" -Description "Get User Stories"

# Test Playlists
Write-Host "`n--- PLAYLISTS ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/playlists" -Headers $authHeaders -Description "Get User Playlists"
} else {
    Test-Endpoint -Method "GET" -Endpoint "/api/playlists" -Description "Get User Playlists (401 expected)"
}

# Test Courses
Write-Host "`n--- COURSES ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/courses" -Description "List Courses"

# Test Analytics
Write-Host "`n--- ANALYTICS ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/analytics/video/test-video-id" -Headers $authHeaders -Description "Get Video Analytics"
} else {
    Test-Endpoint -Method "GET" -Endpoint "/api/analytics/video/test-video-id" -Description "Get Video Analytics (401 expected)"
}

# Test Crowdfunding
Write-Host "`n--- CROWDFUNDING ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/crowdfunding" -Description "List Campaigns"

# Test Microcredit
Write-Host "`n--- MICROCREDIT ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/microcredit" -Description "List Loan Requests"

# Test Jobs
Write-Host "`n--- JOBS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/jobs" -Description "List Jobs"

# Test Services
Write-Host "`n--- SERVICES ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/services" -Description "List Services"

# Test Events
Write-Host "`n--- EVENTS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/events" -Description "List Events"

# Test Civic
Write-Host "`n--- CIVIC PETITIONS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/civic" -Description "List Petitions"

# Test News
Write-Host "`n--- NEWS ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/news" -Description "List News Articles"

# Test Challenges
Write-Host "`n--- CHALLENGES ---" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Endpoint "/api/challenges" -Description "List Challenges"

# Test Moderation
Write-Host "`n--- MODERATION ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/moderation/reports" -Headers $authHeaders -Description "List Moderation Reports"
} else {
    Test-Endpoint -Method "GET" -Endpoint "/api/moderation/reports" -Description "List Moderation Reports (401 expected)"
}

# Test Notifications
Write-Host "`n--- NOTIFICATIONS ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/notifications" -Headers $authHeaders -Description "Get Notifications"
} else {
    Test-Endpoint -Method "GET" -Endpoint "/api/notifications" -Description "Get Notifications (401 expected)"
}

# Test Orders
Write-Host "`n--- ORDERS ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/orders" -Headers $authHeaders -Description "List Orders"
} else {
    Test-Endpoint -Method "GET" -Endpoint "/api/orders" -Description "List Orders (401 expected)"
}

# Test Saves
Write-Host "`n--- SAVES ---" -ForegroundColor Yellow
if ($authHeaders.Count -gt 0) {
    Test-Endpoint -Method "GET" -Endpoint "/api/saves" -Headers $authHeaders -Description "Get Saves"
} else {
    Test-Endpoint -Method "GET" -Endpoint "/api/saves" -Description "Get Saves (401 expected)"
}

# Résumé
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total de tests: $totalTests" -ForegroundColor White
Write-Host "Tests réussis: $passedTests" -ForegroundColor Green
Write-Host "Tests échoués: $failedTests" -ForegroundColor Red

$successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }
Write-Host "Taux de réussite: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

if ($successRate -eq 100) {
    Write-Host "`n✅ TOUS LES TESTS SONT PASSÉS !" -ForegroundColor Green
}
elseif ($successRate -ge 80) {
    Write-Host "`n⚠️  La plupart des tests sont passés" -ForegroundColor Yellow
}
else {
    Write-Host "`n❌ Plusieurs tests ont échoué" -ForegroundColor Red
}

