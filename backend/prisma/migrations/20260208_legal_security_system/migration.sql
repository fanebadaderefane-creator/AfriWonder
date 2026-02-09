-- Migration: Legal & Security System (GDPR/CCPA Compliant)
-- Date: 2026-02-08

-- =====================================================
-- 1. LEGAL DOCUMENTS MANAGEMENT (Versioning obligatoire)
-- =====================================================
CREATE TABLE "legal_documents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "type" TEXT NOT NULL, -- 'privacy_policy', 'terms_of_service', 'cookies_policy', 'data_protection'
  "version" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'fr',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL, -- Full HTML/Markdown content
  "effective_date" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by" TEXT, -- Admin user ID
  UNIQUE("type", "version", "language")
);

CREATE INDEX "idx_legal_documents_type_active" ON "legal_documents"("type", "is_active");
CREATE INDEX "idx_legal_documents_effective_date" ON "legal_documents"("effective_date");

-- =====================================================
-- 2. USER LEGAL ACCEPTANCE TRACKING
-- =====================================================
CREATE TABLE "user_legal_acceptances" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "accepted_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" TEXT,
  "user_agent" TEXT,
  "device_info" JSONB, -- {device_type, os, browser}
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_user_legal_acceptances_user" ON "user_legal_acceptances"("user_id");
CREATE INDEX "idx_user_legal_acceptances_document" ON "user_legal_acceptances"("document_id");
CREATE INDEX "idx_user_legal_acceptances_accepted_at" ON "user_legal_acceptances"("accepted_at");

-- =====================================================
-- 3. COOKIE CONSENT MANAGEMENT (CMP)
-- =====================================================
CREATE TABLE "user_cookie_preferences" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT UNIQUE NOT NULL,
  "essential" BOOLEAN NOT NULL DEFAULT TRUE, -- Always true (required)
  "analytics" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketing" BOOLEAN NOT NULL DEFAULT FALSE,
  "functional" BOOLEAN NOT NULL DEFAULT FALSE,
  "social_media" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" TEXT,
  "user_agent" TEXT,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_cookie_preferences_user" ON "user_cookie_preferences"("user_id");

-- Guest cookie preferences (avant login)
CREATE TABLE "guest_cookie_consents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "session_id" TEXT NOT NULL,
  "essential" BOOLEAN NOT NULL DEFAULT TRUE,
  "analytics" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketing" BOOLEAN NOT NULL DEFAULT FALSE,
  "functional" BOOLEAN NOT NULL DEFAULT FALSE,
  "social_media" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" TEXT,
  "expires_at" TIMESTAMP NOT NULL
);

CREATE INDEX "idx_guest_cookie_session" ON "guest_cookie_consents"("session_id");

-- =====================================================
-- 4. DATA EXPORT REQUESTS (GDPR Article 20)
-- =====================================================
CREATE TABLE "data_export_requests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  "format" TEXT NOT NULL DEFAULT 'json', -- 'json', 'csv', 'pdf'
  "requested_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "expires_at" TIMESTAMP, -- Download link expires after 7 days
  "download_url" TEXT,
  "file_size" BIGINT, -- In bytes
  "error_message" TEXT,
  "ip_address" TEXT,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_data_export_user" ON "data_export_requests"("user_id");
CREATE INDEX "idx_data_export_status" ON "data_export_requests"("status");
CREATE INDEX "idx_data_export_requested_at" ON "data_export_requests"("requested_at");

-- =====================================================
-- 5. ACCOUNT DELETION REQUESTS (GDPR Right to Erasure)
-- =====================================================
CREATE TABLE "account_deletion_requests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "reason" TEXT,
  "requested_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "scheduled_deletion_at" TIMESTAMP NOT NULL, -- 30 days after request
  "deleted_at" TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'cancelled', 'completed'
  "cancellation_token" TEXT UNIQUE, -- To allow user to cancel
  "ip_address" TEXT,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_deletion_user" ON "account_deletion_requests"("user_id");
CREATE INDEX "idx_deletion_status" ON "account_deletion_requests"("status");
CREATE INDEX "idx_deletion_scheduled" ON "account_deletion_requests"("scheduled_deletion_at");

-- =====================================================
-- 6. SECURITY LOGS (Audit Trail)
-- =====================================================
CREATE TABLE "security_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- 'login', 'logout', 'password_change', 'email_change', 'withdrawal', 'account_deletion', 'login_failed', '2fa_enabled', '2fa_disabled'
  "status" TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'suspicious'
  "ip_address" TEXT NOT NULL,
  "user_agent" TEXT,
  "device_info" JSONB, -- {device_type, os, browser, location}
  "metadata" JSONB, -- Additional context
  "risk_score" INTEGER DEFAULT 0, -- 0-100, for suspicious activity detection
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_security_logs_user" ON "security_logs"("user_id");
CREATE INDEX "idx_security_logs_action" ON "security_logs"("action");
CREATE INDEX "idx_security_logs_created_at" ON "security_logs"("created_at");
CREATE INDEX "idx_security_logs_risk_score" ON "security_logs"("risk_score");

