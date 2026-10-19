-- Witness statements carry the interview summary and the excerpt the demand
-- letter may quote.

ALTER TABLE "liability_evidence_items" ADD COLUMN IF NOT EXISTS "witnessName" TEXT;
ALTER TABLE "liability_evidence_items" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "liability_evidence_items" ADD COLUMN IF NOT EXISTS "demandExcerpt" TEXT;
