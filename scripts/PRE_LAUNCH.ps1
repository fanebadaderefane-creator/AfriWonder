# ==============================================================================
# AfriWonder - Script PRE-LAUNCH (J-1) - version PowerShell pour Windows
#
# Usage :
#   powershell -ExecutionPolicy Bypass -File scripts\PRE_LAUNCH.ps1 [-Step all|1|2|3|4]
#
# Variables attendues (exporter avant lancement) :
#   $env:DATABASE_URL_PROD         (obligatoire pour step 2)
#   $env:EXPO_PUBLIC_BACKEND_URL   (par defaut : https://afriwonder-api.onrender.com)
#   $env:EXPO_PUBLIC_SENTRY_DSN    (recommande)
#   $env:EXPO_PUBLIC_FACEBOOK_APP_ID, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_SUPER_ADMIN_EMAIL (optionnel)
# ==============================================================================

param(
    [ValidateSet("all","1","2","3","4")]
    [string]$Step = "all"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
$TS = Get-Date -Format "yyyy-MM-dd"

function Title([string]$msg)  { Write-Host ""; Write-Host "==[ $msg ]==" -ForegroundColor Cyan }
function OK   ([string]$msg)  { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn ([string]$msg)  { Write-Host "  [!!]  $msg" -ForegroundColor Yellow }
function Fail ([string]$msg)  { Write-Host "  [X]   $msg" -ForegroundColor Red; exit 1 }

function Invoke-PreLaunchSecretRotation {
    Title "Etape 1 - Rotation des secrets"
    $secretsFile = "scripts\SECRETS_PROD_$TS.env"
    if (Test-Path $secretsFile) {
        OK "Fichier secrets deja genere : $secretsFile"
    } else {
        node -e @'
const c = require('crypto');
const fs = require('fs');
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
].join('\n');
fs.writeFileSync(process.argv[1], out + '\n');
console.log('Secrets generes dans ' + process.argv[1]);
'@ $secretsFile
        OK "Nouveaux secrets generes -> $secretsFile"
    }
    Warn "ACTION MANUELLE requise : pousser ces secrets dans Render + Doppler."
    Warn "Guide : scripts\ROTATE_SECRETS.md"
    Warn "Puis rotate le mot de passe Supabase (dashboard)."
}

function Invoke-PreLaunchDatabaseMigration {
    Title "Etape 2 - Migration DB production + smoke test"
    if (-not $env:DATABASE_URL_PROD) {
        Warn "DATABASE_URL_PROD non defini. Lance d'abord :"
        Write-Host "  `$env:DATABASE_URL_PROD = 'postgresql://...@...:6543/postgres?pgbouncer=true'"
        return
    }
    Push-Location "$Root\backend"
    try {
        OK "Application des migrations Prisma..."
        $env:DATABASE_URL = $env:DATABASE_URL_PROD
        npx prisma migrate deploy
        OK "Generation du client Prisma..."
        npx prisma generate
        OK "Smoke test backend..."
        $secretsFile = "$Root\scripts\SECRETS_PROD_$TS.env"
        if (Test-Path $secretsFile) {
            $secrets = Get-Content $secretsFile | Where-Object { $_ -match '^(JWT_SECRET|JWT_REFRESH_SECRET)=' }
            foreach ($line in $secrets) {
                $kv = $line -split '=', 2
                Set-Item -Path "env:$($kv[0])" -Value $kv[1]
            }
        }
        npm run test:smoke
    } finally {
        Pop-Location
    }
    OK "DB prod alignee avec schema.prisma."
}

function Invoke-PreLaunchEasSecrets {
    Title "Etape 3 - Push des EAS secrets"
    if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
        Warn "eas-cli non installe. Installer :"
        Write-Host "  npm install -g eas-cli"
        return
    }

    $backend = if ($env:EXPO_PUBLIC_BACKEND_URL) { $env:EXPO_PUBLIC_BACKEND_URL } else { "https://afriwonder-api.onrender.com" }
    $socket  = if ($env:EXPO_PUBLIC_SOCKET_URL)  { $env:EXPO_PUBLIC_SOCKET_URL }  else { "wss://afriwonder-api.onrender.com" }
    $project = if ($env:EXPO_PUBLIC_EAS_PROJECT_ID) { $env:EXPO_PUBLIC_EAS_PROJECT_ID } else { "54406371-5aa5-4bf1-8f80-b64b9f1e72fc" }
    $sentry  = if ($env:EXPO_PUBLIC_SENTRY_DSN)  { $env:EXPO_PUBLIC_SENTRY_DSN }  else { "" }
    $publicOrigin = if ($env:EXPO_PUBLIC_PUBLIC_WEB_ORIGIN) { $env:EXPO_PUBLIC_PUBLIC_WEB_ORIGIN } else { "https://afri-wonder.vercel.app" }
    $fbId = if ($env:EXPO_PUBLIC_FACEBOOK_APP_ID) { $env:EXPO_PUBLIC_FACEBOOK_APP_ID } else { "" }
    $googleWeb = if ($env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) { $env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID } else { "" }
    $superAdmin = if ($env:EXPO_PUBLIC_SUPER_ADMIN_EMAIL) { $env:EXPO_PUBLIC_SUPER_ADMIN_EMAIL } else { "" }

    Push-Location "$Root\frontend"
    try {
        function Register-EasProjectSecret {
            param(
                [Parameter(Mandatory = $true)][string]$Name,
                [Parameter(Mandatory = $true)][string]$Value
            )
            if ([string]::IsNullOrEmpty($Value)) { Warn "skip $Name (vide, renseigner plus tard)"; return }
            Write-Host "  [push] $Name"
            & eas secret:create --scope project --name $Name --value $Value --force 2>&1 | Out-Null
        }

        Register-EasProjectSecret -Name "EXPO_PUBLIC_APP_ENV" -Value "production"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_BACKEND_URL" -Value $backend
        Register-EasProjectSecret -Name "EXPO_PUBLIC_SOCKET_URL" -Value $socket
        Register-EasProjectSecret -Name "EXPO_PUBLIC_EAS_PROJECT_ID" -Value $project
        Register-EasProjectSecret -Name "EXPO_PUBLIC_PUBLIC_WEB_ORIGIN" -Value $publicOrigin
        Register-EasProjectSecret -Name "EXPO_PUBLIC_SENTRY_DSN" -Value $sentry
        Register-EasProjectSecret -Name "EXPO_PUBLIC_FACEBOOK_APP_ID" -Value $fbId
        Register-EasProjectSecret -Name "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" -Value $googleWeb
        Register-EasProjectSecret -Name "EXPO_PUBLIC_SUPER_ADMIN_EMAIL" -Value $superAdmin

        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_MARKETPLACE" -Value "1"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_CROWDFUNDING_CONTRIBUTE" -Value "1"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_COURSES" -Value "1"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_NEWS" -Value "1"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_SERVICES_HUB" -Value "1"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_WALLET_P2P" -Value "1"
        Register-EasProjectSecret -Name "EXPO_PUBLIC_ENABLE_STRIPE" -Value "1"

        OK "Secrets EAS pousses."
        Write-Host ""
        eas secret:list
    } finally {
        Pop-Location
    }
}

