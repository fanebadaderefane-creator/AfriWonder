# Builds app-release.aab locally on Windows while reducing CMake "file in use" failures.
#
# Par defaut [4] nettoie vite (chemins connus + tout <pkg>\android\.cxx au 1er niveau de node_modules).
# Scan recursif COMPLET (tres long, minutes sans message) : avant npm run, dans le meme terminal :
#   $env:AFW_ANDROID_AAB_WIN_FULL_CXX_RECURSE = '1'
#
# REQUIRED for reliable builds: Defender exclusion on the whole frontend folder:
#   C:\Users\<you>\...\AfriWonder\frontend
# Close Android Studio and any parallel Gradle builds.
#
# Output: android\app\build\outputs\bundle\release\app-release.aab
$ErrorActionPreference = 'Stop'

$FrontendRoot = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $FrontendRoot 'android'
$NodeModulesDir = Join-Path $FrontendRoot 'node_modules'

Write-Host ''
Write-Host 'AfriWonder - AAB Windows (CMake + retries Windows)' -ForegroundColor Cyan
Write-Host "Frontend : $FrontendRoot"
Write-Host ''

if (!(Test-Path -LiteralPath $AndroidDir)) {
  Write-Error "Dossier android introuvable : $AndroidDir"
}

function Test-FrontendLikelyExcludedFromWindowsDefender {
  param([string]$FrontendPath)
  try {
    if (-not (Get-Command Get-MpPreference -ErrorAction SilentlyContinue)) {
      return $false
    }
    $prefs = Get-MpPreference -ErrorAction Stop
    $separator = [System.IO.Path]::DirectorySeparatorChar
    $tRoot = ([System.IO.Path]::GetFullPath($FrontendPath.TrimEnd('\', '/')) + $separator)
    foreach ($rule in @($prefs.ExclusionPath)) {
      if ([string]::IsNullOrWhiteSpace($rule)) {
        continue
      }
      $rRoot = ([System.IO.Path]::GetFullPath($rule.TrimEnd('\', '/')) + $separator)
      if ($tRoot.StartsWith($rRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
      }
    }
  }
  catch {
    return $false
  }
  return $false
}

if (Test-FrontendLikelyExcludedFromWindowsDefender -FrontendPath $FrontendRoot) {
  Write-Host 'Defender : exclusion lisible qui couvre probablement frontend (verification via Get-MpPreference).' -ForegroundColor DarkGray
}
else {
  Write-Host '*** IMPORTANT *** Sans exclusion Defender sur frontend + caches Gradle, erreurs fichier utilise par CMake reviennent.' -ForegroundColor Red
  Write-Host 'Une fois dans PowerShell ADMIN (dossier frontend) : npm run android:windows:defender-exclude' -ForegroundColor Yellow
}

Write-Host ''

function Stop-StaleCmakeToolkitProcesses {
  foreach ($procName in @('ninja', 'cmake')) {
    Get-Process -Name $procName -ErrorAction SilentlyContinue | ForEach-Object {
      Write-Host "       -> arrete $($_.ProcessName) (PID $($_.Id))"
      Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

function Remove-PathIfPresent {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) {
    return $false
  }
  try {
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    return $true
  }
  catch {
    Write-Warning "PowerShell suppression refusee : $Path - $($_.Exception.Message)"
    if (!(Test-Path -LiteralPath $Path)) {
      return $true
    }
    try {
      $rc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'rmdir', '/s', '/q', $Path) -Wait -NoNewWindow -PassThru
      if (($null -eq $rc) -or ($rc.ExitCode -ne 0)) {
        Write-Warning 'cmd rmdir a echoue ; fermer antivirus ou autres builds puis reessayer.'
        return $false
      }
    }
    catch {
      return $false
    }
    return -not (Test-Path -LiteralPath $Path)
  }
}

function Clear-AndroidCMakeCaches {
  param([string]$NodeModulesRoot, [string]$AndroidProjDir)

  $removedDirs = New-Object System.Collections.Generic.HashSet[string]

  foreach ($rel in @(
      'react-native-nitro-modules\android\.cxx',
      'react-native-worklets\android\.cxx',
      'react-native-screens\android\.cxx',
      'react-native-reanimated\android\.cxx',
      'react-native-gesture-handler\android\.cxx',
      'react-native-quick-crypto\android\.cxx',
      'react-native-quick-base64\android\.cxx',
      'react-native-iap\android\.cxx',
      'react-native-vision-camera\android\.cxx',
      'expo-modules-core\android\.cxx',
      '@shopify\react-native-skia\android\.cxx'
    )) {
    $cxx = Join-Path $NodeModulesRoot $rel
    if (Remove-PathIfPresent $cxx) {
      [void]$removedDirs.Add($cxx)
    }
  }

  if (Test-Path -LiteralPath $NodeModulesRoot) {
    foreach ($top in @(Get-ChildItem -LiteralPath $NodeModulesRoot -Directory -Force -ErrorAction SilentlyContinue)) {
      if ($top.Name.StartsWith('@')) {
        foreach ($inner in @(Get-ChildItem -LiteralPath $top.FullName -Directory -Force -ErrorAction SilentlyContinue)) {
          $cxx = Join-Path $inner.FullName 'android\.cxx'
          if ($removedDirs.Contains($cxx)) {
            continue
          }
          if (Remove-PathIfPresent $cxx) {
            [void]$removedDirs.Add($cxx)
          }
        }
      }
      else {
        $cxx = Join-Path $top.FullName 'android\.cxx'
        if ($removedDirs.Contains($cxx)) {
          continue
        }
        if (Remove-PathIfPresent $cxx) {
          [void]$removedDirs.Add($cxx)
        }
      }
    }
    if (($env:AFW_ANDROID_AAB_WIN_FULL_CXX_RECURSE -eq '1')) {
      Write-Host '       (scan recursif COMPLET node_modules actif : tres long...)' -ForegroundColor DarkYellow
      Get-ChildItem -Path $NodeModulesRoot -Recurse -Force -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ceq '.cxx' } |
        ForEach-Object {
          $p = $_.FullName
          if (!$removedDirs.Contains($p) -and (Remove-PathIfPresent $p)) {
            [void]$removedDirs.Add($p)
          }
        }
    }
  }

  Remove-PathIfPresent (Join-Path $AndroidProjDir 'app\.cxx') | Out-Null
  Remove-PathIfPresent (Join-Path $AndroidProjDir '.cxx') | Out-Null

  return $removedDirs.Count
}

# Evite "Picked up _JAVA_OPTIONS" sur chaque gradlew (conflit potentiel avec org.gradle.jvmargs)
$__saveJavaToolOpts = [Environment]::GetEnvironmentVariable('JAVA_TOOL_OPTIONS', 'Process')
$__saveUnderscoreJavaOpts = [Environment]::GetEnvironmentVariable('_JAVA_OPTIONS', 'Process')
[Environment]::SetEnvironmentVariable('JAVA_TOOL_OPTIONS', $null, 'Process')
[Environment]::SetEnvironmentVariable('_JAVA_OPTIONS', $null, 'Process')

$gradleExit = 1
$maxAttempts = 3

try {
  Push-Location $AndroidDir
  try {
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
      Write-Host "=== Tentative $attempt / $maxAttempts ===" -ForegroundColor Yellow

      Write-Host '[1] Gradle --stop...'
      & .\gradlew.bat --stop

      Write-Host '[2] Fin des processus ninja/cmake (handles Windows)...'
      Stop-StaleCmakeToolkitProcesses

      $waitSec = 10 + (($attempt - 1) * 20)
      Write-Host "[3] Pause ${waitSec}s (ne pas faire Ctrl+C pendant ce delai) ..."
      Start-Sleep -Seconds $waitSec

      Write-Host '[4] Suppression caches CMake (.cxx) ; en general rapide (sans scan recursif complet).'
      try {
        $n = Clear-AndroidCMakeCaches -NodeModulesRoot $NodeModulesDir -AndroidProjDir $AndroidDir
      }
      catch {
        Write-Warning "Nettoyage .cxx incomplet : $($_.Exception.Message)"
        $n = -1
      }
      Write-Host "       -> environ $n dossier(s) .cxx comptes comme supprimes (ou -1 si erreur partielle)"

      Write-Host '[5] :app:bundleRelease (--no-daemon, --max-workers=1, --no-watch-fs)...'
      & .\gradlew.bat --no-daemon ':app:bundleRelease' --no-configuration-cache --max-workers=1 --no-watch-fs
      $gradleExit = $LASTEXITCODE
      if ($null -eq $gradleExit) {
        $gradleExit = 1
      }

      if ($gradleExit -eq 0) {
        break
      }

      if ($attempt -lt $maxAttempts) {
        Write-Warning 'Echec build (souvent verrou fichier + CMake sur Windows). Nouvelle tentative apres pause...'
        Write-Warning 'Verifie exclusion Windows Defender : npm run android:windows:defender-exclude (PowerShell ADMIN).'
      }
    }
  }
  finally {
    Pop-Location
  }

  if ($gradleExit -ne 0) {
    Write-Host ''
    Write-Host "Echec Gradle apres $maxAttempts tentative(s). Code $gradleExit." -ForegroundColor Red
    Write-Host 'Sortie sans build local : npm run eas:android:production' -ForegroundColor Yellow
    exit $gradleExit
  }

  $aabPath = Join-Path $AndroidDir 'app\build\outputs\bundle\release\app-release.aab'
  Write-Host ''
  if (Test-Path -LiteralPath $aabPath) {
    Write-Host 'OK - AAB genere :' -ForegroundColor Green
    Write-Host $aabPath
  }
  else {
    Write-Warning 'Gradle OK mais fichier app-release.aab introuvable au chemin par defaut. Verifier flavors.'
  }

  exit 0
}
finally {
  if ($null -ne $__saveJavaToolOpts) {
    [Environment]::SetEnvironmentVariable('JAVA_TOOL_OPTIONS', $__saveJavaToolOpts, 'Process')
  }
  else {
    [Environment]::SetEnvironmentVariable('JAVA_TOOL_OPTIONS', $null, 'Process')
  }

  if ($null -ne $__saveUnderscoreJavaOpts) {
    [Environment]::SetEnvironmentVariable('_JAVA_OPTIONS', $__saveUnderscoreJavaOpts, 'Process')
  }
  else {
    [Environment]::SetEnvironmentVariable('_JAVA_OPTIONS', $null, 'Process')
  }
}
