# ClearCaseIQ — Functional Specification (Detailed)

> A detailed functional reference describing **exactly what the platform does**, organized by
> user role and capability. This describes **behavior and features** (the "what"),
> complementing `TECHNICAL_SPECIFICATION.md` (the "how").
>
> This edition documents concrete fields, options, formulas, endpoints, and business rules as
> implemented in the source. Where a feature is backed by mock/in-memory data or is otherwise
> not production-complete, it is explicitly flagged.

---

## 1. Product Summary

ClearCaseIQ (a.k.a. "Injury Intelligence") is an AI-powered personal-injury case assessment and
attorney-matching platform. An injured person describes their incident through a guided intake;
the platform instantly estimates the strength and value of the case using a layered AI/ML +
underwriting model, helps the claimant strengthen the case by uploading evidence (which is OCR'd
and re-scored), and then routes qualified, interested attorneys to represent them. Attorneys get a
dashboard of pre-screened, scored leads plus a full matter-management suite; firm and platform
admins get routing, compliance, communications, and analytics controls.

### Primary user roles
| Role | Description |
|------|-------------|
| **Claimant / Plaintiff** | The injured person seeking an assessment and representation. |
| **Attorney** | A licensed attorney who receives, reviews, accepts, and manages matched cases. |
| **Firm Admin** | Manages a law firm's attorneys, permissions, settings, and case assignment. |
| **Platform Admin** | Operates the platform: routing, matching rules, heuristics, compliance, comms, analytics. |

### High-level lifecycle
1. **Intake** → claimant completes the guided wizard; a draft/lead is saved locally and server-side.
2. **Assessment** → an `Assessment` record is created; prediction + ChatGPT analysis run.
3. **Results** → claimant sees a Case Snapshot, full tabbed report, and improvement actions.
4. **Strengthening** → claimant uploads evidence; OCR/vision extraction re-runs valuation.
5. **Submit for review** → claimant submits; routing/matching engine offers the case to attorneys.
6. **Acceptance & matter management** → an attorney accepts; the Case Command Center drives the matter.

---

## 2. Claimant-Facing Functions

### 2.1 Guided Intake Wizard (`IntakeWizardQuick.tsx`)

The production intake is an **8-step** wizard. The same 8 steps are shown for every injury type
(per-injury *step hiding* exists in code but is currently a no-op); branching happens **within**
steps — primarily the **Case Details** step.

**Ordered steps**

| # | Step key | Title | Purpose |
|---|----------|-------|---------|
| 1 | `injury_type` | Injury Type | Pick one of 9 injury categories; sets the claim type. |
| 2 | `when` | Incident Facts | Date, narrative, location, severity, treatment, optional contact. |
| 3 | `injury_details` | Injury Details | Body parts, treatments, diagnoses, symptoms, recovery, life impact. |
| 4 | `case_details` | Case Details | **Injury-type-specific** liability/evidence questions. |
| 5 | `evidence` | Evidence Upload | Inline document/photo upload by category. |
| 6 | `financial_impact` | Damages & Valuation | Live valuation visualization + damage inputs. |
| 7 | `legal_status` | Insurance & Legal Status | Fault belief, insurer contact, attorney status, coverage. |
| 8 | `consent` | Your Case Report Is Ready | Pre-submit summary + consents + submit. |

A progress bar shows "Step X of 8". When resuming an older draft, legacy step keys (`where`,
`narrative`, `branch_7…10`, etc.) are remapped onto the current 8 steps.

#### 2.1.1 Injury types (Step 1)
`vehicle` (auto), `slip_fall`, `workplace`, `medmal` (medical malpractice), `dog_bite`, `product`,
`assault` (negligent security), `toxic` (toxic exposure), `other`. Selecting a type sets both
`injuryType` and a derived `claimType`:

`vehicle→auto`, `slip_fall→slip_and_fall`, `workplace→slip_and_fall`, `medmal→medmal`,
`dog_bite→dog_bite`, `product→product`, `assault→slip_and_fall`, `toxic→product`,
`other→slip_and_fall` (unknown → `product`).

#### 2.1.2 Incident Facts (Step 2)
A single combined screen with five numbered sections plus optional contact capture:
1. **Date** — native date picker, or quick presets *Today / Last week (−7d) / Last month / Last
   year*. When computable, an **estimated SOL filing-deadline** card is shown.
2. **Narrative** — free text, max **1,000 characters**, with injury-type-specific hint chips.
3. **Where** — State, County (dropdown when known, else free text), City. An **IP-geolocation**
   banner (ipapi.co + FCC county lookup) offers to pre-fill location.
4. **Injury severity** — `minor / moderate / serious / surgery / unsure`.
5. **Treatment received** (multi-select) — `ER visit / chiropractic-PT / MRI / injections /
   pain management / surgery / none`. "none" is exclusive; "MRI" syncs into injury details.
6. **Contact (optional, "save your progress")** — email and/or phone, with a preferred-method
   choice. Email gets typo suggestions + DNS/MX deliverability checking; phone is format-validated.

#### 2.1.3 Injury Details (Step 3)
- **Body parts**: `neck, lower_back, shoulder, knee, head_concussion, hand_wrist, hip, other`.
  Selecting head/shoulder/lower-back reveals contextual finding sub-panels (concussion symptoms,
  shoulder findings, back findings).
- **Treatments received**: `MRI, CT scan, X-ray, physical therapy, chiropractic, injections,
  surgery, other`.
- **Diagnoses**: `herniation, radiculopathy, muscle strain, tear, whiplash, concussion, fracture,
  TBI, other`.
