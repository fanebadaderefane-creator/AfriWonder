# AfriWonder — Guide Test Appels sur APK Android

## 🎯 Objectif
Tester les appels audio/vidéo + incoming calls en background sur 2 vrais téléphones Android.

---

## 📋 Pré-requis

### 1. Organisation Expo (obligatoire depuis juin 2026)
- **Organisation** : `abdoulayefane-afriwonder-production` (ABDOULAYEFANE AFRIWONDER PRODUCTION)
- **Projet** : `afriwonder-production` (AfriWonder-Production)
- **Project ID** : `54406371-5aa5-4bf1-8f80-b64b9f1e72fc`
- **Ne plus utiliser** `global-production` ni `fanebadaderefane` — quotas builds gratuits épuisés.

### 1b. Signature Android prod (AAB Play Store)

**Certificat obligatoire** — FANE ABDOULAYE / FBF-GLOBAL :
- SHA-1 : `85:A5:AF:29:52:74:2F:0E:AE:D9:22:77:16:FB:29:CB:4A:AF:A8:CF`
- SHA-256 : `D5:E0:38:36:22:57:3F:9F:A6:A0:5B:30:2F:2E:29:B6:28:B0:F0:BF:77:92:33:D4:1E:0B:BF:85:E8:1B:09:16`

Interdit : `E9:26:B0:F2:…` (clé EAS auto-générée)

```bash
cd frontend
node scripts/install-android-prod-keystore.cjs --jks PATH --alias ALIAS --storepass PASS
npm run verify:android-signing
```

### 2. Outils locaux à installer (sur votre PC)
```bash
npm install -g eas-cli
eas login    # compte membre de abdoulayefane-afriwonder-production
cd frontend && npm run verify:eas-org
```

### 3. Configuration Render avant build
Allez sur **Render dashboard → AfriWonder backend → Environment** et ajoutez :

**Pour transcription + traduction :**
```
OPENAI_API_KEY=sk-...      # votre clé OpenAI
```

**Pour TURN (appels) — choisir UNE option (cf. GUIDE_TURN_SERVER.md) :**

Option A — Metered.ca free (recommandé) :
```
TURN_URL=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turn:openrelay.metered.ca:443?transport=tcp,turns:openrelay.metered.ca:443
TURN_SHARED_SECRET=<votre secret Metered>
TURN_REALM=openrelay.metered.ca
TURN_CREDENTIAL_TTL_SEC=3600
```

Puis : **Save → Render redéploie automatiquement (~2 min)**

---

## 🔨 Build APK dev-client

### Étape 1 : Push les changements sur GitHub
Depuis l'interface Emergent, cliquez sur **"Save to GitHub"** (en haut à droite).

### Étape 2 : Pull en local
```bash
cd ~/votre-dossier-AfriWonder
git pull
cd frontend
npm install   # ou yarn install
```

### Étape 3 : Lancer le build EAS
```bash
cd frontend
eas build --platform android --profile development
```

EAS va :
1. Uploader votre code à ses serveurs
2. Compiler un APK avec les modules natifs (`react-native-callkeep`, `@notifee/react-native`, `react-native-webrtc`, `react-native-vision-camera`)
3. Vous donner un lien de téléchargement (~15-20 min)
4. Vous pouvez aussi suivre sur https://expo.dev/accounts/abdoulaye_fane/projects/afriwonder/builds

### Étape 4 : Installer l'APK sur 2 devices Android
- Téléchargez le `.apk` depuis le lien
- Activez "Installer apps de sources inconnues" sur les téléphones
- Installez l'APK

---

## 🧪 Tests à réaliser

### Test 1 — Auth & navigation
1. Ouvrir l'app sur device 1 → vous connecter (utilisez vos identifiants Render prod)
2. Vérifier que l'inbox `/messages` charge la liste de discussions
3. Vérifier que l'onglet "Appels" affiche l'historique réel
4. Vérifier que `/messages` charge

