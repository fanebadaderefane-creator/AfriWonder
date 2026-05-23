# 🔧 CORRECTION DU PROBLÈME DE MIGRATION

## Problème identifié
```
Migration `20260207225747_live_streaming_pro` failed to apply cleanly
Error: column "type" of relation "Message" does not exist
```

## 🚀 SOLUTION RAPIDE (Développement)

Si vous êtes en **développement** et que perdre les données n'est pas un problème :

```bash
# Option 1 : Push direct du schema (sans migration)
npx prisma db push --skip-generate

# Ensuite générer le client
npx prisma generate

# Puis configurer le système
node scripts/setup-legal-system.js
```

## 🏭 SOLUTION PRODUCTION (Conservation des données)

Si vous êtes en **production** ou avez des données importantes :

### Étape 1 : Créer une migration SQL manuelle

```bash
# Créer un fichier de migration vide
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_legal_security_system
```

### Étape 2 : Créer le fichier migration.sql

Créez `prisma/migrations/YYYYMMDDHHMMSS_add_legal_security_system/migration.sql` avec :

```sql
-- CreateTable pour LegalDocument
CREATE TABLE IF NOT EXISTS "legal_documents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour UserLegalAcceptance
CREATE TABLE IF NOT EXISTS "user_legal_acceptances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_info" JSONB,

    CONSTRAINT "user_legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour UserCookiePreference
CREATE TABLE IF NOT EXISTS "user_cookie_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "essential" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "functional" BOOLEAN NOT NULL DEFAULT false,
    "social_media" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "user_cookie_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour GuestCookieConsent
CREATE TABLE IF NOT EXISTS "guest_cookie_consents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "essential" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "functional" BOOLEAN NOT NULL DEFAULT false,
    "social_media" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_cookie_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour DataExportRequest
CREATE TABLE IF NOT EXISTS "data_export_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "format" TEXT NOT NULL DEFAULT 'json',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "download_url" TEXT,
    "file_size" BIGINT,
    "error_message" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour AccountDeletionRequest
CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_deletion_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancellation_token" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour SecurityLog
CREATE TABLE IF NOT EXISTS "security_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "device_info" JSONB,
    "metadata" JSONB,
    "risk_score" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour User2FA
CREATE TABLE IF NOT EXISTS "user_2fa" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "secret" TEXT,
    "backup_codes" TEXT[],
    "phone_number" TEXT,
    "last_used_at" TIMESTAMP(3),
    "enabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_2fa_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour AdminAuditLog
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour SuspiciousActivityAlert
CREATE TABLE IF NOT EXISTS "suspicious_activity_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notified_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suspicious_activity_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour LegalEntityInfo
CREATE TABLE IF NOT EXISTS "legal_entity_info" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "legal_form" TEXT,
    "registration_number" TEXT,
    "vat_number" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT,
    "country" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "dpo_name" TEXT,
    "dpo_email" TEXT,
    "dpo_phone" TEXT,
    "data_controller" TEXT,
    "hosting_provider" TEXT,
    "hosting_region" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_entity_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour DataRetentionPolicy
CREATE TABLE IF NOT EXISTS "data_retention_policies" (
    "id" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "description" TEXT,
    "auto_delete_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_cleanup_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable pour ConsentLog
CREATE TABLE IF NOT EXISTS "consent_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "consent_type" TEXT NOT NULL,
    "consent_given" BOOLEAN NOT NULL,
    "consent_version" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "legal_documents_type_version_language_key" ON "legal_documents"("type", "version", "language");
CREATE INDEX IF NOT EXISTS "legal_documents_type_is_active_idx" ON "legal_documents"("type", "is_active");
CREATE INDEX IF NOT EXISTS "legal_documents_effective_date_idx" ON "legal_documents"("effective_date");

-- CreateIndex pour UserLegalAcceptance
CREATE INDEX IF NOT EXISTS "user_legal_acceptances_user_id_idx" ON "user_legal_acceptances"("user_id");
CREATE INDEX IF NOT EXISTS "user_legal_acceptances_document_id_idx" ON "user_legal_acceptances"("document_id");
CREATE INDEX IF NOT EXISTS "user_legal_acceptances_accepted_at_idx" ON "user_legal_acceptances"("accepted_at");

-- CreateIndex pour UserCookiePreference
CREATE UNIQUE INDEX IF NOT EXISTS "user_cookie_preferences_user_id_key" ON "user_cookie_preferences"("user_id");
CREATE INDEX IF NOT EXISTS "user_cookie_preferences_user_id_idx" ON "user_cookie_preferences"("user_id");

-- CreateIndex pour GuestCookieConsent
CREATE INDEX IF NOT EXISTS "guest_cookie_consents_session_id_idx" ON "guest_cookie_consents"("session_id");

-- CreateIndex pour DataExportRequest
CREATE INDEX IF NOT EXISTS "data_export_requests_user_id_idx" ON "data_export_requests"("user_id");
CREATE INDEX IF NOT EXISTS "data_export_requests_status_idx" ON "data_export_requests"("status");
CREATE INDEX IF NOT EXISTS "data_export_requests_requested_at_idx" ON "data_export_requests"("requested_at");

-- CreateIndex pour AccountDeletionRequest
CREATE INDEX IF NOT EXISTS "account_deletion_requests_user_id_idx" ON "account_deletion_requests"("user_id");
CREATE INDEX IF NOT EXISTS "account_deletion_requests_status_idx" ON "account_deletion_requests"("status");
CREATE INDEX IF NOT EXISTS "account_deletion_requests_scheduled_deletion_at_idx" ON "account_deletion_requests"("scheduled_deletion_at");
CREATE UNIQUE INDEX IF NOT EXISTS "account_deletion_requests_cancellation_token_key" ON "account_deletion_requests"("cancellation_token");

-- CreateIndex pour SecurityLog
CREATE INDEX IF NOT EXISTS "security_logs_user_id_idx" ON "security_logs"("user_id");
CREATE INDEX IF NOT EXISTS "security_logs_action_idx" ON "security_logs"("action");
CREATE INDEX IF NOT EXISTS "security_logs_created_at_idx" ON "security_logs"("created_at");
CREATE INDEX IF NOT EXISTS "security_logs_risk_score_idx" ON "security_logs"("risk_score");

-- CreateIndex pour User2FA
CREATE UNIQUE INDEX IF NOT EXISTS "user_2fa_user_id_key" ON "user_2fa"("user_id");
CREATE INDEX IF NOT EXISTS "user_2fa_user_id_idx" ON "user_2fa"("user_id");
CREATE INDEX IF NOT EXISTS "user_2fa_is_enabled_idx" ON "user_2fa"("is_enabled");

-- CreateIndex pour AdminAuditLog
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_entity_type_entity_id_idx" ON "admin_audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_timestamp_idx" ON "admin_audit_logs"("timestamp");

-- CreateIndex pour SuspiciousActivityAlert
CREATE INDEX IF NOT EXISTS "suspicious_activity_alerts_user_id_idx" ON "suspicious_activity_alerts"("user_id");
CREATE INDEX IF NOT EXISTS "suspicious_activity_alerts_status_idx" ON "suspicious_activity_alerts"("status");
CREATE INDEX IF NOT EXISTS "suspicious_activity_alerts_severity_idx" ON "suspicious_activity_alerts"("severity");
CREATE INDEX IF NOT EXISTS "suspicious_activity_alerts_created_at_idx" ON "suspicious_activity_alerts"("created_at");

-- CreateIndex pour DataRetentionPolicy
CREATE UNIQUE INDEX IF NOT EXISTS "data_retention_policies_data_type_key" ON "data_retention_policies"("data_type");

-- CreateIndex pour ConsentLog
CREATE INDEX IF NOT EXISTS "consent_logs_user_id_idx" ON "consent_logs"("user_id");
CREATE INDEX IF NOT EXISTS "consent_logs_consent_type_idx" ON "consent_logs"("consent_type");
CREATE INDEX IF NOT EXISTS "consent_logs_created_at_idx" ON "consent_logs"("created_at");

-- AddForeignKey (si les tables users existent)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE "user_legal_acceptances" ADD CONSTRAINT "user_legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "user_legal_acceptances" ADD CONSTRAINT "user_legal_acceptances_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "user_cookie_preferences" ADD CONSTRAINT "user_cookie_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "user_2fa" ADD CONSTRAINT "user_2fa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "suspicious_activity_alerts" ADD CONSTRAINT "suspicious_activity_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

### Étape 3 : Marquer la migration comme appliquée

```bash
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_legal_security_system
```

## ⚡ COMMANDES RAPIDES À EXÉCUTER

Pour **développement** (recommandé) :

```bash
# Dans backend/
npx prisma db push --skip-generate
npx prisma generate
node scripts/setup-legal-system.js
```

Pour **production** :

```bash
# 1. Appliquer le SQL directement
psql -d your_database -f prisma/migrations/YYYYMMDDHHMMSS_add_legal_security_system/migration.sql

# 2. Marquer comme appliqué
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_add_legal_security_system

# 3. Générer le client
npx prisma generate

# 4. Configurer le système
node scripts/setup-legal-system.js
```

## ✅ Vérification

Après application, vérifiez que les tables existent :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%legal%' OR table_name LIKE '%cookie%' OR table_name LIKE '%security%'
ORDER BY table_name;
```

Vous devriez voir :
- legal_documents
- user_legal_acceptances
- user_cookie_preferences
- guest_cookie_consents
- data_export_requests
- account_deletion_requests
- security_logs
- user_2fa
- admin_audit_logs
- suspicious_activity_alerts
- legal_entity_info
- data_retention_policies
- consent_logs