- **Current symptoms**: `pain, stiffness, limited range of motion, numbness, weakness, headaches,
  other`.
- **Recovery status**: `fully recovered, mostly improved, symptoms ongoing, getting worse`, plus a
  **biggest impact** choice (`work, pain, mobility, daily activities, not sure`).
- **Daily-life impact** (multi-select): `unable to work normally, sleep disruption, exercise
  limitations, driving difficulty, household chores, missed family`, plus free text.
- **Collapsible "Additional information"**: prior injuries, symptom frequency & trend, future
  treatment expectations, and (conditionally) planned procedures and surgery status.
- A live **Case Snapshot sidebar** computes a running severity score, document-completeness, and
  value-confidence as answers change.

#### 2.1.4 Case Details (Step 4) — branching by injury type
Up to four sub-sections render different questions per injury type, with a progress bar counting
answered sections. Highlights per type:

- **Vehicle**: crash type, who's at fault, liability-evidence checklist (police report, ticket,
  witnesses, photos/video, dashcam, red-light, DUI), property damage, defendant type.
- **Workplace**: cause, reported-to-employer / WC claim flags, third-party involvement.
- **Slip & fall**: hazard type, property type, hazard-awareness (employees knew, warning signs,
  duration), injury impact + documentation (incident report, photos).
- **Med-mal**: error type, provider type, harm severity, "another doctor confirmed", records access.
- **Dog bite**: animal type & ownership, bite location, prior aggression, medical (multi-select) + skin/photos.
- **Product**: product type, malfunction/recall flags, injury-cause free text, evidence (product,
  packaging, receipt, photos, treatment).
- **Assault / negligent security**: where it occurred, prior incidents, security questions, police,
  property-owner free text.
- **Toxic exposure**: substance, exposure location & duration, symptoms, doctor-linked, reported-to.
- **Other**: free-text description, who caused it, evidence.

#### 2.1.5 Evidence Upload (Step 5)
Three accordions — **Accident** (photos, video, police report), **Medical** (bills, medical
records), **Financial** (wage verification). Each row supports drag/drop, capture, and
mismatch-move (e.g., a video dropped under Photos can be relocated). A **readiness score** weights
categories (medical records 30, police report 25, bills 25, photos 20, wage verification 15).
Only **bills** and **wage verification** trigger immediate financial OCR (cached by file signature)
to refine on-screen estimates. Actual uploads to the server are **deferred** until the assessment
is created, then posted and processed; failures stay queued with a retry UI.

#### 2.1.6 Damages & Valuation (Step 6)
The top half is a **live valuation visualization** (economic specials, pain-multiplier
non-economic, low/likely/high settlement and trial ranges, comparables, timeline, confidence
factors). Inputs live in a collapsible "Edit your damage details":
- **Medical bills so far** (banded; exact amount field for the top band; "are bills complete?" flag).
- **Future treatment cost** (banded).
- **Work impact** (`no / few days / several weeks / unable to return / lost job or business income`).
- **Lost income range** (conditional on work impact).

#### 2.1.7 Insurance & Legal Status (Step 7)
- **Who's responsible** (other party / shared fault / not sure; label adapts per injury type).
- **Partial fault** (no / possibly / yes).
- **Insurer contact** (no contact / contacted only / made an offer → offer amount band).
- **Attorney status** (hired / not hired).
- **Accepted a settlement?** (no / yes → warning / not sure).
- Collapsible **Insurance details**: defendant coverage limits; **UM/UIM** (vehicle only).

#### 2.1.8 Your Case Report Is Ready (Step 8)
A pre-submit preview: profile-completeness ring, preliminary settlement-range estimate, readiness
label, "strengthen your case" suggestions, and editable summary cards (each "Edit" jumps back to
the relevant step and returns here). **Consents** are two checkboxes: one combined Terms+Privacy and
one AI/ML-use consent (all three booleans required).

#### 2.1.9 Validation rules
- **Injury type**: required.
- **Incident facts**: date required and not in the future; state + county required; email (if
  entered) must be valid and deliverable; phone (if entered) valid; severity required; narrative optional.
- **Injury details / case details / evidence / damages / legal status**: no blocking validation
  (all advanceable/skippable; evidence has an explicit "Skip for now").
- **Consent**: all three consents required. Final submit re-checks venue + consents.

#### 2.1.10 Draft autosave, resume, and server lead sync
- **Local autosave** (debounced ~400 ms) stores form data, current step, custom date, furthest step
  reached, and lead id once an injury type exists. On return, the draft is merged back (consents are
  always reset to false). "Start over" clears the draft after confirmation.
- **Cross-device resume** via `?lead=<id>` fetches the server snapshot and restores answers (contact
  and consents are intentionally **not** restored from a link).
- **Server lead sync**: once an email/phone is present (or a lead already exists), the wizard
  best-effort `create`/`update`s an **intake lead** carrying `email, phone, injuryType, venueState,
  venueCounty, currentStep, formSnapshot` (snapshot excludes contact + consents). Leads are written
  when contact first appears, on each subsequent step change, and on final submit (with
  `assessmentId` + `status:'completed'`). All sync errors are swallowed so they never block intake.

#### 2.1.11 Final submit behavior
Builds a large payload (claim type, derived case taxonomy, venue, incident + generated narrative,
injuries with severity, treatment, liability with comparative-negligence, damages, insurance,
plaintiff context, consents, and a raw `intakeData` blob), then:
1. Creates the assessment (`createAssessment`).
2. Caches a `pending_assessment_id`, clears the local draft.
3. Marks the lead completed.
4. Fires **prediction** and **ChatGPT analysis** (fire-and-forget).
5. Uploads any queued evidence; on success navigates to `/results/:id` (retry UI on failure).

