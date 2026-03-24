# Feed fullscreen — stabilité premium

Objectif : éviter toute impression d'écran noir, de carte trop étroite, ou de transition "pas prête" sur le feed vidéo fullscreen, surtout en Android WebView / PWA / Firefox.

## Invariants à préserver

- Colonne feed pilotée par le viewport dans `src/pages/Home.jsx`
  - `width: min(100vw, 400px)`
  - `minWidth: min(100vw, 400px)`
  - `maxWidth: 400px`
- Conteneur scroll du feed en flux normal
  - `relative w-full h-full`
  - `minHeight: 100dvh`
- Slides fullscreen
  - `height: 100dvh`
  - `scrollSnapAlign: start`
  - `scrollSnapStop: always`
- Pas de couche UI fullscreen extrême au-dessus du player dans `src/components/video/VideoCard.jsx`
- Pas de `absolute inset-0` réintroduit sur le conteneur scroll du feed

## Préparation visuelle minimale

- Précharger le poster de la slide active et des slides voisines
- Préparer les vidéos voisines avant le swipe
- Ne pas vider tout le buffer de préchauffage à chaque changement d'index
- Garder un poster ou un fond visuel stable tant que la première frame n'est pas peinte

## Garde-fous PWA / WebView

- Ne pas forcer un reload service worker en pleine session feed sur mobile standalone
- Réutiliser un seul service worker principal pour éviter les conflits de scope
- Tester explicitement Android WebView / PWA, pas seulement Chrome desktop

## Checklist anti-régression

1. Ouverture à froid : aucune zone noire visible avant la première frame.
2. Premier scroll : la slide suivante apparaît déjà préparée.
3. 5 à 10 swipes rapides : pas de carte étroite, pas de flash noir.
4. Retour onglet / retour navigation : pas de reprise sur fond noir.
5. PWA standalone Android : pas de reload brutal pendant une session feed.
6. Firefox desktop/mobile : largeur de la carte correcte et player visible.

## Si le bug revient

Vérifier d'abord :

- largeur réelle de la colonne du feed
- positionnement du conteneur scroll
- couches CSS au-dessus du player
- service worker / reload PWA

Ne pas commencer par modifier la logique de lecture vidéo tant que ces points ne sont pas exclus.
