# 🧪 Script de Test Complet AfriConnect
# Tests de toutes les API endpoints

$API_URL = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    $testResults.Total++
    Write-Host "🧪 Test $($testResults.Total): $Name" -ForegroundColor Cyan
    
    try {
        $params = @{
            Uri = "$API_URL$Endpoint"
            Method = $Method
            Headers = $headers.Clone()
        }
        
        foreach ($key in $Headers.Keys) {
            $params.Headers[$key] = $Headers[$key]
        }
        
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 10 -Compress
            $params.Body = $bodyJson
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        
        Write-Host "  ✅ $Name" -ForegroundColor Green
        $testResults.Passed++
        return $response
    }
    catch {
        Write-Host "  ❌ $Name" -ForegroundColor Red
        Write-Host "     Erreur: $($_.Exception.Message)" -ForegroundColor Yellow
        $testResults.Failed++
        return $null
    }
}

Write-Host "`n" "="*60 -ForegroundColor Blue
Write-Host "🧪 TESTS COMPLETS AFRICONNECT" -ForegroundColor Blue
Write-Host "="*60 -ForegroundColor Blue
Write-Host ""

# 1. Health Check
Write-Host "`n📡 === VÉRIFICATION SERVEURS ===" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction Stop
    if ($health.StatusCode -eq 200) {
        Write-Host "  ✅ Health Check" -ForegroundColor Green
        $testResults.Passed++
        $testResults.Total++
    } else {
        Write-Host "  ❌ Health Check - Status: $($health.StatusCode)" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Total++
    }
} catch {
    Write-Host "  ❌ Health Check - Erreur: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Failed++
    $testResults.Total++
}
Start-Sleep -Milliseconds 500

# 2. Authentification
Write-Host "`n🔐 === TESTS AUTHENTIFICATION ===" -ForegroundColor Yellow
$testEmail = "test$(Get-Date -Format 'yyyyMMddHHmmss')@africonnect.test"
$testPassword = "Test123!@#"

$registerResponse = Test-Endpoint -Name "Register" -Method "POST" -Endpoint "/auth/register" -Body @{
    email = $testEmail
    password = $testPassword
    username = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')"
    full_name = "Test User"
}

$authToken = $null
$refreshToken = $null
$userId = $null

if ($registerResponse -and $registerResponse.data) {
    $authToken = $registerResponse.data.accessToken
    $refreshToken = $registerResponse.data.refreshToken
    $userId = $registerResponse.data.user.id
    $headers["Authorization"] = "Bearer $authToken"
}

Start-Sleep -Milliseconds 500

if ($authToken) {
    Test-Endpoint -Name "Login" -Method "POST" -Endpoint "/auth/login" -Body @{
        email = $testEmail
        password = $testPassword
    } -Headers @{}
    
    Test-Endpoint -Name "Get Me" -Method "GET" -Endpoint "/auth/me" -Headers $headers
    
    Test-Endpoint -Name "Refresh Token" -Method "POST" -Endpoint "/auth/refresh" -Body @{
        refreshToken = $refreshToken
    } -Headers @{}
}

Start-Sleep -Milliseconds 500

# 3. Vidéos
Write-Host "`n🎥 === TESTS VIDÉOS ===" -ForegroundColor Yellow
$videos = Test-Endpoint -Name "List Videos" -Method "GET" -Endpoint "/videos" -Headers @{}

$videoId = $null
if ($authToken) {
    $newVideo = Test-Endpoint -Name "Create Video" -Method "POST" -Endpoint "/videos" -Body @{
        title = "Test Video $(Get-Date -Format 'yyyyMMddHHmmss')"
        description = "Description de test"
        video_url = "https://example.com/video.mp4"
        thumbnail_url = "https://example.com/thumb.jpg"
        duration = 120
        category = "entertainment"
    } -Headers $headers
    
    if ($newVideo -and $newVideo.data) {
        $videoId = $newVideo.data.id
        
        if ($videoId) {
            Test-Endpoint -Name "Get Video" -Method "GET" -Endpoint "/videos/$videoId" -Headers @{}
            
            Test-Endpoint -Name "Update Video" -Method "PUT" -Endpoint "/videos/$videoId" -Body @{
                title = "Updated Video $(Get-Date -Format 'yyyyMMddHHmmss')"
            } -Headers $headers
            
            Test-Endpoint -Name "Like Video" -Method "POST" -Endpoint "/videos/$videoId/like" -Body @{} -Headers $headers
            
            Test-Endpoint -Name "Comment Video" -Method "POST" -Endpoint "/videos/$videoId/comment" -Body @{
                content = "Super vidéo !"
            } -Headers $headers
        }
    }
}

Start-Sleep -Milliseconds 500

# 4. Produits
Write-Host "`n🛍️ === TESTS PRODUITS ===" -ForegroundColor Yellow
$products = Test-Endpoint -Name "List Products" -Method "GET" -Endpoint "/products" -Headers @{}

