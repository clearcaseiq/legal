-- Postgres schema sync for: email_verification_tokens.
--
-- Single-use, expiring tokens backing the "Request verification link" email
-- verification flow (see api/src/routes/auth.ts). Like password_reset_tokens,
-- only a SHA-256 hash of the token is persisted; the raw token is emailed to the
-- user and never stored, so a DB leak can't be used to verify accounts.
--
-- This project manages the live PostgreSQL/Supabase schema with `prisma db push`,
-- while the prisma/migrations history is legacy MySQL. Apply this idempotent script
-- to staging/production to bring those databases in line with schema.prisma.
--
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_userId_fkey') THEN
    ALTER TABLE "email_verification_tokens"
      ADD CONSTRAINT "email_verification_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
