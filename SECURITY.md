# Politique de sécurité — AfriWonder

## Signaler une vulnérabilité

Ne pas ouvrir d’issue publique GitHub pour des failles sensibles.

- Écrire à l’équipe produit / technique avec le détail reproduit, impact estimé et version concernée.
- Réponse visée sous **72 h ouvrées** (accusé de réception).

## Bonnes pratiques dépôt (audit Phase 1)

- Secrets : **Doppler** ou gestionnaire équivalent ; jamais de clés dans le code ou des commits.
- CI : workflow **detect-secrets** (`.github/workflows/detect-secrets.yml`) + baseline `.secrets.baseline`.
- GitHub (org ou repo) : **Settings → Code security** — activer **Secret scanning** (et **Push protection** pour bloquer les commits contenant des secrets connus).
- **Dependabot alerts** + **Code scanning** (workflow `codeql.yml` présent) — à vérifier comme activés sur le dépôt.

## Périmètre

Ce canal concerne la webapp (Vite), l’API Node (backend) et l’infrastructure documentée (`render.yaml`, Vercel). Les rapports hors périmètre (spam, demandes de fonctionnalités) seront redirigés vers le support produit.
