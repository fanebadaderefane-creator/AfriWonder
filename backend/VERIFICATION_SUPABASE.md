# 🔍 Vérifications Supabase pour la Migration

## ❌ Problème Actuel

```
Error: P1001: Can't reach database server at `db.tlgpcoeadjhitwirfgrb.supabase.co:5432`
```

## ✅ Vérifications à Faire dans Supabase Dashboard

### 1. Vérifier que le Projet est Actif

1. Aller sur **https://supabase.com/dashboard**
2. Se connecter avec votre compte
3. Vérifier que le projet **`tlgpcoeadjhitwirfgrb`** est **ACTIF** (pas en pause)
   - Si le projet est en pause, cliquer sur **"Resume"** ou **"Restore"**

### 2. Vérifier la Connection String Exacte

1. Dans le dashboard Supabase, aller dans **Settings** → **Database**
2. Scroller jusqu'à **"Connection string"**
3. Cliquer sur l'onglet **"URI"** (pas "Connection pooling")
4. **Copier la chaîne complète** qui ressemble à :
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OU
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 3. Vérifier le Mot de Passe Database

1. Dans **Settings** → **Database**
2. Vérifier la section **"Database password"**
3. Si vous ne connaissez pas le mot de passe :
   - Cliquer sur **"Reset database password"**
   - Noter le nouveau mot de passe
   - Mettre à jour le fichier `.env` avec le nouveau mot de passe

### 4. Vérifier les Paramètres de Connexion

Dans **Settings** → **Database**, vérifier :

- ✅ **Connection pooling** : Activé ou désactivé ?
- ✅ **IPv4 compatibility** : Vérifier si activé
- ✅ **Region** : Noter la région (ex: `eu-central-1`, `us-east-1`)

### 5. Tester la Connexion Directe

1. Dans **Settings** → **Database**
2. Chercher **"Connection string"**
3. Essayer les deux formats :

#### Format Direct (Port 5432)
```
postgresql://postgres:[PASSWORD]@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres
```

#### Format Connection Pooling (Port 6543)
```
postgresql://postgres.tlgpcoeadjhitwirfgrb:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## 🔧 Solutions selon le Problème

### Problème 1 : Projet en Pause

**Solution** :
1. Aller dans le dashboard Supabase
2. Cliquer sur **"Resume project"** ou **"Restore"**
3. Attendre quelques minutes que le projet redémarre

### Problème 2 : Mot de Passe Incorrect

**Solution** :
1. Dans **Settings** → **Database** → **"Reset database password"**
2. Copier le nouveau mot de passe
3. Mettre à jour le fichier `.env` :
   ```env
   DATABASE_URL="postgresql://postgres:NOUVEAU_MOT_DE_PASSE@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"
   ```
   ⚠️ N'oubliez pas d'encoder le `@` en `%40` si présent dans le mot de passe

### Problème 3 : Port 5432 Bloqué (IPv4)

**Solution** : Utiliser le format Connection Pooling (port 6543)

1. Dans **Settings** → **Database** → **Connection string**
2. Cliquer sur **"Connection pooling"** (pas "URI")
3. Copier l'URL avec le port **6543**
4. Mettre à jour le fichier `.env` :
   ```env
   DATABASE_URL="postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
   ```

### Problème 4 : Firewall / Réseau

**Solution** :
1. Vérifier que votre connexion internet fonctionne
2. Essayer depuis un autre réseau (mobile, VPN)
3. Vérifier les paramètres de firewall

## 📋 Checklist Complète

- [ ] Projet Supabase actif (pas en pause)
- [ ] Mot de passe database connu et correct
- [ ] Connection string copiée depuis le dashboard
- [ ] Format de l'URL correct (avec `%40` pour `@`)
- [ ] Port testé (5432 ou 6543)
- [ ] IPv4 compatibility vérifiée
- [ ] Firewall / réseau OK

## 🚀 Après Vérification

Une fois les vérifications faites, mettre à jour le fichier `.env` avec la bonne URL et réessayer :

```bash
npm run db:migrate
```

## 🔄 Alternative : Migration SQL Directe

Si Prisma ne fonctionne toujours pas, utiliser le SQL direct :

1. Aller dans **SQL Editor** dans Supabase
2. Copier le contenu de `backend/migration.sql`
3. Coller et exécuter dans l'éditeur SQL
4. Vérifier dans **Table Editor** que les tables sont créées

---

**💡 Astuce** : La plupart du temps, le problème vient d'un projet en pause ou d'un mauvais format d'URL. Vérifiez d'abord ces deux points !

