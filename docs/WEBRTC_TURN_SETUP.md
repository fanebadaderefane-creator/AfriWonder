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

## 5. Variables a configurer dans Afriwonder (frontend)

Dans `.env.local` (dev) et dans variables d'environnement production:

```env
VITE_TURN_URL=turns:turn.afriwonder.com:5349?transport=tcp
VITE_TURN_USERNAME=afriwonder
VITE_TURN_CREDENTIAL=CHANGE_ME_STRONG_PASSWORD
```

Puis redemarrer le frontend.

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
- plusieurs serveurs TURN (HA / regional)

