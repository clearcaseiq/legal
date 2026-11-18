# Secure data export API

Firm service accounts use the same `ccsk_*` credentials as the sync API. Create
a key from the Integrations settings with the `export:read` scope and an expiry.
Existing unscoped keys retain only their legacy case/change/proposal access.

## Endpoints

- `POST /v1/sync/exports` — queue `snapshot` or `incremental`. Incremental
  requests require `since_cursor`. An optional public HTTPS `webhook_url` and
  32+ character `webhook_secret` may be supplied; when the secret is omitted,
  the generated secret is returned once.
- `GET /v1/sync/exports/cursor` — current firm change cursor.
- `GET /v1/sync/exports/:id` — status, counts, reconciliation, checksum, expiry.
- `GET /v1/sync/exports/:id/download` — authorized ZIP download while ready and
  unexpired.

The ZIP contains versioned JSONL datasets for the firm's cases, contacts,
communications, appointments, financials, workflows, demands, documents,
evidence, predictions, reviews, outcomes, and audit/change history. Available
case-file binaries are included in separate archive paths. Firm settings,
integration credentials, tokens, and internal storage paths are excluded.

Exports use a repeatable-read database transaction and page records into
bounded JSONL writers. JSONL files and binaries are streamed into the ZIP
instead of being held in memory. The manifest contains the cutoff cursor,
assessment revisions, row/file counts, SHA-256 checksums, byte sizes,
omissions, and reconciliation totals.

Cases hidden from the requesting attorney by an ethical wall are omitted.
Cases with an explicit inactive `attorney_share` consent are also omitted,
except imported firm-owned cases. HIPAA evidence with an explicit inactive,
revoked, or expired HIPAA consent is omitted. Missing consent records retain
legacy behavior; they are not interpreted as an explicit denial. The manifest
records policy omissions without copying sensitive record content.

## Webhook verification

Completion callbacks include `x-cciq-timestamp`, `x-cciq-event-id`, and
`x-cciq-signature`. The signature is lowercase hexadecimal HMAC-SHA256 over:

`<timestamp>.<event-id>.<exact-request-body>`

Reject stale timestamps and previously processed event IDs. One event ID is
persisted when the export is queued and reused for every retry of that
completion event. Delivery uses bounded exponential backoff and never places
the signing secret or an
unauthenticated download token in the payload.

## Deployment and rollback

1. Confirm a recoverable PostgreSQL backup and object-storage availability.
2. Set `DEPLOY_ENV=qa` and run `npm run schema:apply:data-exports` from `api/`.
3. Deploy the API, run `scripts/validate-data-export-qa.ts`, and inspect the
   `data-exports` scheduler health, logs, latency, and object writes.
4. In production, repeat the backup check and set
   `ALLOW_PRODUCTION_SCHEMA_CHANGE=true` only for the guarded migration command.
5. Roll back application containers if needed. The migration is additive, so
   leave the new nullable column/tables in place during application rollback;
   dropping them would destroy the audit/artifact ledger. Expire artifacts and
   remove schema only in a separately approved data-removal change.
