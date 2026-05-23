-- Préférence alertes de connexion (e-mail si nouvelle empreinte navigateur / appareil)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "login_alerts_enabled" BOOLEAN NOT NULL DEFAULT true;
