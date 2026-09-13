-- Mailing address for claimants, used for demand letters and settlement checks.
-- Nullable throughout: every existing row predates the field, and an address is
-- not something we can infer.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
