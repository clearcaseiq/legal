# Attorney bar licence verification

How ClearCaseIQ decides that a person registering as an attorney is one, what
that decision is allowed to claim, and how any of it can be tested without
querying the California State Bar about people who do not exist.

> **Status.** Parts of this are now built. Implemented: name matching and the
> badge rule (`lib/bar-license-identity.ts`), the `licenseStatus` /
> `licenseRecordName` / `licenseNameMatch` columns, the pre-registration preview
> endpoint, the registration validate button, and the `STATE_BAR_LOOKUP_MODE`
> test mode with its fixture table (`lib/state-bar-mock.ts`). Still proposed:
> registration format validation via `normalizeBarNumber`, `licenseReviewState`
> and the admin review screen, the discipline field, and parser unit tests
> against a captured calbar fixture.

## The short version

A real lookup already exists. `POST /v1/attorney-profile/license/state-bar-lookup`
fetches `apps.calbar.ca.gov/attorney/LicenseeSearch/QuickSearch`, parses the
result table, and sets `licenseVerified` only when a row's bar number matches and
the status reads exactly `Active`. Nothing is verified from a format match.

What it does not do is tie that licence to the person typing it.

| | Today |
| --- | --- |
| Live lookup against the CA State Bar | Exists — an HTML scrape, no vendor or API key |
| Any state other than California | Fails closed, into a review process that does not exist |
| Name on the record checked against the registrant | **No** |
| Bar-number format validated at registration | **No** — any string is accepted |
| Non-Active statuses distinguished from "not found" | **No** |
| Way to test without calling the real State Bar | **No** |
| Tests for the parser, the endpoint, or the admin toggle | **None** |
| The uploaded licence document | Stored, never read by anything |

## The hole that matters

`lookupCaliforniaStateBarLicense` takes the attorney's name and never compares it
to the record it found:

```ts
const [name, status, number, city, admissionDate] = cells
if (number.replace(/\D/g, '') !== normalizedLicenseNumber) continue

const isActive = status.toLowerCase() === 'active'
return { found: isActive, /* … */ name, status, city, admissionDate }
```

`attorneyName` is used only to echo back on the not-found branch. So the lookup
answers "is this an active California bar number", not "is this yours". Anyone
can register under any name, enter a bar number belonging to a real attorney, and
receive a verified-licence badge carrying that attorney's identity.

That is also why the proposed `TEST-CA-000005 → name mismatch` case has nothing
to assert against yet. The rule has to exist before it can be tested.

## What verification is allowed to claim

Two flags already exist and mean different things. Keeping them separate is
deliberate and stays that way:

- `AttorneyProfile.licenseVerified` — this bar number resolves to an active
  licence. A licence fact.
- `Attorney.isVerified` — this attorney is live to claimants and eligible for
  routing. A business decision, only an admin makes it.

A passed lookup sets the first and never the second.

### Status handling

The current code collapses everything that is not `Active` into `found: false`,
which makes a suspended attorney indistinguishable from a typo. Each outcome
becomes its own recorded state:

| State Bar status | `licenseVerified` | Recorded | What the attorney is told |
| --- | --- | --- | --- |
| `Active` | true (if the name matches) | status verbatim | Licence verified |
| `Inactive` | false | status verbatim | Record found, licence is not active |
| `Suspended`, `Disbarred`, `Resigned` | false | status verbatim | Record found, not eligible to practise |
| No row for that number | false | `not_found` | No matching record — check the number |
| Non-CA state | **unchanged** | `unsupported_state` | Not yet automated for this state |
| Parse produced no usable rows | **unchanged** | `lookup_error` | Could not read the State Bar response, try again |
| Network or HTTP failure | unchanged (already) | `lookup_error` | Could not reach the State Bar, try again |

The last three rows are corrections rather than additions.

