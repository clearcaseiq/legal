# Case Assistance — phase 2 entry point

Phase 1 shipped the specialist role, the queue, the workspace and the AI panel.
It is deliberately **read-only on case answers**: a specialist guides the
claimant by phone and the claimant updates their own case.

Phase 2 is on-behalf editing — a specialist entering an answer for a claimant
who is on the phone. This document is why that is not a UI task, and what has
to be built first.

**Status:** the data groundwork is done. A specialist proposes a value, the
claimant confirms it, and only then does it land — guarded against a concurrent
edit and recorded per field. The remaining work is the two surfaces that call
those endpoints, plus the compliance prerequisites below, which gate the
contact tooling rather than the editing.

## Why on-behalf editing is blocked

### `Assessment.facts` is one JSON blob — now behind a choke point

`facts` is a `String @db.Text` holding the whole case. Fourteen write sites
across ten modules each parsed it, shallow-spread it and wrote the whole thing
back:

| Module | Write sites | Kind |
| --- | --- | --- |
| `routes/assessments.ts` | 4 | 3 updates, 1 create |
| `routes/rose.ts` | 2 | creates |
| `routes/case-insights.ts` | 1 | update |
| `routes/attorney-dashboard.ts` | 1 | create |
| `lib/case-recalculation.ts` | 1 | update |
| `lib/damages-ledger.ts` | 1 | update |
| `lib/liability-record.ts` | 1 | update |
| `lib/medical-record.ts` | 1 | update |
| `lib/question-facts-sync.ts` | 1 | update |
| `lib/question-medical-sync.ts` | 1 | update |

`lib/case-insights.ts` and `lib/rose-engine.ts` only *read* facts; the writes
attributed to them live in the corresponding route files.

**This part is done.** `lib/case-facts.ts` now owns every write. The ten update
sites call `updateCaseFacts`, which reads, parses strictly, applies a mutator
and records a change. The four create sites — which have no prior value to lose
— call `serializeCaseFacts` and stamp `lastWriteSource` at birth. A test in
`lib/case-facts.test.ts` scans the source tree and fails on a fifteenth writer,
because a choke point that is only a convention stops being one the first time
somebody writes the obvious four lines.

Two things it fixed on the way through:

- **Six sites could destroy the whole document.** They parsed with
  `try { JSON.parse(...) } catch { facts = {} }` and wrote the result straight
  back, so one malformed blob was rewritten as a near-empty case.
  `requireCaseFacts` throws instead. Note the behaviour change: a corrupt case
  now surfaces a visible error rather than silently "healing" into an empty one.
- **`revision` never moved on a facts write.** Every write now records a change,
  so the column finally means what the schema says.

Two further problems, both since fixed — see steps 1 and 2:

1. **A prior value was gone the moment a write landed.** There was nowhere to
   hold "the claimant said 3 weeks, the specialist entered 3 months" so a human
   could choose.
2. **Last-write-wins between two concurrent editors, silently.** A specialist
   and a claimant editing the same case in the same minute is the normal case
   for this feature, not an edge case.

### ~~The provenance fields cannot express per-field authorship~~ — addressed

- `Assessment.lastWriteSource` is **one string for the whole case**. It is read
  in two places in `lib/canonical-case.ts` and written by `recordCaseChange()`
  (and stamped at creation). Its documented `admin` value still has no call
  site. It cannot say "the claimant wrote the injury date and a specialist wrote
  the claim number" — `CaseFactChange` now does that instead, and this column is
  best read as "who touched the case last", nothing finer.
- `Assessment.revision` is now incremented in two places: `recordCaseChange()`
  in `lib/data-authority.ts`, and `updateCaseFacts`, which must bump it in the
  same statement as its guarded write. It used not to move on a facts write at
  all, because none of the fourteen writers called it. It is now a usable
  concurrency token, and `CaseChangeEvent` and `CaseFactChange` rows written for
  the same change share it.

## The order to build it in

### ~~0. Route every facts write through one function~~ — done

