# Rollback rapide AfriConnect

## 1. Rollback applicatif (code)

### Avec Docker (recommandé)
```bash
# Lister les images récentes
docker images africonnect-backend --format "{{.Tag}}\t{{.CreatedAt}}" | head -5

# Rollback 1-click : redéployer l'image précédente
docker tag africonnect-backend:previous africonnect-backend:latest
docker compose -f docker-compose.prod.yml up -d backend

# Ou avec tag de version
docker pull your-registry/africonnect-backend:v1.2.2
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
gunzip -c backups/africonnect_backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL" -f -

# 2. Ou restaurer dans une DB temporaire puis basculer
createdb africonnect_restored
gunzip -c backups/africonnect_backup_*.sql.gz | psql africonnect_restored -f -
# Vérifier les données, puis mettre DATABASE_URL vers africonnect_restored et redémarrer
```

## 3. Rollback paiement (remboursement)

- **Admin** : Dashboard → Refunds → Approuver remboursement.
- **Escrow** : `escrowService.refundFunds(orderId, reason)` déjà utilisé par disputes.
- **Webhook déjà traité** : confirmPayment est idempotent (déjà payé = 200 OK, pas de double débit).

## Objectif

- **Rollback code** : < 10 min (Docker image précédente).
- **Restore DB** : < 1 h (backup 3x/jour, testé hebdo).
