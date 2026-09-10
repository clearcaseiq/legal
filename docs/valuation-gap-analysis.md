# Valuation gap analysis

How ClearCaseIQ values a case, measured against how a major carrier values the
same case. The carrier benchmark is State Farm's use of Colossus, the claims
software that scores a bodily-injury demand and produces the adjuster's
authority range.

This exists because the two sides of a negotiation are running different
models, and the places where ours is coarser than theirs are the places an
adjuster gets to argue us down for free.

## The short version

The core method matches. We use the multiplier method, the same shape Colossus
uses: economic damages plus a general-damages figure scaled by severity, then
adjusted for liability and venue. Where we anchor differs and should — Colossus
is tuned to produce the carrier's opening authority, ours is meant to describe
fair value.

Below that, five things were wrong or missing. All five are now closed.

| Area | Status |
| --- | --- |
| Policy limits ignored | Fixed — `coverage-ceiling.ts` |
| ICD/CPT codes never reached the number | Fixed — codes now set severity |
| Treatment gaps and imaging never reached the number | Fixed — real chronology replaces the keyword scan |
| Calibration graded an engine nobody reads | Fixed — the loop now grades underwriting |
| The claimant was shown a discounted number | Fixed — doubt now sits in the band width |

## The root cause three of them shared

There were two valuation engines, and the sophisticated one was discarded.

`prediction.ts` computes a detailed heuristic valuation: it reads ICD and CPT
codes through `clinical-codes.ts`, measures real treatment gaps and onset delay
through `treatment-chronology.ts`, and accounts for imaging and policy limits.
`underwriting-engine.ts` computes a second, simpler valuation.

In `routes/predict.ts`, `reconcileValueBandsWithUnderwriting` overwrites the
heuristic bands with the underwriting bands. Underwriting wins. So every signal
that only `prediction.ts` knew how to read was computed, logged, and thrown away
before anyone saw a number.

Three of them were therefore one gap: the analysis existed, it just ran in the
engine that lost. The fix was to route those signals into the engine that wins,
rather than to rewrite the analysis.

Both engines still exist and underwriting still overwrites the heuristic. That
duplication is worth removing eventually, but it is now a tidiness problem
rather than a correctness one — no signal is lost on the way to the claimant.

## What was fixed

**Policy limits are now applied to the estimate.**

`reconcileValueBandsWithUnderwriting` hardcoded `policyLimitConstrained: false`
on both the settlement and trial bands, discarding the constraint
`prediction.ts` had already computed. A claimant with a $200,000 case against a
$25,000 policy was shown a six-figure estimate, next to a disclaimer that
claimed the estimate reflected "insurance constraints."

`coverage-ceiling.ts` now resolves what coverage can actually pay, and
`calculateSettlement` applies it to the finished band so everything downstream
inherits the cap.

Two details worth knowing, because both are easy to get backwards:

- **An unknown limit means no cap, not a guessed one.** Carriers are not
  obliged to disclose limits until a written request, and often not until suit,
  so most cases have no limit on file for weeks. Capping on absent data would
  invent a ceiling.
- **Confirmed UM/UIM is added to the ceiling, and unconfirmed UM/UIM suppresses
  the cap entirely.** Underinsured coverage stacks on top of the defendant's
  policy — a $120,000 case against a $50,000 policy still recovers $95,000 when
  the claimant carries $45,000 of UIM. Intake captures UM/UIM as a yes/no with
  no dollar figure, so when a claimant says they have it and nobody has pulled
  the declarations page, capping at the defendant's limit alone would
  *understate* the case. That is the more damaging error of the two, because
  the number looks authoritative either way.

MedPay is deliberately excluded from the ceiling: it pays medical bills
regardless of fault and does not reduce the third-party bodily-injury recovery,
so counting it would double-count.

The trial band reports the constraint but is not capped by it. A verdict is not
limited by the policy — an excess judgment is the predicate for a bad-faith
claim against the carrier, so capping the trial band would erase the one signal
that says the case is worth more than the coverage.

