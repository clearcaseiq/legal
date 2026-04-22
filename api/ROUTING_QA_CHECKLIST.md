# Routing QA Checklist

Use this checklist before shipping routing changes that affect intake gating, attorney matching, lifecycle state, or notifications.

## Core Verification

1. Run `npm run test:routing` from `api`.
2. Confirm `/v1/case-routing/assessment/:id/status` shows the expected `lifecycleState` and `statusMessage`.
3. Confirm attorney dashboard lead actions still work for `accept`, `decline`, and `request more info`.
4. Confirm admin manual-review queue loads and shows held cases.
5. Confirm admin communications queue shows routing notification events.

## Scenario Matrix

### Ready To Route

1. Submit a normal `auto` or `slip_and_fall` case with narrative, disclosures, and contact info.
2. Verify routing engine creates introductions and the lead enters `routing_active`.
3. Verify attorney receives SMS/email/in-app notification event.

### Manual Review

1. Submit a case with `verification.status = failed` or `manual_review`.
2. Submit a case with `statute_of_limitations_status = expiring_soon`.
3. Submit a high-value case with thin evidence.
4. Verify assessment enters manual review and plaintiff status shows `manual_review_needed`.

### Needs More Info

1. Submit a case with weak evidence and missing core intake items.
2. Verify routing is blocked with `needs_more_info` or `plaintiff_info_requested`.
3. Verify plaintiff-facing status message explains the hold clearly.

### Not Routable Yet

1. Submit an expired SOL case.
2. Submit an unsupported jurisdiction or claim type.
3. Verify lead state becomes `not_routable_yet`.

### Fraud / Compliance

1. Upload evidence with failed processing.
2. Upload medical documents without HIPAA alignment when compliance settings require it.
3. Create duplicate recent submissions from the same plaintiff.
4. Verify each case is held for manual review before attorney routing.

### Attorney Lifecycle

1. Accept a routed lead and verify `attorney_matched`.
2. Record a retained/consulted/rejected outcome and verify decision memory updates.
3. Verify routing analytics and revenue events are recorded.

## Admin Feedback Workflow

1. Open `/v1/admin/routing-feedback/summary` and confirm aggregate counts populate.
2. Open `/v1/admin/routing-feedback/candidates` and review override/outcome samples.
3. Export a dataset from `/v1/admin/routing-feedback/export`.
4. Create a retraining request with `/v1/admin/routing-feedback/retraining-request`.

## Notification Configuration

1. Configure `TWILIO_*` variables to verify live SMS delivery.
2. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to verify live email delivery.
3. If provider credentials are absent, verify events still appear in admin communications for follow-up.
