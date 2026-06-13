# Verifie credentials.json + fichier .jks avant eas build (gitignored — secrets locaux).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$credPath = Join-Path $root 'credentials.json'
$jksPath = Join-Path $root 'android-keystore.jks'

if (-not (Test-Path $credPath)) {
  Write-Host 'MISSING frontend/credentials.json — copy credentials.json.example'
  exit 1
}
if (-not (Test-Path $jksPath)) {
  Write-Host 'MISSING frontend/android-keystore.jks'
  Write-Host 'Download keystore: expo.dev -> Credentials -> Android -> Download keystore'
  Write-Host "Save as: $jksPath"
  exit 1
}

Write-Host 'OK credentials.json + android-keystore.jks — ready for eas build.'
exit 0
