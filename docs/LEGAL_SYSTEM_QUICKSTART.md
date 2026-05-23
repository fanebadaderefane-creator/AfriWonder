# ⚡ DÉMARRAGE RAPIDE - SYSTÈME LÉGAL & SÉCURITÉ

## 🚀 Installation en 5 minutes

### Étape 1: Installer les dépendances backend
```bash
cd backend
npm install speakeasy qrcode
```

### Étape 2: Créer la migration Prisma
```bash
npx prisma migrate dev --name legal_security_system
npx prisma generate
```

### Étape 3: Créer le premier document légal

**Option A - Via Script SQL:**
```sql
-- Connectez-vous à votre base PostgreSQL
INSERT INTO legal_documents (id, type, version, language, title, content, effective_date, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'privacy_policy',
  '1.0',
  'fr',
  'Politique de confidentialité - AfriConnect',
  '<h2>1. Collecte des données</h2>
<p>Nous collectons les informations suivantes :</p>
<ul>
  <li>Nom et prénom</li>
  <li>Adresse email</li>
  <li>Photo de profil (si fournie via OAuth)</li>
</ul>

<h2>2. Utilisation des données</h2>
<p>Vos données sont utilisées pour :</p>
<ul>
  <li>Créer et gérer votre compte</li>
  <li>Fournir nos services</li>
  <li>Améliorer votre expérience</li>
</ul>

<h2>3. Partage des données</h2>
<p>Nous ne vendons ni ne partageons vos données personnelles avec des tiers.</p>

<h2>4. Vos droits RGPD</h2>
<ul>
  <li><strong>Droit d''accès :</strong> Consultez vos données</li>
  <li><strong>Droit de rectification :</strong> Modifiez vos informations</li>
  <li><strong>Droit à l''oubli :</strong> Supprimez votre compte</li>
  <li><strong>Droit à la portabilité :</strong> Exportez vos données</li>
</ul>

<h2>5. Sécurité</h2>
<p>Vos données sont protégées par chiffrement et stockées de manière sécurisée.</p>

<h2>6. Contact</h2>
<p>Pour toute question : <a href="mailto:dpo@africonnect.app">dpo@africonnect.app</a></p>',
  NOW(),
  true,
  NOW(),
  NOW()
);
```

**Option B - Via API (besoin d'un compte admin):**
Créez un script `backend/scripts/create-legal-docs.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Politique de confidentialité
  const privacyPolicy = await prisma.legalDocument.create({
    data: {
      type: 'privacy_policy',
      version: '1.0',
      language: 'fr',
      title: 'Politique de confidentialité - AfriConnect',
      content: `
        <h2>1. Collecte des données</h2>
        <p>Nous collectons les informations suivantes :</p>
        <ul>
          <li>Nom et prénom</li>
          <li>Adresse email</li>
          <li>Photo de profil (si fournie via OAuth)</li>
        </ul>
        <!-- ... reste du contenu ... -->
      `,
      effective_date: new Date(),
      is_active: true,
    },
  });

  // Conditions d'utilisation
  const terms = await prisma.legalDocument.create({
    data: {
      type: 'terms_of_service',
      version: '1.0',
      language: 'fr',
      title: 'Conditions d\'utilisation - AfriConnect',
      content: `
        <h2>1. Acceptation des conditions</h2>
        <p>En utilisant AfriConnect, vous acceptez ces conditions.</p>
        <!-- ... reste du contenu ... -->
      `,
      effective_date: new Date(),
      is_active: true,
    },
  });

  console.log('✅ Documents légaux créés:', privacyPolicy.id, terms.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Exécutez:
```bash
node scripts/create-legal-docs.js
```

### Étape 4: Configurer les informations légales de l'entreprise
Créez `backend/scripts/setup-legal-entity.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const info = await prisma.legalEntityInfo.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      company_name: 'AfriConnect',
      legal_form: 'SAS',
      address: '123 Avenue de l\'Innovation',
      city: 'Dakar',
      postal_code: '10000',
      country: 'Sénégal',
      email: 'legal@africonnect.app',
      dpo_name: 'Délégué à la Protection des Données',
      dpo_email: 'dpo@africonnect.app',
      hosting_provider: 'AWS / Cloudflare',
      hosting_region: 'Europe (eu-west-1)',
    },
  });

  console.log('✅ Informations légales configurées');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Exécutez:
