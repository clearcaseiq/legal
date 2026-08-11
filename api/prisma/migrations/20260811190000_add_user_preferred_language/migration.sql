-- Persist plaintiff preferred UI/communication language (en | es | zh).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT;
