# Prisma : drift et bonnes pratiques migrations

## Ce qui s’est passé

1. **`npx prisma migrate deploy`** a réussi : les migrations `20260311100000_video_hls_url_transcoding` et `20260315000000_superapp_partial_absent_features` sont bien appliquées sur la base (Supabase).
2. Ensuite, **`npx prisma migrate dev`** a signalé un **drift** : la base réelle ne correspond plus exactement à ce que l’historique des migrations “attend”.

C’est normal si :
- la base a été modifiée en dehors de Prisma (Supabase, SQL manuel, autres migrations),
- certaines migrations ont été modifiées après avoir été appliquées,
- des tables/colonnes existent en base mais pas dans les fichiers de migration (ex. anciennes migrations manuelles ou schéma dérivé).

## À ne pas faire

- **Ne pas lancer `prisma migrate reset`** sur une base de production ou contenant des données à garder : cette commande **supprime toutes les données** puis réapplique les migrations depuis zéro.

## Bonnes pratiques

### En production / base partagée (ex. Supabase)

- Utiliser **uniquement** :
  ```bash
  npx prisma migrate deploy
  ```
- Ne pas utiliser `migrate dev` sur cette base. Réserver `migrate dev` à un environnement local dont la base est dédiée au dev et peut être resetée si besoin.

### Pour le développement local

- Soit tu travailles avec une **copie locale** de la base (ou une DB locale vide) : tu peux y lancer `migrate dev` et éventuellement `migrate reset` si tu veux repartir de zéro.
- Soit tu pointes vers la même base que la prod/staging : dans ce cas, **n’utilise que `migrate deploy`** et ignore le drift pour `migrate dev` (ou évite de lancer `migrate dev` sur cette URL).

### Si tu vois “Drift detected”

- **Tu ne veux pas perdre les données** : ne pas reset. Continuer à appliquer les nouvelles migrations avec `migrate deploy`. Le drift signifie seulement que l’historique des migrations et l’état réel de la base divergent (tables/colonnes/index en plus ou en moins par rapport aux fichiers).
- **Synchroniser le schéma Prisma avec la base réelle** (optionnel) :
  ```bash
  npx prisma db pull
  ```
  Cela met à jour `schema.prisma` à partir de la base. À utiliser avec précaution (vérifier les diff avant de committer).

## Résumé

| Commande | Usage |
|----------|--------|
| `npx prisma migrate deploy` | À utiliser pour appliquer les migrations sur la base Supabase (ou toute base “réelle”). **C’est la commande à utiliser après avoir ajouté une nouvelle migration.** |
| `npx prisma migrate dev` | Pour le dev local : crée des migrations et les applique. À éviter sur une base qui a du drift ou qui est partagée avec la prod. |
| `npx prisma migrate reset` | Réinitialise la base (supprime tout) et réapplique toutes les migrations. **À n’utiliser que sur une base de dev dont les données peuvent être perdues.** |

Les migrations super-app (Post, PaymentRequest, chapitres vidéo, etc.) sont déjà appliquées grâce à `migrate deploy`. Tu peux continuer à développer et à déployer de nouvelles migrations avec `migrate deploy` sans exécuter `migrate reset`.
