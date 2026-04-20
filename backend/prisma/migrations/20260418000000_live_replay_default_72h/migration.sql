-- Alignement CDC 6.5 : défaut ≈ 72 h (3 jours) pour nouveaux lives ; les existants conservent leur valeur.
ALTER TABLE "LiveStream" ALTER COLUMN "replay_retention_days" SET DEFAULT 3;
