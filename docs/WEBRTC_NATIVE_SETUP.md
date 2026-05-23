# WebRTC natif — Guide d'installation (Vague 7)

## Statut actuel

- Appels audio/vidéo **fonctionnels sur web** via socket.io signaling + WebRTC web natif du navigateur.
- Appels audio/vidéo **désactivés sur mobile natif** (flag `callsOnNative` à `false` par défaut sur natif, car `react-native-webrtc` n'est pas dans le bundle EAS standard).
- Le signaling (rooms, invites, raccroché) passe déjà par socket.io → **rien à recoder côté backend**.

## Ce qu'il reste à faire pour activer le natif

### 1. Installer la librairie

```bash
cd frontend
npm install react-native-webrtc@^124.0.0
```

### 2. Ajouter le config plugin Expo

Dans `frontend/app.json`, ajouter dans la liste `plugins` :

```json
"plugins": [
  // ... plugins existants ...
  [
    "react-native-webrtc/app.plugin.js",
    {
      "cameraPermission": "Autoriser AfriWonder à accéder à la caméra pour les appels vidéo.",
      "microphonePermission": "Autoriser AfriWonder à accéder au micro pour les appels audio/vidéo."
    }
  ]
]
```

Les permissions iOS `NSCameraUsageDescription` / `NSMicrophoneUsageDescription` sont **déjà présentes** dans `app.json`. Les permissions Android `CAMERA` / `RECORD_AUDIO` aussi.

### 3. Activer le flag

Dans le build EAS ou dans `.env` local :

```bash
EXPO_PUBLIC_ENABLE_NATIVE_CALLS=1
```

Ou secret EAS :

```bash
cd frontend
eas secret:create --scope project --name EXPO_PUBLIC_ENABLE_NATIVE_CALLS --value 1
```

### 4. Builder un dev-client EAS (obligatoire — Expo Go ne supporte pas WebRTC natif)

```bash
cd frontend
eas build --profile development --platform android
```

Attendre la fin du build, installer l'APK sur le device, et lancer `npm start` → scanner le QR depuis cette app dev-client (pas Expo Go).

### 5. Tester

- Se connecter avec 2 comptes sur 2 devices (ou 1 device + 1 web).
- Ouvrir une conversation → bouton appel vidéo.
- Vérifier que :
  - La caméra s'active (permissions demandées au 1er appel).
  - L'audio passe dans les deux sens.
  - Raccrocher ferme proprement le flux.

### 6. Production

Une fois testé en dev, rebuild production avec le flag actif :

```bash
cd frontend
eas build --profile production --platform android
```

## Fichiers concernés

- `frontend/src/services/webrtc*.ts` — modules WebRTC (signaling socket + peer connection).
- `frontend/app/messages/call.tsx` — UI d'appel entrant/sortant.
- `frontend/src/config/featureFlags.ts` — flag `callsOnNative`.

## Pourquoi je ne l'ai pas installé automatiquement

L'ajout de `react-native-webrtc` modifie le bundle natif Android/iOS :

- Augmente la taille de l'APK (~5-8 MB).
- Oblige à passer par EAS build (impossible avec Expo Go).
- Nécessite des credentials Google Play / Apple si tu veux publier.

Je ne déclenche pas tout ça sans ta validation explicite. Les 6 étapes ci-dessus sont à exécuter **quand tu es prêt pour un vrai dev-client**.

## Kill-switch d'urgence

Si les appels natifs posent problème en production, désactive sans re-builder :

```bash
eas secret:create --scope project --name EXPO_PUBLIC_ENABLE_NATIVE_CALLS --value 0 --force
eas update --branch production --message "Hotfix: disable native WebRTC"
```

L'app retombe automatiquement sur le mode signaling-only (l'UI reste, mais pas de flux média sur natif).