`lib/case-facts.ts`, described above.

### ~~1. Guard the write on the revision that was read~~ — done

`updateCaseFacts` scopes its write to `where: { id, revision }` and bumps
`revision` in the same statement. Both halves are needed: matching on the
revision excludes a concurrent writer, and moving it in the same statement is
what makes that exclusion hold for the next one. A writer that matches nothing
re-reads and re-applies its mutator against the winner's document, up to three
times before raising `CaseFactsConflictError`. The mutator contract already
anticipated this — a pure function of the facts it is handed re-runs safely.

Because the bump is now atomic with the facts, calling `recordCaseChange`
afterwards would increment a second time and leave the feed event pointing at a
revision that never existed as a distinct write. `data-authority.ts` gained
`recordCaseChangeAtRevision` for callers that bumped it themselves;
`recordCaseChange` is unchanged for everyone else.

Two things this changed outside the module. `universalPrismaMock` defaulted
`updateMany` to `{ count: 0 }`, so every guarded write in every test would have
taken the lost-race branch; the default is now `{ count: 1 }`, with the
no-match path still available explicitly. And the mock had no `createMany` at
all, which the provenance rows need.

### ~~2. Add a provenance record~~ — done

`CaseFactChange` records per-field authorship: dotted path, previous and next
value, revision, source, actor and action. Rows are written in the same
transaction as the facts, because facts without their provenance is the state
this model exists to prevent.

`lib/case-facts-diff.ts` turns two versions of the document into those paths.
Three decisions shape what it can answer:

- **Arrays compare whole.** `facts.treatment` is rewritten wholesale by the
  medical write-through, and pairing elements across two versions of an unkeyed
  array invents changes nobody made.
- **Absent is not null.** A field nobody has answered is not a field answered
  "no", so the two are distinguished rather than both serializing to `null`.
- **The diff is bounded at 40 paths.** `runCaseRecalculation` replaces the whole
  document on every evidence upload. Past the cap the diff records nothing and
  logs that it declined — half a rewrite attributed to one actor would read as a
  precise claim about fields it never singled out. The change feed still records
  that the write happened.

What is still missing for on-behalf editing: nothing reads these rows yet, and
no surface offers "the claimant said X, you entered Y — which stands?". The data
to answer it now exists.

### ~~3. Extend the two assets that are already the right shape~~ — done

Neither needed inventing; both needed widening.

**`ExternalWriteProposal`** already implemented preserve-both-values-and-
require-review, but only for three scalar `Assessment` columns arriving from
external systems. It now also carries proposals against paths *inside* the facts
document, where almost everything a specialist would capture on a call lives.
The `field` column holds `facts:<dotted.path>` for those, so no migration was
needed — every column the mechanism uses was already nullable text.