### ICD and CPT codes now set severity

Colossus scores specific diagnosis codes. A cervical radiculopathy with a
positive EMG scores differently from a cervical strain, and the adjuster's
authority moves accordingly. Our severity was driven by keyword matching on
narrative text, which cannot make that distinction.

`calculateSeverity` now reads the coded diagnosis. Codes come off the medical
records, so they outrank narrative keywords — but only upward. A coded sprain
does not disprove a herniation the treating physician described in a report
nobody has coded yet, so codes upgrade the injury and never downgrade it.
Procedure codes are also treated as proof of the procedure, so a surgery or
injection the bills show but the narrative never mentioned still counts.

The classification itself was at the code *family* level, which collapsed
distinctions worth six figures. It now reads the subcategory and, where it
carries severity, the seventh character:

- **Brain injury.** S06.0 (concussion), S06.1-.3 (structural injury) and
  S06.4-.6 (intracranial haemorrhage) are three different cases, and used to
  score identically. Loss-of-consciousness duration, encoded as the sixth
  character, upgrades a concussion that kept someone under for hours.
- **Spinal.** S14/S24/S34 covers both cord injuries and nerve-root or plexus
  injuries, and everything in the range scored as a cord injury. Cord injuries
  and cauda equina are now separated from radiculopathies.
- **Disc.** The subcategory separates the carrier's best argument from ours:
  `.3` is degeneration, which they will call pre-existing, while `.1` is a
  documented radiculopathy and `.0` is cord compression.
- **Fracture.** A femur or skull fracture no longer scores the same as a finger,
  ribs are separated from the thoracic vertebrae that share their root, and the
  seventh character distinguishes an open fracture from a closed one.

### Treatment gaps and imaging now reach the number

Gaps in care are among the largest downward adjustments a carrier makes, and
imaging is among the largest upward ones. An MRI confirming a herniation is what
separates a soft-tissue claim from a real one.

`calculateTreatmentQuality` now calls `analyzeTreatmentChronology`, which
measures gap length, gap count and onset delay from actual treatment dates. What
it replaced was a regex over a concatenated text blob whose fallback arm was a
bare `/gap/` — it fired on any use of the word, including a record stating there
was *no* gap in treatment, and had no notion of how long the gap was or when it
happened. The keyword scan survives only as a fallback for files with no usable
dates, and is now narrow enough not to penalise a record for saying the opposite
of what it means.

Imaging was not considered at all; the term did not appear in the engine. It now
earns credit from an imaging CPT code, a dated imaging visit, or the narrative.

### Calibration now grades the engine that produces the number

`valuation-calibration.ts` compared predictions against real outcomes and
derived correction coefficients, then applied them inside
`predictViabilityHeuristic` — whose output underwriting overwrites. The loop
ran, produced coefficients, and adjusted a number nobody saw. The engine
actually shown to claimants had never been calibrated against a real settlement.

`backtest` now scores samples through `underwriteCase`, and the underwriting
engine accepts the same coefficients the heuristic did: `settlementScale` on the
median, `bandWidthScale` on the spread, and `severityAnchorScale` on the
per-injury floor. Identity calibration reproduces the previous numbers exactly.

This needed a point-in-time snapshot of the underwriting inputs, since facts
keep moving after a case resolves and grading against a file that already
contains the settlement would leak the answer into the inputs. `CaseOutcome`
gained an `underwritingSnapshot` column for that. Samples recorded before it
existed fall back to the heuristic engine, and the CLI reports how many of each
it scored — a run that is mostly heuristic is still tuning the wrong thing.

This is the fix that compounds: the others are static, but an uncalibrated
engine drifts and nothing detects it.

### Uncertainty is carried by the band, not by a discount

The four fixes above all improved the number the engine produces. None of them
reached the claimant, because `Results.tsx` took the finished band and shaved it
— 0.7x off the low end, 0.9x off the high, floor-rounded — before displaying it.

