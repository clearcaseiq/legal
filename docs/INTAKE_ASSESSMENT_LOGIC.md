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