A network or HTTP failure throws, and the throw happens before the profile write,
so today's behaviour is already right — the prior verdict survives and the caller
gets a 500. The dangerous case is the one that does **not** throw. If calbar
changes its markup, the regex parser finds no matching row and returns
`found: false`, which is indistinguishable from "no such bar number" and writes
`licenseVerified: false`. Every attorney who retries after a markup change is
silently un-verified, by code whose comment reads "fail closed". A parse that
yields zero usable rows has to be separable from a parse that yields rows and
none that match, and only the second is an answer.

Submitting a non-CA state has the same shape: it returns `found: false` without
error and overwrites `licenseNumber` and `licenseState`, so an attorney with a
verified California licence who mistypes the state clears their own badge.

### Name matching

The rule reuses `nameTokens` / `compareToClaimant` from
`api/src/lib/claimant-identity-check.ts`, which already encodes the shared-token
comparison and its reasoning: any significant token in common is a match,
credentials and single initials are dropped. That accepts maiden names, nicknames
and middle initials, and rejects an entirely different person — the same
asymmetry we accepted for medical records, for the same reason.

| Outcome | `licenseVerified` | Effect |
| --- | --- | --- |
| Tokens shared with the record | true | Verified |
| No tokens shared | false | Record and its name stored, routed to admin review |
| Either name unreadable | false | Treated as no comparison; admin review |

A mismatch **does not block registration**. The account is created, the attorney
reaches the dashboard, and they are told the licence is pending review. Blocking
would turn a middle-initial difference into a support ticket, and the badge —
not the account — is what carries the claim.

## Schema

Added to `AttorneyProfile`:

| Field | Type | Purpose |
| --- | --- | --- |
| `licenseStatus` | `String?` | Status verbatim from the record, or the sentinel from the table above |
| `licenseRecordName` | `String?` | The name the State Bar has, which may not be the registrant's |
| `licenseNameMatch` | `String?` | `match`, `mismatch`, `unknown` |
| `licenseAdmissionDate` | `String?` | Comparable identity field the search already returns |
| `licenseCity` | `String?` | As above |
| `licenseReviewState` | `String?` | `none`, `pending`, `cleared`, `rejected` |
| `licenseLookupAt` | `DateTime?` | Last attempt, as distinct from last success |

`licenseVerifiedAt` already exists and is written but never read; staleness and
re-verification stay out of scope here.

**Uniqueness.** `Attorney.barNumber` is `@unique`, but registration only ever
writes `AttorneyProfile.licenseNumber`, which has no constraint — so the
guarantee protects a field the live path never populates. Two profiles can hold
the same bar number today. The fix is to write the normalised number through to
`Attorney.barNumber` on a successful lookup and let the existing constraint do
its job, which also turns a second person claiming a licence into a database
error rather than a duplicate badge.

## Registration validation

`normalizeBarNumber` in `api/src/lib/attorney-identity.ts` already enforces the
real rule — digits only, 2 to 7 of them, leading zeros stripped — and is wired
only into bulk import. Registration should use it, so `"N/A"` and `"pending"`
stop landing in `licenseNumber` verbatim. Note the second, unrelated
`normalizeBarNumber` in `lib/claims.ts` does no validation at all; the identity
one is the one to use.

Format validity is not verification and must not set any flag on its own.

## Test mode

### The switch

`STATE_BAR_LOOKUP_MODE`, following the `DROPBOX_SIGN_TEST_MODE` precedent — an
explicit override rather than anything inferred from `NODE_ENV`, so enabling
mocks is always a deliberate act:

| Value | Behaviour |
| --- | --- |
| `live` | Query the State Bar. The default. |
| `mock` | Serve from the fixture table below. Never opens a socket. |

`env.ts` fails at boot if the mode is `mock` while `NODE_ENV === 'production'`.
A silently mocked production would hand out verified badges to anyone.

### Where the mock intercepts

