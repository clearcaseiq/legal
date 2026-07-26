-- The admin audit viewer orders by createdAt DESC and filters on action /
-- entityType. audit_logs is append-only and written on every mutating /v1
-- request, so without these each page was a full scan of the whole table.
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
