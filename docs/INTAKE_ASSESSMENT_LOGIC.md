# Intake Assessment Logic

This document describes all intake assessment flows, data models, API endpoints, and business logic in the CaseIQ Legal platform.

---

## 1. Overview

**Assessment** is the core case entity. It holds case facts, claim type, venue, and links to predictions, evidence, tasks, and lead management. Intake is the process of creating or importing assessments.

**Flows:**
- **Plaintiff/Consumer** → Web intake wizard → `POST /v1/assessments` → Assessment
- **Attorney** → Manual intake, from-lead, clone-template, import → `POST /v1/attorney-dashboard/intake/*` → Assessment + CaseIntakeRequest
- **Admin** → Route cases → Assessment + LeadSubmission + Introduction

---

## 2. Data Models

### Assessment (`assessments`)

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String? | Plaintiff/user who created (optional) |
| claimType | String | auto, slip_and_fall, dog_bite, medmal, product, nursing_home_abuse, wrongful_death, high_severity_surgery |
| venueState | String | State code (e.g. CA) |
| venueCounty | String? | County |
| status | String | DRAFT, IN_PROGRESS, COMPLETED |
| facts | String (JSON) | Case facts (incident, injuries, treatment, damages, consents, etc.) |
| chatgptAnalysis | String? | JSON of ChatGPT analysis |
| caseTierId | String? | Links to CaseTier for routing |

**Related:** predictions, files, evidenceFiles, leadSubmission, caseTasks, insuranceDetails, lienHolders, demandLetters, billingInvoices, etc.

### Facts JSON Structure (from `AssessmentWrite` / `AssessmentUpdate`)

```json
{
  "incident": {
    "date": "YYYY-MM-DD",
    "location": "",
    "narrative": "",
    "parties": [],
    "timeline": [{ "label": "", "order": 1, "approxDate": "" }]
  },
  "liability": {},
  "injuries": [],
  "treatment": [],
  "damages": {
    "med_charges": 0,
    "med_paid": 0,
    "wage_loss": 0,
    "services": 0
  },
  "insurance": {},
  "consents": {
    "tos": false,
    "privacy": false,
    "ml_use": false,
    "hipaa": false
  },
  "caseAcceleration": { "wageLoss": {} },
  "jurisdiction": {},
  "plaintiffContext": {},
  "expectationCheck": {}
}
```

### CaseIntakeRequest (`case_intake_requests`)

Tracks attorney-initiated intake requests.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| attorneyId | String | Attorney who requested |
| assessmentId | String? | Linked assessment |
| leadId | String? | If converted from lead |
| kind | String | manual, from_lead, clone_template, import |
| source | String? | For import (e.g. source system) |
| payload | String? | JSON of request details |
| status | String | queued (default) |

### LeadSubmission (`lead_submissions`)

One-to-one with Assessment when case is routed to attorneys.

| Field | Type | Description |
|-------|------|-------------|
| assessmentId | String | FK to Assessment |
| viabilityScore, liabilityScore, causationScore, damagesScore | Float | Quality scores |
| evidenceChecklist | String? | JSON |
| sourceType | String | organic_search, paid_ad, referral, direct, admin |
| assignedAttorneyId | String? | Assigned attorney |
| assignmentType | String | exclusive, first_look, shared |
| status | String | submitted, contacted, consulted, retained, rejected |

### AttorneyIntakeConfig (`attorney_intake_configs`)

Per-attorney smart intake settings.

| Field | Type | Description |
|-------|------|-------------|
| attorneyId | String | Unique |
| config | String | JSON: dynamicQuestionnaires, conditionalLogic, missingInfoDetection, autoFollowUps |

---

## 3. API Endpoints

### Plaintiff/Consumer Flow

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/assessments` | Create assessment from intake wizard |
| PATCH | `/v1/assessments/:id` | Update assessment (merge facts) |
| GET | `/v1/assessments/:id` | Get assessment + latest prediction |
| GET | `/v1/assessments` | List assessments (filtered by user if logged in) |
| POST | `/v1/assessments/associate` | Associate anonymous assessments with user |

**Create flow:**
1. Validate body with `AssessmentWrite` schema
2. Create Assessment with `status: DRAFT`, `facts: JSON.stringify(parsed.data)`
3. Kick off ChatGPT analysis (non-blocking)
4. Return `assessment_id`, `status`, `created_at`

**Update flow:**
1. Validate with `AssessmentUpdate`
2. Merge current facts with updates
3. Set `status: IN_PROGRESS`
4. Re-run ChatGPT analysis (non-blocking)

### Attorney Intake Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/attorney-dashboard/intake/manual` | Create draft from template |
| POST | `/v1/attorney-dashboard/intake/from-lead` | Convert lead to case (use existing assessment) |
| POST | `/v1/attorney-dashboard/intake/clone-template` | Clone template (MVA, premises, medmal, PI) |
| POST | `/v1/attorney-dashboard/intake/import` | Import from external source |
| POST | `/v1/attorney-dashboard/intake/smart-config` | Save attorney smart intake config |

