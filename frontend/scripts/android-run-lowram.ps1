# Build + install debug APK sur machine Windows peu de RAM (évite crash daemon Gradle OOM).
# Usage : powershell -ExecutionPolicy Bypass -File scripts/android-run-lowram.ps1
$ErrorActionPreference = 'Stop'
$FrontendRoot = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $FrontendRoot 'android'

Write-Host ''
Write-Host '=== AfriWonder — expo run:android (mode faible RAM) ===' -ForegroundColor Cyan
Write-Host 'Fermez Chrome, MEmu et Android Studio avant de continuer.' -ForegroundColor Yellow
Write-Host ''

if (Test-Path -LiteralPath (Join-Path $AndroidDir 'gradlew.bat')) {
  Push-Location $AndroidDir
  try {
    .\gradlew.bat --stop 2>$null
  }
  finally {
    Pop-Location
  }
}

# Une seule ABI = moitié moins de compilation native (Expo détecte l’ABI de l’appareil USB).
$env:ORG_GRADLE_PROJECT_reactNativeArchitectures = 'armeabi-v7a'
$env:GRADLE_OPTS = '-Xmx1024m -XX:MaxMetaspaceSize=384m -XX:+UseSerialGC'

Push-Location $FrontendRoot
try {
  npx expo run:android -- --max-workers=1 --no-build-cache
}
finally {
  Pop-Location
}