#### 2.1.12 Localization
A lightweight custom i18n (`t`/`tx`/`localizeOptions`) covering **English, Spanish, Chinese**.
English is bundled; ES/ZH are lazy-loaded. Missing keys fall back to English, then to the raw key.
(The `STEPS` titles and a few control labels are hardcoded English.)

#### 2.1.13 Alternative intakes
- **Rose** (`RoseIntake.tsx`): a separate conversational/voice intake (phases: story capture →
  targeted follow-up → recap confirmation → completed) using the Web Speech API and server turns;
  on completion it creates an assessment and navigates to results. Conversation state is held
  **in-memory** server-side (not durable across restarts).
- **Legacy** (`IntakeWizard.tsx`): the original 5-step schema-driven wizard (basic → incident →
  injuries → damages → review), superseded by the Quick wizard.

### 2.2 Case Snapshot & Results (`Results.tsx`)

The results page has three views: an always-on **Case Snapshot**, a collapsible **Full Case
Report** with six tabs, and a **post-submission tracking** view once submitted for review. All
insight panels **auto-refresh every 5 seconds** via React Query while the tab is in the foreground
(polling pauses when backgrounded; also refetches on window focus/reconnect).

#### 2.2.1 Case Snapshot (always-on)
- **Header**: logo, "Preliminary assessment • Confidential", a short reference ID, a **Download
  Summary** PDF button, and a **Continue to Attorney Review** CTA.
- **Fact row**: case type, jurisdiction, incident date.
- **Three core cards**:
  - **Settlement Estimate** — most-likely range, most-likely amount, confidence level, plus a trial
    sub-block.
  - **Liability** — badge + summary + checklist (police report, photos, witnesses, fault clear) and
    a gradient marker at the liability percentage.
  - **Attorney Interest** — level word (Strong/Building/Early), "what's holding it back", and a marker.
- **Top Actions** (up to four undone improvement items, each with a potential-impact "boost").
- **Case Details Breakdown** — six tone-colored rows (Fault/Liability, Injury Severity, Treatment
  History, Insurance Coverage, Documentation, Venue).
- **Likely Attorney Matches** (top 3), **AI Case Summary** bullets, **Value Drivers**, deadline
  warning, and a toggle to open the full report.

#### 2.2.2 Full Case Report tabs
1. **Case Overview** — four metric cards (Settlement Estimate, Liability Strength, Attorney
   Readiness, Trial value), an AI summary + quality-score gauge, three columns (Medical Timeline,
   Damages Breakdown, What's Missing), attorney matches, "how to increase value", and disclaimers.
2. **Liability Analysis** — liability-strength gauge, most-likely-at-fault bars, attorney-interest
   projections, shared-fault risk, strongest liability factors, likely insurer arguments, estimated
   impact of additional evidence, an "improve your liability" stepper, venue intelligence, and
   recommended next steps.
3. **Medical Story** — treatment-strength, attorney-readiness, injury-severity, value-confidence,
   and treatment-length metrics; AI medical summary; treatment timeline; missing-evidence impact;
   known economic damages; future-treatment indicators; required-vs-helpful evidence; and a
   collapsible **Review & correct** panel where the claimant edits damage estimates and confirms or
   skips the medical chronology (which **recomputes** settlement/trial ranges).
4. **Damages & Valuation** — a Case Command Center summary, overall-assessment gauge, modeled
   settlement range with confidence reasons, success probability, likely timeline, litigation
   potential, key value drivers, case signals + litigation readiness, a "how we calculated this"
   breakdown, DIY-demand suitability, comparable benchmarks, expected timeline, SOL, and
   documentation/readiness.
5. **Evidence & Documents** — case-strength, settlement-confidence, and attorney-interest gauges;
   the most important missing documents (with confidence boosts and value bands); progress bars;
   "unlocks when you upload"; projected impact of uploading; medical-document extraction totals;
   demand-package status (locked until no docs missing).
6. **Next Steps** — attorney-interest, estimated-settlement, liability-strength, and review-time
   headline metrics; an attorney-review-readiness gauge; "what happens next"; "increase your case
   value"; top attorney matches (locked previews); save-your-case prompt; and the submit CTA
   (blocked while a medical review is pending).

#### 2.2.3 Valuation & scoring (consumer-facing derivations)
The prediction API supplies viability, value bands, and underwriting; the page derives the
consumer numbers. Key relationships (as implemented):
- **Case strength** and **success probability** both = `round(viability.overall × 100)`.
- **Settlement range** comes from underwriting/value-band low/expected/high (defaults 15k / median / 75k).
- **Trial range** ≈ settlement high × 1.35 (low) to × 3.25 (high) when not provided.
- **Early-stage display compression**: when confidence is Low, evidence is absent, readiness ≤ 50%,
  or liability isn't strong, the **displayed** range is compressed/rounded down to avoid
  over-promising. (Notably, the Next Steps tab shows the **raw** range while the snapshot shows the
  **compressed** range.)
- **Estimate confidence** accrues points for treatment, ER, MRI, medical records, bills, police
  report, photos, wage proof, and liability strength (High ≥ 70, Medium ≥ 40, else Low).
- **Attorney interest / acceptance** combine viability, liability, severity, documentation, and
  expected-fee economics; missing medical records penalize the score.
- **Readiness / documentation / evidence-completion** are fractions of required items present.

#### 2.2.4 Downloadable PDFs (`reportPdfExports.ts`)
A dependency-free PDF generator produces three documents:
- **Case Snapshot PDF** (rich, color-matched) — header band, fact row, key metric cards, settlement
  estimate, liability, attorney interest, case-details breakdown, top actions, AI summary, value
  drivers, timeline & deadlines, and a disclaimer footer.
- **Dashboard report PDF** (simple text) — incident/medical/damages/evidence summary, case score,
  estimated value, documentation %.
- **Wage-loss documentation template PDF**.

### 2.3 Claimant Dashboard (`Dashboard.tsx`)

The claimant's home after assessment. On load it gates on consent compliance (redirecting to a
complete-consent flow if required consents are missing), then loads the active assessment, evidence,
and document requests. Freshness is handled without React Query: routing status **polls every 30
seconds** while under review, and the active assessment **refetches on window focus/visibility**.

