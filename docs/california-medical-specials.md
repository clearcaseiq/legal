# California medical specials: billed vs. paid

Whether valuing past medical damages on billed charges is a defensible
plaintiff-side anchor or an overstatement of what the case can recover.

This is an engineering analysis of what the code does and what data it has. The
legal rules below shape the question but the answer needs confirming with
counsel before anything changes — the conclusion affects the number every
California claimant sees.

Companion to `valuation-gap-analysis.md`, which raised this as a deliberate
difference from the carrier. That framing holds in general and does not hold in
California, which is the whole of the problem.

## The short version

`valuation-gap-analysis.md` says we value on billed charges, that carriers argue
paid, and that "in some states that argument has real support". In California
it is not an argument the carrier makes. It is the measure of damages, and the
gap analysis files it under disclosure rather than modelling.

The engine has the data to tell the two situations apart. It captures who paid
for treatment at intake, including whether the claimant is treating on a lien —
which is the exact fact the rule turns on. That signal is then misread by the
engine whose output is discarded and ignored by the engine that produces the
number.

| Question | Finding |
| --- | --- |
| Does CA law limit past medicals to amounts paid? | Yes, with an exception that matters here |
| Does the engine value on billed? | Yes, and it takes the *higher* of billed and paid |
| Does it affect non-economic damages too? | Yes — general damages are a multiple of the specials |
| Do we capture who paid? | Yes, at intake, including lien status |
| Does the authoritative engine read it? | No |
| Is a blanket "cap at paid" correct? | No — it would under-value lien cases |

## The rule, and the exception that prevents a one-line fix

*Howell v. Hamilton Meats & Provisions, Inc.* (2011) 52 Cal.4th 541 holds that a
plaintiff whose medical bills were satisfied by insurance at negotiated rates
may recover no more than the amount actually paid and accepted. The difference
between the chargemaster figure and the negotiated rate — the "negotiated rate
differential" — is not recoverable, because the plaintiff never incurred it.

*Corenbaum v. Lampkin* (2013) 215 Cal.App.4th 1308 extends the reasoning to the
part that matters most for our arithmetic: the full billed amount is not
admissible to prove past medical damages, is not admissible as a basis for
future medical damages, and is **not admissible as a measure of non-economic
damages**. That last holding is aimed squarely at the practice of multiplying
billed specials to reach a pain-and-suffering figure, which is what
`calculateSettlement` does.

The exception is why this cannot be a one-line change. Where the claimant
remains personally liable for the full billed amount — treating on a medical
lien or letter of protection, or uninsured — the billed figure is recoverable.
*Katiuzhinsky v. Perry* (2007) 152 Cal.App.4th 1288 and *Uspenskaya v. Meline*
(2015) 241 Cal.App.4th 996 both turn on that distinction: what a third party
paid to acquire the debt does not reduce what the plaintiff still owes.

So the correct figure depends on **who paid and whether the provider accepted
the payment in full satisfaction**. Insured claimant, negotiated rate: paid.
Lien or LOP claimant still on the hook: billed. A blanket cap would systematically
under-value exactly the claimants least able to absorb it, which is the opposite
error and no better.

## What the engine does today

Both engines prefer the larger number. The authoritative one falls through to
billed first:

```677:677:api/src/lib/underwriting-engine.ts
  const medicalBills = Number(damages.med_charges || damages.med_paid || damages.estimated_med_charges || 0)
```

The heuristic one is explicit about taking the maximum:

```878:878:api/src/lib/prediction.ts
    Math.max(medCharges, medPaid, imputedMedical) +
```

Neither consults who paid. There is no reference to *Howell* or to a paid-amount
cap anywhere in the codebase.

The effect compounds rather than staying in the specials line. General damages
are computed as a multiple of the specials, with a per-injury floor:

```704:711:api/src/lib/underwriting-engine.ts
  const medicalSpecials = economicDamages.medicalBills + economicDamages.futureMedicalAdjusted
  let generalDamagesMultiplier = GENERAL_DAMAGES_MULTIPLIERS[severity.primaryInjury]
  // ...
  const generalDamages = Math.max(baseInjuryValue, medicalSpecials * generalDamagesMultiplier)
```

Where a hospital bills three to four times the negotiated rate — routine — an
insured claimant's specials *and* their pain-and-suffering component are both
scaled off a base that is three to four times the recoverable figure. This is
the practice *Corenbaum* addresses directly, so it is the more exposed half.

