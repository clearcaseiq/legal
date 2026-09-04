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

Below that, four things were wrong or missing. One is now fixed. Three remain,
and they share a single root cause described in the next section.

| Area | Status |
| --- | --- |
| Policy limits ignored | Fixed — see "What was fixed" |
| ICD/CPT codes never reach the number | Open |
| Treatment gaps and imaging never reach the number | Open |
| Calibration grades an engine nobody reads | Open |

## The root cause behind the open items

There are two valuation engines, and the sophisticated one is discarded.

`prediction.ts` computes a detailed heuristic valuation: it reads ICD and CPT
codes through `clinical-codes.ts`, measures real treatment gaps and onset delay
through `treatment-chronology.ts`, and accounts for imaging and policy limits.
`underwriting-engine.ts` computes a second, simpler valuation.

In `routes/predict.ts`, `reconcileValueBandsWithUnderwriting` overwrites the
heuristic bands with the underwriting bands. Underwriting wins. So every signal
that only `prediction.ts` knows how to read is computed, logged, and thrown
away before anyone sees a number.

That is why the three open items look like separate gaps but are one: the
analysis exists, it just runs in the engine that lost.

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

## Open gaps

### 1. ICD and CPT codes do not affect the dollar figure

Colossus scores specific diagnosis codes. A cervical radiculopathy with a
positive EMG scores differently from a cervical strain, and the adjuster's
authority moves accordingly.

We extract codes and classify them in `clinical-codes.ts`, but two things limit
it. The classification is at the code *family* level, so codes that Colossus
separates collapse into one bucket for us. And the result only reaches
`prediction.ts`, which means it never reaches the number — the string
`icd`, `cpt`, and `clinical` do not appear anywhere in
`underwriting-engine.ts`.

Severity in the underwriting engine is instead driven by keyword matching on
diagnosis text. That is legible and debuggable, but it cannot distinguish the
gradations a carrier is scoring on.

### 2. Treatment gaps and imaging do not affect the dollar figure

Gaps in care are among the largest downward adjustments a carrier makes, and
imaging is among the largest upward ones. An MRI confirming a herniation is
what separates a soft-tissue claim from a real one.

`treatment-chronology.ts` computes genuine gap analysis from treatment dates —
onset delay, gap length, continuity. None of it reaches the settlement figure.

What the underwriting engine actually does is at `underwriting-engine.ts:466`:

```
if (facts?.damages?.treatment_gap || /major gap|large gap|stopped treating/.test(blob)) {
  ...
} else if (/gap/.test(blob)) {
```

That is a regex over a concatenated text blob. It has no notion of how long the
gap was or when it occurred, and the bare `/gap/` arm fires on any use of the
word — including a narrative that says there was *no* gap in treatment.

Imaging is not considered at all; the term does not appear in the engine.

### 3. Calibration grades an engine whose output is discarded

`valuation-calibration.ts` compares predicted values against real outcomes from
`case-outcomes.ts` and derives correction coefficients. The coefficients are
applied in `predictViabilityHeuristic` — inside `prediction.ts`, whose output is
then overwritten by underwriting.

So the feedback loop runs, produces coefficients, and adjusts a number nobody
sees. The engine that produces the claimant-facing figure has never been
calibrated against a real settlement.

This is the one that compounds: the other gaps are static, but an uncalibrated
engine drifts and nothing detects it.

## Where we differ from the carrier on purpose

Not every difference is a gap. Two are deliberate and should stay.

**We value on billed charges, not paid.** `calculateSettlement` prefers
`med_charges` over `med_paid`. Carriers argue paid amounts, and in some states
that argument has real support. Valuing on billed reflects the claim's gross
value and gives the claimant the stronger anchor going in. It does mean the
figure is not what nets out after liens and reductions, which is a disclosure
question rather than a modelling one.

**We are not tuned to produce a lowball.** Colossus exists to generate the
carrier's authority range, which is the opening position in a negotiation, not
an estimate of fair value. Matching its output would mean adopting its purpose.

## Suggested order of work

1. **Route clinical codes, chronology, and imaging into the underwriting
   engine.** This closes gaps 1 and 2 together, because it is one change: the
   analysis already exists and needs a path into the engine that wins. Largest
   accuracy gain available.
2. **Point calibration at the underwriting engine.** Cheap once step 1 lands,
   and it is what keeps the other work from decaying.
3. **Deepen ICD classification past the family level.** Only worth doing after
   step 1, since today it would refine an input that gets discarded.

## Reference

- `api/src/lib/coverage-ceiling.ts` — coverage ceiling and band capping
- `api/src/lib/underwriting-engine.ts` — authoritative valuation
- `api/src/lib/prediction.ts` — heuristic valuation, discarded downstream
- `api/src/lib/clinical-codes.ts` — ICD/CPT classification
- `api/src/lib/treatment-chronology.ts` — gap and onset analysis
- `api/src/lib/valuation-calibration.ts` — outcome feedback loop
- `api/src/routes/predict.ts` — where underwriting overwrites the heuristic
