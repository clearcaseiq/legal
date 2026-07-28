-- Editable case name (caption), conventionally "Plaintiff v. Defendant".
--
-- Free text rather than structured plaintiff/defendant columns: no defendant
-- name is captured anywhere in the schema or in intake, so there is nothing to
-- populate a structured second half from. The only stored defendant name in the
-- whole system is "document_requests"."recipientName" when recipientRole is
-- 'defendant', which exists only on cases where someone happened to serve the
-- opposing party directly.
--
-- Nullable on purpose. Null means "no caption chosen", and every display falls
-- back to the label cases have always shown (plaintiff name, then claim type),
-- so existing cases read exactly as they did before.
--
-- Idempotent, so this file is safe to re-run.

ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "caseName" TEXT;