### Test 2 — Appel audio 1-1 (même WiFi, app ouverte)
- Device A : ouvrir l'app, foreground sur `/messages`
- Device B : ouvrir l'app, foreground sur n'importe quel écran
- Device A : tap sur une conversation avec B → bouton 📞 → appel
- Device B : voit l'overlay `IncomingCallOverlay` → "Repondre"
- Vérifier : audio bidirectionnel marche, durée s'incrémente

### Test 3 — Appel vidéo 1-1
- Idem Test 2 mais bouton 📹
- Vérifier : vidéo bidirectionnelle, swap caméra avant/arrière marche, mute/unmute marche
- Vérifier dans les logs Metro/devtools : `[Call] Profile vidéo sélectionné medium TURN: true`

### Test 4 — Background incoming call (Notifee Android)
- Device A : appeler device B
- Device B : avoir l'app fermée (swipe out de la liste récente) → la notif full-screen doit apparaître avec sonnerie + boutons "Repondre"/"Refuser"
- Tap "Repondre" → l'app s'ouvre directement sur l'écran d'appel

### Test 5 — Réseau dégradé (data mobile vs WiFi)
- Device A sur WiFi, Device B sur 4G (data mobile désactivée WiFi)
- Lancer appel vidéo
- Vérifier : qualité adaptée (résolution moindre côté 4G)
- Couper le WiFi de A en pleine conversation → toast "Reseau change : CELLULAR" doit apparaître
- L'appel doit continuer (avec brève interruption)

### Test 6 — Carrier-grade NAT (Mali 4G ↔ France WiFi)
**Le test CRITIQUE — celui qui valide la prod Afrique.**
- Device 1 au Mali sur 4G Orange/Moov
- Device 2 en France sur WiFi (ou tout autre pays)
- Appel doit s'établir en <10s
- Si l'appel échoue : TURN mal configuré sur Render. Vérifier les logs côté backend.

### Test 7 — Note vocale + transcription + traduction
- Device A : tenir bouton micro dans une conversation → enregistrer 5s de bambara
- Envoyer
- Device B : long-press sur la bulle vocale → "Transcrire (IA)"
- Attendre, le texte apparaît
- Tap drapeau 🇫🇷 → traduction française
- Tap drapeau 🇬🇧 → traduction anglaise

---

## 🐛 Debug commun

### "Appel se termine immédiatement"
- TURN non configuré ou mauvais secret → check `curl ...turn-credentials` doit retourner `turnConfigured: true`

### "Incoming call ne s'affiche pas Android"
- Permission notif non accordée → réinstaller APK et accepter toutes les permissions
- Battery saver actif → mettre AfriWonder en "unrestricted" dans Battery settings
- Android 14+ : permission FULL_SCREEN_INTENT à activer manuellement dans Settings → AfriWonder → Notifications

### "Vidéo noire d'un côté"
- Permission caméra refusée → réinstaller ou activer dans paramètres
- VisionCamera config issue → check logs Metro

### "Transcription = 503 ou empty"
- `OPENAI_API_KEY` manquante ou expirée sur Render → vérifier dashboard

### "Traduction Bambara/Wolof ressemble à du français"
- C'est normal pour les premiers usages : GPT-5.2 connaît mais peut être prudent. Reformuler la transcription source aide.

---

## 📊 Métriques attendues (qualité prod)

| Test | Critère | Cible |
|------|---------|-------|
| Connexion appel | Temps avant son | < 5s |
| Connexion appel 4G | Temps avant son | < 10s |
| Cross-NAT (Mali ↔ FR) | Taux succès | > 90% avec TURN |
| Qualité audio 3G | Compréhensible | Opus 16-32 kbps |
| Qualité vidéo 4G | Fluidité | 640x480 @ 20+ fps |
| Background call notif | Délai affichage | < 2s |
| Bundle APK size | | < 80 MB |

---

## 🚀 Quand vous serez prêt pour la prod
- `eas build --platform android --profile production` → AAB pour Play Store
- `eas build --platform ios --profile production` → IPA pour App Store
- Configurer ASC App ID + Apple ID dans `eas.json` submit section

Bon test ! 📞
