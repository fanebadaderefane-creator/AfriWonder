# AfriWonder Flutter App

Base Flutter officielle pour atteindre la parité produit utilisateur avec la PWA.

## Objectif

`flutter_app/` réutilise le backend existant et couvre désormais les domaines principaux suivants :

- authentification et reprise de session
- feed, découverte, recherche et profil
- messagerie, groupes et appels directs
- live viewer et live host
- marketplace, panier, checkout et commandes
- notifications, settings, wallet, privacy, legal, support et offline center

## Lancer le projet

```bash
cd flutter_app
flutter pub get
flutter run
```

## Configuration locale

Créer `flutter_app/.env` à partir de `.env.example`.

Exemple :

```env
API_URL=http://10.0.2.2:3000/api
SOCKET_URL=http://10.0.2.2:3000
AGORA_APP_ID=YOUR_AGORA_APP_ID
```

Notes :

- Android emulator : `10.0.2.2`
- iOS simulator : `http://127.0.0.1:3000/api`
- appareil réel : IP locale de votre machine

## Socle technique

- `dio` pour l’API REST et le refresh token
- `socket_io_client` pour le temps réel
- `firebase_messaging` pour le push natif
- `agora_rtc_engine` pour le live et les appels
- `flutter_secure_storage` pour la session
- `go_router` pour la navigation
- `flutter_riverpod` pour l’état applicatif

## Références

- `docs/mobile/FLUTTER_MVP_CONTRACT_MATRIX.md`
- `docs/mobile/FLUTTER_FOUNDATION_ARCHITECTURE.md`
- `docs/mobile/BACKEND_MOBILE_API_SPEC.md`
- `docs/mobile/FLUTTER_MIGRATION_ROLLOUT.md`