$productId = $null
if ($authToken) {
    $newProduct = Test-Endpoint -Name "Create Product" -Method "POST" -Endpoint "/products" -Body @{
        name = "Test Product $(Get-Date -Format 'yyyyMMddHHmmss')"
        description = "Description de test"
        price = 10000
        currency = "XOF"
        category = "electronics"
        stock = 10
        images = @("https://example.com/image.jpg")
    } -Headers $headers
    
    if ($newProduct -and $newProduct.data) {
        $productId = $newProduct.data.id
        
        if ($productId) {
            Test-Endpoint -Name "Get Product" -Method "GET" -Endpoint "/products/$productId" -Headers @{}
            
            Test-Endpoint -Name "Update Product" -Method "PUT" -Endpoint "/products/$productId" -Body @{
                name = "Updated Product $(Get-Date -Format 'yyyyMMddHHmmss')"
            } -Headers $headers
        }
    }
}

Start-Sleep -Milliseconds 500

# 5. Commandes
Write-Host "`n🛒 === TESTS COMMANDES ===" -ForegroundColor Yellow
if ($authToken -and $productId) {
    # Créer un panier directement dans la DB via Prisma (simulation)
    # Le service orderService.createFromCart crée le panier s'il n'existe pas
    # Mais il faut qu'il ait des items. On va créer le panier avec des items directement.
    try {
        # Créer le panier avec des items via une requête directe à la DB
        # Pour le test, on va utiliser l'API orders qui devrait créer le panier automatiquement
        # Mais d'abord, créons le panier manuellement via une requête SQL simulée
        # En fait, le service vérifie si le panier existe et le crée s'il n'existe pas
        # Le problème est que le panier est vide. On doit ajouter des items.
        # Pour simplifier, on va créer le panier avec des items via Prisma directement
        # Mais comme on ne peut pas faire ça depuis le script, on va modifier le test
        # pour créer le panier via une route API si elle existe, sinon on skip ce test
        $cartCreated = $false
        try {
            # Essayer de créer le panier via une route PUT /api/cart si elle existe
            $cartBody = @{
                items = @(
                    @{
                        product_id = $productId
                        quantity = 1
                    }
                )
            } | ConvertTo-Json
            $cartResult = Invoke-RestMethod -Uri "$API_URL/cart" -Method PUT -Body $cartBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
            $cartCreated = $true
        } catch {
            # Si la route n'existe pas, on va créer le panier directement via Prisma
            # Mais on ne peut pas faire ça depuis PowerShell, donc on va modifier le service
            # pour accepter des items dans le body de la requête create order
            Write-Host "  ⚠️  Route cart non disponible, création panier via service..." -ForegroundColor Yellow
        }
    } catch {}
    
    # Le service orderService.createFromCart attend un panier avec des items
    # Si le panier n'existe pas ou est vide, il va échouer
    # Pour le test, on va créer le panier avec des items avant
    $newOrder = Test-Endpoint -Name "Create Order" -Method "POST" -Endpoint "/orders" -Body @{
        shipping_address = "123 Test Street, Bamako, Mali, 00100"
        payment_method = "orange_money"
        items = @(
            @{
                product_id = $productId
                quantity = 1
            }
        )
    } -Headers $headers
    
    $orderId = $null
    if ($newOrder -and $newOrder.data) {
        $orderId = $newOrder.data.id
        
        if ($orderId) {
            Test-Endpoint -Name "List Orders" -Method "GET" -Endpoint "/orders" -Headers $headers
            
            Test-Endpoint -Name "Get Order" -Method "GET" -Endpoint "/orders/$orderId" -Headers $headers
        }
    }
}

Start-Sleep -Milliseconds 500

# 6. Notifications & Saves
Write-Host "`n🔔 === TESTS NOTIFICATIONS ===" -ForegroundColor Yellow
if ($authToken) {
    Test-Endpoint -Name "List Notifications" -Method "GET" -Endpoint "/notifications" -Headers $headers
    
    if ($videoId) {
        Test-Endpoint -Name "Toggle Like" -Method "POST" -Endpoint "/videos/$videoId/like" -Body @{} -Headers $headers
        
        Test-Endpoint -Name "Toggle Save" -Method "POST" -Endpoint "/saves" -Body @{
            video_id = $videoId
        } -Headers $headers
    }
}

Start-Sleep -Milliseconds 500

# 7. Utilisateurs
Write-Host "`n👤 === TESTS UTILISATEURS ===" -ForegroundColor Yellow
if ($authToken) {
    Test-Endpoint -Name "List Users" -Method "GET" -Endpoint "/users" -Headers $headers
    
    if ($userId) {
        Test-Endpoint -Name "Get User" -Method "GET" -Endpoint "/users/$userId" -Headers $headers
    }
}

# Résultats finaux
Write-Host "`n" "="*60 -ForegroundColor Blue
Write-Host "📊 RÉSULTATS FINAUX" -ForegroundColor Blue
Write-Host "="*60 -ForegroundColor Blue
Write-Host "Total: $($testResults.Total)" -ForegroundColor White
Write-Host "✅ Réussis: $($testResults.Passed)" -ForegroundColor Green
Write-Host "❌ Échoués: $($testResults.Failed)" -ForegroundColor Red
$score = if ($testResults.Total -gt 0) { [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1) } else { 0 }
Write-Host "`nScore: $score%" -ForegroundColor Cyan

if ($testResults.Failed -eq 0) {
    Write-Host "`nTOUS LES TESTS SONT PASSES !" -ForegroundColor Green
} else {
    Write-Host "`n$($testResults.Failed) test(s) ont echoue" -ForegroundColor Yellow
}

