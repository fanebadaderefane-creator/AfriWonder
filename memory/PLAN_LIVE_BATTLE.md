# AfriWonder — Lot 4 : Plan Live Battle 1v1 (future session)

## 🥊 Vision : Live Battle TikTok-style

Deux créateurs s'affrontent en duo split-screen :
- Audience vote en envoyant des cadeaux à l'un OU l'autre
- Une barre de score temps réel montre qui mène
- Round de 3 minutes (configurable)
- Gagnant désigné → animations + récompense XP/Stars

C'est l'une des features les plus virales de TikTok Live (revenu massif via gifts).

## 🛠️ Architecture technique nécessaire

### Backend (TypeScript Express)
1. **Modèle Prisma** :
```prisma
model LiveBattle {
  id              String   @id @default(uuid())
  challenger_id   String   // créateur qui lance
  opponent_id     String   // créateur qui accepte
  challenger_live_id String?
  opponent_live_id   String?
  status          String   // 'pending', 'active', 'ended', 'declined'
  duration_sec    Int      @default(180)
  challenger_score Int     @default(0)  // total gift coins
  opponent_score   Int     @default(0)
  winner_id       String?
  started_at      DateTime?
  ended_at        DateTime?
  created_at      DateTime @default(now())
  agora_channel_pk String? // Agora PK channel name
}
```

2. **Endpoints** :
- `POST /api/live/:id/battle/challenge` (body: opponentLiveId, duration)
- `POST /api/live/:id/battle/accept`
- `POST /api/live/:id/battle/decline`
- `POST /api/live/:id/battle/gift` (body: amount, side: 'challenger'|'opponent')
- `GET /api/live/:id/battle/current` (state polling)
- `POST /api/live/:id/battle/end`

3. **Socket events** :
- `battle:proposed` (au challenger)
- `battle:started` (aux deux lives + audiences)
- `battle:score-update` (toutes les 500ms)
- `battle:ended` (résultat final)

### Agora "PK Channel Media Relay"
Agora propose la feature `startChannelMediaRelay` qui permet à un broadcaster d'un channel A d'envoyer sa vidéo dans un channel B simultanément. C'est le mécanisme officiel pour les battles.

Endpoint Agora à utiliser :
- `RtcEngine.startOrUpdateChannelMediaRelay(config)` côté SDK natif
- Nécessite le token destination

Documentation : https://docs.agora.io/en/interactive-live-streaming/develop/channel-media-relay

### Frontend Mobile

1. **Bouton "Lancer un battle"** dans `/live/stream` (host menu)
   - Picker : liste des autres lives actifs OU recherche créateur
   - Confirm → POST challenge
   
2. **Notif au défié** : modal "X veut faire un battle, accepter ?"
   - Accept → POST accept → side-by-side instantané
   - Decline → POST decline
   
3. **Split-screen UI** : 
   - Local video à gauche (50% width)
   - Remote video (challenger Agora PK relay) à droite (50% width)
   - Bandeau score en haut : "Score 2400 | 3100 Score" avec barre de progression rouge/bleu
   - Compteur descendant 03:00 → 00:00

4. **Audience UX** :
   - Le viewer voit aussi le split-screen
   - Quand il envoie un gift, choisir le côté (challenger ou opponent)
   - Animations de support (cœurs, confettis)
   
5. **Fin de battle** :
   - Animation grandiose (crown, fireworks)
   - Loser doit faire une "punishment" (custom emoji/sticker au-dessus de sa caméra pendant 60s)
   - Stats post-battle (top supporters de chaque côté)

## 📊 Estimation effort

| Tâche | Effort | Priorité |
|-------|--------|----------|
| Modèle Prisma + migration | 30 min | P0 |
| Endpoints REST + sockets | 3h | P0 |
| Agora PK Channel Media Relay (native hook) | 4h | P0 |
| Split-screen UI mobile | 3h | P0 |
| Score bar + gift side-picker | 2h | P0 |
| Animations fin de battle | 1h | P1 |
| Punishment système | 2h | P2 |
| Replay battle avec scores | 2h | P2 |

**Total estimé : ~17h de dev** (deux sessions complètes)

## 🎁 Bonus revenu

Les battles sont la feature #1 de revenue sur TikTok Live :
- ARPU (Average Revenue Per User) ×3 à ×5 vs live solo
- Engagement (gifts/min) ×8 pendant un battle
- Effet réseau : les supporters viennent en masse

Si vous voulez maximiser le revenu Mobile Money (Orange Money/Wave) au Mali/Sénégal/CI, **c'est la feature à prioriser absolument**.

## Quand vouloir implémenter ce lot ?

Idéalement après :
1. ✅ Vos premiers utilisateurs ont testé les lives "classiques" (sessions 1-7)
2. ✅ Les cadeaux Mobile Money sont validés (flux paiement OK)
3. ✅ Vous avez >5-10 créateurs actifs réguliers (pour avoir un pool de "challengers")

Sans cette masse critique, les battles ne se déclenchent pas et la feature reste morte.

## Next session : on attaque le battle dès que vous donnez le GO.
