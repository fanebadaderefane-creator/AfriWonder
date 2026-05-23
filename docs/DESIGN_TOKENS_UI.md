# Design tokens UI — AfriWonder (Web + Mobile)

Cohérence visuelle entre la PWA (`src/`) et l’app Flutter (`flutter_app/`). **Couleur de l'application complète : BLEU.** Vision et CDC : `docs/VISION_ET_ARCHITECTURE_CIBLE.md`.

## Couleurs

| Usage | Web (Tailwind / CSS) | Mobile (RN) | Hex |
|--------|----------------------|-------------|-----|
| **Primary (marque)** | `blue-500` / `blue-600` | `#2563eb` | #2563eb |
| **Onglet actif** | `text-white` | `#F9FAFB` | #F9FAFB |
| **Onglet inactif** | `text-white/60` ou `text-gray-400` | `#9CA3AF` | #9CA3AF |
| **Like (aimé)** | `text-red-500` / `fill-red-500` | `#ef4444` | #ef4444 |
| **Saved (sauvegardé)** | `text-yellow-400` / `fill-yellow-400` | `#FBBF24` | #FBBF24 |
| **Soutenir / tip** | `text-yellow-400` | `#FBBF24` | #FBBF24 |
| **Barre de progression** | primary bleu | `#2563eb` | #2563eb |
| **Fond feed / cards** | `#020617` / `bg-slate-950` | `#020617` | #020617 |
| **Barre d’onglets** | `bg-black/50` ou `#0a0a0a` | `#0a0a0a` | #0a0a0a |

## Icônes (même sémantique)

| Action | Web (Lucide) | Mobile (Ionicons) |
|--------|--------------|-------------------|
| Retour | `ArrowLeft` | `arrow-back` |
| Accueil | `Home` | `home-outline` |
| Découvrir | `Compass` | `compass-outline` |
| Créer | `PlusSquare` | `add` / `add-circle-outline` |
| Live | `Radio` | `radio-outline` |
| Profil | `User` | `person-outline` |
| Recherche | `Search` | `search-outline` |
| Notifications | `Bell` | `notifications-outline` |
| Like | `Heart` | `heart` / `heart-outline` |
| Commentaires | `MessageCircle` | `chatbubble-ellipses-outline` |
| Partager | `Share2` | `share-social-outline` |
| Sauvegarder | `Bookmark` | `bookmark` / `bookmark-outline` |
| Son | `Volume2` / `VolumeX` | `volume-high-outline` / `volume-mute-outline` |
| Soutenir | `DollarSign` | `currency-usd` (MaterialCommunityIcons) |

## Boutons

- **Primaire (CTA)** : fond bleu (`#2563eb`), texte blanc. Sur web, utiliser `bg-primary` (CSS var) ou `blue-500`/`blue-600`.
- **Flèche retour** : en haut à gauche, `ArrowLeft` / `arrow-back`, `aria-label="Retour"`, `navigate(-1)` ou `navigation.goBack()`. Sur fond sombre : icône blanche (`#F9FAFB`) ; sur fond clair : bleu (`#2563eb`).
- **Create (bottom nav)** : bouton bleu (web : gradient blue-600→700 ; mobile : `#2563eb`), icône blanche.

## Ordre des actions (VideoCard)

1. Avatar créateur  
2. Like (cœur)  
3. Commentaires  
4. Partager  
5. Sauvegarder  
6. Son (mute/unmute)  
7. Soutenir (optionnel)

Taille d’icône d’action : ~24–28px (web `w-7 h-7` = 28px, mobile 24–26).
