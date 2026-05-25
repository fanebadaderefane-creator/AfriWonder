# AfriWonder — Guide TURN Server (Lot 2 Appels)

Pour que les appels audio/vidéo fonctionnent de manière fiable au Mali, Sénégal, Côte d'Ivoire,
un **serveur TURN** est obligatoire. Sans TURN, ~30-40% des appels échouent silencieusement à cause
du Carrier-Grade NAT des opérateurs mobiles (Orange ML, Free SN, Moov CI, MTN, etc).

## Options de serveur TURN (du moins cher au plus pro)

### Option 1 — Metered.ca (GRATUIT 50 GB/mois) ⭐ RECOMMANDÉ pour démarrer
- URL : https://www.metered.ca/tools/openrelay/
- Tier gratuit : 50 GB/mois (~1500 minutes d'appel audio HD ou ~300 min vidéo HD)
- Free tier suffit pour 100-200 utilisateurs actifs/jour
- Inscription : 2 min, pas de carte bancaire
- Variables à ajouter sur Render :
  ```
  TURN_URL=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turn:openrelay.metered.ca:443?transport=tcp,turns:openrelay.metered.ca:443
  TURN_SHARED_SECRET=<récupéré sur dashboard metered>
  TURN_REALM=openrelay.metered.ca
  TURN_CREDENTIAL_TTL_SEC=3600
  ```

### Option 2 — Twilio Network Traversal Service (PAYANT $0.40/GB)
- URL : https://www.twilio.com/stun-turn
- Fiable, multi-régions (Afrique routée via Europe)
- Variables sur Render :
  ```
  TURN_URL=turn:global.turn.twilio.com:3478?transport=udp,turn:global.turn.twilio.com:3478?transport=tcp,turn:global.turn.twilio.com:443?transport=tcp
  TURN_SHARED_SECRET=<auth_token Twilio>
  TURN_REALM=twilio.com
  ```

### Option 3 — Coturn auto-hébergé (DigitalOcean Frankfurt ~5$/mois)
- VPS DigitalOcean Frankfurt FRA1 (latence acceptable pour AF Ouest)
- Install : `apt install coturn` + config `/etc/turnserver.conf`
- Avantage : illimité, sous contrôle total
- Variables sur Render :
  ```
  TURN_URL=turn:<votre-ip-vps>:3478,turn:<votre-ip-vps>:5349?transport=tcp
  TURN_SHARED_SECRET=<votre secret>
  TURN_REALM=afriwonder.com
  ```

### Option 4 — Xirsys (PAYANT, scaling Afrique)
- URL : https://xirsys.com/
- Bon pour gros volumes, géoblock région Afrique disponible

## Comment vérifier que ça marche

Une fois le TURN configuré sur Render :
```bash
# Avec un access token valide
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://afriwonder.onrender.com/api/proxy/calls/turn-credentials
```

Réponse attendue :
```json
{
  "success": true,
  "data": {
    "urls": ["turn:..."],
    "username": "1234567890:user_id",
    "credential": "base64hash...",
    "expiresAt": 1234567890000,
    "ttlSec": 3600,
    "realm": "openrelay.metered.ca",
    "publicStun": ["stun:stun.l.google.com:19302", ...],
    "turnConfigured": true
  }
}
```

Si `turnConfigured: false` → TURN pas encore configuré, mais l'appel marchera quand même
sur réseaux ouverts grâce aux STUN publics.

## Tests recommandés sur device réel

1. **Test 1 - Même WiFi** : 2 téléphones sur même WiFi → appel doit marcher (STUN suffit)
2. **Test 2 - WiFi vs 4G** : 1 phone WiFi, 1 phone 4G Mali → TURN obligatoire
3. **Test 3 - 4G vs 4G** : 2 phones sur 4G du même opérateur → TURN obligatoire
4. **Test 4 - Roaming** : 1 phone en France WiFi, 1 phone Mali 4G → TURN obligatoire

## Optimisations Afrique de l'Ouest déjà intégrées dans l'app

### Bande passante adaptative (auto)
- 2G/3G → Vidéo 320x240 @ 15fps, bitrate max 200 kbps
- 4G mobile → Vidéo 640x480 @ 24fps, bitrate max 500 kbps
- WiFi / Ethernet → Vidéo HD 1280x720 @ 30fps, bitrate max 1.5 Mbps

### Audio
- Suppression de bruit activée (marchés, motos, taxis)
- Echo cancellation + Auto Gain Control
- Compression Opus 16-32 kbps suffit en 2G

### Réseau
- STUN multiples (Google + Cloudflare + Twilio) — résilience NAT
- ICE candidate pool = 4 (connexion plus rapide)
- Bundle policy max-bundle — moins de ports ouverts requis
- Détection changement réseau (WiFi → 4G handover) avec notification utilisateur
- Watchdog 15s : si connexion échoue, retry auto

## Coûts estimés pour 1000 utilisateurs actifs (Mali/Sénégal/CI)

Hypothèses : 50% utilisent appels, 30 min/jour/utilisateur, audio principalement.
- Metered Free : OK jusqu'à ~150 utilisateurs actifs/jour
- Au-delà : Metered Pro 30$/mois jusqu'à 200 GB
- Twilio : ~120$/mois pour 1000 utilisateurs (300 GB)
- Coturn DO 4GB RAM : ~24$/mois illimité (recommandé pour scaling)

## Next steps après config TURN

1. Faire un EAS Build dev-client Android
2. Installer APK sur 2 devices (idéalement 1 en France + 1 au Mali sur 4G)
3. Tester appel audio puis vidéo
4. Vérifier dans les logs Metro : `[Call] Profile vidéo sélectionné medium TURN: true`
