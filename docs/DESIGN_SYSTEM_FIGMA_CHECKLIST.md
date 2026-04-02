# Design system Figma — checklist audit Phase 1

Objectif : un **fichier Figma unique** « AfriWonder Design System » (composants, typo, couleurs, espacements, états) aligné sur les tokens web (`src/styles/audit-design-tokens.css`, `docs/DESIGN_TOKENS_UI.md`).

## À produire dans Figma

- [ ] **Couleur primaire** bleue (alignée produit — ne pas changer sans validation).
- [ ] **Sémantique** : succès, avertissement, erreur, info (dark + light).
- [ ] **Typographie** : échelles (display, titre, corps, légende), graisses.
- [ ] **Rayons / ombres** : cohérents avec `--radius` (12px) et élévations PWA.
- [ ] **Composants** : boutons (variants), champs formulaire, cartes, modales, navigation, feed vidéo (HUD minimal).
- [ ] **Grilles** : mobile 360–430px, tablette, desktop ; safe areas.
- [ ] **Icônes** : jeu unique (ex. Lucide mapping) + tailles.

## Lien & handoff

- [ ] Publier le fichier Figma (lecture équipe + dev).
- [ ] Renseigner l’URL dans **`.env` racine** : `VITE_FIGMA_DESIGN_SYSTEM_URL=...` (voir `.env.example`).
- [ ] Optionnel : **Code Connect** ou lien vers Storybook si ajouté plus tard.

## Hors périmètre Figma (code déjà présent)

- Tokens CSS d’audit, PWA manifest, règles accessibilité Lighthouse — maintenus dans le repo.
