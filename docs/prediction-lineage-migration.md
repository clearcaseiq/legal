# Prediction lineage migration plan

## Scope

This change adds append-only lineage to new predictions, complete per-field fact
auditing, protected prediction retention, and structured attorney opinions. It
does not change liability calculations or recalculation triggers.

## Deployment

This repository's checked-in Prisma migration history is legacy MySQL history.
PostgreSQL environments are normally synchronized by the API entrypoint with
non-destructive `prisma db push`. Do not change `migration_lock.toml` and do not
run `prisma migrate deploy`.

The lineage change is applied once with
`api/scripts/apply-prediction-lineage-schema.mjs`. The applicator:

- takes a PostgreSQL advisory lock;
- records the migration and its SHA-256 checksum in
  `clearcaseiq_schema_changes`;
- applies the SQL transactionally;
- adopts a complete schema that was already applied, but refuses a partial one;
- verifies columns, foreign keys, the deduplication index, and unchanged
  prediction counts; and
- refuses production unless `ALLOW_PRODUCTION_SCHEMA_CHANGE=true`.

### QA

From the repository root, select the release image without changing the
currently deployed tag:

```bash
export TAG=<reviewed-release-commit-sha>
export API_IMAGE="${REGISTRY:-302524629649.dkr.ecr.us-east-1.amazonaws.com}/clearcaseiq-api:${TAG}"
docker compose -f docker-compose.deploy.yml --env-file .env.qa pull api
docker compose -f docker-compose.deploy.yml --env-file .env.qa \
  run --rm --no-deps -T --entrypoint node api \
  scripts/apply-prediction-lineage-schema.mjs
```

Run it a second time and require `already applied and verified`. Then run the
database-backed lineage test and normal QA deployment.

### Production

1. Create a recoverable production backup, test or otherwise confirm the
   restore procedure, and record current `Prediction` and `Assessment` counts.
2. Confirm the selected `API_IMAGE` contains this applicator and the reviewed
   migration checksum.
3. Apply the schema in the maintenance window:

```bash
export TAG=<reviewed-release-commit-sha>
export API_IMAGE="${REGISTRY:-302524629649.dkr.ecr.us-east-1.amazonaws.com}/clearcaseiq-api:${TAG}"
docker compose -f docker-compose.deploy.yml --env-file .env.prod pull api
docker compose -f docker-compose.deploy.yml --env-file .env.prod \
  run --rm --no-deps -T \
  -e ALLOW_PRODUCTION_SCHEMA_CHANGE=true \
  --entrypoint node api scripts/apply-prediction-lineage-schema.mjs
```

4. Require `applied and verified` (or `already applied and verified`), then run
   the normal `./deploy/deploy.sh prod <tag>` deployment. The entrypoint's
   `prisma db push` should verify/no-op against the applied schema.
5. Verify new predictions have a 64-character hash, a valid trigger event, and
   a snapshot whose revision and model version match the prediction row.
   Concurrent attempts for the same revision, hash, and model version must
   resolve to one row through the database uniqueness key.
6. Compare pre/post-deploy counts and monitor database errors and prediction
   latency. Use a small authorized synthetic case to exercise evidence-driven
   recalculation and an attorney review without destructive testing on client
   data.

## Existing rows

Legacy predictions remain readable with null lineage fields. Do not synthesize
historical input snapshots: the exact inputs and configuration used for those
rows cannot be reconstructed reliably after the fact. They should be presented
as “legacy lineage unavailable.”

## Retention and deletion

The Prediction-to-Assessment foreign key changes from cascade to restrict.
Ordinary assessment deletion therefore fails while prediction history exists.
The authorized claimant-erasure and import-rollback workflows explicitly delete
attorney reviews, then predictions, then assessments in one transaction.

## Rollback

The application can be rolled back before the database because old code ignores
the additive columns. Reverting the database migration is destructive: first
drop the review and trigger-event foreign keys and indexes, restore the
Prediction-to-Assessment cascade, then drop the added columns. Preserve an
export of lineage and attorney-review data before doing so.
