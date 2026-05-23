# AfriWonder — Guide Live Streaming Agora (Lot 3)

## 🎥 Architecture Live actuelle (déjà 95% en place)

Votre repo contient une implémentation Live très complète :

### Backend TypeScript Express
- `/api/live/categories`, `/api/live/discovery`, `/api/live/recommendations`
- `/api/live/start`, `/api/live/:id/end`, `/api/live/:id/join`, `/api/live/:id/leave`, `/api/live/:id/heartbeat`
- `/api/live/:id/token`, `/api/live/:id/agora-token` (sécurisé, role broadcaster/audience)
- `/api/live/:id/chat`, `/api/live/:id/like`, `/api/live/:id/tip`
- `/api/live/:id/gift`, `/api/live/:id/gifts/catalog`, `/api/live/:id/top-donors`
- `/api/live/:id/poll`, `/api/live/:id/poll/vote`
- `/api/live/:id/cohost/invite`, `/api/live/:id/cohost/accept`, `/api/live/:id/raise-hand`
- `/api/live/:id/captions`, `/api/live/:id/replay-chat`
- `/api/live/wallet/*` (recharge Mobile Money)
- `/api/live/agora-status` (santé serveur Agora)

### Frontend Mobile
- `/live/start` — formulaire pré-broadcast (titre, catégorie, tags)
- `/live/stream` — UI broadcaster (1967 lignes — co-host, gifts, polls, beauty, switch caméra, chat host)
- `/live/[id]` — UI viewer (1500 lignes — chat, gifts, follow, share, raise-hand, geo restrictions, age gate)
- `/live/gifts` — catalogue cadeaux + animations
- `/live/replay` — replay avec chat sync
- `/live/analytics` — stats créateur
- `/live/coin-recharge-mm` — recharge Mobile Money (Orange Money / Wave)

### Hook Agora Native
- `src/hooks/useAgoraLiveRtc.native.tsx` (429 lignes)
  - Auto-quality 360p / 540p / 720p selon NetInfo
  - Beauty filter
  - Camera flip
  - Co-host support (5 cells max)
  - Network tier detection (2G/3G/4G/WiFi)

## 🎯 Ajout cette session (Lot 3)

### TikTok-like Floating Hearts ❤️
**Nouveau composant** : `src/live/FloatingHeartsBurst.tsx`
- Animation cœur qui monte avec balancier + fade
- Palette couleurs Afrique (orange, rouge, jaune, rose, cyan, violet)
- Cap 50 cœurs simultanés (perf protection)
- useNativeDriver (60fps)

**Wiring viewer (`/live/[id]`)** :
- Zone tap invisible à droite de l'écran (100×280 px, bottom: 100)
- Tap = cœur monte + accumule pour envoi groupé au backend toutes les 1.2s
- Émet aussi via socket `live:hearts` → autres viewers voient des cœurs

**Wiring host (`/live/stream`)** :
- Le broadcaster voit les cœurs de son audience en temps réel
- Listener socket → burst depuis le bord droit

**Backend** (`src/index.ts`) :
- Socket relay event `live:hearts` à tous les viewers du stream
- Rate-limit : 30 events/min/socket (anti-spam)

## ⚙️ Configuration Render requise pour Live