#### Manual Intake (`/intake/manual`)

**Schema:** `intakeManualSchema`  
- `template?`: mva, premises, medmal, pi  
- `claimType?`, `venueState?`, `notes?`

**Logic:**
1. Resolve `claimType` from payload or template (mva→auto, premises→slip_and_fall, etc.)
2. Call `createDraftAssessment({ claimType, venueState })`
3. Create `CaseIntakeRequest` with `kind: 'manual'`
4. Return `assessmentId`, `claimType`, `venueState`, `notes`

#### From Lead (`/intake/from-lead`)

**Schema:** `intakeFromLeadSchema`  
- `leadId`: string

**Logic:**
1. Get authorized lead via `getAuthorizedLead(req, leadId)`
2. Create `CaseIntakeRequest` with `assessmentId: lead.assessmentId`, `kind: 'from_lead'`
3. Return `assessmentId` (existing)

#### Clone Template (`/intake/clone-template`)

**Logic:** Same as manual, but `claimType` comes from template only. Creates new draft assessment.

#### Import (`/intake/import`)

**Schema:** `intakeImportSchema`  
- `source`, `includeDocuments?`, `includeHistory?`, `includeTasks?`, `includeMedical?`, `notes?`, `files?`

**Logic:**
1. Create draft with `claimType: 'auto'`, `venueState: 'CA'`
2. Create `CaseIntakeRequest` with `kind: 'import'`, `source`
3. Return `importId`, `assessmentId`, options

#### Smart Config (`/intake/smart-config`)

**Schema:** `smartIntakeSchema`  
- `dynamicQuestionnaires`, `conditionalLogic`, `missingInfoDetection`, `autoFollowUps`

**Logic:** Upsert `AttorneyIntakeConfig` for attorney.

---

## 4. createDraftAssessment

**Location:** `api/src/routes/attorney-dashboard.ts`

```typescript
async function createDraftAssessment(payload: { claimType?: string; venueState?: string }) {
  const claimType = payload.claimType || 'auto'
  const venueState = payload.venueState || 'CA'
  const facts = {
    incident: { date: new Date().toISOString().split('T')[0], narrative: '' },
    injuries: [],
    treatment: [],
    damages: {},
    consents: { tos: false, privacy: false, ml_use: false, hipaa: false }
  }
  return prisma.assessment.create({
    data: {
      claimType,
      venueState,
      venueCounty: null,
      status: 'DRAFT',
      facts: JSON.stringify(facts)
    }
  })
}
```

---

## 5. Template → ClaimType Mapping

**Location:** `getTemplateClaimType(template)`

| Template | claimType |
|----------|-----------|
| mva | auto |
| premises | slip_and_fall |
| medmal | medmal |
| pi (default) | auto |

---

## 6. Web Intake Wizard (Plaintiff)

**Location:** `app/src/pages/IntakeWizard.tsx`  
**Routes:** `/assess`, `/intake`, `/edit-assessment/:assessmentId`

**Steps:** basic → incident → injuries → damages → review

**Behavior:**
- New: starts with blank form, calls `createAssessment` on submit
- Edit: loads assessment, calls `updateAssessment` on save
- Draft saved to `localStorage` key `intake_draft_v1`
- Evidence can be uploaded inline via `InlineEvidenceUpload`
- Consents: TOS, privacy, ML use, HIPAA (links to policy pages)

**Submit payload (AssessmentWrite):**
- claimType, venue, incident, liability, injuries, treatment, damages, insurance, consents
- Optional: caseAcceleration, jurisdiction, plaintiffContext, expectationCheck

---

## 7. Lead → Assessment Link

- **LeadSubmission** has 1:1 `assessmentId` → Assessment
- **Lead** (in attorney dashboard) refers to `LeadSubmission`; `lead.assessmentId` is the assessment
- Admin routing creates `Introduction` + `LeadSubmission` for an assessment
- `upsertLeadSubmission(assessmentId, attorneyId, prediction)` creates/updates LeadSubmission with viability scores from prediction

---

## 8. Assessment Validation (AssessmentWrite)

**Location:** `api/src/lib/validators.ts`

