# Prisma : drift détecté — que faire (sans perdre les données)

## Situation

Quand vous exécutez `npx prisma migrate dev`, Prisma signale :

- **Drift** : le schéma réel de la base (Supabase) ne correspond plus à ce qu’attendent les fichiers de migration.
- **Migrations modifiées après application** :  
  `20260208190000_ticketing_event_ticket_type_lock` et  
  `20260210_add_performance_indexes`  
  ont été modifiées après avoir été appliquées, ce qui invalide l’historique.

**Ne pas exécuter `prisma migrate reset`** : cela supprime toutes les données de la base.

---

## Option 1 : Ne rien casser, ajouter l’index Message à la main (recommandé si vous avez des données)

L’index pour la messagerie (`Message(conversation_id, created_at)`) améliore les perfs. Vous pouvez l’ajouter directement en SQL sur Supabase :

1. Ouvrir **Supabase** → votre projet → **SQL Editor**.
2. Exécuter :

```sql
-- Index messagerie (pagination par conversation)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON "Message"(conversation_id, created_at DESC);
```

`IF NOT EXISTS` évite une erreur si l’index existe déjà. Aucune migration Prisma n’est créée, l’historique n’est pas touché.

Ensuite vous pouvez continuer à utiliser `prisma generate` et l’app normalement. Pour les prochaines migrations, préférez **Option 3** ou **Option 2** selon votre contexte.

---

## Option 2 : Environnement de dev vide (sans données à garder)

**Uniquement** si la base est une base de **développement** sans données à conserver :

```bash
cd backend
npx prisma migrate reset
```

Cela va :

- Supprimer toutes les données
- Réappliquer toutes les migrations depuis le début
- Resynchroniser l’historique avec la base

À n’utiliser **jamais** sur une base de production ou contenant des données importantes.

---

## Option 3 : Remettre les migrations dans l’état “appliqué” (avancé)

Si la base a déjà été migrée correctement et que seuls les **fichiers** de migration ont été modifiés (par exemple après un git pull), vous pouvez :

1. Remettre le contenu **d’origine** des deux migrations concernées (via git : `git checkout -- prisma/migrations/20260208190000_ticketing_event_ticket_type_lock/ prisma/migrations/20260210_add_performance_indexes/`) pour que le checksum corresponde à ce qui a été appliqué.
2. Ou marquer ces migrations comme appliquées sans les réexécuter :  
   `npx prisma migrate resolve --applied 20260210_add_performance_indexes`  
   (et idem pour l’autre si besoin), **après** avoir vérifié que la base contient bien les changements (index, colonnes, etc.).

En production, on applique en général les migrations avec **`npx prisma migrate deploy`** (sans reset), après avoir résolu le drift en dev.

---

## En résumé

| Situation | Action |
|-----------|--------|
| Base avec des données à garder | **Option 1** : exécuter le SQL de l’index Message dans Supabase. Ne pas faire `migrate reset`. |
| Base de dev vide / jetable | **Option 2** : `npx prisma migrate reset` (données perdues). |
| Fichiers de migration modifiés par erreur | **Option 3** : restaurer les fichiers ou utiliser `migrate resolve`. |

Pour l’optimisation messagerie, **Option 1** suffit : l’index est créé, l’app en profite, sans risque pour les données.
