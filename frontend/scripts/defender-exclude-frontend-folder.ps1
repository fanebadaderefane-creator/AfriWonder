# Ajoute les exclusions Windows Defender les plus utiles contre les erreurs Gradle/CMake :
# metadata_generation_command.txt (fichier utilise par un autre processus)
#
# UTILISATION : clic droit sur ce fichier -> Executer avec PowerShell en tant qu ADMINISTRATEUR
# Ou : depuis une invite PowerShell ADMIN : npm run android:windows:defender-exclude
#
# Sans ca, npm run android:aab:win peut echouer en boucle (metadata_generation_command.txt verrouille).
#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

function Test-FolderExcluded {
  param([string]$Path)
  try {
    $prefs = Get-MpPreference -ErrorAction Stop
    $normTarget = [System.IO.Path]::GetFullPath(($Path.TrimEnd('\', '/') + '\' ))
    foreach ($rule in ($prefs.ExclusionPath | Where-Object { $_ })) {
      $normRule = [System.IO.Path]::GetFullPath(($rule.TrimEnd('\', '/') + '\' ))
      if ($normTarget.StartsWith($normRule, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
      }
    }
  }
  catch {
    return $false
  }
  return $false
}

$FrontendRoot = Split-Path -Parent $PSScriptRoot
$GradleUserHomeDefault = Join-Path $env:USERPROFILE '.gradle'

$pathsToAdd = @($FrontendRoot, $GradleUserHomeDefault)

foreach ($dir in $pathsToAdd) {
  if (!(Test-Path -LiteralPath $dir)) {
    Write-Warning "Dossier introuvable, ignore : $dir"
    continue
  }
  $already = Test-FolderExcluded -Path $dir
  if ($already) {
    Write-Host "(deja exclus ou parent exclus) : $dir" -ForegroundColor DarkGray
    continue
  }
  Add-MpPreference -ExclusionPath $dir
  Write-Host "Exclusion ajoutee Defender : $dir" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Termine. Relance ensuite (sans CMD admin obligatoire) : npm run android:aab:win' -ForegroundColor Cyan
