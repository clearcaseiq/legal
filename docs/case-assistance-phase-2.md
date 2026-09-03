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

What is left is the UI. `POST /v1/case-assistance/:id/proposals` and the
confirmation endpoints are wired and tested, but the specialist workspace has no
control that calls the first and the claimant's case page has none for the
second.

## Compliance prerequisites

These gate specific phase 2 features. None of them is satisfied today.

### UPL boundary enforced in the product, not just in training

A specialist under time pressure drifts from "ask about the claim number" to
"you probably have a good case". Phase 1 states the boundary in the AI panel and
on the specialist login screen, which is a start and not a control. Before
on-behalf editing — where a specialist is authoring case content — the boundary
needs to be enforced by the surface itself.

### Two-party recording consent, verified before a call connects

The Amazon Connect stack is already built: `startOutboundCall`, recordings,
Contact Lens transcripts and LLM summaries. What is missing is the authorization
path — `POST /v1/calls/start` is plaintiff-authenticated and hardcodes
`initiatedBy: 'plaintiff'`; the `'staff'` value is documented and dead.

California is a two-party consent state. The `call_recording` consent template
exists in `lib/consent-templates.ts`; it must be **checked before dialling**,
not recorded afterwards. Until then, phase 1 logs manually placed calls.

### Inbound STOP handling before any specialist-initiated SMS

`sendSms` can text a claimant today. Inbound SMS handling only recognises
attorney `ACCEPT` / `DECLINE` replies via `processInboundSmsDecision` and drops
everything else — **nothing processes a STOP**. Specialists texting claimants
without working opt-out is TCPA exposure. SMS stays out of the specialist
toolset until inbound handling exists.

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