```env
# Agora — créer un compte sur https://console.agora.io
AGORA_APP_ID=<votre App ID>
AGORA_APP_CERTIFICATE=<votre App Certificate>

# Optionnel : limites de qualité par utilisateur
LIVE_DEFAULT_VIDEO_QUALITY=540p  # ou auto

# Storage uploads (déjà configuré probablement)
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

## 💰 Coût Agora estimé pour vos cibles (Mali/Sénégal/CI)

Tarification 2026 :
- **Audio uniquement** : ~$0.99 / 1000 min
- **Video HD** : ~$3.99 / 1000 min  
- **Cloud Recording** : ~$1.49 / 1000 min (optionnel)

Pour 1000 utilisateurs actifs (50% font lives, 20 min/jour) :
- Trafic estimé : 300 000 min/mois
- Coût Agora : ~$300-500/mois en vidéo HD
- Beaucoup moins si majorité en 360p/540p (auto-quality déjà actif)

## 🚀 Fonctionnalités TikTok-like déjà présentes

| Feature | Status | Fichier |
|---------|--------|---------|
| Broadcast vidéo HD | ✅ | `app/live/stream.tsx` + `useAgoraLiveRtc` |
| Audience join/leave | ✅ | `app/live/[id].tsx` |
| Chat en temps réel | ✅ | Socket.IO |
| Cadeaux animés | ✅ | `app/live/gifts.tsx` + `useGiftAnimations` |
| Top fans / donors | ✅ | `_liveTopFansSheet.tsx` |
| Follow during live | ✅ | Bouton Wonder |
| Share natif + WhatsApp + Facebook | ✅ | `shareLive*` functions |
| Polls / sondages | ✅ | `LivePollStrip` |
| Co-host / multi-host | ✅ | `cohostStripViewer`, `inviteCohost` |
| Raise-hand audience → host | ✅ | `raiseHand`, `respondRaiseHandHost` |
| Captions broadcast (sous-titres host) | ✅ | `liveStt.service` |
| Beauty filter | ✅ | `beautyEnabled` flag |
| Switch caméra avant/arrière | ✅ | `cameraFlipNonce` |
| Auto-quality (360/540/720) | ✅ | `networkTierFromNetInfo` |
| Geo restrictions | ✅ | `resolveLiveJoinGeo` |
| Age gate (18+) | ✅ | `ageRestriction` + `ageGateOk` |
| Picture-in-Picture | ✅ | `tryEnterPictureInPicture` |
| Replay avec chat sync | ✅ | `app/live/replay.tsx` |
| Analytics créateur | ✅ | `app/live/analytics/` |
| Wallet + Mobile Money recharge | ✅ | `coin-recharge-mm.tsx` |
| **❤️ Floating hearts TikTok-like** | ✅ **AJOUTÉ** | `FloatingHeartsBurst.tsx` |
| **❤️ Socket hearts broadcast** | ✅ **AJOUTÉ** | `index.ts` |

## ❌ Fonctionnalités TikTok pas encore présentes

- Swipe up/down → live suivant (Reels-style navigation)
- Stickers AR / Lenses (nécessite Banuba SDK ou ARKit/ARCore custom)
- Live shopping intégré (déjà partial via `LiveStreamProduct`)
- Live battle (1v1 host battles)

Ces features sont des opportunités futures.

## 📋 Test Live sur APK (après EAS Build)

### Test 1 — Démarrer un live
- Device A : `/live/start` → titre + catégorie + GO LIVE
- Vérifier : caméra s'ouvre, qualité 540p en 4G

### Test 2 — Joindre un live (viewer)
- Device B : ouvrir l'app, voir le live de A dans la liste
- Tap → ouvre `/live/[id]` → vidéo + chat
- Envoyer message dans le chat → apparaît côté A

### Test 3 — Floating hearts ❤️ TikTok
- Sur device B (viewer) : tap rapide à droite de l'écran (zone invisible)
- Vérifier : cœurs colorés montent
- Sur device A (host) : cœurs apparaissent aussi
- Vérifier dans le backend log : `live:hearts` reçu et relayé

### Test 4 — Cadeau
- Device B : bouton 🎁 → choisir cadeau → envoyer
- Vérifier : animation côté B ET côté A, balance déduite

### Test 5 — Co-host
- Device A invite Device B → notification raise-hand
- B accepte → vidéo de B apparaît en grille à côté de A

### Test 6 — Réseau dégradé (handover)
- A en live sur WiFi, débrancher → bascule sur 4G
- Vérifier : qualité descend auto à 360p, pas de gel

## Next Action Items
1. User : Save to GitHub
2. User : Configure `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` sur Render
3. User : `eas build --platform android --profile development` (si pas déjà fait)
4. User : Tester les 6 scenarios Live ci-dessus
5. Bonus : si tout marche, on peut faire le **Lot 4** : swipe-to-next-live, live battles, live shopping