Approving a facts proposal goes through `updateCaseFacts`, which means it
inherits the revision guard and the `CaseFactChange` row from steps 1 and 2. The
two allowlists now read as a pair: `RECONCILABLE_FIELDS` for columns,
`PROPOSABLE_FACT_PATHS` in `lib/case-fact-paths.ts` for facts. The second is
deliberately narrow — facts a claimant can state plainly on a call. Consent
fields, derived values like `med_charges_source`, and `plaintiffMedicalReview`
(which is the claimant's review of *our* output) are absent on purpose.

Two details that would otherwise corrupt the document quietly. Proposals store
values as text because a reviewer has to see two of them side by side, so each
path carries the type needed to put the value back as a number or boolean rather
than `"1200"` where every reader does arithmetic. And several insurance keys
exist twice under different names — `claim_number` alongside `claimNumber` —
which `question-facts-sync.ts` already writes in pairs; a proposal writes the
mirrors too, or the old value keeps showing wherever the duplicate is read.

**Who may review** is now part of the model rather than an accident of which
route was called. `reviewerForSource` sends a specialist's proposal to the
claimant and everything else to the firm, and both approve and reject refuse a
caller whose declared standing does not match. A firm user confirming a
specialist's value on the claimant's behalf would defeat the entire reason it is
a proposal. The firm inbox excludes specialist proposals for the same reason.

**`buildPlaintiffMedicalReview`** was the model for the claimant's side rather
than the host for it: mixing arbitrary fact confirmations into a medical
chronology payload would be the wrong shape. `GET`/`POST
/v1/case-insights/assessments/:id/fact-confirmations` implements the same
interaction — here is what we have, confirm it or correct it — for values a
specialist took down.

Once confirmed, the provenance row attributes the value to the *claimant*, not
the specialist. That is deliberate: after they confirm, it is their answer. The
proposal row remains the durable record of who suggested it.

Both UI surfaces are now built. The specialist workspace has a "Record an
answer" panel that proposes an allowlisted field, and
`PlaintiffFactConfirmations` sits above the tabs on the claimant's results page
— above, because claimants arrive there from a notification email and a
confirmation buried under a tab is a proposal that never gets answered.

## Compliance prerequisites

These gate specific phase 2 features.

### UPL boundary enforced in the product, not just in training

A specialist under time pressure drifts from "ask about the claim number" to
"you probably have a good case". Phase 1 stated the boundary in the AI panel and
on the specialist login screen, which is a start and not a control.

`lib/upl-guard.ts` now enforces it on the only claimant-facing surface where a
specialist composes prose: the email body and subject in `POST
/v1/case-assistance/:id/email`. Everything else they can write is either an
allowlisted typed fact value or an internal note. Six categories are refused —
grading the claim, putting a number on it, telling the claimant what to do,
implying a lawyer-client relationship, deciding fault, and advising on an offer.
The route returns 422 with the matched phrases, and the workspace renders them
in the form with the draft still in the textarea.

It **blocks rather than warns**. A warning that can be clicked through is a
slower version of no control, and every one of these has a compliant phrasing.

Two things about it are worth stating plainly rather than discovering later.
First, it is a keyword check: it catches the phrasings people reach for and
misses paraphrase, so it shrinks the surface and does not eliminate it. It is
not a substitute for supervision, and everything a specialist writes remains
attributable to them.

Second, the hard part was not blocking advice but **not blocking the job**.
Recording what a claimant told you is the entire role; agreeing with its legal
conclusion is the violation, and the two are the same sentence with a different
preamble. So matches preceded by an attribution phrase — "you mentioned", "I
noted that", "the attorney will" — are exempt, bounded to the current sentence
because attribution does not survive a full stop. An earlier revision of the
valuation rule blocked "the attorney will discuss what your case may be worth",
which is the compliant alternative this module itself recommends; a guard that
forbids its own suggested rewrite only teaches people to route around it.

### Two-party recording consent, verified before a call connects

The Amazon Connect stack was already built: `startOutboundCall`, recordings,
Contact Lens transcripts and LLM summaries. What was missing was authorization.

`lib/recording-consent.ts` now gates `POST /v1/calls/start` before dialling.
This has to happen in the route, not the contact flow: the flow's first action
is `UpdateContactRecordingBehavior` for both participants, the attorney transfer
is two actions later, and there is no branch anywhere in it. Once the call is
placed the recording exists, so the only place to prevent one is before
`startOutboundCall`.

`ALL_PARTY_CONSENT_STATES` lists the fourteen states whose statutes require
every party to consent. Where the rule is contested or unsettled — Nevada by
case law, Michigan and Oregon for telephone calls, Connecticut on its civil
statute — the state is **included**. Wrongly including one costs an extra
prompt; wrongly excluding one is a criminal statute plus, in several of them, an
inadmissible recording, which destroys the evidentiary value that is the whole
reason for recording.

In an all-party state the attorney must have consented too. Because `Attorney`
has no user account, their consent is a `Consent` row carrying the attorney id
in `metadata` — the shape `attorney_share` already uses to name the firms an
authorization covers. `Call.recordingConsentNote`, previously never written,
now records which rule was applied and on what basis, because admissibility can
turn on that years later and these state lists change.

The `call_recording` template went to **1.1**, which forces re-consent. The 1.0
text told people "the spoken notice at the start of the call provides notice to
everyone on the line". The flow plays that notice to the claimant's leg only,
and before the attorney joins, so the attorney never heard it — and in an
all-party state that sentence was the entire basis for treating one person's
agreement as everyone's. Consent to that text is not consent to this one.

The honest weakness: **nothing in the schema records where the claimant
physically is.** `User` has no address, and `Assessment.venueState` is where the
incident happened, sometimes itself an IP-geolocation guess from intake — so
someone injured in Nevada who lives in California is stored as `NV`. The gate
takes the union of venue state and the attorney's `barState` and applies the
stricter rule. Both are proxies. A real fix needs the claimant's location
captured at call time.

Still outstanding, and not blocking: the contact flow's disclosure remains
one-sided, and `POST /v1/calls/start` is still plaintiff-authenticated with
`initiatedBy` hardcoded, so the `'staff'` value stays dead and phase 1 continues
to log manually placed specialist calls.

### Inbound STOP handling before any specialist-initiated SMS

The exposure here was not that we texted claimants. It was that
`IntakeWizardQuick` promised "Reply STOP to opt out" before taking their number,
in all three languages, while `processInboundSmsDecision` recognised only
attorney `ACCEPT` / `DECLINE` and dropped everything else. A claimant who texted
STOP was answered with "Reply ACCEPT to accept or DECLINE to decline the case" —
and on the SNS path we then sent them another text saying so.

Three pieces now exist:

**`SmsOptOut` is keyed on the phone number, not a user.** It has to be. The
claimant-facing sends read `IntakeLead.phone`, and an intake lead frequently has
no `User` row at all — those are exactly the people the abandonment and
report-ready texts reach, and exactly who would send a STOP. An opt-out attached
to a user id would have covered the wrong population while looking correct.

**One canonical key.** Five phone normalizers already existed in this repo and
they disagree: `lib/phone.ts` yields E.164, `sms.ts` yields `+digits`,
`sms-inbound.ts` yields bare digits. An opt-out is worthless if the number
written on the way in does not match the number read on the way out, so both
paths go through `optOutKey()` and nothing else.

**The check lives in `sendSms`.** Six of the eight outbound call sites reach it
directly and never touch `platform-notifications`, including all three
claimant-facing sends. A suppression check in the notification layer would have
looked right and covered the wrong half of the traffic.

Three details that are load-bearing:

- Keywords are parsed **before** the attorney lookup. Claimants are not rows in
  `Attorney`, so a STOP checked afterwards falls through to "Phone number not
  recognized".
- The confirmation reply sets `ignoreOptOut`. Carriers expect one final message
  acknowledging a STOP, and since the SNS path replies by placing a fresh
  outbound send, the suppression would otherwise swallow its own confirmation —
  making a honoured request look exactly like a dead number.
- `isSmsSuppressed` fails **closed** on a database error. Not texting someone who
  might have opted out is recoverable; texting someone who did is a statutory
  violation per message.
- Keyword matching is strict — the keyword alone, with punctuation. "please stop
  calling me about the deposition" is a conversation, and unsubscribing someone
  from case updates over it would be its own failure.

STOP now works, so SMS is no longer categorically barred from the specialist
toolset. Adding it still needs a claimant-facing consent record for
specialist-initiated texts; the opt-out is the floor, not the whole obligation.

## Deferred, non-blocking

Operational metrics — time to first contact, contact success rate, readiness
improvement per case — are deliberately phase 2. `CaseInteraction` records what
they need (`firstContactAt` is stored separately from `lastContactAt` for
exactly this reason), but the numbers are meaningless until real history
accumulates. `AdminAnalytics.tsx` also has no internal-staff section to put them
in; today it is platform and attorney metrics only.

Language-aware assignment is likewise left as a hook: the queue surfaces the
claimant's `preferredLanguage` so a specialist can see it before calling, but
`pickNextSpecialist()` does not match on it.
