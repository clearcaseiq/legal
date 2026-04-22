# ClearCaseIQ Attorney Routing Engine

The routing engine behaves like a **controlled matching engine**, not a simple lead blast. It maximizes plaintiff fit, attorney acceptance rate, speed to first response, compliance, and long-term marketplace quality.

## Mental Model

**Uber dispatch + underwriting engine + reputation system**

## Complete Flow (Steps 1–20)

```
Plaintiff intake
  → Case scoring & normalization
  → Eligibility check (pre-routing gate)
  → Candidate attorney pool (hard filters)
  → Ranking model
  → Routing waves (Step 7)
  → Attorney notification (Step 8: email, SMS, in-platform)
  → Attorney review screen (Step 9: case summary)
  → Attorney actions (Step 10: accept / decline / request info)
  → Case locking when accepted (Step 11)
  → Plaintiff notification (Step 12)
  → Escalation waves 2 & 3 (Step 13)
  → Routing analytics (Step 14)
  → Reputation scoring (Step 15)
  → Fraud controls (Step 16)
  → Case lifecycle tracking (Step 17)
  → Plaintiff dashboard update (Step 18)
  → Revenue tracking (Step 19)
  → ML feedback loop (Step 20)
```

## Stages

### 1. Case Intake Normalization (`case-normalization.ts`)

Transforms raw assessment + facts into a structured `NormalizedCase`:

- `case_id`, `claim_type`, `jurisdiction_state`, `jurisdiction_county`
- `injury_severity`, `treatment_status`, `liability_confidence`, `evidence_score`, `damages_score`
- `estimated_case_value_low`, `estimated_case_value_high`
- `medical_record_present`, `police_report_present`, `wage_loss_present`
- `urgency_level`, `narrative_present`, `plaintiff_contact_complete`, `required_disclosures_accepted`

### 2. Pre-Routing Gating (`pre-routing-gate.ts`)

Before routing, the system checks:

**Minimum thresholds:**
- Valid jurisdiction (supported states)
- Claim type supported
- Statute of limitations not expired
- Case score above minimum
- Minimum evidence score

**Optional holds:**
- Too little information → `needs_more_info`
- Missing core narrative → `needs_more_info`
- Jurisdiction unsupported → `not_routable_yet`
- Duplicate / already routed recently → `manual_review`

### 3. Candidate Generation (Hard Filters)

From `routing.ts` – `filterEligibleAttorneys`:

- Attorney licensed in state + county
- Attorney accepts case type
- Attorney is active and verified
- Attorney has capacity (weekly/monthly limits)
- Case value within attorney's range
- No conflict rules triggered

### 4. Quality Gate

From `routing.ts` – `filterQualifiedAttorneys`:

- Response time within SLA
- Contact rate above minimum
- Complaint rate below maximum
- No cherry-picking pattern

### 5. Ranking Model

Weighted score (tunable):

| Dimension           | Weight |
|--------------------|--------|
| Jurisdiction fit   | 20%    |
| Case-type fit      | 20%    |
| Economic fit       | 15%    |
| Response score     | 15%    |
| Conversion score   | 10%    |
| Capacity score     | 10%    |
| Plaintiff fit      | 5%     |
| Strategic priority | 5%     |

### 6. Controlled Routing Waves

**Do not send to all attorneys.** Route in waves:

- **Wave 1:** Top N attorneys (default 3)
- **Wave 2:** If no response within X hours, escalate to next N (future: cron/scheduler)
- **Wave 3:** etc.

## API Endpoints

### Admin
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/admin/cases/route` | Bulk route with `autoRoute: true` – uses routing engine |
| POST | `/v1/admin/cases/:id/route-engine` | Run routing engine on single case |
| POST | `/v1/admin/cases/escalate-due` | Run escalation for waves due (cron: every hour) |

### Attorney (auth required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/case-routing/introductions/:id/summary` | Case snapshot for review (Step 9) |
| POST | `/v1/case-routing/introductions/:id/accept` | Accept case (Step 10) |
| POST | `/v1/case-routing/introductions/:id/decline` | Decline case (body: `{ declineReason? }`) |
| POST | `/v1/case-routing/introductions/:id/request-info` | Request more info (body: `{ notes }`) |

### Plaintiff
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/case-routing/assessment/:id/status` | Routing status for dashboard (Step 18) |

**Route engine body:**
```json
{
  "maxAttorneysPerWave": 3,
  "skipPreRoutingGate": false,
  "dryRun": false
}
```

## Trigger Points

1. **Plaintiff submit for review** – `POST /v1/assessments/:id/submit-for-review` triggers routing engine asynchronously
2. **Admin bulk route** – `POST /v1/admin/cases/route` with `autoRoute: true` uses routing engine
3. **Admin single case** – `POST /v1/admin/cases/:id/route-engine` for manual trigger

## Escalation Timing (Step 13)

- **Wave 1:** Top 3 attorneys → wait 4 hours
- **Wave 2:** Next 5 attorneys → wait 12 hours
- **Wave 3:** Broader network (10) → wait 24 hours
- **After Wave 3:** Flag for manual review, notify plaintiff

Run `POST /v1/admin/cases/escalate-due` via cron (e.g. every hour).

## Files

- `api/src/lib/case-normalization.ts` – Case intake normalization
- `api/src/lib/pre-routing-gate.ts` – Pre-routing gating
- `api/src/lib/routing-engine.ts` – Main orchestrator
- `api/src/lib/routing-lifecycle.ts` – Attorney actions, locking, escalation, analytics
- `api/src/lib/case-notifications.ts` – Multi-channel notifications (Step 8, 12)
- `api/src/lib/routing.ts` – Eligibility, quality gate, scoring (existing)
- `api/src/routes/case-routing.ts` – Attorney & plaintiff API
