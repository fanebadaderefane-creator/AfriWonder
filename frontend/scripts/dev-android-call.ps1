# AfriWonder — débogage appels Android en temps réel (sans rebuild APK à chaque fix JS)
# Usage : powershell -File scripts/dev-android-call.ps1
# Prérequis : Development Build installé une fois (expo-dev-client), USB debugging, adb devices

$ErrorActionPreference = "Stop"
$FrontendRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $FrontendRoot

Write-Host ""
Write-Host "=== AfriWonder — dev appels Android (Metro + logcat) ===" -ForegroundColor Cyan
Write-Host ""

# 1) Vérifier adb
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host "adb introuvable. Installez Android SDK platform-tools et ajoutez au PATH." -ForegroundColor Red
  exit 1
}

$devices = adb devices | Select-String "device$"
if (-not $devices) {
  Write-Host "Aucun appareil Android USB. Branchez le téléphone et activez le débogage USB." -ForegroundColor Yellow
} else {
  Write-Host "Appareil(s) USB :" -ForegroundColor Green
  adb devices -l
}

Write-Host ""
Write-Host "Étapes (3 terminaux recommandés) :" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [T1] Backend local :" -ForegroundColor White
Write-Host "       cd $RepoRoot\backend"
Write-Host "       npm run dev"
Write-Host ""
Write-Host "  [T2] Metro (Development Build — PAS Expo Go) :" -ForegroundColor White
Write-Host "       cd $FrontendRoot"
Write-Host "       npx expo start --dev-client --host lan"
Write-Host "       (Sur le téléphone : ouvrir l'app AfriWonder dev → se connecter au packager)"
Write-Host ""
Write-Host "  [T3] Logs appels (ce script peut lancer logcat seul) :" -ForegroundColor White
Write-Host "       adb logcat -c"
Write-Host "       adb logcat -v time ReactNativeJS:E ReactNativeJS:W *:S"
Write-Host ""
Write-Host "  Reload JS après modification : secouer le téléphone → Reload, ou touche 'r' dans Metro." -ForegroundColor Yellow
Write-Host "  Rebuild APK natif UNIQUEMENT si vous changez un module natif (react-native-webrtc, plugins…)." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Vérif livraison JS : après un appel, logcat doit contenir :" -ForegroundColor Yellow
Write-Host "       [PATCH_AUDIO_FIX_ACTIVE] ... tag=2026-06-09-v3"
Write-Host "       [DEBUG_TRANSCEIVERS] / [DEBUG_SENDERS]"
Write-Host "  Si la stack trace montre 'index.android.bundle' SANS ces tags → APK figé, pas Metro." -ForegroundColor Red
Write-Host ""

$launchLogcat = Read-Host "Lancer logcat filtré maintenant ? (o/N)"
if ($launchLogcat -eq 'o' -or $launchLogcat -eq 'O') {
  adb logcat -c
  Write-Host "Logcat — filtres [AFW_CALL] [SDP_*] [ICE_*] [CALL_END_*] [AFW_CALL_EXIT]" -ForegroundColor Green
  adb logcat -v time ReactNativeJS:E ReactNativeJS:W *:S
}
