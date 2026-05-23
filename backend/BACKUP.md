# Sauvegardes (backups)

Ce document décrit comment effectuer des sauvegardes des données critiques (commandes, transactions, résumé utilisateurs) pour AfriConnect.

## Variables d'environnement

| Variable     | Description                                      | Défaut    |
|-------------|---------------------------------------------------|-----------|
| `BACKUP_DIR` | Dossier où écrire les fichiers de backup (JSON). | `./backups` |

Le chemin est relatif au répertoire de travail au moment de l’exécution (script ou serveur). En production, définir un chemin absolu, par exemple `/var/backups/africonnect`.

## Endpoints admin

- **`GET /api/admin/backup/export`**  
  Retourne l’export JSON en flux (sans l’écrire sur disque).  
  Query : `from`, `to` (dates ISO, optionnel).  
  Réservé aux utilisateurs avec rôle admin.

- **`POST /api/admin/backup/trigger`**  
  Déclenche un backup : appelle le service, écrit le fichier dans `BACKUP_DIR` et retourne le `filepath` dans la réponse.  
  Query optionnelles : `from`, `to`.

## Script en ligne de commande

Le script `scripts/backup-export.ts` écrit un fichier de backup dans `BACKUP_DIR` en utilisant le même service que l’API.

**Exécution (depuis la racine du repo) :**

```bash
npx tsx backend/scripts/backup-export.ts
```

**Depuis le dossier `backend/` :**

```bash
cd backend && npx tsx scripts/backup-export.ts
```

Variables optionnelles pour le script :

- `BACKUP_FROM` : date de début (ISO), optionnel.
- `BACKUP_TO` : date de fin (ISO), optionnel.  
Si non définies, la période par défaut est les 30 derniers jours.

Assurez-vous que `DATABASE_URL` (et éventuellement `BACKUP_DIR`) sont définis (fichier `.env` à la racine ou dans `backend/`).

## Exemple cron (Linux / macOS)

Sauvegarde tous les jours à 2h du matin :

```cron
0 2 * * * cd /chemin/vers/AfriConnect && BACKUP_DIR=/var/backups/africonnect npx tsx backend/scripts/backup-export.ts
```

Adapter `/chemin/vers/AfriConnect` et `/var/backups/africonnect` selon l’environnement. Pour charger les variables depuis un `.env` dédié :

```cron
0 2 * * * cd /chemin/vers/AfriConnect && export $(cat backend/.env | xargs) && npx tsx backend/scripts/backup-export.ts
```

## Contenu d’un fichier de backup

Chaque fichier est un JSON contenant notamment :

- `exportedAt` : date d’export (ISO).
- `period` : `from` / `to` de la période exportée.
- `usersSummary` : nombre d’utilisateurs et de vendeurs.
- `orders` : commandes de la période (avec items et produits).
- `ordersCount` : nombre de commandes.
- `transactions` : transactions de la période.
- `transactionsCount` : nombre de transactions.

Conserver ces fichiers de manière sécurisée et les archiver (rotation, copie vers un stockage distant) selon la politique de sauvegarde de votre infrastructure.