Ahead of normalisation. The lookup's first act is
`licenseNumber.replace(/\D/g, '')`, which would reduce `TEST-CA-000001` to
`000001` and `normalizeBarNumber` would further reduce it to `1`. The test
namespace has to be matched on the raw trimmed input, against
`/^TEST-CA-\d{6}$/i`, before any digits are stripped.

Test numbers are also rejected by registration validation in `live` mode, so one
can never be stored as a real licence.

### Fixtures

| Bar number | Record | Expected |
| --- | --- | --- |
| `TEST-CA-000001` | Ryan Garcia, Active, LA, admitted 2018-06-15 | Verified |
| `TEST-CA-000002` | Inactive | Not verified, status `Inactive` |
| `TEST-CA-000003` | Suspended | Not verified, status `Suspended` |
| `TEST-CA-000004` | Active, with discipline history | Verified, discipline surfaced |
| `TEST-CA-000005` | Active, record name differs from registrant | Not verified, `mismatch`, review |
| `TEST-CA-000006` | Active, record name is a maiden name | Verified — shared surname |
| `TEST-CA-999999` | — | `not_found` |
| `TEST-CA-000007` | Simulated upstream failure | `lookup_error`, prior verdict untouched |
| `TEST-CA-000008` | Simulated unreadable response | `lookup_error`, prior verdict untouched |

Plus the input cases, which never reach a lookup: `ABC123` rejected as malformed,
empty rejected as required, a valid-format number with a non-CA state returning
`unsupported_state`.

### Testing the real thing

Two separate concerns, and they should not share a test.

**The parser** is the brittle part — it walks `<tr>` elements with a regex and
breaks silently whenever calbar changes markup. It has no coverage at all today.
Capture a real response as a fixture under `api/src/test/fixtures/` and unit-test
the parser against it: the active row, a non-active row, a number that appears in
some other column, and an empty result. This runs offline and is the highest
value test in the set.

**The integration** — that we can still reach calbar and that its shape has not
changed — needs one live call against a genuinely listed attorney, e.g. bar
number `271370`. This stays out of PR CI: it depends on the network and on a
third party's markup, so in CI it fails on commits that did not break anything.
Nightly or on demand, alerting on failure.

## The manual-upload path

`AttorneyLicenseUpload.tsx` tells attorneys *"It will be reviewed by our team."*
No review process exists. Nothing enumerates profiles awaiting one, no admin
route can read the file, and `AdminAttorneys.tsx` offers a "Mark verified" toggle
on a screen showing only a name and an email. All 49 non-California states are
funnelled into this same promise.

`licenseReviewState` makes the queue expressible. The admin screen needs to show
what it is deciding about — the number, the state, the record name, the status,
the name-match verdict, and the uploaded document — before the toggle means
anything. Until then, "Mark verified" is a blind action, and it writes
`licenseVerificationMethod: 'admin_review'` as though it were not.

**Resolved differently, and better.** Rather than build the queue, the upload now
OCRs the document, reads the bar number off it and runs the same automatic
lookup and name comparison as typed entry (`license-document.ts`, writing
`licenseVerificationMethod: 'document_bar_lookup'`). A valid California bar card
therefore verifies on upload with nobody in the loop, and the false promise is
replaced by the actual outcome.

Extraction is deliberately strict: only a number explicitly labelled as a bar
number counts, and a document carrying two different ones yields nothing. The
failure that matters is not missing a number — that leaves the attorney where
they were — but reading the *wrong* one, which resolves to a real licence
belonging to someone else and reports as a name mismatch, sending an attorney
hunting for a typo they never made.

This leaves a genuine remainder for a human queue: unreadable documents, the 49
non-California states, and name mismatches. Those are now told plainly that they
are not verified and what to do, instead of being promised a review.

## Not in scope

Re-verification and licence expiry; states beyond California; treating discipline
history as an automatic disqualification; and replacing the scrape with a vendor
API. Each is worth its own decision.
