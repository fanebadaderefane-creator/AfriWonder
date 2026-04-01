# 🔧 RÉSOLUTION DATABASE_URL - AfriConnect

## ✅ CORRECTION EFFECTUÉE

### Format Utilisé (Connection Pooling - Port 6543)

```env
DATABASE_URL="postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
```

**Détails** :
- ✅ Format : Connection Pooling (recommandé pour IPv4)
- ✅ Port : 6543 (pooler)
- ✅ Utilisateur : `postgres.tlgpcoeadjhitwirfgrb`
- ✅ Mot de passe : `Mali%40202520211215` (avec `%40` pour `@`)
- ✅ Host : `aws-0-eu-central-1.pooler.supabase.com`

---

## ⚠️ SI LE PROBLÈME PERSISTE

### Vérifications à Faire

1. **Projet Supabase Actif**
   - Aller sur https://supabase.com/dashboard
   - Vérifier que le projet `tlgpcoeadjhitwirfgrb` n'est pas en pause
   - Si en pause, cliquer sur "Resume"

2. **Obtenir la Vraie Connection String**
   - Aller dans Supabase Dashboard → Settings → Database
   - Scroller jusqu'à "Connection string"
   - Cliquer sur "Session mode" (pas Transaction mode)
   - Copier la chaîne complète
   - Remplacer `[YOUR-PASSWORD]` par `Mali@202520211215` (le @ sera encodé automatiquement)

3. **Tester la Connexion Directement**
   ```bash
   # Installer psql si nécessaire
   # Puis tester :
   psql "postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
   ```

4. **Vérifier le Firewall**
   - Vérifier que le port 6543 n'est pas bloqué
   - Vérifier que votre IP n'est pas bloquée par Supabase

---

## 🔄 ALTERNATIVE : Format Direct (Port 5432)

Si le format pooling ne fonctionne pas, essayer le format direct :

```env
DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"
```

**Note** : Ce format nécessite IPv6 ou une configuration réseau spécifique.

---

## 📝 FICHIER .env CORRIGÉ

Le fichier `backend/.env` a été mis à jour avec le format Connection Pooling.

Pour vérifier :
```powershell
cd backend
Get-Content .env | Select-String "DATABASE_URL"
```

---

## ✅ PROCHAINES ÉTAPES

Une fois la connexion établie :

1. ✅ Vérifier les logs : `npm run dev`
2. ✅ Voir "✅ Database connected"
3. ✅ Tester : `curl http://localhost:3000/health`
4. ✅ Lancer les tests : `powershell -ExecutionPolicy Bypass -File test-api.ps1`

---

**Status** : ⏳ En attente de vérification connexion Supabase

