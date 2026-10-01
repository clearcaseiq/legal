-- ClearCaseIQ Super Demand: which template a letter uses, and the attorney approval gate.
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "template" TEXT;
ALTER TABLE "demand_letters" ADD COLUMN IF NOT EXISTS "approvalChecklist" TEXT;
