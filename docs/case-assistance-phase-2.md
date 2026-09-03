# Case Assistance — phase 2 entry point

Phase 1 shipped the specialist role, the queue, the workspace and the AI panel.
It is deliberately **read-only on case answers**: a specialist guides the
claimant by phone and the claimant updates their own case.

Phase 2 is on-behalf editing — a specialist entering an answer for a claimant
who is on the phone. This document is why that is not a UI task, and what has
to be built first.

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

What is still missing for on-behalf editing:

1. **A prior value is gone the moment a write lands.** There is nowhere to hold
   "the claimant said 3 weeks, the specialist entered 3 months" so a human can
   choose. Any "original versus updated" view has nothing to read. This needs
   the provenance record in step 2 below.
2. **Last-write-wins between two concurrent editors, silently.** A specialist
   and a claimant editing the same case in the same minute is the normal case
   for this feature, not an edge case. The choke point returns the revision it
   produced, so the guard is now a change to one function — see step 1.

### The provenance fields cannot express per-field authorship

- `Assessment.lastWriteSource` is **one string for the whole case**. It is read
  in two places in `lib/canonical-case.ts` and written by `recordCaseChange()`
  (and now stamped at creation). Its documented `admin` value still has no call
  site. It cannot say "the claimant wrote the injury date and a specialist wrote
  the claim number".
- `Assessment.revision` is incremented in exactly one place —
  `recordCaseChange()` in `lib/data-authority.ts`. It used not to move on a facts
  write at all, because none of the fourteen writers called it; the choke point
  now does, so it is usable as a concurrency token. Per-field authorship still
  needs its own record.

Building the editing UI before provenance exists means building it twice: once
against a data model that cannot record who said what, and again afterwards.

## The order to build it in

### ~~0. Route every facts write through one function~~ — done

`lib/case-facts.ts`, described above.

### 1. Guard the write on the revision that was read

`updateCaseFacts` currently reads, mutates and writes without a concurrency
check, so two writers that read the same revision still race. The fix is a
`where: { id, revision }` on the write — which means `updateMany` and a
`count === 0` check — plus a retry that re-reads and re-runs the mutator.

Two reasons this was left out of the choke-point change rather than bundled
with it. It makes writes able to *fail* where they previously always succeeded,
across ten call sites whose error handling ranges from swallowing to a 500. And
it needs `prisma.assessment.updateMany` to stop defaulting to `{ count: 0 }` in
`test/universalPrismaMock.ts`, which every existing test through these paths
would otherwise trip over. Both are tractable; neither belongs in the same
commit as a mechanical refactor.

The mutator contract already anticipates this: it must be a pure function of the
facts it is handed, so re-running it against a fresh read is safe.

### 2. Add a provenance record

Per-field authorship, not per-case. Which field, what the value was, what it
became, who changed it, through which surface, and when.

### 3. Extend the two assets that are already the right shape

Neither of these needs inventing; both need widening.

- **`ExternalWriteProposal`** already implements preserve-both-values-and-
  require-review, but only for three scalar `Assessment` fields (`caseName`,
  `status`, `venueCounty`) arriving from external systems. The mechanism is
  correct; the scope is narrow.
- **`buildPlaintiffMedicalReview`** in `lib/case-insights.ts` already implements
  claimant confirmation with per-item corrections, for the medical chronology.
  That is exactly the interaction a specialist-entered value needs: the claimant
  confirms it before it counts as theirs.

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
