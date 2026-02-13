# Réplication PostgreSQL – Haute disponibilité AfriWonder

Ce guide décrit la configuration de la réplication PostgreSQL pour la haute disponibilité et la scalabilité en lecture.

---

## 1. Objectifs

- **Haute disponibilité** : basculement automatique en cas de panne du primary
- **Scalabilité lecture** : répartir les requêtes SELECT sur des replicas
- **Backup continuity** : WAL archiving pour backup à chaud

---

## 2. Réplication streaming (streaming replication)

### 2.1 Architecture

```
 primary (read-write)  ----streaming---->  replica 1 (read-only)
                                |
                                +------------->  replica 2 (read-only)
```

### 2.2 Configuration serveur primary (zéro perte de données)

Dans `postgresql.conf` :

```ini
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
synchronous_commit = on
full_page_writes = on
```

- **synchronous_commit = on** : garantit qu'une transaction n'est confirmée qu'après écriture sur le replica (zéro perte)
- **full_page_writes = on** : requis pour récupération après crash

Dans `pg_hba.conf` :

```
host    replication     replicator      <replica_ip>/32    md5
```

### 2.3 Création du rôle réplication

```sql
CREATE ROLE replicator WITH REPLICATION PASSWORD 'secret' LOGIN;
```

### 2.4 Démarrer un replica

```bash
# Sur le serveur replica
pg_basebackup -h <primary_host> -D /var/lib/postgresql/data -U replicator -P -R
```

---

## 3. Prisma avec read replicas

Si vous utilisez plusieurs connexions (primary + replicas), adaptez la config :

```env
# Primary pour écritures
DATABASE_URL="postgresql://user:pass@primary:5432/afriwonder"

# Replica pour lecture (optionnel, si Prisma le supporte)
DATABASE_READ_URL="postgresql://user:pass@replica:5432/afriwonder"
```

Prisma ne supporte pas nativement le read/write splitting. Alternatives :

- **PgBouncer** en mode transaction avec routing
- **Proxy SQL** (ex. ProxySQL) pour router les SELECT vers les replicas
- **Code applicatif** : utiliser deux clients Prisma (un pour write, un pour read)

---

## 4. Failover manuel

En cas de panne du primary :

1. Promouvoir un replica : `pg_ctl promote -D /var/lib/postgresql/data`
2. Mettre à jour `DATABASE_URL` pour pointer vers le nouveau primary
3. Redémarrer l'application

---

## 5. Outils managed (simplifié)

| Fournisseur | Service | Réplication |
|-------------|---------|-------------|
| **Supabase** | PostgreSQL managé | Read replicas via dashboard |
| **AWS RDS** | PostgreSQL | Multi-AZ, read replicas |
| **DigitalOcean** | Managed DB | Read replicas |
| **Azure** | PostgreSQL Flexible | Read replicas |

Avec un service managé, la réplication est souvent configurée via l'interface ou l'API du fournisseur.

---

## 6. Checklist

- [ ] `wal_level = replica` sur le primary
- [ ] Rôle `replicator` créé
- [ ] `pg_hba.conf` configuré pour les replicas
- [ ] Replica créé via `pg_basebackup`
- [ ] Monitoring du lag de réplication (`pg_stat_replication`)

---

## 7. Test de restauration (données jamais perdues)

Pour valider que les backups sont restaurables :

```bash
cd backend
./scripts/restore-backup-test.sh
# ou avec un fichier spécifique:
./scripts/restore-backup-test.sh ./backups/afriwonder_backup_20260213_020000.sql.gz
```

Ce script crée une DB temporaire, restaure le backup, vérifie les tables, puis nettoie.

---

*Document créé pour l'audit production – février 2026*
