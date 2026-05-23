# Rollback rapide AfriWonder

## 1. Rollback applicatif (code)

### Avec Docker (recommandé)
```bash
# Lister les images récentes
docker images afriwonder-backend --format "{{.Tag}}\t{{.CreatedAt}}" | head -5

# Rollback 1-click : redéployer l'image précédente
docker tag afriwonder-backend:previous afriwonder-backend:latest
docker compose -f docker-compose.prod.yml up -d backend

# Ou avec tag de version
docker pull your-registry/afriwonder-backend:v1.2.2
docker compose -f docker-compose.prod.yml up -d backend
```

### Sans Docker (PM2 / node)
```bash
cd backend
./scripts/rollback.sh
# Choisir la version (ex: v1.2.2)
```

## 2. Rollback base de données

**Uniquement si une migration a cassé la prod.**

```bash
# 1. Restaurer le dernier backup
gunzip -c backups/afriwonder_backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL" -f -

# 2. Ou restaurer dans une DB temporaire puis basculer
createdb afriwonder_restored
gunzip -c backups/afriwonder_backup_*.sql.gz | psql afriwonder_restored -f -
# Vérifier les données, puis mettre DATABASE_URL vers afriwonder_restored et redémarrer
```

## 3. Rollback paiement (remboursement)

- **Admin** : Dashboard → Refunds → Approuver remboursement.
- **Escrow** : `escrowService.refundFunds(orderId, reason)` déjà utilisé par disputes.
- **Webhook déjà traité** : confirmPayment est idempotent (déjà payé = 200 OK, pas de double débit).

## Objectif

- **Rollback code** : < 10 min (Docker image précédente).
- **Restore DB** : < 1 h (backup 3x/jour, testé hebdo).
