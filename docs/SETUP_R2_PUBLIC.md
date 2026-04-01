# 🚀 Guide Rapide : Activer l'Accès Public R2

## ⚠️ Problème Actuel
Votre bucket R2 n'est **PAS** configuré en public access, donc les vidéos ne peuvent pas être lues.

---

## ✅ Solution : Activer l'Accès Public (5 minutes)

### Étape 1 : Ouvrir Cloudflare Dashboard
1. Allez sur : **https://dash.cloudflare.com**
2. Connectez-vous à votre compte

### Étape 2 : Accéder à R2
1. Dans le menu de gauche, cliquez sur **"R2"** (icône de stockage)
2. Vous verrez vos buckets

### Étape 3 : Ouvrir votre Bucket
1. Cliquez sur le bucket **`africonnect`**
2. Vous arrivez sur la page du bucket

### Étape 4 : Aller dans Settings
1. Cliquez sur l'onglet **"Settings"** en haut
2. Faites défiler jusqu'à la section **"Public Access"**

### Étape 5 : Activer l'Accès Public
1. Vous verrez un bouton **"Allow Access"** ou **"Enable Public Access"**
2. Cliquez dessus
3. Cloudflare vous demandera de confirmer → Cliquez **"Confirm"** ou **"Enable"**

### Étape 6 : Vérifier
1. Vous devriez voir un indicateur vert **"Public Access Enabled"**
2. Notez l'URL publique affichée (si visible)

---

## 🧪 Test Immédiat

Après avoir activé l'accès public, testez avec ce script :

```bash
cd backend
npx tsx scripts/verify-r2-public.ts
```

**Résultat attendu** : ✅ Fichiers accessibles

---

## 🎯 Option Avancée : Custom Domain (Recommandé)

Si vous voulez utiliser `cdn.africonnect.com` au lieu de l'URL R2 directe :

### Dans R2 Settings > Public Access :
1. Cliquez sur **"Connect Domain"** ou **"Add Custom Domain"**
2. Entrez : `cdn.africonnect.com`
3. Cloudflare configurera automatiquement le DNS

### Mettre à jour votre `.env` :
```env
R2_PUBLIC_URL=https://cdn.africonnect.com
```

### Redémarrer le backend :
```bash
npm run dev
```

---

## ✅ Checklist

- [ ] Cloudflare Dashboard ouvert
- [ ] Bucket `africonnect` ouvert
- [ ] Settings > Public Access
- [ ] "Allow Access" activé
- [ ] Script de vérification exécuté
- [ ] ✅ Résultat : Fichiers accessibles
- [ ] Vidéos testées dans l'application

---

## 🆘 Si ça ne fonctionne pas

### Erreur : "Public Access" non visible
→ Vérifiez que vous êtes sur le bon compte Cloudflare

### Erreur : HTTP 403 après activation
→ Attendez 1-2 minutes pour la propagation

### Erreur : Custom Domain ne fonctionne pas
→ Vérifiez le DNS dans Cloudflare > DNS > Records

---

## 📞 Besoin d'aide ?

Consultez le guide détaillé : `backend/docs/R2_PUBLIC_ACCESS_SETUP.md`

---

**Une fois activé, vos vidéos fonctionneront immédiatement ! 🎉**