- **claimType:** enum (auto, slip_and_fall, dog_bite, medmal, product, nursing_home_abuse, wrongful_death, high_severity_surgery)
- **venue:** state (required), county (optional)
- **incident:** date, location?, narrative?, parties?, timeline?
- **damages:** med_charges?, med_paid?, wage_loss?, services?
- **consents:** tos, privacy, ml_use, hipaa (all boolean)

---

## 9. Post-Intake Automation

After assessment create/update:
- **ChatGPT analysis** runs async (`analyzeCaseWithChatGPT`)
- **Case tier** can be assigned (`assignCaseTier`) for routing
- **Task SLA templates** can apply when status changes (`applyTaskSlaTemplates`)
- **Reminders** for tasks, invoices, escalations (`createCaseReminder`, `scheduleTaskReminder`, `scheduleEscalationAlert`)

---

## 10. File References

| Component | Path |
|-----------|------|
| Assessment routes (create/update/get) | `api/src/routes/assessments.ts` |
| Attorney intake endpoints | `api/src/routes/attorney-dashboard.ts` (lines ~1519–1672) |
| Validators | `api/src/lib/validators.ts` |
| Intake wizard UI | `app/src/pages/IntakeWizard.tsx` |
| Web API helpers | `app/src/lib/api.ts` (createAssessment, updateAssessment, intake/*) |
| Schema | `api/prisma/schema.prisma` (Assessment, CaseIntakeRequest, LeadSubmission, AttorneyIntakeConfig) |
| Valuation engine | `api/src/lib/prediction.ts` (severity, liability, settlement/trial bands, viability) |

---

# Part B — Valuation Engine (How Settlement, Liability & Other Metrics Are Calculated)

This part explains, in exact detail, how `api/src/lib/prediction.ts` turns an
assessment's `facts` into a settlement range, a trial range, liability, injury
severity, and the case-strength (viability) scores. Every constant below is taken
directly from the source. Unless an ML service is configured
(`ML_PREDICTION_MODE` ≠ `fallback`), this heuristic model is the source of truth.

---

## In plain English (read this first)

Think of the engine as a careful intake paralegal who reads the case file and works
through the same checklist every time. There's no AI guessing here — it's a fixed set
of rules, so the same facts always produce the same numbers.

Here's what it does, step by step:

1. **How badly was the person hurt? (Severity.)** It looks at the medical bills, how
   much treatment they got, how many body parts were injured, whether there was
   surgery or imaging, and whether the injury disrupted their daily life. It adds up
   "severity points" and sorts the case into one of five buckets: none, mild,
   moderate, severe, or catastrophic. More serious injury → higher bucket.

2. **Whose fault was it? (Liability.)** It starts at a coin-flip (50%) and reads the
   incident story for fault clues. Things that clearly point at the other side push
   the number up — *"rear-ended," "texting," "ran the red light," a police report,
   photos.* Things that suggest the injured person was partly to blame push it back
   down. The result is a percentage and a label from "very weak" to "very strong."

3. **What are the hard dollars? (Economic damages.)** It adds up the real,
   receipt-style costs: medical bills + lost wages + out-of-pocket costs + vehicle/
   property damage (property damage is capped at $25,000).

4. **What is the case "worth" on paper? (Injury-supported value.)** It takes those
   hard dollars and adds credit for pain and suffering, the number of injured body
   parts, and any surgery or procedures. This becomes the anchor number everything
   else is scaled from. A floor based on injury severity makes sure a serious case
   isn't valued too low.

5. **Adjust for the real world. (Modifiers.)** The anchor is then nudged up or down
   by things that actually change what a case settles for: how strong the fault case
   is, how good the evidence is (uploaded documents count for more than self-typed
   estimates), the state it's in, whether the person already has a lawyer, prior
   injuries, and medical liens.

6. **The settlement range.** After all those adjustments, the engine produces a
   realistic settlement range — a low, a middle (median), and a high — rounded to the
   nearest $1,000. This is the primary number shown to the plaintiff. If the at-fault
   party's insurance policy has a known limit, the range is capped so it doesn't
   promise more than the policy can pay.

7. **The trial range.** Separately, it estimates what a *jury* might award if the case
   went all the way to trial. This is almost always higher and wider than the
   settlement range, because juries are less predictable — it reflects potential
   exposure, not the expected outcome.

8. **How good is the case overall? (Viability.)** Finally it produces a simple
   "case strength" score (and sub-scores for liability, causation, and damages) that
   the platform uses to decide how to route the case to attorneys.

**A quick example.** Someone is stopped at a red light and gets rear-ended by a
driver who was texting; they hurt a shoulder, run up about $18,000 in medical bills,
miss $5,000 in wages, and have $9,000 of car damage. The engine rates the injury
**moderate**, the fault **very strong** (rear-end + texting + police report), totals
**$32,000** in hard dollars, and lands on a settlement range of roughly **$39k–$52k
(about $46k in the middle)**, with a much wider trial range of about **$73k–$186k**.
If those medical bills were backed by *uploaded* documents instead of a typed
estimate, the engine trusts them more and the settlement range nudges up a few
percent.

**Two honest caveats:**
- The fault score is keyword-based, so how the story is written matters — vague
  narratives score lower than detailed ones.
- The "causation" and "damages" sub-scores still include a small random wobble; the
  main settlement and liability numbers do not.

The rest of this document is the exact, formula-by-formula version of everything above.

---

## 11. Pipeline overview

```
assessment.facts (JSON)
  └─ computeFeatures(assessment)        // flatten facts + score severity & liability
       └─ predictViability(features)
            ├─ predictViabilityHeuristic(features)   // the deterministic model below
            └─ (optional) ML service in shadow / replace mode
```

- `fallback` (or no `ML_SERVICE_URL`): heuristic only.
- `shadow`: heuristic returned to the user; ML output logged and attached as `shadowPrediction`.
- replace mode: ML output replaces the heuristic (falls back to heuristic if ML returns nothing).

---

## 12. Injury Severity — `calculateInjurySeverity(facts)`

Returns `{ level: 0–4, score, label, factors[] }`. Accumulates a numeric `score`, then buckets it.

**Short-circuits (return immediately):**
- No injuries AND `med_paid == 0` AND `med_charges == 0` → level 0 (`none`).
- Narrative contains catastrophic keywords (`death`, `paralyzed`, `amputation`, `coma`, …) → level 4.
- `claimType === 'wrongful_death'` → level 4.

**Additive scoring:**

| Signal | Points |
|---|---|
| `high_severity_surgery` claim type | +2.5 |
| Med charges ≥100k (or med paid ≥75k) | +2.5 |
| ≥50k / ≥40k | +2.0 |
| ≥25k / ≥20k | +1.5 |
| ≥10k / ≥7.5k | +1.0 |
| >0 | +0.5 |
| Treatment entries ≥12 / ≥6 / ≥3 / <3 | +1.5 / +1.0 / +0.5 / +0.2 |
| ≥2 body parts | +min(1.2, count × 0.25) |
| High-impact area (head / neck / lower back) | +0.6 |
| Concussion symptoms | +min(1.0, count × 0.25) |
| Daily-life impact (can't work / sleep / emotional) | +0.6 |
| Surgery recommended / scheduled / completed | +1.2 / +1.6 |
| Interventional pain procedure (epidural / nerve block / RFA) | +0.9 |
| MRI / CT / X-ray | +0.55 / +0.25 |
| Severe / moderate / mild narrative keywords | +2.0 / +1.0 / +0.3 |
| Injuries count ≥5 / ≥3 / else | +1.5 / +1.0 / +0.5 |
| Wage loss ≥50k / ≥20k / >0 | +1.0 / +0.5 / +0.2 |

**Bucketing:** `≥4.0 catastrophic (4), ≥3.0 severe (3), ≥2.0 moderate (2), ≥0.5 mild (1), else none (0)`.

**Example.** Claimant with `med_charges = 18,000`, 2 treatment entries, a shoulder
injury, 2 daily-life impacts, 1 structured injury, `wage_loss = 5,000`:

```
+1.0  (med charges ≥10k)
+0.2  (2 treatment entries, <3)
+0.0  (1 body part, not ≥2)
+0.6  (daily-life impact present)
+0.5  (1 injury reported)
+0.2  (wage loss > 0)
-----
 2.5  → level 2 (moderate)
```

---

## 13. Liability — `calculateLiabilityScore(facts, venue)`

Returns `{ score: 0.05–0.95, comparativeNegligence, strength, factors[] }`.
Starts at **0.50 (neutral)** and adjusts via narrative keyword matching per claim type.

**Auto rules:** rear-end +0.30; T-bone + ran-light +0.25 (else +0.10); left turn vs
oncoming +0.20, ambiguous −0.10 & `compNeg += 0.20`; head-on wrong-lane +0.25 (else +0.10);
parking lot +0.05 & `compNeg += 0.15`; distracted/phone +0.15; speeding +0.10; DUI +0.20.

**Other claim types:** slip/fall wet +0.20, defect +0.15, ice +0.10 (& +0.10 compNeg),
no-warning +0.10, poor lighting +0.08, invitee +0.05; dog bite strict-liability +0.25,
provocation −0.20 (& +0.30 compNeg), dangerous-dog +0.10, off-leash +0.15; medmal
misdiagnosis +0.15 / surgical error +0.20 / medication error +0.18 / no-consent +0.12;
product +0.15 base, defect +0.10; nursing home +0.20 base, abuse +0.15, bed sores +0.10;
wrongful death +0.10 base.

**Cross-cutting:** fault words +min(0.10, n×0.02); plaintiff-fault words −min(0.15, n×0.03)
& `compNeg += min(0.30, n×0.05)`; witness +0.08; police +0.05; evidence array (police
report +0.10, photo +0.08, medical +0.05, witness +0.08, ≥3 files +0.05); narrative photo
+0.03, police report +0.05.

**Venue:** Pure comparative (CA/NY/FL) annotated; Modified (TX) −0.20 if `compNeg > 0.50`.

**Final:** `clamp(score, 0.05, 0.95)`; strength `≥0.80 very_strong, ≥0.65 strong, ≥0.50 moderate, ≥0.35 weak, else very_weak`.

**Example.** Narrative: *"Stopped at a red light when the other driver, who was
texting, rear-ended me. Police report and photos."* (auto):

```
0.50  base
+0.30 rear-end
+0.15 texting / phone
+0.05 police mentioned
+0.03 photo mentioned
-----
1.03  → clamped to 0.95 → "very_strong",  comparativeNegligence = 0
```

---

## 14. Feature vector — `computeFeatures(assessment)`

Flattens `facts` into model inputs: the severity & liability objects above, plus
`medCharges` (= `med_charges ?? estimated_med_charges`), `medPaid`, `wageLoss`,
`outOfPocket`, `propertyDamage` (`estimated_property_damage`), `futureMedCharges`,
`medChargesSource` (= `med_charges_source ?? 'self_reported'` — documented bills upgrade
it via `runCaseRecalculation`), `policyLimit`, `priorInjury`, `bodyParts`,
`surgeryStatus`, `procedures`, `futureTreatment`, `concussionSymptoms`,
`lifestyleImpact`, `representationStage`, `settlementOffer`, `billPaymentSources`,
`narrativeLength` (= narrative characters ÷ 100).

---

## 15. Economic Damages (hard-dollar base)

```
medicalBills    = max(med_charges, med_paid)
economicDamages = max(med_charges, med_paid) + wage_loss + out_of_pocket + min(property_damage, 25000)
```

Property damage is capped at $25,000 in the economic total.

**Example.** `medicalBills = max(18000,0) = 18,000`; `economicDamages = 18000 + 5000 + 0 + 9000 = 32,000`.

---

## 16. Injury-Supported Value (the anchor)

```
treatmentCredibility = hasTreatment ? 1.12 : 0.82
medicalSupport       = min(medicalBills × (severity≥3 ? 1.25 : 0.9), 140000)
bodyPartSupport      = min(bodyParts.length × 6000, 35000)
lifestyleSupport     = min(lifestyleImpact.length × 5000, 30000)   // pain & suffering proxy
concussionSupport    = min(concussionSymptoms.length × 8000, 45000)
procedureLeverage    = 1 + bumps  // surgery recommended +0.28 / scheduled +0.36 / completed +0.45;
                                  // interventional +0.22; future surgery +0.24; future long-term +0.25; concussion +0.20

injurySupportedValue = max(
  severityAnchor[level],                                    // {0:6k,1:18k,2:45k,3:125k,4:350k}
  (economicDamages + medicalSupport + futureMed×0.7
   + bodyPartSupport + lifestyleSupport + concussionSupport)
   × treatmentCredibility × procedureLeverage
)
```

**Example.**
```
medicalSupport   = min(18000 × 0.9, 140000) = 16,200
bodyPartSupport  = 1 × 6000                  = 6,000
lifestyleSupport = 2 × 5000                  = 10,000
procedureLeverage= 1.0
inner = (32000 + 16200 + 0 + 6000 + 10000 + 0) × 1.12 × 1.0 = 71,904
injurySupportedValue = max(45000, 71904) = 71,904
```

---

## 17. The Modifier Stack

| Modifier | Source | Value (example) |
|---|---|---|
| Settlement compression | `getSettlementCompressionFactor` | level 2 → 0.58 +0.04 = **0.62** |
| Liability risk | inline | `clamp(0.95 × (1 − 0×0.55), 0.25, 1.05)` = **0.95** |
| Evidence confidence | `getEvidenceConfidenceModifier` | 0.82 +0.08 +0.05 = **0.95** |
| Venue constraint | `getVenueConstraint` | CA → **1.08** |
| Case stage | `getCaseStageModifier` | no_lawyer → **0.92** |
| Prior injury | `getPriorInjuryModifier` | none → **1.0** |
| Lien pressure | `getLienPressureModifier` | none → **1.0** |
| Offer anchor | `getOfferAnchor` | no offer → **0** |

Exact tables:
```
settlementCompression = {0:0.45,1:0.5,2:0.58,3:0.66,4:0.72}[level] + (hasTreatment ? +0.04 : −0.04)
liabilityModifier     = clamp(liability × (1 − comparativeNegligence × 0.55), 0.25, 1.05)
evidenceModifier      = clamp(0.82 +0.08(treatment) +0.05(has medical)
                              +{documented:0.05, partially_documented:0.02, self_reported:0}
                              +0.03(narrative>3) +0.04(procedures/surgery), 0.72, 1.08)
venueConstraint       = CA/NY→1.08, TX/FL→1.0, else→0.94
caseStageModifier     = {no_lawyer:0.92, lawyer_retained:1.02, demand_sent:1.08, in_litigation:1.18, mediation_scheduled:1.24, trial_scheduled:1.35}
priorInjuryModifier   = {none:1, similar:0.82, prior_claim:0.78, prior_surgery:0.74, not_sure:0.9}
lienPressureModifier  = clamp(1 −0.08(lien) −0.05(workers_comp) +0.03(medpay), 0.84, 1.05)
offerAnchor           = {under_10k:10000, 10k_25k:25000, 25k_50k:50000, higher:75000}
```

**Provenance impact example.** If the $18k were **document-verified** instead of
self-reported, the evidence modifier becomes `0.95 + 0.05 = 1.00`, lifting both
settlement and trial medians by ~5%.

---

## 18. Settlement Band (primary plaintiff-facing number)

```
settlementMedian = max(offerAnchor,
    injurySupportedValue × settlementCompression × liabilityModifier
    × evidenceModifier × venueConstraint × caseStageModifier
    × priorInjuryModifier × lienPressureModifier)

settlementFloor  = max(5000, min(injurySupportedValue × 0.7, economicDamages + medicalBills × 0.4))

low  = max(settlementFloor,       settlementMedian × 0.62)
high = max(settlementFloor × 1.2, settlementMedian × 1.3)
(low, high) = applyPolicyLimitConstraint(low, high, policyLimit)

p25 = round1k(low)   median = round1k((low + high) / 2)   p75 = round1k(high)
```

**Example.**
```
settlementMedian = 71904 × 0.62 × 0.95 × 0.95 × 1.08 × 0.92 × 1.0 × 1.0 ≈ 39,976
settlementFloor  = max(5000, min(50333, 32000 + 7200)) = 39,200
low  = max(39200, 24785) = 39,200
high = max(47040, 51969) = 51,969
policyLimit = 0 → no constraint
Settlement band:  p25 ≈ $39,000   median ≈ $46,000   p75 ≈ $52,000
```

**Policy-limit constraint** (`applyPolicyLimitConstraint`):
```
constrainedHigh = min(high, policyLimit)
constrainedLow  = min(low, max(constrainedHigh × 0.45, policyLimit × 0.25))
constrained     = high > policyLimit          // policyLimit 0 → skipped entirely
```
With `low = 39,200`, `high = 51,969`, `policyLimit = 50,000` → band ≈ **$22,500 – $50,000** (flagged constrained).

---

## 19. Trial Band (gross, pre-fee jury exposure)

```
nonEconomicDamages = painSuffering[level] + lifestyleSupport + concussionSupport   // {0:4k,1:12k,2:45k,3:150k,4:500k}
juryIntentModifier = go_to_trial?1.12 : settle_quickly?0.95 : 1
juryRiskModifier   = (level≥3 ? 1.25 : liability≥0.75 ? 1.12 : 1.0) × juryIntentModifier
trialBaseValue     = economicDamages + futureDamages + nonEconomicDamages + medicalSupport
trialMedian        = trialBaseValue × liabilityModifier × venueConstraint × juryRiskModifier × evidenceModifier
trialLow  = max(settlement.high × 1.15, trialMedian × 0.65)
trialHigh = max(settlement.high × 1.8,  trialMedian × 1.65)
(then same policy-limit constraint, then round to $1k)
```

**Example.**
```
nonEconomicDamages = 45000 + 10000 + 0 = 55,000
juryRiskModifier   = (liability 0.95 ≥ 0.75 → 1.12) × 1 = 1.12
trialBaseValue     = 32000 + 0 + 55000 + 16200 = 103,200
trialMedian        = 103200 × 0.95 × 1.08 × 1.12 × 0.95 ≈ 112,660
trialLow  = max(59764, 73229) = 73,229
trialHigh = max(93544, 185889) = 185,889
Trial band:  p25 ≈ $73,000   median ≈ $130,000   p75 ≈ $186,000
```

---

## 20. Viability (case-strength) — `predictViabilityHeuristic`

```
overall = clamp(0.45 + severityLift + medFactor + treatmentFactor + narrativeFactor + venueFactor + claimFactor, 0.05, 0.95)
   severityLift    = {0:−0.10,1:0.02,2:0.08,3:0.15,4:0.20}[level]
   medFactor       = min(med_paid / 100000, 0.15)        // uses med_paid only
   treatmentFactor = hasTreatment ? 0.08 : −0.03
   narrativeFactor = min(narrativeLength / 5, 0.06)
   venueFactor     = CA/NY/TX ? 0.05 : −0.02
   claimFactor     = {medmal:0.08, product:0.06, auto:0.03, premises:0.01, workers:−0.05}

liability = clamp(liabilityScore.score, 0.05, 0.95)             // deterministic
causation = clamp(overall − 0.06 + random(±0.05), 0.05, 0.95)   // ⚠ random jitter
damages   = clamp(overall + 0.08 + random(±0.05), 0.05, 0.95)   // ⚠ random jitter
ci = [overall − 0.09, overall + 0.09]
```

**Example.**
```
overall = 0.45 + 0.08 + 0.00 + 0.08 + 0.06 + 0.05 + 0.03 = 0.75
liability = 0.95   causation ≈ 0.69 (±0.05)   damages ≈ 0.83 (±0.05)   ci = [0.66, 0.84]
```

---

## 21. Output object & explainability

`predictViabilityHeuristic` returns:
- `viability { overall, liability, causation, damages, ci }`
- `value_bands { p25, median, p75, settlement{…}, trial{…}, economics{…}, drivers{…} }` (each band carries a human-readable `formula`)
- `explainability[]` — `{ feature, direction, impact }` rows: severity, liability strength, comparative negligence, medical bills, prior-injury discount, litigation-stage pressure, procedure leverage, offer anchor, policy-limit constraint, treatment continuity, detailed narrative.
- `severity`, `liability`, `caveats`, `modelVersion: 'heuristic-v1.0'`, `inferenceSource: 'heuristic'`.

---

## 22. End-to-End Worked Example

**Input:** Auto rear-end. CA. *"Stopped at a red light when the other driver, who
was texting, rear-ended me. Police report and photos."* Shoulder injury, 2
treatment visits, `med_charges = $18,000` (self-reported), `wage_loss = $5,000`,
property damage repair range $5k–$15k (→ $9,000), 2 daily-life impacts, no lawyer
yet, defendant policy limit unknown.

| Stage | Result |
|---|---|
| Severity | score 2.5 → **level 2 (moderate)** |
| Liability | 0.50 → 1.03 → clamp **0.95 (very_strong)**, comp-neg 0 |
| Economic damages | **$32,000** |
| Injury-supported value | **$71,904** |
| Modifiers | comp 0.62 · liab 0.95 · evid 0.95 · venue 1.08 · stage 0.92 |
| Settlement median (raw) | **≈ $39,976** |
| **Settlement band** | **≈ $39,000 / $46,000 / $52,000** (p25 / median / p75) |
| **Trial band** | **≈ $73,000 / $130,000 / $186,000** |
| Viability | overall **0.75**, liability **0.95**, causation ≈0.69, damages ≈0.83 |

**Sensitivity:** if the $18,000 were **document-verified**, the evidence modifier
rises 0.95 → 1.00, lifting the settlement median to ≈ $42,080 and the band to roughly
**$39,000 / $47,000 / $55,000** — illustrating how medical-cost provenance feeds
confidence into valuation.

---

## 23. Known limitations

- **Randomness:** `causation` and `damages` viability include `Math.random()` jitter (±0.05). `overall` and `liability` are deterministic.
- **Keyword-based liability:** relies on matching free-text narrative keywords, which is brittle to phrasing and language.
- **`medFactor` uses `med_paid` only**, so a case with large `med_charges` but no recorded `med_paid` gets no `medFactor` lift in viability `overall`.
- **Policy-limit floor quirk:** `applyPolicyLimitConstraint` can pull the band *low* down toward 25% of the policy limit even when the high is within the limit.

_Source: `api/src/lib/prediction.ts` (`calculateInjurySeverity`, `calculateLiabilityScore`, `computeFeatures`, `predictViabilityHeuristic`, and the modifier helpers)._

---

## 24. Future Direction (Roadmap)

The current engine is intentionally a transparent, rules-based heuristic. The
limitations in Section 23 stem from that design — free-text keyword matching, fixed
thresholds, and a flat (chronology-blind) view of treatment. Future versions should
evolve the model along the following axes **while preserving explainability** (every
output must still trace back to a human-readable reason):

### 24.1 Replace keyword matching with NLP-based clinical extraction
- Swap the brittle `narrative.includes('...')` keyword scans (in
  `calculateLiabilityScore` and `calculateInjurySeverity`) for a clinical NLP layer
  that extracts structured entities — injuries, body parts, mechanisms of injury,
  fault indicators — from free text and uploaded records.
- Normalize synonyms and negation (e.g. "no loss of consciousness" must not count as
  a concussion signal) so phrasing no longer changes the score.
- **Explainability requirement:** each extracted entity carries a source span (the
  exact sentence/phrase it came from) so the resulting score still shows *why*.

### 24.2 Incorporate ICD-10 / CPT codes
- Ingest diagnosis (ICD-10) and procedure (CPT) codes from medical records and bills
  during `runCaseRecalculation`, and map them to severity and damages weights instead
  of relying on dollar thresholds alone.
- Codes give an objective, auditable basis for severity (e.g. a documented fracture or
  surgical CPT code is far stronger than a self-reported "moderate" injury) and feed
  directly into the `medChargesSource` provenance ladder
  (`self_reported → partially_documented → documented`).

### 24.3 Account for treatment chronology and gaps in care
- Today `treatment.length` is treated as a flat count (each entry ≈ "one month").
  Replace this with a true timeline: treatment start/end dates, visit frequency,
  duration, and **gaps in care**.
- Gaps and late treatment onset are classic value-reducers (defense argues the injury
  wasn't serious or wasn't caused by the incident); continuous, consistent treatment
  is a value-builder. Model both explicitly rather than rewarding raw visit count.

### 24.4 Calibrate thresholds using historical settlement outcomes — IMPLEMENTED (Phase 2)
- The hand-tuned constants are no longer the only lever: the engine now accepts a small,
  interpretable set of **calibration coefficients** fit from real outcomes, applied on
  top of the existing model so the hand-set constants (and their explainability) are
  preserved.
- **Coefficients** (`api/src/lib/valuation-config.ts`): `settlementScale`, `trialScale`,
  per-severity `severityAnchorScale`, and `bandWidthScale`. The default is **identity
  (all 1.0)** → uncalibrated deployments reproduce prior behavior exactly. Resolution
  order: in-process override → `VALUATION_CALIBRATION` env JSON → `api/data/valuation-calibration.json` → identity.
- **Outcome substrate** (`CaseOutcome` model + `api/prisma/sql/20260628_case_outcomes.sql`):
  records each real resolution (settlement/verdict/dismissed) with a snapshot of the
  feature vector and predicted median. `recordCaseOutcome()` writes them;
  `exportOutcomeSamples()` turns them into a labeled dataset.
- **Backtest + calibrate** (`api/src/lib/valuation-calibration.ts`): `backtest()` reports
  median absolute % error, bias, and p25–p75 band coverage (overall and per severity);
  `calibrate()` grid-searches the scalar coefficients to minimize error while holding
  band coverage near its ~50% target, returning before/after metrics — an auditable,
  non-black-box fit.
- **CLI** (`api/scripts/calibrate-valuation.ts`):
  ```bash
  # Dry-run a backtest + recommendation from recorded outcomes
  ts-node scripts/calibrate-valuation.ts --from-db
  # …or from a JSON dataset, and persist the recommendation for runtime use
  ts-node scripts/calibrate-valuation.ts --input=./data/outcomes.json --write
  ```
- **Bridge to ML hooks:** the same coefficients can be evaluated against the heuristic in
  `shadow` mode (Section 11, `predictViability`) before promoting to `replace`. Predictions
  made under a non-identity calibration are tagged `heuristic-v1.0+cal:<version>` for traceability.

### 24.5 Preserve explainability throughout
- Any learned or NLP-driven component must still emit the `explainability[]` rows and
  per-band `formula` strings the platform relies on today.
- Prefer inherently interpretable methods (monotonic/GBM models, calibrated logistic
  layers, SHAP-style attributions) so attorneys and claimants always see the drivers
  behind a number — the model gets smarter without becoming a black box.

> **Guiding principle:** increase accuracy (NLP, codes, chronology, calibration)
> without sacrificing the transparency that makes the output defensible and trusted.
