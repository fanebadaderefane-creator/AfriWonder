# Guide : Configuration du Custom Domain R2 avec africonnect.uk

## 🎯 Objectif
Configurer `cdn.africonnect.uk` comme domaine personnalisé pour votre bucket R2.

---

## 📋 Étapes

### Option 1 : Si `africonnect.uk` est déjà dans Cloudflare

1. **Vérifier dans Cloudflare Dashboard**
   - Allez dans **Domaines** (Domains) dans le menu de gauche
   - Cherchez `africonnect.uk` dans la liste
   - Si présent → Passez à l'étape 2
   - Si absent → Passez à l'Option 2

2. **Ajouter le Custom Domain dans R2**
   - Allez dans **R2** > votre bucket `africonnect` > **Settings**
   - Cliquez sur **"Domaines personnalisés"** (Custom Domains)
   - Cliquez sur **"+ Ajouter"**
   - Entrez : `cdn.africonnect.uk`
   - Cliquez sur **"Ajouter"** ou **"Connect"**
   - Cloudflare configurera automatiquement le DNS CNAME

3. **Vérifier le DNS**
   - Allez dans **DNS** > **Records** pour `africonnect.uk`
   - Vérifiez qu'un CNAME existe :
     - **Type** : CNAME
     - **Name** : `cdn`
     - **Target** : `<bucket-name>.<account-id>.r2.cloudflarestorage.com`
     - **Proxy** : ✅ Proxied (orange cloud)

4. **Mettre à jour la configuration**
   - Attendez 1-2 minutes pour la propagation DNS
   - Mettez à jour votre `.env` :
     ```env
     R2_PUBLIC_URL=https://cdn.africonnect.uk
     ```
   - Redémarrez votre backend

---

### Option 2 : Si `africonnect.uk` n'est pas dans Cloudflare

1. **Ajouter le domaine à Cloudflare**
   - Allez dans Cloudflare Dashboard
   - Cliquez sur **"Ajouter un site"** (Add a site)
   - Entrez : `africonnect.uk`
   - Choisissez le plan **"Gratuit"** (Free)
   - Cliquez sur **"Continuer"**

2. **Configurer les serveurs de noms**
   - Cloudflare vous donnera des serveurs de noms (ex: `dale.ns.cloudflare.com`, `paislee.ns.cloudflare.com`)
   - Allez dans votre compte SendGrid
   - Trouvez la section **"DNS"** ou **"Name Servers"** pour `africonnect.uk`
   - Remplacez les serveurs de noms actuels par ceux de Cloudflare
   - Sauvegardez

3. **Revenir sur Cloudflare**
   - Cliquez sur **"J'ai mis à jour mes serveurs de noms"**
   - Attendez la vérification (quelques minutes)

4. **Une fois le domaine actif dans Cloudflare**
   - Suivez les étapes de l'Option 1 (étape 2 et suivantes)

---

## ⚠️ Important

- La propagation DNS peut prendre de quelques minutes à 48 heures
- Pendant cette période, votre site peut être temporairement inaccessible
- Une fois propagé, le custom domain R2 fonctionnera immédiatement

---

## ✅ Après configuration

Testez avec le script :
```bash
cd backend
npx tsx scripts/verify-r2-public.ts
```

Résultat attendu : ✅ Fichiers accessibles via `https://cdn.africonnect.uk`

---

## 🆘 Dépannage

### Le domaine n'apparaît pas dans Cloudflare
→ Vérifiez que les serveurs de noms sont bien configurés chez SendGrid

### Le custom domain ne fonctionne pas
→ Vérifiez le DNS CNAME dans Cloudflare > DNS > Records

### Erreur 404
→ Attendez quelques minutes pour la propagation DNS

