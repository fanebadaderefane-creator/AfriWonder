# WebRTC TURN Setup (Afriwonder Calls)

Ce guide active la partie la plus importante pour les appels vocaux/video sur mobile:
un serveur TURN, pour que deux telephones puissent se connecter meme derriere NAT/4G/5G strict.

## 1. Pourquoi TURN est obligatoire

- STUN seul fonctionne sur certains reseaux.
- Sur beaucoup de reseaux mobiles/opérateurs, sans TURN l'appel ne passe pas ou coupe vite.
- TURN relaie le media quand le peer-to-peer direct est bloque.

## 2. Deployer coturn rapidement (Docker)

Exemple minimal sur un serveur Linux public (VPS):

```bash
docker run -d --name afriwonder-coturn \
  --restart unless-stopped \
  -p 3478:3478/tcp \
  -p 3478:3478/udp \
  -p 5349:5349/tcp \
  -p 5349:5349/udp \
  -p 49152-65535:49152-65535/udp \
  instrumentisto/coturn \
  -n \
  --log-file=stdout \
  --lt-cred-mech \
  --fingerprint \
  --realm=turn.afriwonder.com \
  --user=afriwonder:CHANGE_ME_STRONG_PASSWORD \
  --external-ip=YOUR_PUBLIC_IP \
  --listening-port=3478 \
  --tls-listening-port=5349
```

Remplacer:
- `turn.afriwonder.com` par ton sous-domaine TURN
- `CHANGE_ME_STRONG_PASSWORD` par un mot de passe fort
- `YOUR_PUBLIC_IP` par IP publique du serveur

## 3. DNS et reseau

- Creer un A record: `turn.afriwonder.com -> IP_SERVEUR`
- Ouvrir firewall:
  - `3478/tcp`, `3478/udp`
  - `5349/tcp`, `5349/udp`
  - plage UDP media: `49152-65535/udp`

## 4. TLS recommande

Pour les navigateurs modernes, preferer TURN TLS:

- `turns:turn.afriwonder.com:5349?transport=tcp`

Tu peux ajouter certificats LetsEncrypt dans coturn pour production.

## 5. Variables d'environnement

### Backend (Render / VPS) — **obligatoire pour mobile + PWA**

Les clés TURN **ne vont pas dans l'APK Expo**. L'app mobile appelle `GET /api/proxy/calls/turn-credentials` (JWT) ; le backend renvoie STUN + TURN temporaires.

Dans `backend/.env` (production Render) :

```env
# Option A — Metered.ca (recommandé, déjà utilisé si METERED_TURN_API_KEY est défini)
METERED_TURN_DOMAIN=afriwonder.metered.live
METERED_TURN_API_KEY=<clé dashboard Metered>

# Région TURN — OBLIGATOIRE pour Maroc ↔ Mali (pas de rebuild APK)
# Défaut backend si absent : afriwonder (eu-west-1 + eu-central-1 + repli global)
METERED_TURN_REGION=afriwonder
# Override fin : METERED_TURN_RELAY_HOSTS=eu-west-1.relay.metered.ca,eu-central-1.relay.metered.ca

# Option B — coturn self-hosted (VPS EU/FR — OVH, Scaleway…)
TURN_URL=turn:turn.afriwonder.com:3478?transport=udp,turn:turn.afriwonder.com:3478?transport=tcp,turns:turn.afriwonder.com:5349?transport=tcp
TURN_USERNAME=afriwonder
TURN_CREDENTIAL=CHANGE_ME_STRONG_PASSWORD
TURN_REALM=turn.afriwonder.com

# CORS + Socket.io (Maroc ↔ Mali — domaines prod)
CORS_ORIGIN=https://afri-wonder.vercel.app,https://afriwonder.app,https://afriwonder.com
# Multi-instances Render (optionnel mais recommandé si scale)
REDIS_URL=redis://...
```

### PWA Vite uniquement (racine `src/`) — optionnel

Si la PWA n'utilise pas encore l'API turn-credentials :

```env
VITE_TURN_URL=turns:turn.afriwonder.com:5349?transport=tcp
VITE_TURN_USERNAME=afriwonder
VITE_TURN_CREDENTIAL=CHANGE_ME_STRONG_PASSWORD
```

### Expo mobile (`frontend/`)

**Ne pas** définir `EXPO_PUBLIC_TURN_*`. Seule variable critique :

```env
EXPO_PUBLIC_BACKEND_URL=https://afriwonder.onrender.com
```

Puis redéployer le backend (TURN) et reconstruire l'APK si l'URL backend change.

## 6. Tests rapides

1. Ouvrir 2 comptes (2 telephones ou 2 navigateurs differents).
2. Lancer appel depuis chat.
3. Accepter sur le destinataire.
4. Verifier audio bidirectionnel.
5. Verifier video bidirectionnelle.
6. Verifier raccrocher synchronise.

## 7. Debug si echec

- Verifier que les ports TURN sont vraiment ouverts.
- Verifier credentials TURN.
- Verifier que `VITE_TURN_*` est bien charge (redemarrage requis).
- Essayer `turn:` (3478) puis `turns:` (5349).

## 8. Note production

Pour un usage intensif, prevoir:
- monitoring bande passante TURN
- rotation des credentials
- **Région TURN** : `METERED_TURN_REGION=afriwonder` sur Render (eu-west-1 + eu-central-1) — voir `backend/src/services/meteredTurnRegions.ts`

### Maroc ↔ Mali sans rebuild APK

Les credentials TURN sont récupérés **à chaque appel** via l'API backend. Il suffit de :

1. Ajouter sur **Render** : `METERED_TURN_REGION=afriwonder`
2. Redéployer le **backend** (pas l'APK)
3. Vérifier : `node scripts/test-turn-credentials-decisive.mjs` → URLs contenant `eu-west-1.relay.metered.ca`

Metered n'a pas de PoP Afrique de l'Ouest ; `fr` + `eu-west` minimisent la latence vs `global` (Canada).