-- =====================================================
-- 7. TWO-FACTOR AUTHENTICATION
-- =====================================================
CREATE TABLE "user_2fa" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT UNIQUE NOT NULL,
  "method" TEXT NOT NULL, -- 'sms', 'authenticator', 'email'
  "is_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "secret" TEXT, -- For TOTP (Google Authenticator)
  "backup_codes" TEXT[], -- Array of backup codes
  "phone_number" TEXT, -- For SMS
  "last_used_at" TIMESTAMP,
  "enabled_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_2fa_user" ON "user_2fa"("user_id");
CREATE INDEX "idx_2fa_enabled" ON "user_2fa"("is_enabled");

-- =====================================================
-- 8. ADMIN AUDIT LOGS
-- =====================================================
CREATE TABLE "admin_audit_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- 'user_ban', 'content_delete', 'settings_change', 'legal_update', 'payout_approve', etc.
  "entity_type" TEXT, -- 'user', 'video', 'product', 'order', 'legal_document'
  "entity_id" TEXT,
  "changes" JSONB, -- Before/after values
  "ip_address" TEXT,
  "user_agent" TEXT,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_admin_audit_admin" ON "admin_audit_logs"("admin_id");
CREATE INDEX "idx_admin_audit_entity" ON "admin_audit_logs"("entity_type", "entity_id");
CREATE INDEX "idx_admin_audit_timestamp" ON "admin_audit_logs"("timestamp");

-- =====================================================
-- 9. SUSPICIOUS ACTIVITY ALERTS
-- =====================================================
CREATE TABLE "suspicious_activity_alerts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "alert_type" TEXT NOT NULL, -- 'new_country', 'multiple_failed_logins', 'unusual_withdrawal', 'rapid_transactions'
  "severity" TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  "description" TEXT NOT NULL,
  "metadata" JSONB, -- Context data
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'false_positive'
  "notified_at" TIMESTAMP,
  "reviewed_by" TEXT, -- Admin ID
  "reviewed_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_suspicious_alerts_user" ON "suspicious_activity_alerts"("user_id");
CREATE INDEX "idx_suspicious_alerts_status" ON "suspicious_activity_alerts"("status");
CREATE INDEX "idx_suspicious_alerts_severity" ON "suspicious_activity_alerts"("severity");
CREATE INDEX "idx_suspicious_alerts_created" ON "suspicious_activity_alerts"("created_at");

-- =====================================================
-- 10. LEGAL ENTITY INFORMATION (DPO, Company Info)
-- =====================================================
CREATE TABLE "legal_entity_info" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "company_name" TEXT NOT NULL,
  "legal_form" TEXT, -- 'SARL', 'SAS', 'SA', etc.
  "registration_number" TEXT, -- SIRET, Company registration number
  "vat_number" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postal_code" TEXT,
  "country" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT NOT NULL,
  "dpo_name" TEXT, -- Data Protection Officer
  "dpo_email" TEXT,
  "dpo_phone" TEXT,
  "data_controller" TEXT, -- Name of data controller
  "hosting_provider" TEXT, -- e.g., 'AWS', 'Google Cloud'
  "hosting_region" TEXT, -- e.g., 'eu-west-1'
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Only one row in this table
INSERT INTO "legal_entity_info" ("id", "company_name", "address", "city", "country", "email")
VALUES ('default', 'AfriConnect', 'À compléter', 'À compléter', 'Mali', 'fanebadaderefane@gmail.com');

-- =====================================================
-- 11. DATA RETENTION POLICIES
-- =====================================================
CREATE TABLE "data_retention_policies" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "data_type" TEXT NOT NULL UNIQUE, -- 'messages', 'logs', 'payment_records', 'analytics', 'deleted_accounts'
  "retention_days" INTEGER NOT NULL, -- Number of days to retain
  "description" TEXT,
  "auto_delete_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_cleanup_at" TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Default retention policies
INSERT INTO "data_retention_policies" ("data_type", "retention_days", "description") VALUES
('security_logs', 365, 'Logs de sécurité conservés 1 an'),
('messages', 730, 'Messages conservés 2 ans'),
('payment_records', 3650, 'Données de paiement conservées 10 ans (obligation légale)'),
('analytics', 730, 'Données analytiques conservées 2 ans'),
('deleted_accounts_soft', 30, 'Comptes supprimés (soft delete) définitivement effacés après 30 jours'),
('session_logs', 90, 'Logs de session conservés 90 jours');

-- =====================================================
-- 12. CONSENT LOGS (Detailed consent tracking)
-- =====================================================
CREATE TABLE "consent_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT,
  "consent_type" TEXT NOT NULL, -- 'cookies', 'terms', 'privacy', 'marketing_emails', 'push_notifications'
  "consent_given" BOOLEAN NOT NULL,
  "consent_version" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_consent_logs_user" ON "consent_logs"("user_id");
CREATE INDEX "idx_consent_logs_type" ON "consent_logs"("consent_type");
CREATE INDEX "idx_consent_logs_created" ON "consent_logs"("created_at");
