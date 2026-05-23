-- CDC: ajout suspension_hours pour timeouts courts (spam 1ère fois = 1h)
ALTER TABLE "UserStrike" ADD COLUMN IF NOT EXISTS "suspension_hours" INTEGER;