**Tabs**: Dashboard, Tasks (badge = pending action items), Documents (badge = strengthening
opportunities), Attorney Review, Case Value, Journal. Only the Dashboard tab renders inline; the
others load via a lazy deferred panel.

**Non-matched state** (still awaiting an attorney):
- Header metric cards: Case Strength, Attorney Interest (gauge), Settlement Range, Expected Response.
- **Attorney Review Status** (submitted → matched to PI firms → under review → response expected)
  and "what happens next".
- **Increase Your Case Value** (Medical Records / Police Report = high impact; Medical Bills =
  medium; Lost Wages = low) and **Potential Attorney Matches** (locked previews).
- Secondary metrics: liability strength, settlement likelihood, similar cases in the venue state,
  case readiness.
- **Case Coach** (state-driven guidance), Attorney Messages placeholder, **Case Summary**, and a
  bottom CTA to send the case for attorney review.

**Matched state** (an attorney is engaged):
- Attorney match card (name, firm, experience, specialties, response time; Call/Message/Browse).
- **Schedule Consultation** (or scheduled state with reschedule/cancel/join) and a Next Best Action.
- Pre-consult checklist with saved prep notes, an "attorney viewed" signal, an in-platform **Case
  Messages** thread, and verified-review submission once eligible.
- Legacy strengthening grid: ways to strengthen, what-happens-next timeline, estimated value
  (current vs potential), biggest opportunities, similar cases, case coach, and help.

**Other tabs** (deferred panel): Tasks (merged review + evidence + score-improvement items),
Attorney Review (status + CTAs), Documents & Evidence (impact-weighted checklist + medical summary),
Case Value (history bar chart + "cases like yours"), and a **Journal** (wage-loss estimator, pain
slider 0–10, impact notes, saved locally per case).

An **Action Center** appears when attorney document requests exist, showing per-request progress and
upload links.

### 2.4 Evidence & Case Strengthening

- **Upload** (`EvidenceUpload`) — category/subcategory selectors (medical records, police report,
  bills, wage loss, photos, videos, correspondence, other), description, drag/drop or **camera
  capture**, multi-file, 50 MB cap; auto-processes after upload.
- **Dashboard** (`EvidenceDashboard`) — stats (total/processed/processing/pending, total size, total
  extracted $), an **AI Evidence Intelligence** panel (gaps, contradictions, severity/liability
  signals, medical chronology), search/filter/grid-list, and per-file detail (AI
  classification/summary/tags/relevance, extracted totals, edit metadata, document intelligence,
  annotations, and an audit trail).
- **Automated processing pipeline** (server): OCR via **Tesseract** (default) or **AWS Textract**;
  PDFs use embedded text first, then Textract fallback; DOCX via mammoth; `.txt` direct. Extraction
  pulls **dollar amounts** (with a smart "total" heuristic to avoid double-counting), **dates**
  (multi-format, calendar-validated), **ICD** and **CPT** codes, a structured medical timeline, and
  keywords. **AWS Rekognition** vision labeling assesses image relevance per category (relevant /
  review / mismatch), and Textract keyword sets distinguish police report vs bill vs medical record.
  Vision verdicts are **non-blocking** (they set a relevance score and may flag for manual review).