## We already collect the fact that decides it

Intake asks who is paying for treatment, and the options map cleanly onto the
legal distinction:

```434:442:app/src/pages/IntakeWizardQuick.tsx
const TREATMENT_PAYER_OPTION_DEFS = [
  { value: 'health_insurance', labelKey: 'payer_healthInsurance' },
  { value: 'workers_comp', labelKey: 'payer_workersComp' },
  { value: 'auto_insurance', labelKey: 'payer_autoInsurance' },
  { value: 'attorney_lien', labelKey: 'payer_attorneyLien' },
  { value: 'medical_lien', labelKey: 'payer_medicalLien' },
  { value: 'out_of_pocket', labelKey: 'payer_outOfPocket' },
  { value: 'not_sure', labelKey: 'optionNotSure' },
]
```

`health_insurance` is the *Howell* case. `attorney_lien` and `medical_lien` are
the *Katiuzhinsky* exception. Intake also captures `health_insurance_paid` and
`med_paid` separately from `med_charges`, so the two figures exist side by side.

This is a better starting position than it looks. The hard part of applying the
rule is knowing which branch a case falls in, and that answer is already in the
record.

### The signal is dropped twice

`underwriting-engine.ts` — the engine that produces every number a claimant sees
— never reads `bill_payment_sources` or `health_insurance_paid`. It has no
concept of who paid.

The heuristic engine does read it, and reads it wrongly:

```762:769:api/src/lib/prediction.ts
function getLienPressureModifier(sources: string[]) {
  if (!Array.isArray(sources)) return 1
  let modifier = 1
  if (sources.includes('lien')) modifier -= 0.08
  if (sources.includes('workers_comp')) modifier -= 0.05
  if (sources.includes('medpay')) modifier += 0.03
  return clamp(modifier, 0.84, 1.05)
}
```

Intake never emits `'lien'` — it emits `'attorney_lien'` and `'medical_lien'`.
It never emits `'medpay'` either; the nearest option is `'auto_insurance'`. The
values pass through `computeFeatures` unmodified, so two of the three branches
are unreachable and only `workers_comp` has ever fired.

The practical impact today is nil, because the band this modifier feeds is
overwritten by `reconcileValueBandsWithUnderwriting` before anyone sees it. That
makes it dead code inside a discarded engine rather than a live mispricing — but
it is worth recording as evidence for the first item in the gap analysis's
"still worth doing" list. The duplication is not just dead weight; it is where
bugs go to be undetectable.

## What this would do to a real case

The wet-floor premises case reviewed on 15 Sep shows $45,000–$103,000, most
likely $79,000, with no documented medical bills — the specials are imputed from
self-reported figures. That case cannot be recomputed here, and its `med_paid`
is unknown.

The shape of the change is predictable, though. For an insured claimant, if paid
runs at 30% of billed, the specials drop by 70% and the general-damages multiple
drops with them, because it is applied to the specials. The headline figure moves
by roughly the same proportion rather than by the specials line alone. For a lien
claimant, nothing should move at all.

That spread — a number potentially cut to a third, or left untouched, depending
on a question already answered at intake — is the reason this is worth settling
before any more calibration work.

## Options

1. **Leave it, and disclose.** Keep billed as the anchor and state plainly that
   the figure is a gross claim value, not a recoverable one. Cheapest, and
   defensible for a pre-representation estimate whose purpose is to get a
   claimant to an attorney. Weakest where the claimant treats the number as what
   they will receive.
2. **Branch on payer.** Use paid where the record shows an insurer settled the
   bill at a negotiated rate, and billed where the claimant is on a lien or
   uninsured. Matches the law, uses data already captured, and needs a defined
   answer for `not_sure` and for cases with no payer answer at all — likely
   billed, since capping on absent data repeats the coverage-ceiling mistake the
   gap analysis already calls out.
3. **Show both.** Present the gross claim value and the likely recoverable value
   as separate figures. Most honest, most explaining to do, and the one that
   makes the attorney's first conversation easier rather than harder.

## What is needed before deciding

- Confirmation from counsel that the reading above is right, particularly that
  a multiplier applied to billed specials is exposed under *Corenbaum*.
- How often `bill_payment_sources` is actually answered in production, and how
  often `med_paid` is present and differs from `med_charges`. If paid is rarely
  captured, option 2 degrades to option 1 for most cases regardless.
- Whether the same question needs answering for the other states we value in,
  since the rule is not uniform and the engine applies one formula everywhere.
