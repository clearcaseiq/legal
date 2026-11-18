# Clio Manage integration

ClearCaseIQ can connect to Clio Manage with OAuth 2.0 and import new matters
into a firm's ClearCaseIQ workspace. The integration is deliberately read-only
for inbound caseload import.

API reference: https://docs.developers.clio.com/clio-manage/api-reference/

## Current behavior

- Connects a firm-owned Clio account through OAuth.
- Reads matters, clients, practice areas, and matter custom-field values.
- Imports new matters as attorney-owned ClearCaseIQ cases.
- Detects changed claim type, venue, date of loss, and narrative on previously
  imported matters and sends those changes to the firm's reconciliation queue.
- Uses Clio's `updated_since` watermark and paging links.
- Retries rate-limited and transient read requests using Clio's `Retry-After`
  header, exponential backoff, and a bounded request timeout.
- Verifies read access to Matters and Custom Fields during OAuth connection.
- Encrypts OAuth access and refresh tokens with AES-256-GCM at rest.
- Requires an explicit per-connection opt-in before any caseload is read.
- Supports a dry-run preview before creating cases.
- Never uses Clio `open_date` as the date of loss.

The importer does not currently transfer document files or provide
bidirectional synchronization. It never silently overwrites an existing case:
changed source values are held for firm approval, and an unchanged matter from
the same Clio ID is reported as already on file.

## Create the Clio developer app

1. Create a Clio Manage developer application.
2. Configure the authorization-code OAuth flow.
3. Register the callback for the target environment:
   - Production: `https://api.clearcaseiq.com/v1/integrations/callback/clio`
   - QA: `https://api-qa.clearcaseiq.com/v1/integrations/callback/clio`
   - Local: `http://localhost:4000/v1/integrations/callback/clio`
4. Give the app read access to Matters, Contacts, Practice Areas, and Custom
   Fields/Custom Field Values. Clio controls these permissions in the app
   configuration rather than through a `scope` query parameter.
5. Store the client ID and client secret only in the API environment.

Use a separate Clio developer app for QA when possible. This keeps test
authorizations and callback configuration isolated from production.

## Environment

```env
CMS_TOKEN_ENCRYPTION_KEY=<high-entropy random secret>
CLIO_CLIENT_ID=<Clio app client id>
CLIO_CLIENT_SECRET=<Clio app client secret>
CLIO_REDIRECT_URI=https://api.clearcaseiq.com/v1/integrations/callback/clio
CLIO_API_BASE=https://app.clio.com
```

`CMS_TOKEN_ENCRYPTION_KEY` must remain stable. Changing it makes already stored
CMS tokens unreadable, requiring firms to reconnect.

`CLIO_API_BASE` defaults to the US base. Use the Clio base appropriate to the
account's region when configuring a non-US deployment.

## Matter custom fields

Clio does not provide a built-in date-of-loss field. ClearCaseIQ recognizes
these matter custom-field names:

- Date of Loss
- Incident Date
- Accident Date
- Date of Incident

Venue state aliases:

- Venue State
- Jurisdiction State
- State of Venue

Venue county aliases:

- Venue County
- Jurisdiction County
- County of Venue

Field matching ignores capitalization, spaces, punctuation, and underscores.
Venue state must contain a two-letter state code. A trailing `County` is
removed from venue county. Date values use the same strict parser as manual
imports; invalid, impossible, or future dates are not imported.

Matters without a trustworthy date of loss are listed as needing attention.
Unknown custom fields remain in the preserved raw Clio payload.

## Firm workflow

1. An authenticated attorney opens **Integrations** and connects Clio.
2. In **Imports & intake**, the attorney enables **Import new matters
   automatically** for that connection.
3. The attorney selects **Preview** to review imports and skipped matters.
4. The attorney selects **Sync now** to create cases.
5. New matters are checked periodically while the connection remains enabled
   and connected.
6. Disconnecting Clio deletes the stored tokens and disables automatic import.

## Sandbox verification

Create sanitized Clio test matters covering:

- A person client with email and phone.
- A company client using only its display name.
- Each supported date-of-loss custom-field alias.
- Venue state and county custom fields.
- An impossible date, a future date, and a matter with no date of loss.
- More than one page of matters.
- A matter updated after the first sync. Confirm changed values become pending
  firm-review proposals and a repeated sync does not duplicate those proposals.
- A previously imported Clio matter, which must be reported as already on file.

Run Preview first and compare the matter count, client identity, date of loss,
venue, practice area, skipped reasons, and Clio matter IDs. Then run the real
sync and confirm a second run creates no duplicate cases.