- **Re-scoring**: every processed upload merges into case facts (gated so blank/unreadable uploads
  don't inflate scores), recomputes the prediction, and notifies the claimant when value rises and
  attorneys when a material change occurs (≥ 20% value increase or new liability evidence).
- **Consent gating**: for non-guest users, evidence upload is blocked (403) until required consents
  are complete (and email is verified when that flag is enabled).

### 2.5 Supporting Claimant Tools

> Several of these are **UI-complete but backed by mock/in-memory data** today. Persisted/real
> tools: SOL, Demand, Messaging, Case Tracker, Evidence, Consent/Compliance.

- **Statute-of-limitations (SOL) calculator** — covers all 50 states + DC across general PI, auto,
  med-mal, wrongful death, and workers' comp, with claim-type alias normalization. Returns the rule,
  expiration date, years/days remaining, and a status (`safe > 365d`, `warning > 90d`, else
  `critical`). A richer helper additionally applies the **discovery rule** and **minor tolling** and
  is used by routing/attorney surfaces. The public `/calculate` endpoint is unauthenticated.
- **Recovery Hub** — tabs (Overview, Recovery Log, Goals, Trends) with summary cards, activity feed,
  goals, and recommendations. **Mock/in-memory**: the API returns hardcoded data and the
  Add Entry/Goal buttons currently just show a success alert.
- **Medical Providers directory** — searchable provider list with lien terms, a referrals tab, and
  analytics. The page currently loads **client-side mock data**; the (real) API supports
  provider search, referral CRUD, and analytics, though distance is a stub.
- **Financing** — tabs for Pre-Settlement Funding (partner cards with APR/term/approval-rate),
  Medical Liens, and a **Cost Calculator** (amortization → monthly payment, total payback, effective
  rate, settlement-impact, and rule-based recommendations). Partners/medical lists are **hardcoded**
  and funding requests are **not persisted**; the calculator is real.
- **Messaging** — plaintiff ↔ attorney chat rooms (get-or-create, last-20 history, unread tracking)
  plus a keyword-matching **AI assistant** chatbot. Attorney messages are **translated** into the
  plaintiff's language (ES/ZH). Creating a room and sending messages is **consent- and
  verified-email-gated** (403 otherwise) and **push-notifies the attorney**.
- **Demand** — a self-help settlement-demand package. Pre-fills a demand amount (2× medical
  charges), runs a **DIY-suitability** risk screen, and generates a letter in **pro se** (first
  person, non-waiver language) or **represented** (attorney letterhead) mode, downloadable as **DOCX
  or TXT**. An anti-hallucination guard rejects LLM drafts that contradict reported damages.
- **Case Tracker** — a portfolio view: per-case status, estimated value (median + p25–p75), counts,
  a **client-transparency** progress bar with plain-English status and next action, upcoming
  appointments, a details modal (with AI prediction + full case facts), and a synthesized timeline.
  Status text and attorney messages are translated (ES/ZH).
- **Assessments** — a read-only list of the claimant's assessments linking to each results page.
- **User Profile** — edit first/last name and phone (validated); email is read-only/verified.

---

## 3. AI / ML & Automation Functions

ClearCaseIQ produces viability/value/severity/liability through **three layers**:

### 3.1 Heuristic prediction (`lib/prediction.ts`)
Derives a feature vector from case facts: a weighted **injury-severity** score (0–4 from med
charges, treatment duration, body parts, concussion, surgery, keywords); a **rules-based liability**
score (claim-type-specific narrative rules + per-state comparative negligence); damages; insurance /
policy-limit signals; treatment/procedure signals; representation stage; and litigation intent. It
outputs dual **settlement vs trial** value bands (with policy-limit constraints), an explainability
list, and caveats. The prediction *mode* is configurable (`fallback` heuristic, live ML service, or
**shadow** mode that logs ML vs heuristic and returns the heuristic). Liability is deterministic;
causation/damages sub-scores retain minor randomized jitter.

### 3.2 Underwriting engine (`lib/underwriting-engine.ts`)
A deterministic "ca-pi-underwriting-v1" model overlaid on the prediction. It computes liability
(using the **verified** evidence set so blank uploads don't inflate it), severity from a base-value
table by injury type, treatment quality, documentation completeness, a settlement estimate
(`(base injury value + economic damages) × venue modifier × liability modifier × treatment
modifier`, with low/expected/high = ×0.7/1/1.3), attorney-acceptance ROI/probability, attorney
consensus, and an aggregate **case strength** (weighted liability .25, severity .25, treatment .15,
documentation .15, acceptance .20).

### 3.3 Case recalculation (`lib/case-recalculation.ts`)
Runs on uploads/estimates: merges OCR-extracted data into facts (credit gated on usable content),
dedupes amounts, applies a **medical-specials decision rule** (documented / partially documented /
self-reported, with discrepancy detection ≥ $5k & ≥ 40%), extracts wage loss, then re-predicts and
persists. It notifies the claimant when median value rises and attorneys on material change.

### 3.4 ChatGPT case analysis (`services/chatgpt.ts`)
LLM-grounded analysis (model `gpt-4o-mini` by default, JSON-only). Optionally retrieves grounded
legal context, then returns a structured analysis: case-strength sub-scores, key issues / strengths
/ weaknesses / recommendations, estimated value, comparable-case data, valuation breakdown, medical
chronology, a **demand draft** (consumed by the demand generator), expected settlement range,
liability model, missing-treatment analysis, severity model, adjuster prediction, timeline, and next
steps. With no API key (or on any error) it returns a deterministic **fallback** analysis.

### 3.5 Case insights (`lib/case-insights.ts`)
Builds the medical chronology (merging incident + facts + extracted record timelines), a case
preparation report (missing docs, treatment gaps > 30 days, strengths/weaknesses, readiness 0–100),
and settlement benchmarks (p25/p50/p75/p90 from comparable settlement records).

### 3.6 AI Copilot (`routes/ai-copilot.ts`)
A **heuristic/mock** assistant (rule/keyword answers, mocked document analysis, SOL, and settlement
simulation) — distinct from the LLM-backed ChatGPT analysis. Useful for canned guidance.

---

## 4. Attorney-Facing Functions

### 4.1 Onboarding & Identity
- **Registration** (`AttorneyRegister`) — a 5-step wizard: account → practice areas → service area
  (states + counties) → capacity (cases/week, cases/month, intake hours/status) → license
  verification (State Bar lookup or document upload). Creates the user, attorney, and initial
  profile, links the firm, and issues an auth token.
- **Login** (`AttorneyLogin`) — email/password + Google SSO; attorney login additionally requires a
  matching attorney record.
- **License upload & verification** (`AttorneyLicenseUpload`, `verification`) — State Bar lookup
  (CA today) or manual document upload (≤ 10 MB). The verification route also models ID
  verification, e-signature requests, and compliance status (mock Jumio/Onfido/DocuSign).
- **Profile** (`AttorneyProfile`) — public profile editor (bio, photo, specialties, languages, years
  of experience, firm), performance metrics, and "Verified Verdicts"; auto-refreshes every 30s.
- **Preferences** (`AttorneyPreferences`) — firm locations, jurisdictions, case preferences (min
  severity, excluded case types, min/max damages), capacity, and buying preferences (pricing/payment
  model, subscription tier).

### 4.2 Profile Claiming (Yelp-style) (`ClaimProfile`, `attorney-claim`, `lib/claims.ts`)
A pre-imported attorney profile is claimed via a tokenized link: start the claim (returns a masked
profile + available methods) → verify by **email OTP**, **SMS OTP**, or **State Bar number** → create
an account, which links the user to the existing profile and updates the claim status. Admins issue
invites; OTPs are hashed with TTLs and attempt limits; emails/phones/bar numbers are masked/normalized.

### 4.3 Attorney Dashboard (`AttorneyDashboard` + components)

**Tabs**
- **Leads** — a filterable lead table (case type, value range, status, pipeline stage, evidence
  level, jurisdiction) with quick actions (Accept / Decline / Call / Message), starring, and bulk
  actions (document requests, schedule consults). A routing inbox summarizes Awaiting decision, Hot
  matches, Aging > 24h, and Consult-ready.
- **Intake** — create manual cases, clone templates, and **import** from Clio / Filevine / Needles /
  Litify / spreadsheets (with documents, history, tasks, and medical ingestion). Configures a
  **Smart Intake Engine** (dynamic questionnaires, conditional logic, missing-info detection,
  auto-follow-ups).
- **Profile** — the public profile view (bio, specialties, languages, firm, jurisdictions, case
  preferences, capacity, response-time commitments, license status).
- **Analytics** — conversion snapshot (acceptance/consult/retain), operations pulse (readiness,
  demand-ready, doc-blocked, overdue tasks), decision intelligence (decisions captured, override
  rate), case-level intelligence (cost vs outcome, duration vs value, settlement efficiency),
  conversion funnel, revenue pipeline, firm profitability, and an AI forecast.

**Lead Detail** toggles **Pre-Acceptance** (viability breakdown — liability/causation/damages —
case type, venue, Accept/Reject) and **Post-Acceptance** (the Case Command Center). It surfaces the
Next Best Action, defense risks, lead transfer to firm attorneys, and quick actions.

**Workstreams** (post-acceptance):
- **Overview** — incident facts, liability confidence, evidence count, a Case Opportunity Score,
  evidence status, value drivers, treatment timeline (gap detection), activity, review checklist,
  similar cases, and SOL.
- **Tasks** — task CRUD (general / statute / milestone / checkpoint / demand / negotiation), with
  priority, due dates, reminders, assignees, creation from command-center blockers, and workflow
  templates.
- **Health** — a Case Health Score (liability, evidence, treatment, insurance constraints, time
  risk, cost burn) with risk alerts and escalation rules.
- **Evidence** — assessment + uploaded files, inline uploader, and a link to the Evidence Dashboard.
- **Insurance** — carriers/policy limits/adjusters and a Liens tab (holders, types, amounts, statuses).
- **Demand** — demand-readiness, AI demand-letter drafting, latest drafts, DOCX download, blockers,
  and negotiation posture.
- **Billing** — invoice/payment CRUD (PDF/Word), recurring invoices, Stripe payment methods,
  subscriptions, lead credits, and Connect payout status.
- **Collaboration** — comment threads (general/decision) with auto-summaries and @mentions, plus
  quick notes.
- **Negotiation** — a Negotiation Tracker (offers/counters/demands/calls/notes, posture,
  recommended moves, scenario modeling) and cadence templates.
- **Case Insights** — medical chronology, case-preparation report, and settlement benchmarks.

### 4.4 Case Command Center (`AttorneyCaseCommandCenter`, `lib/case-command-center.ts`)
The intelligence backbone. `buildCaseCommandCenter` aggregates facts, lead status, predictions,
appointments, insurance, negotiation events, and contact history into: stage, readiness, value /
liability / coverage stories, negotiation summary, treatment monitor (gaps + recommended actions),
medical-cost benchmark, strengths/weaknesses/defense risks, missing items, Next Best Action, a
**suggested document request**, a **suggested plaintiff update**, and a **copilot** (suggested
prompts + evidence context). It powers the document-request page, demand workstream, tasks-from-
readiness, and lead detail.

### 4.5 Billing & Calendar
- **Payments** (Stripe) — invoice checkout, attorney **subscription** checkout, **lead-credit**
  purchase, save-card setup, per-case **routing-fee** charge (covered by subscription credits when
  available, else off-session charge or checkout), and **Stripe Connect** onboarding/payout status.
  A webhook reconciles checkout/subscription/invoice events.
- **Calendar** (`CalendarPage`, `EventsPage`) — a month grid and upcoming-consult list built from the
  dashboard summary; clicking a date schedules a consult or adds a task.
- **Calendar sync** (`attorney-calendar`) — Google/Microsoft OAuth connect, sync, disconnect, and
  push webhooks.
- **Appointments** (`appointments`) — create/reschedule/cancel with **conflict checks** (against
  appointments and busy blocks), prep checklists, waitlist, notifications, external calendar event
  creation, and availability generation; scheduling a consult advances the lead lifecycle.

### 4.6 Network, Recommendations & Lead Quality
- **Attorney Network** (`AttorneyNetwork`) — a marketing/landing page (value props, how-it-works,
  differentiators, CTAs).
- **Smart Recommendations** (`SmartRecommendations`, `smart-recommendations`) — *assessment-scoped*
  (owned by the requester): attorney matches (filter by rating, response time, verified-only,
  free-consult; sort by score/rating/response), case insights, treatment recommendations, and
  similar cases. Matching **hard-rejects** excluded case types, below-minimum severity, out-of-range
  damages, and over-capacity attorneys; then awards points for jurisdiction (40), case-type
  specialty (30), rating (≤ 20), response time (≤ 10), plus language/consultation/verified bonuses,
  returning the top 10 with reasons.
- **Lead Quality** (`LeadQuality`, `lead-quality`) — quality overview (viability + L/C/D breakdown,
  evidence completeness, source, hotness), an evidence checklist (per case-type templates with
  critical flags), **deterministic conflict checks** (adverse-interest = high, duplicate-party =
  medium), and quality reports (spam/duplicate auto-issues a **$50 credit** and resolves).

### 4.7 Practice / Case-Management Subpages
All "Add" pages read a lead id, render a case label, validate, POST, and return to the dashboard:

| Page | Purpose | Notes |
|------|---------|-------|
| Add Task | Create a general task | Title required; due date can prefill; priority. |
| Add Note | Add a case note | General/strategy/evidence/update. |
| Add Contact | Add a case contact | Client/opposing counsel/adjuster/witness/provider/expert/other. |
| Add Expense | Add expense/lien | Medical/lien/subrogation/other; status open. |
| Contacts | List/edit/delete contacts | Optimistic delete with rollback; edit modal. |
| Calendar / Events | Month grid + consult list | From dashboard summary. |
| Time Entry | Log time | Hours + activity encoded into a task. |
| Create Invoice | Create an invoice | Amount required; optional number, due date, notes. |
| Case Documents | View/upload/delete docs | Single vs batch (≤ 10); type icons. |
| Document Request | Request docs from the plaintiff | **Prefills from the Command Center's suggested request**; shows readiness + blockers. |
| Draft Message | Message the plaintiff | Full chat thread + quick templates; blocks if the plaintiff has no account. |
| Drafts | Draft legal documents | **Client-side generation only** (no save): demand letter, incident summary, injury chronology, damages summary, police-report summary. |

---

## 5. Matching & Routing Functions

Two routing systems coexist.

### 5.1 Controlled Matching Engine
A 3-step pipeline (`lib/routing.ts`):
- **Step 0 — Hard eligibility**: jurisdiction, case-type, capacity, and exclusion gates.
- **Step 1 — Quality gate**: admin-configured thresholds (viability, evidence, etc.).
- **Step 2 — Match score**: weighted **Fit 35% / Outcome 35% / Trust 20% / Value 10%**.

`runRoutingEngine` (`lib/routing-engine.ts`) dispatches the case to attorneys in **waves**, applying
a final admin-weighted re-rank: `routingScore = base × 0.72 + acceptanceProbability × 0.2 +
feedback × 0.08`, using eight admin-tunable weights. A **pre-routing gate** (`lib/pre-routing-gate.ts`)
holds cases that aren't routable yet (e.g., missing facts), and `lib/routing-lifecycle.ts` manages
lifecycle states (e.g., `not_routable_yet`, `manual_review_needed`, `attorney_matched`,
`consultation_scheduled`). An escalation wave widens the candidate pool over time. Decision memory
records overrides/acceptances and feeds acceptance-probability back into ranking.

### 5.2 Tiered Routing (Tiers 1–4)
A separate sequential-offer system (`routes/tier-routing.ts` + per-tier modules +
`case-tier-classifier.ts`) classifies a case into tiers 1–4 by quality/value and offers it through
tier-appropriate channels. On `submit-for-review`, the platform starts **tier-first** routing with a
classic fallback, plus an escalation wave.

### 5.3 Acceptance via inbound SMS
Attorneys can **Accept/Decline by replying to the offer SMS**. The Twilio webhook is idempotent
(per `MessageSid`), matches the attorney by phone, finds the latest pending introduction, and
transactionally updates the introduction + lead submission (accept → contacted/exclusive assignment;
decline → rejected), responding with TwiML.

### 5.4 Heuristics & Lead Quality
A configurable heuristics engine (`lib/heuristics-config.ts`, `routes/heuristics.ts`) governs
thresholds and rules (including conflict-check lookback). Lead-quality reporting and deterministic
conflict screening feed credits and routing penalties.

### 5.5 Feedback loops
**Manual review** (entry → queue → release / reject / request-info / compliance) and the
decision-memory-based **routing feedback / retraining** loop feed acceptance probability and
override penalties directly back into ranking.

---

## 6. Firm Admin Functions
- **Firm dashboard** (`FirmDashboard`, `firm-dashboard`) — a role/permission-based firm view:
  metrics, the firm's attorneys, and **case assignment** among them.
- **Firm settings** (`AdminFirmSettings`) — firm configuration and intake settings.
- Manage the firm's attorneys, permissions, and routing preferences; transfer/assign cases to firm
  attorneys from the lead detail.

---

## 7. Platform Admin Functions

Backed by a large admin API (`admin.ts`, `admin-communications.ts`, `feature-toggles.ts`) with every
mutation **audited**:
- **Home / Dashboard** — operational overview.
- **Cases** — full case oversight and detail.
- **Attorneys** — manage attorney records and detail.
- **Matching & routing** — matching rules, routing queue, routing feedback, and heuristics.
- **Manual review** — the human-in-the-loop queue (release / reject / request-info / compliance).
- **Analytics** — platform analytics.
- **Communications** — notification oversight (history, automation logs).
- **Documents** — document oversight.
- **User roles** and **feature toggles** — RBAC and gradual feature rollout.
- **Compliance admin** — see §8.4.
- **Settings** and **support tickets**.

---

## 8. Cross-Cutting / Platform Functions

### 8.1 Authentication & Accounts
- Email/password registration & login for claimants, attorneys, and admins (bcrypt-hashed,
  JWT-based, default 7-day expiry). Admin is granted when the email is in the configured admin list.
- **OAuth** via **Google** and **Apple** (linked by provider id then email; sets email verified;
  redirects back with a token). Returns 503 with setup guidance when unconfigured.
- Role-based access control across claimant, attorney, firm, and admin areas. Email verification is
  currently a stub (501); the consent/verification gates skip guest-case emails.

### 8.2 Notifications
Multi-channel orchestration (`platform-notifications.ts`): **email** (Resend), **SMS** (Twilio, with
an inbound webhook for offer accept/decline), **in-app**, and **push** (Expo, with interactive
action buttons). Each event records per-attempt logs; **undelivered events are marked failed** (not
falsely "sent") with a reason and a retry time. Resend is limited to **3 per 24h** and can switch
channel; a background retry re-drives failed/stale events. Case offers fan out across SMS + email +
in-app + push.

### 8.3 Payments & Financing
- **Stripe** for client invoice payments, attorney subscriptions, lead credits, per-case routing
  fees, saved cards, and **Connect** payouts, reconciled by webhook.
- **Pre-settlement financing** calculator (real) plus partner/medical-lien directories (currently
  hardcoded; requests not persisted).

### 8.4 Compliance & Consent
- **Versioned consents** (`consent-templates.ts`) for HIPAA, Terms, Privacy, and Marketing. Required
  for plaintiffs: **HIPAA + Terms + Privacy**. Bumping a version forces re-consent.
- **Consent guard** (`client-consent-guard.ts`) computes missing/outdated consents and gates
  messaging and evidence upload (403). Guests, admins, and attorneys are exempt.
- **Consent capture/management** — create (with SHA-256 hash of the consent text + IP/user-agent
  capture), list, view, download signature, and **revoke**; combined or stepped e-signature flows.
- **HIPAA authorization** and **AI/ML-use** attestation pages (print/save-as-PDF; attestation flags).
- **Compliance Admin** (admin-only) — compliance settings (HIPAA-aligned, SOC2-ready, secure APIs),
  data-retention policies, **ethical walls** (block an attorney from an assessment), and an **audit
  log** viewer (with automation-history separation).

### 8.5 Marketing & Discovery
- Public pages: Home, How It Works, For Attorneys, Help, Terms, Privacy.
- **Attorney directory** (`Attorneys`, `AttorneysEnhanced`).
- **SEO landing pages** (`SeoLandingPage`) for conversion/discovery.

---

## 9. API Surface Overview

All routes are mounted under `/v1`. Selected groups:

| Prefix | Purpose |
|--------|---------|
| `/v1/assessments` | Create/update assessments, damage estimates, command center, document-requests, submit-for-review, associate guest cases. |
| `/v1/predict` | Core prediction, scenario simulation, prediction history. |
| `/v1/sol` | SOL calculation and per-state rules. |
| `/v1/intake-leads` | Partial-intake capture, progress sync, and resume-by-link. |
| `/v1/evidence` | Upload (single/multi), vision/extract prechecks, list/detail, process, annotations, insights. |
| `/v1/files` | Legacy generic file store (simulated processing). |
| `/v1/chatgpt` | LLM case analysis + retrieval; analysis status. |
| `/v1/ai-copilot` | Heuristic/mock copilot (ask, analyze-document, SOL, settlement). |
| `/v1/demands` | Demand drafting/generation and DOCX export. |
| `/v1/case-insights` | Medical chronology, plaintiff review, case prep, benchmarks. |
| `/v1/notify` | Direct notification send/lookup. |
| `/v1/payments` | Stripe checkout/subscription/credits/routing-fee/Connect/webhook. |
| `/v1/auth` | Password auth + Google/Apple OAuth. |
| `/v1/rose` | Conversational intake (in-memory state). |
| `/v1/sms` | Inbound Twilio webhook (offer accept/decline). |

---

## 10. Integrations Summary
| Capability | Provider |
|------------|----------|
| OCR / document AI | AWS Textract, Tesseract, pdf-parse, mammoth |
| Image relevance / vision | AWS Rekognition |
| LLM analysis & conversational intake | OpenAI |
| Email | Resend |
| SMS (outbound + inbound) | Twilio |
| Push | Expo |
| Payments / payouts | Stripe (incl. Connect) |
| Auth | Google OAuth, Apple Sign-in |
| Calendar sync | Google Calendar, Microsoft |
| Database | PostgreSQL (Prisma ORM) |

---

## 11. Notes, Caveats & In-Progress Items

- **"Save your progress" (resume-by-link + report-ready notifications)** — the intake captures
  contact info and saves a server-side lead snapshot; backend/frontend code to email/SMS a tokenized
  resume link and the finished-report link is drafted. Delivery requires `RESEND_API_KEY` /
  `RESEND_FROM_EMAIL` (and Twilio credentials) to be configured.
- **Mock / in-memory surfaces** (not production-persisted): Recovery Hub, Financing partner/medical
  lists and funding requests, the Medical Providers page's client-side data, the AI Copilot route,
  the legacy `/v1/files` store, and Rose conversation state.
- **Email verification** is a stub (501); consent/verification gates skip guest-case emails.
- **Step hiding by injury type** exists in code but is currently a no-op — all 8 intake steps are
  shown to every claimant, with branching inside steps.
- **Display-range compression** means the snapshot's settlement range can be lower/narrower than the
  raw modeled range shown on the Next Steps tab.
- **Notification delivery** records true failure when providers are unconfigured (rather than
  reporting "sent").

---

*Generated as a functional reference. For data models, infrastructure, and deployment details, see
`TECHNICAL_SPECIFICATION.md` and the `docs/` deployment guides.*
