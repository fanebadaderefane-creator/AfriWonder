# Prisma + Supabase : drift et migrations modifiées

## Ce que montre l’erreur

Quand `npx prisma migrate dev` affiche :

- **« migration X was modified after it was applied »** : le fichier `migration.sql` dans le dépôt ne correspond plus au **checksum** enregistré dans `_prisma_migrations` sur la base.
- **« Drift detected »** : le schéma réel PostgreSQL ne correspond pas au schéma qu’on obtiendrait en rejouant **toute** l’historique des migrations (changements faits à la main, autres outils, migrations éditées, base copiée, etc.).

Prisma propose alors **`migrate reset`** (drop + rejouer tout) : **à ne faire que sur une base jetable**, pas sur la prod / une base avec des données à garder.

## Bonnes pratiques

| Environnement | Commande typique |
|---------------|------------------|
| Développement local (Postgres vide ou dédié) | `prisma migrate dev` |
| CI / staging / production (dont Supabase) | `prisma migrate deploy` après avoir **commit** les nouveaux dossiers sous `prisma/migrations/` |

Éviter `migrate dev` pointé directement sur **la même** instance Supabase que la prod si vous ne pouvez pas vous permettre un reset.

## 1) Corriger « modified after it was applied » (checksums)

Après **toute modification** d’un fichier `migration.sql` déjà appliqué, il faut aligner la base.

1. Recalculer le SHA-256 **du fichier tel qu’il est sur disque** (même fins de ligne que Git / l’outil qui a écrit le fichier) :

   ```bash
   node -e "const fs=require('fs');const c=require('crypto');const p='prisma/migrations/NOM_MIGRATION/migration.sql';console.log(c.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));"
   ```

2. Mettre à jour Supabase (SQL Editor ou `psql`) :

   ```sql
   UPDATE "_prisma_migrations"
   SET checksum = '<hash_sha256_hex>'
   WHERE migration_name = 'NOM_DOSSIER_MIGRATION';
   ```

Exemple de checksums SHA-256 (hex) calculés sur les fichiers du dépôt sous Windows — **recalculez** après toute édition des SQL :

| `migration_name` | `checksum` (exemple) |
|------------------|----------------------|
| `20260208190000_ticketing_event_ticket_type_lock` | `1ff9179ba3f47bf288fbdf30b21b4f23471574f3879b311d103e9c64614ec7cf` |
| `20260210_add_performance_indexes` | `2afe91acb4739b2f5b3d677fdad5c4c6d8cdfd170703be596f669e675442be06` |
| `20260315220000_mini_app_reviews` | `bcaab1add7a79549175dcf38ee9cdab93e994beaf67819a05a8fec57972f9ad6` |

Raccourci depuis la racine du backend :

```bash
node scripts/print-migration-checksums.cjs
```

Si après `UPDATE` Prisma se plaint encore du format de checksum, comparer une ligne existante dans `_prisma_migrations` (longueur, préfixe) avec la valeur calculée.

## 2) Gérer le drift massif

Le drift ne disparaît **pas** en corrigeant seulement les checksums : il indique que **l’historique des migrations ≠ la base**.

Options (à choisir selon la réalité du projet) :

1. **Baseline** : documenter que la vérité est la base actuelle ; utiliser `prisma db pull` pour resynchroniser `schema.prisma` (puis repartir sur des migrations propres — stratégie d’équipe à définir).
2. **Ne pas utiliser `migrate dev` sur cette base** : appliquer les **nouvelles** migrations avec `migrate deploy` + SQL manuel ponctuel si besoin.
3. **Postgres local** : `migrate dev` sur Docker/local ; `migrate deploy` vers Supabase avec les mêmes fichiers de migration.

Tant que le drift n’est pas traité, `migrate dev` contre Supabase peut continuer à refuser ou proposer un reset.

## 3) Push Web : table `PushSubscription`

La migration **`20260322120000_push_subscriptions`** crée la table `PushSubscription` de façon **idempotente** (`IF NOT EXISTS` / `duplicate_object`) pour pouvoir l’exécuter sur une base déjà partiellement alignée.

Sur Supabase (après backup / validation) :

```bash
cd backend
npx prisma migrate deploy
```

Si `migrate deploy` échoue encore à cause du drift global, vous pouvez exécuter **uniquement** le SQL de `prisma/migrations/20260322120000_push_subscriptions/migration.sql` dans l’éditeur SQL Supabase, puis marquer la migration comme appliquée (à manier avec précaution) :

```bash
npx prisma migrate resolve --applied 20260322120000_push_subscriptions
```

(`resolve` met à jour `_prisma_migrations` sans rejouer le SQL — à utiliser seulement si la base contient déjà exactement ce que fait la migration.)