The intent was defensible: an unevidenced estimate should only ever be revised
upward, so start it low. The implementation was not. The discount lived on one
page, so the same case showed one range on the Results page and a different one
on the plaintiff Dashboard, the Case Tracker and both PDF exports. It also
contradicted the undiscounted range printed further down that same page. And it
fired on `liabilityOutlook !== 'strong'`, which is true of every case that has
not been scored yet, so in practice most claimants saw the haircut.

Worse, it did the thing this document says we do not do. A 30% cut off the low
end produces a carrier-shaped opening number. The reason differed — hedging
rather than negotiating — but the claimant could not tell the difference.

An unevidenced case is not a cheaper case, it is a less certain one, so the
doubt now sits where uncertainty belongs. `calculateSettlement` takes the
documentation score and drops the bottom of the band as confidence falls: a
fully documented file keeps the original ±30%, and a file with nothing on it
reaches roughly -55%. Three details make it safe:

- **Downward only.** Widening upward as well would have an unevidenced case
  advertise a higher ceiling than the same case once proven, so uploading
  records would appear to cost the claimant money.
- **Coverage still wins.** The widening is applied before the coverage ceiling,
  so a thin file against a small policy is still capped at what the policy pays.
- **Calibration still governs it.** The widening multiplies through
  `bandWidthScale`, so the feedback loop tunes the spread as it always did, and
  a documented file is unchanged — identity calibration still reproduces the
  original band exactly.

Every plaintiff surface now renders the same modelled band with no arithmetic of
its own.

## Where we differ from the carrier on purpose

Not every difference is a gap. Two are deliberate and should stay.

**We value on billed charges, not paid.** `calculateSettlement` prefers
`med_charges` over `med_paid`. Carriers argue paid amounts, and in some states
that argument has real support. Valuing on billed reflects the claim's gross
value and gives the claimant the stronger anchor going in — which was true of
the engine but not of the claimant's screen until the display discount came out.
It does mean the figure is not what nets out after liens and reductions, which
is a disclosure question rather than a modelling one.

The same stance shows up in how the file is scored rather than valued: readiness
credits the treatment and charges a claimant reported, and tags those points as
client-reported rather than documented. Use their account for the number, and be
explicit about what is proven.

**We are not tuned to produce a lowball.** Colossus exists to generate the
carrier's authority range, which is the opening position in a negotiation, not
an estimate of fair value. Matching its output would mean adopting its purpose.
This is the easier of the two claims to assert and quietly break: the engine was
never tuned to lowball, and the page in front of the claimant discounted its
output anyway. See the section on band width above.

## What is still worth doing

Nothing here is a correctness gap, but three things would make the model better:

1. **Collapse the two engines.** `prediction.ts` still computes a full valuation
   that `reconcileValueBandsWithUnderwriting` discards. Now that no signal is
   lost in the handover, the duplication is dead weight rather than a bug.
2. **Run a real calibration pass.** The loop is pointed at the right engine, but
   it needs recorded outcomes carrying underwriting snapshots before its
   coefficients mean anything. Until then it is correct and idle.
3. **Capture a UM/UIM limit at intake.** Coverage is captured as a yes/no with
   no figure, which is why an unconfirmed UM/UIM policy suppresses the cap
   entirely rather than adding to it.

## Reference

- `api/src/lib/coverage-ceiling.ts` — coverage ceiling and band capping
- `api/src/lib/underwriting-engine.ts` — authoritative valuation
- `api/src/lib/prediction.ts` — heuristic valuation, discarded downstream
- `api/src/lib/clinical-codes.ts` — ICD/CPT classification
- `api/src/lib/treatment-chronology.ts` — gap and onset analysis
- `api/src/lib/valuation-calibration.ts` — outcome feedback loop
- `api/src/routes/predict.ts` — where underwriting overwrites the heuristic
- `app/src/pages/Results.tsx` — claimant-facing presentation of the band
