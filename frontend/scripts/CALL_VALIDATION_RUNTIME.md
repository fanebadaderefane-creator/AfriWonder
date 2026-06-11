# Validation runtime appels — build callDiagnostic (versionCode 26)

## 1. Générer l'APK diagnostic (EAS)

Depuis la machine avec accès à l’organisation Expo **`global-production`** :

```powershell
cd frontend
git rev-parse HEAD
eas build -p android --profile callDiagnostic --non-interactive
```

Enregistrer :
- **Build ID EAS** (URL expo.dev)
- **Commit** : sortie de `git rev-parse HEAD`

`versionCode` attendu : **26** (> 25 Play Store publié).

Variables actives : `EXPO_PUBLIC_CALL_DEBUG=1`.

## 2. Installer sur 2 téléphones

Télécharger l'APK depuis le lien EAS → installer (sources inconnues autorisées).

Comptes test :
- A : abdoulayefane813@gmail.com
- B : badadereadama3@gmail.com

## 3. Matrice des 8 scénarios

Pour chaque ligne : lancer l'appel, attendre connexion ou échec, exporter les logs.

| # | Mode | Réseau A | Réseau B | Fichier log A | Fichier log B |
|---|------|----------|----------|---------------|---------------|
| 1 | vocal | Wi-Fi | Wi-Fi | s01-a.log | s01-b.log |
| 2 | vocal | Wi-Fi | 4G | s02-a.log | s02-b.log |
| 3 | vocal | 4G | 4G | s03-a.log | s03-b.log |
| 4 | vidéo | Wi-Fi | Wi-Fi | s04-a.log | s04-b.log |
| 5 | vidéo | Wi-Fi | 4G | s05-a.log | s05-b.log |
| 6 | vidéo | 4G | 4G | s06-a.log | s06-b.log |

## 4. Capturer Logcat (USB ou Wi-Fi adb)

```powershell
adb devices
adb logcat -c
# Lancer l'appel maintenant
adb logcat -d | findstr /i "AFW_CALL" > s01-a.log
```

Répéter pour le 2e téléphone (autre câble ou `adb -s SERIAL`).

## 5. Valider automatiquement

```powershell
cd frontend
node scripts/validate-afw-call-log.cjs s01-a.log s01-b.log
```

Critères **PASS** par scénario (2 logs) :
- Présents : turn_config, pc_created, sdp_send, sdp_remote, ice_local, ice_state, media_connected
- Absents : signal_failed, ice_remote_failed, ice_state failed
- ice connected + media_connected sur les deux

## 6. GO publication Play Store

Uniquement si **les 6 scénarios × 2 téléphones = 12 logs** passent `validate-afw-call-log.cjs`.

Ensuite build production :

```powershell
eas build -p android --profile production
```

Mettre à jour `MOBILE_ANDROID_LATEST_VERSION_CODE=26` sur Render.
