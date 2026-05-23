# Supprime le dossier flutter-afriwonder (vide).
# Lancer ce script APRÈS avoir fermé Cursor et tout onglet dans ce dossier.
# Double-clic ou : powershell -ExecutionPolicy Bypass -File "scripts\supprimer-flutter-afriwonder.ps1"

$dir = Join-Path $PSScriptRoot "..\flutter-afriwonder"
if (Test-Path $dir) {
  Remove-Item -Path $dir -Recurse -Force
  Write-Host "Dossier flutter-afriwonder supprime."
} else {
  Write-Host "Le dossier flutter-afriwonder n'existe plus."
}
