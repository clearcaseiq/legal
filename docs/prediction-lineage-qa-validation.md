# Prediction lineage QA validation

Date: 2026-11-16

## Environment

- Dedicated local PostgreSQL 16 database: `clearcaseiq_lineage_qa`
- Source: isolated clone of the local non-production database
- Existing predictions before migration: 40
- Production was not accessed or changed.
- Outbound email, SMS, and payments remained disabled.

No remote QA database credentials were available in the workspace, so this
phase validates real PostgreSQL behavior locally. Repeat the same gated test
against the remote QA database before production.

## Migration results

The prediction-lineage SQL migration applied successfully. Existing prediction
rows remained readable with null lineage columns, as designed.

Two schema/deployment characteristics were found:

1. `api/prisma/migrations/migration_lock.toml` still declares `mysql` while the
   current Prisma datasource is PostgreSQL. `prisma migrate deploy` stops with
   P3019.
2. The existing database has no `_prisma_migrations` table and was behind the
   checked-in schema. The API entrypoint confirms that PostgreSQL environments
   are intentionally managed with non-destructive `prisma db push`.

Changing the legacy lock file or inventing a PostgreSQL Prisma baseline would
conflict with the established deployment path. The lineage SQL is therefore
applied through `api/scripts/apply-prediction-lineage-schema.mjs`, a controlled
PostgreSQL applicator with an advisory lock, transaction, SHA-256 checksum
ledger, complete-schema verification, partial-schema refusal, and an explicit
production safety gate.

The original lineage deduplication index name exceeded PostgreSQL's 63-byte
identifier limit and was silently truncated. It is now explicitly named
`predictions_lineage_dedupe_key`.

The applicator was run twice against `clearcaseiq_lineage_qa`. It first adopted
and verified the already-applied schema, then reported `already applied and
verified`. A production-mode invocation without
`ALLOW_PRODUCTION_SCHEMA_CHANGE=true` was refused as designed.

A temporary clone was also rolled back to the pre-lineage schema. The
applicator completed the fresh transactional apply, preserved all 40 prediction
rows, and passed a second idempotency run. The temporary database was removed.

## Real-database scenario

`api/src/prediction-lineage.postgres.test.ts` passed against PostgreSQL and
verified:

- initial plaintiff prediction;
- evidence-driven recalculation and a second prediction;
- structured attorney disagreement linked to that second prediction;
- later evidence and later prediction versions without moving the disagreement;
- transaction/reload persistence of snapshots, SHA-256 hashes, assessment
  revisions, model versions, and trigger-event links;
- concurrent evidence recalculations with optimistic-revision retry and no
  mismatched or duplicate lineage tuple;
- 55 simultaneous field changes, with all 55 `CaseFactChange` rows retained;
- database rejection of assessment deletion while predictions exist;
- database rejection of prediction deletion while a review references it;
- successful authorized deletion in review → prediction → assessment order;
- database enforcement of the lineage deduplication key.

The synthetic fixture was removed after the test. The 40 legacy predictions
remained intact.

## Rollback compatibility

An isolated clone was migrated backward with
`docs/prediction-lineage-rollback.sql`, then migrated forward again.

- All 40 existing predictions survived rollback and reapplication.
- The rollback restored `ON DELETE CASCADE`.
- Reapplication restored `ON DELETE RESTRICT`.
- All 40 legacy predictions retained null lineage fields.
- The deduplication index was restored with its explicit short name.

Database rollback discards lineage and structured disagreement columns. Export
those fields first if an emergency database rollback is ever required.

## Production recommendation

The schema-management blocker is resolved. Production remains a controlled
operational decision and was not accessed during this validation.

Before production:

1. Run the applicator and `prediction-lineage.postgres.test.ts` against the
   remote QA database using a recent sanitized production clone.
2. Confirm outbound integrations are disabled in QA.
3. Take a production backup and confirm its restore procedure.
4. Compare row counts and constraints before and after migration.
5. Apply the schema with the backup-gated command documented in
   `docs/prediction-lineage-migration.md`.
6. Deploy the API and web application through the normal release process, then
   run the authorized synthetic production verification and monitor database
   errors and prediction latency.
