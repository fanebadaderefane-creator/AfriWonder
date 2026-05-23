# Guide : Configuration du Bucket R2 en Public Access

## 🎯 Objectif
Permettre l'accès public aux fichiers vidéo et images stockés dans votre bucket R2 Cloudflare.

---

## 📋 Méthode 1 : Public Access Direct (Simple)

### Étape 1 : Accéder au Dashboard Cloudflare
1. Allez sur [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre compte/organisation

### Étape 2 : Accéder à R2
1. Dans le menu de gauche, cliquez sur **"R2"**
2. Vous verrez la liste de vos buckets

### Étape 3 : Configurer le Bucket
1. Cliquez sur votre bucket **`africonnect`**
2. Allez dans l'onglet **"Settings"** (Paramètres)
3. Faites défiler jusqu'à **"Public Access"** (Accès Public)

### Étape 4 : Activer l'Accès Public
1. Cliquez sur **"Allow Access"** ou **"Enable Public Access"**
2. Cloudflare vous demandera de confirmer
3. ⚠️ **IMPORTANT** : Notez l'URL publique qui sera affichée
   - Format attendu : `https://<account-id>.r2.cloudflarestorage.com/<bucket-name>`
   - Exemple : `https://e09927b84d226ec4c34b1b82184f835f.r2.cloudflarestorage.com/africonnect`

### Étape 5 : Vérifier la Configuration
1. Une fois activé, vous devriez voir un indicateur vert "Public Access Enabled"
2. Testez en accédant à une URL de fichier directement dans votre navigateur

---

## 📋 Méthode 2 : Custom Domain (Recommandé pour Production)

### Avantages
- ✅ URL propre : `https://cdn.africonnect.com/videos/...`
- ✅ Meilleur pour le SEO
- ✅ Plus professionnel
- ✅ Contrôle total sur le domaine

### Étape 1 : Prérequis
1. Avoir un domaine configuré dans Cloudflare (ex: `africonnect.com`)
2. Avoir accès à la gestion DNS du domaine

### Étape 2 : Configurer le Custom Domain dans R2
1. Dans R2 > votre bucket > **Settings** > **Public Access**
2. Cliquez sur **"Connect Domain"** ou **"Add Custom Domain"**
3. Entrez votre sous-domaine (ex: `cdn.africonnect.com`)
4. Cloudflare configurera automatiquement le DNS CNAME

### Étape 3 : Vérifier le DNS
1. Allez dans **DNS** > **Records**
2. Vérifiez qu'un enregistrement CNAME existe :
   - **Type** : CNAME
   - **Name** : `cdn`
   - **Target** : `<bucket-name>.<account-id>.r2.cloudflarestorage.com`
   - **Proxy** : ✅ Proxied (orange cloud)

### Étape 4 : Mettre à jour la Configuration
1. Attendez 1-2 minutes pour la propagation DNS
2. Mettez à jour votre `.env` :
   ```env
   R2_PUBLIC_URL=https://cdn.africonnect.com
   ```
3. Redémarrez votre backend

---

## 🔍 Vérification

### Test Manuel
1. Ouvrez votre navigateur
2. Accédez à une URL de vidéo :
   ```
   https://e09927b84d226ec4c34b1b82184f835f.r2.cloudflarestorage.com/africonnect/videos/1770224677724-les_soninka_ont_a_ta_a_la_honneur_lors_de_missmalifrance2025_danse_223_mali_culture_tradition.mp4
   ```
3. Si la vidéo se charge → ✅ Configuration réussie
4. Si erreur 403/400 → ❌ Le bucket n'est pas encore public

### Test avec Script
Exécutez le script de vérification :
```bash
cd backend
npx tsx scripts/test-r2-access.ts
```

---

## ⚠️ Points Importants

### Sécurité
- ✅ Les fichiers publics sont accessibles à tous
- ✅ Ne stockez JAMAIS de données sensibles dans un bucket public
- ✅ Utilisez des noms de fichiers uniques (avec timestamp) pour éviter les collisions

### Performance
- ✅ Cloudflare R2 est optimisé pour la distribution de contenu
- ✅ Les fichiers sont mis en cache automatiquement
- ✅ Pas de frais de sortie (egress) avec Cloudflare

### Coûts
- ✅ Stockage : ~$0.015/GB/mois
- ✅ Opérations : Gratuites jusqu'à un certain seuil
- ✅ Pas de frais de bande passante si vous utilisez Cloudflare

---

## 🐛 Dépannage

### Problème : HTTP 403 Forbidden
**Cause** : Le bucket n'est pas configuré en public access
**Solution** : Suivez la Méthode 1 ci-dessus

### Problème : HTTP 400 Bad Request
**Cause** : Format d'URL incorrect ou bucket non public
**Solution** : 
1. Vérifiez que le bucket est bien public
2. Vérifiez le format de l'URL dans `cloudflare-r2.ts`

### Problème : Custom Domain ne fonctionne pas
**Cause** : DNS non propagé ou mal configuré
**Solution** :
1. Vérifiez le DNS dans Cloudflare Dashboard
2. Attendez 5-10 minutes pour la propagation
3. Testez avec `nslookup cdn.africonnect.com`

### Problème : Les vidéos ne se chargent pas dans l'app
**Cause** : CORS non configuré ou URL incorrecte
**Solution** :
1. Vérifiez les en-têtes CORS dans R2 Settings
2. Vérifiez que l'URL dans la DB correspond à l'URL publique

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du script `test-r2-access.ts`
2. Consultez la documentation Cloudflare R2 : [https://developers.cloudflare.com/r2/](https://developers.cloudflare.com/r2/)
3. Vérifiez que votre compte Cloudflare a les permissions nécessaires

---

## ✅ Checklist Finale

- [ ] Bucket R2 configuré en public access
- [ ] URL publique testée et fonctionnelle
- [ ] Custom domain configuré (optionnel mais recommandé)
- [ ] DNS propagé (si custom domain)
- [ ] `.env` mis à jour avec la bonne `R2_PUBLIC_URL`
- [ ] Backend redémarré
- [ ] Vidéos testées dans l'application

---

**Date de création** : 2026-02-04
**Dernière mise à jour** : 2026-02-04