```bash
node scripts/setup-legal-entity.js
```

### Étape 5: Démarrer le système

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd ..
npm run dev
```

---

## ✅ VÉRIFICATION

### Backend
1. Accédez à http://localhost:3000/health
2. Vérifiez les logs : "Jobs automatiques démarrés"

### Frontend
1. Accédez à http://localhost:5173
2. La bannière cookies devrait s'afficher après 1 seconde
3. Testez les pages :
   - `/PrivacyPolicy` - Doit afficher le document
   - `/DataProtection` - Doit afficher les infos
   - `/PrivacySettings` - Doit montrer les paramètres (si connecté)

---

## 🧪 TESTS RAPIDES

### 1. Tester la bannière cookies
1. Ouvrez le site en navigation privée
2. La bannière devrait apparaître
3. Cliquez sur "Personnaliser"
4. Activez/désactivez des options
5. Cliquez sur "Enregistrer mes choix"
6. Rechargez la page → La bannière ne devrait plus apparaître

### 2. Tester l'acceptation de politique
1. Connectez-vous
2. Accédez à `/PrivacyPolicy`
3. Cliquez sur "Accepter cette politique"
4. Vérifiez dans la DB:
```sql
SELECT * FROM user_legal_acceptances ORDER BY accepted_at DESC LIMIT 1;
```

### 3. Tester l'export de données
1. Connectez-vous
2. Accédez à `/PrivacySettings`
3. Onglet "Export"
4. Cliquez sur "Nouvelle demande d'export"
5. Vérifiez dans la DB:
```sql
SELECT * FROM data_export_requests ORDER BY requested_at DESC LIMIT 1;
```

### 4. Tester la suppression de compte
1. Connectez-vous
2. Accédez à `/PrivacySettings`
3. Onglet "Suppression"
4. Cliquez sur "Demander la suppression"
5. Confirmez
6. Vérifiez dans la DB:
```sql
SELECT * FROM account_deletion_requests WHERE status = 'pending';
```

### 5. Tester 2FA
1. Connectez-vous
2. Accédez à `/PrivacySettings`
3. Onglet "Sécurité"
4. Cliquez sur "Activer 2FA"
5. Scannez le QR code avec Google Authenticator
6. Entrez le code de vérification

---

## 📝 CONFIGURATION ENVIRONNEMENT

Assurez-vous que votre `.env` backend contient:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/africonnect"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# API
CORS_ORIGIN="http://localhost:5173"

# Email (à configurer pour les notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Cloudflare R2 (pour stockage exports)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret"
R2_BUCKET_NAME="africonnect-exports"
```

---

## 🔧 DÉPANNAGE

### Erreur: speakeasy not found
```bash
cd backend
npm install speakeasy
```

### Erreur: qrcode not found
```bash
cd backend
npm install qrcode
```

### Migration Prisma échoue
1. Vérifiez que PostgreSQL est démarré
2. Vérifiez DATABASE_URL dans .env
3. Supprimez les migrations existantes si conflit:
```bash
rm -rf prisma/migrations/*
npx prisma migrate dev --name init
```

### Bannière cookies ne s'affiche pas
1. Effacez localStorage: `localStorage.clear()`
2. Rechargez la page
3. Vérifiez la console pour erreurs

### Routes API 404
1. Vérifiez que les routes sont bien importées dans `backend/src/app.ts`
2. Redémarrez le backend
3. Testez: `curl http://localhost:3000/api/legal/entity-info`

---

## 📚 RESSOURCES

- **Guide complet:** `LEGAL_SYSTEM_GUIDE.md`
- **Documentation API:** http://localhost:3000/api-docs (si Swagger installé)
- **Prisma Studio:** `npx prisma studio`

---

## 🎯 PROCHAINES ACTIONS

1. ✅ Remplir le contenu réel des politiques légales
2. ✅ Ajouter votre logo et informations d'entreprise
3. ✅ Configurer l'envoi d'emails (pour notifications)
4. ✅ Tester en production avec vrais utilisateurs
5. ✅ Faire auditer par un avocat spécialisé en protection des données

---

**🎉 Votre système légal et sécurité est opérationnel !**

Pour toute question : dpo@africonnect.app