function Invoke-PreLaunchPreviewBuild {
    Title "Etape 4 - Build preview EAS + checklist E2E"
    if (-not (Get-Command eas -ErrorAction SilentlyContinue)) { Warn "eas-cli non installe."; return }
    Push-Location "$Root\frontend"
    try {
        OK "Lancement du build preview..."
        eas build --profile preview --platform all --non-interactive --wait
    } finally {
        Pop-Location
    }
    $checklist = @'
==[ CHECKLIST MANUELLE SUR DEVICE (pre-GO final) ]==

Scanner le QR code envoye par EAS, installer la preview, puis valider :

  [ ] 1. Login email + password -> feed charge
  [ ] 2. Socket : DM arrive en temps reel sans refresh
  [ ] 3. Upload video -> apparait dans le profil
  [ ] 4. Paiement Orange Money sandbox 500 FCFA -> webhook OK
  [ ] 5. Wallet transfer @username -> solde + notification destinataire
  [ ] 6. Airtime recharge 500 FCFA -> historique met a jour
  [ ] 7. Deep link afriwonder://u/<username> depuis un autre app -> ouvre
  [ ] 8. Live : rejoindre + cadeau -> compteur update
  [ ] 9. Logout / login avec nouveau JWT -> OK
  [ ] 10. Mode avion 10s puis reconnexion -> feed retente

Si les 10 passent -> GO production :
    eas build --profile production --platform all
    eas submit --platform ios --latest
    eas submit --platform android --latest
'@
    Write-Host $checklist -ForegroundColor Yellow
}

switch ($Step) {
    "1"   { Invoke-PreLaunchSecretRotation }
    "2"   { Invoke-PreLaunchDatabaseMigration }
    "3"   { Invoke-PreLaunchEasSecrets }
    "4"   { Invoke-PreLaunchPreviewBuild }
    "all" {
        Invoke-PreLaunchSecretRotation
        try { Invoke-PreLaunchDatabaseMigration }    catch { Warn "Etape 2 sautee : $_" }
        try { Invoke-PreLaunchEasSecrets }   catch { Warn "Etape 3 sautee : $_" }
        try { Invoke-PreLaunchPreviewBuild } catch { Warn "Etape 4 sautee : $_" }
    }
}

Title "PRE_LAUNCH termine"
