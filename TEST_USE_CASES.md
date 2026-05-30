# ClearCaseIQ Functional Test Use Cases

## Purpose

This document gives testers a complete functional test checklist for ClearCaseIQ across the plaintiff web app, attorney web app, admin console, mobile app, integrations, and production deployment.

Use this as a manual QA script for release validation, UAT, regression testing, and App Store/TestFlight readiness.

## Test Roles And Accounts

Prepare test users before testing:

- Plaintiff user with no cases
- Plaintiff user with at least one submitted case
- Attorney user with no leads
- Attorney user with active leads
- Attorney user with accepted cases
- Admin user
- Mobile attorney user

Recommended test data:

- Auto accident case
- Slip and fall case
- Dog bite case
- Medical malpractice case
- Wrongful death or high-severity case
- Case with no evidence
- Case with medical records
- Case with photos
- Case with bills
- Case near statute of limitations

## General Test Rules

For every test, capture:

- Browser/device used
- User role
- URL or screen
- Steps performed
- Expected result
- Actual result
- Screenshot/video for failures
- Console/API error if applicable
- Case ID, lead ID, user email, or request ID when available

## 1. Public Website And Navigation

### TC-001: Home Page Loads

Preconditions:

- Production frontend is deployed.

Steps:

1. Open `https://www.clearcaseiq.com`.
2. Confirm the page loads without console errors.
3. Click main navigation links.
4. Resize to mobile width.

Expected result:

- Home page loads.
- Header/navigation works.
- No horizontal scrolling on mobile.
- CTA buttons are visible and clickable.

### TC-002: Public Mobile Header Behavior

Steps:

1. Open the home page on iPhone or mobile emulator.
2. Scroll down.
3. Confirm header behavior.
4. Use mobile navigation links.

Expected result:

- Header does not permanently block content on mobile.
- Mobile nav links are accessible.
- Page does not clip or overflow horizontally.

### TC-003: SEO Landing Page Loads

Steps:

1. Open several injury/topic landing pages.
2. Confirm hero, timeline, severity ladder, treatment progression, settlement factors, FAQs, and CTA render.
3. Inspect page source or browser dev tools for structured data.

Expected result:

- Page-specific content appears.
- FAQs appear.
- Internal links work.
- No missing module or blank page.

## 2. Plaintiff Intake

### TC-004: Start New Intake

Steps:

1. Open plaintiff intake.
2. Start a new case.
3. Select a claim type.
4. Enter incident facts.

Expected result:

- Intake starts successfully.
- User can progress through steps.
- Required fields are enforced.

### TC-005: Intake Mobile Layout

Steps:

1. Open intake on iPhone-sized viewport.
2. Complete Step 1.
3. Check that all options are visible.
4. Continue through Case Posture.

Expected result:

- No clipped cards.
- No required controls hidden below inaccessible areas.
- User can continue without layout blocking.

### TC-006: Case Posture Screen

Steps:

1. Progress to Case Posture.
2. Select Medicare/insurance options.
3. Confirm labels and choices.
4. Continue.

Expected result:

- Medicare labels are readable.
- Case posture content remains visible.
- No required control is hidden.

### TC-007: Review Case Story

Steps:

1. Complete intake facts.
2. Open Review screen.
3. Edit any available field.
4. Continue.

Expected result:

- Review screen is readable and compact.
- User can correct case facts.
- Edits persist to final submission.

### TC-008: Consent And Submission

Steps:

1. Complete intake.
2. Reach consent screen.
3. Attempt to submit without required consent.
4. Add consent.
5. Submit.

Expected result:

- Missing consent blocks submission.
- Accepted consent allows submission.
- Case/assessment is created.

## 3. Plaintiff Case Report

### TC-009: Case Intelligence Report Loads

Steps:

1. Submit a case or open an existing result URL.
2. Wait for report content.
3. Review top summary, statute status, evidence gaps, and recommendations.

Expected result:

- Report loads.
- Logo/header render correctly.
- No old/broken logo artifact appears.
- Report is readable on desktop and mobile.

### TC-010: Statute Of Limitations Check

Steps:

1. Submit an auto claim with incident date and California venue.
2. Confirm SOL calculation appears.
3. Test missing incident date.

Expected result:

- Valid date/venue produces a deadline.
- Missing data shows an “unable to calculate yet” style message.
- No crash occurs.

### TC-011: Evidence Gap Recommendations

Steps:

1. Open a report for a case with no evidence.
2. Review missing documents.
3. Upload evidence.
4. Refresh the report.

Expected result:

- Missing evidence is identified.
- Uploaded evidence changes evidence state after processing.

### TC-011A: Settlement And Trial Values Are Separate

Steps:

1. Submit an auto case with clear rear-end liability, MRI findings, injections, and estimated medical bills.
2. Open the results report.
3. Review the top valuation summary and the Value & Timeline tab.

Expected result:

- Estimated Settlement Range is the primary number.
- Potential Trial Value appears separately and is higher only as litigation exposure.
- Trial warnings mention uncertainty, time, cost, collectability, and policy limits.
- Key Drivers include liability, medical bills/records, treatment severity, evidence confidence, and policy-limit constraints when applicable.
- Product copy does not state that the case is worth one fixed dollar amount.

## 4. Evidence Upload And Processing

### TC-012: Upload PDF Medical Record

Steps:

1. Log in as plaintiff or attorney.
2. Upload a PDF medical record.
3. Wait for processing.
4. Review evidence status.

Expected result:

- Upload succeeds.
- Processing status updates.
- Extracted text or OCR status is available.

### TC-013: Upload Image Evidence

Steps:

1. Upload a JPG/PNG injury photo.
2. Confirm file appears in evidence list.
3. Open or preview file.

Expected result:

- Image upload succeeds.
- File metadata appears.
- Preview/open action works.

### TC-014: Upload Unsupported File

Steps:

1. Attempt to upload an unsupported file type.

Expected result:

- Upload is rejected with a clear error.
- No broken evidence record is created.

### TC-015: OCR Failure Handling

Steps:

1. Upload a scanned or difficult PDF.
2. Observe processing state.
3. Check report/evidence UI if OCR fails.

Expected result:

- Failure is handled gracefully.
- User sees pending/failed/needs review state.
- App does not crash.

## 5. Plaintiff Dashboard

### TC-016: Plaintiff Dashboard Loads

Steps:

1. Log in as plaintiff.
2. Open dashboard.
3. Review case cards, progress, messages, and document requests.

Expected result:

- Dashboard loads.
- Cases are visible.
- Empty state appears if no cases exist.

### TC-017: Plaintiff Document Request Upload

Steps:

1. Open a pending document request.
2. Upload requested document.
3. Confirm completion percentage changes.

Expected result:

- Upload succeeds.
- Request status updates.
- Attorney-visible evidence appears.

## 6. Attorney Registration

### TC-018: Attorney Registration Valid Step 1

Steps:

1. Open attorney registration.
2. Enter first name, last name, email, valid password.
3. Enter valid firm website.
4. Click Next.

Expected result:

- User advances to Practice Areas.

### TC-019: Attorney Registration Invalid Password

Steps:

1. Enter Step 1 fields.
2. Use a password shorter than 8 characters.
3. Click Next.

Expected result:

- User remains on Step 1.
- Password error is visible.
- No progression occurs.

### TC-020: Attorney Registration Invalid Website

Steps:

1. Enter Step 1 fields.
2. Enter invalid website text.
3. Click Next.

Expected result:

- User remains on Step 1.
- Website URL error is visible.

### TC-021: Website Placeholder Behavior

Steps:

1. Open attorney registration.
2. Confirm firm website starts with or can prefill `http://`.
3. Leave only `http://`.
4. Complete required fields.
5. Click Next.

Expected result:

- Placeholder-only website is treated as blank.
- User can continue if other required fields are valid.

### TC-022: Practice Area Validation

Steps:

1. Complete Step 1.
2. On Practice Areas, select no case types and no jurisdictions.
3. Click Next.

Expected result:

- User is blocked.
- Case type and jurisdiction errors are shown.

### TC-023: Complete Attorney Registration

Steps:

1. Complete all registration steps.
2. Submit registration.

Expected result:

- Attorney account is created.
- User is authenticated or redirected to license verification.

## 7. Attorney License Verification

### TC-024: California Active Bar Lookup

Steps:

1. Log in as attorney.
2. Choose State Bar Lookup.
3. Enter valid active CA bar number.
4. Submit.

Expected result:

- Lookup succeeds.
- License is marked verified.
- Status says verified via State Bar lookup.

### TC-025: Invalid California Bar Lookup

Steps:

1. Enter invalid CA bar number.
2. Submit.

Expected result:

- Lookup fails gracefully.
- Attorney is not marked verified.
- User sees clear message.

### TC-026: Unsupported State Bar Lookup

Steps:

1. Choose a non-CA state.
2. Enter license number.
3. Submit.

Expected result:

- Automated lookup is rejected or marked unsupported.
- User is guided to manual upload.

### TC-027: Manual License Upload

Steps:

1. Select Manual Upload.
2. Upload PDF/image license document.
3. Submit.

Expected result:

- Upload succeeds.
- License is pending/manual review unless otherwise configured.

## 8. Attorney Login And Dashboard

### TC-028: Attorney Login

Steps:

1. Open attorney login.
2. Enter valid credentials.
3. Submit.

Expected result:

- Attorney dashboard opens.
- Auth token/user are stored.

### TC-029: Invalid Attorney Login

Steps:

1. Enter invalid credentials.
2. Submit.

Expected result:

- Login fails with clear error.
- User remains on login screen.

### TC-030: Attorney Dashboard Loads

Steps:

1. Log in as attorney.
2. Open dashboard.

Expected result:

- Dashboard overview loads.
- No fatal error screen appears.
- Leads, metrics, queue, and navigation render.

### TC-031: Empty Attorney Dashboard

Steps:

1. Log in as attorney with no leads.

Expected result:

- Empty state appears.
- App does not crash.

## 9. Attorney Lead Review

### TC-032: Open Lead Detail

Steps:

1. Open Attorney Dashboard.
2. Click a new lead.
3. Review case facts.

Expected result:

- Lead detail opens.
- Plaintiff, claim type, venue, evidence, score, and next actions appear.

### TC-033: Accept Case With Stripe Off

Preconditions:

- Admin setting `Stripe payments off`.

Steps:

1. Open submitted lead.
2. Click Accept.
3. Confirm.

Expected result:

- Case is accepted.
- No Stripe checkout opens.
- Dashboard remains usable.
- Lead moves to accepted/contacted/active pipeline.

### TC-034: Accept Case With Stripe On And Configured

Preconditions:

- Admin setting `Stripe payments on`.
- Stripe secret key configured.
- Pricing tier applies.

Steps:

1. Open submitted lead.
2. Click Accept.
3. Confirm.

Expected result:

- Stripe checkout opens, or saved card flow runs.
- Successful payment returns to app.
- Case acceptance finalizes.

### TC-035: Accept Case With Stripe On But Not Configured

Preconditions:

- Admin setting `Stripe payments on`.
- Stripe secret key missing.

Steps:

1. Accept a priced case.

Expected result:

- User sees an action-level payment error.
- Dashboard does not switch to fatal “Error Loading Dashboard.”

### TC-036: Decline Case With Reason

Steps:

1. Open submitted lead.
2. Click Decline.
3. Select decline reason.
4. Submit.

Expected result:

- Case is declined.
- Reason is saved.
- Lead leaves needs-review queue.

### TC-037: Decline Case With Other Reason Missing Text

Steps:

1. Select decline reason “Other.”
2. Leave text blank.
3. Submit.

Expected result:

- User is blocked.
- Validation message appears.

## 10. Attorney Workstreams

### TC-038: Evidence Workstream

Steps:

1. Open accepted case.
2. Open Evidence workstream.
3. Review uploaded files.
4. Open/download evidence.

Expected result:

- Evidence list loads.
- File open action works.

### TC-039: Document Request Workstream

Steps:

1. Open accepted case.
2. Create document request.
3. Select requested documents.
4. Submit.

Expected result:

- Request is created.
- Plaintiff can view/upload requested docs.

### TC-040: Tasks Workstream

Steps:

1. Open accepted case.
2. Add or update task if UI supports it.
3. Mark task complete.

Expected result:

- Task state updates.
- Dashboard counts reflect task changes.

### TC-041: Notes Workstream

Steps:

1. Open accepted case.
2. Add a note.
3. Refresh page.

Expected result:

- Note persists.
- Timestamp/author appear.

### TC-042: Contacts Workstream

Steps:

1. Open accepted case.
2. Add case contact.
3. Edit/view contact.

Expected result:

- Contact is saved.
- Contact appears in list.

### TC-043: Billing Workstream

Steps:

1. Open accepted case.
2. Open Billing.
3. Review invoices/payments.

Expected result:

- Billing loads.
- Empty state appears when no billing records exist.

## 11. Messaging

### TC-044: Attorney Sends Message

Steps:

1. Open case chat.
2. Send message.

Expected result:

- Message sends.
- Message appears in thread.
- Unread counts update for recipient.

### TC-045: Plaintiff Sends Message

Steps:

1. Log in as plaintiff.
2. Open message thread.
3. Send message.

Expected result:

- Attorney can see message.
- Unread count appears.

### TC-046: Empty Message Thread

Steps:

1. Open a case with no messages.

Expected result:

- Empty state appears.
- User can start conversation if allowed.

## 12. Calendar And Consults

### TC-047: Connect Google Calendar

Steps:

1. Log in as attorney.
2. Open profile/calendar sync.
3. Click Google Calendar Connect.
4. Complete OAuth.

Expected result:

- User returns to dashboard.
- Calendar shows connected.
- Busy blocks sync.

### TC-048: Connect Microsoft Calendar

Steps:

1. Click Microsoft Outlook Connect.
2. Complete OAuth.

Expected result:

- Microsoft calendar connects.
- Busy blocks sync.

### TC-049: Sync Calendar Now

Steps:

1. Connect calendar.
2. Click Sync Now.

Expected result:

- Sync completes.
- Busy block count updates.

### TC-050: Disconnect Calendar

Steps:

1. Connected calendar exists.
2. Click Disconnect.

Expected result:

- Connection is removed.
- Calendar status changes to disconnected.

### TC-051: Schedule Consultation

Steps:

1. Open accepted case.
2. Schedule consultation.
3. Select available time.
4. Submit.

Expected result:

- Appointment is created.
- Calendar view shows consult.
- Plaintiff/attorney communication is triggered if configured.

## 13. Admin Console

### TC-052: Admin Login

Steps:

1. Log in as admin.
2. Open admin dashboard.

Expected result:

- Admin pages are accessible.
- Non-admin users cannot access admin pages.

### TC-053: Matching Rules Load

Steps:

1. Open `Admin -> Matching Rules`.

Expected result:

- Matching rules load.
- Tabs appear: Routing, Timing, Gate, Value, Pricing, Weights.

### TC-054: Toggle Routing

Steps:

1. Open Matching Rules.
2. Toggle global routing off.
3. Save.
4. Toggle back on.

Expected result:

- State persists.
- UI reflects current routing state.

### TC-055: Pricing Tier Edit

Steps:

1. Open Matching Rules -> Pricing.
2. Edit a tier price.
3. Save.
4. Reload.

Expected result:

- Price persists.
- Routing fee logic uses updated tier.

### TC-056: Stripe Payments Toggle

Steps:

1. Open Matching Rules -> Pricing.
2. Toggle Stripe payments off.
3. Save.
4. Reload.
5. Toggle on and save.

Expected result:

- Toggle appears.
- Setting persists.
- Backend acceptance behavior follows the toggle.

### TC-057: Ranking Weights Validation

Steps:

1. Open Matching Rules -> Weights.
2. Change weights so total is not 1.0.
3. Attempt to save.

Expected result:

- Invalid total blocks save or shows warning.
- Valid total allows save.

## 14. Mobile App

### TC-058: Mobile Attorney Login

Steps:

1. Install app.
2. Enter attorney credentials.
3. Log in.

Expected result:

- User reaches mobile dashboard.
- Push setup starts if permissions allow.

### TC-059: Mobile Biometric Unlock

Steps:

1. Log in once.
2. Close/reopen app.
3. Use Face ID/Touch ID.

Expected result:

- Biometric prompt appears.
- Successful biometric auth restores session.

### TC-060: Mobile Case Inbox

Steps:

1. Open Cases tab.
2. Pull to refresh.
3. Open a case.

Expected result:

- Case list loads.
- Refresh works.
- Detail screen opens.

### TC-061: Mobile Accept Case With Stripe Off

Preconditions:

- Stripe payments off in Admin.

Steps:

1. Open submitted case in mobile app.
2. Tap Accept.
3. Confirm.

Expected result:

- Case is accepted without Stripe checkout.
- Success notice appears.
- Dashboard refreshes.

### TC-062: Mobile Decline Case

Steps:

1. Open submitted case.
2. Decline with reason.

Expected result:

- Decline succeeds.
- Feedback is saved.

### TC-063: Mobile Calendar Sync

Steps:

1. Open Account tab.
2. Use Google or Microsoft calendar connect.
3. Return to app.
4. Tap Sync now.

Expected result:

- Calendar connection status updates.
- Busy blocks sync.

### TC-064: Mobile Push Notifications

Steps:

1. Install physical-device build.
2. Log in.
3. Grant notification permission.
4. Trigger test notification.

Expected result:

- Push token registers.
- Notification is received.
- Deep link opens intended screen if payload supports it.

### TC-065: Mobile Offline/Network Error

Steps:

1. Open mobile dashboard.
2. Disable network.
3. Refresh.

Expected result:

- User sees clear network error or offline snapshot.
- App does not crash.

## 15. Payments

### TC-066: Stripe Payments Off Acceptance

Preconditions:

- `Stripe payments off` in Admin.

Steps:

1. Accept a priced case.

Expected result:

- Payment endpoint returns skipped payment status.
- Case acceptance continues.
- No Stripe checkout.

### TC-067: Stripe Checkout Creation

Preconditions:

- `Stripe payments on`.
- Stripe keys configured.
- Case pricing tier applies.

Steps:

1. Accept case.

Expected result:

- Checkout session created.
- User redirected to Stripe.

### TC-068: Payment Success Return

Steps:

1. Complete Stripe checkout.
2. Return to app.

Expected result:

- Payment success page processes session.
- Lead acceptance is completed or confirmed.

## 16. Production Deployment

### TC-069: Production Version Check

Steps:

1. SSH into AWS host.
2. Run `git rev-parse --short HEAD`.

Expected result:

- Commit matches expected release commit.

### TC-070: Production Web Health

Steps:

1. Open `https://www.clearcaseiq.com`.
2. Run `curl -I https://www.clearcaseiq.com`.

Expected result:

- HTTP 200 or expected redirect.
- UI loads latest build.

### TC-071: Production API Health

Steps:

1. Run `curl https://api.clearcaseiq.com/health`.

Expected result:

- Response includes `ok: true`.

### TC-072: Production CORS

Steps:

1. From browser on `www.clearcaseiq.com`, perform login or API request.
2. Inspect console.

Expected result:

- No CORS error.
- API response succeeds.

### TC-073: Production Rebuild Verification

Steps:

1. Pull frontend changes.
2. Rebuild `web`.
3. Restart containers.
4. Hard refresh browser.

Expected result:

- Latest UI changes appear.

## 17. Security And Access Control

### TC-074: Unauthorized API Access

Steps:

1. Clear auth token.
2. Call protected API route.

Expected result:

- API returns 401/403.
- No protected data is returned.

### TC-075: Admin Route Access By Attorney

Steps:

1. Log in as attorney.
2. Try to access admin route.

Expected result:

- Access denied.

### TC-076: Plaintiff Cannot Access Attorney Dashboard

Steps:

1. Log in as plaintiff.
2. Navigate to attorney dashboard route.

Expected result:

- User is redirected or denied.

### TC-077: Attorney Cannot Access Other Attorney Lead

Steps:

1. Log in as Attorney A.
2. Attempt to open Attorney B-only lead by URL/API.

Expected result:

- Access denied or not found.

## 18. Error Handling And Regression

### TC-078: API Server Down

Steps:

1. Stop API locally or block API request.
2. Load web/mobile screen.

Expected result:

- Clear API/network error.
- No blank page.

### TC-079: Expired Session

Steps:

1. Log in.
2. Expire/delete token.
3. Perform protected action.

Expected result:

- User is redirected to login or shown session expired.

### TC-080: Browser Console Cleanliness

Steps:

1. Open major screens.
2. Inspect browser console.

Expected result:

- No uncaught runtime errors.
- No missing module errors.

## 19. App Store/TestFlight Testing

### TC-081: TestFlight Install

Steps:

1. Install app from TestFlight.
2. Open app.

Expected result:

- App launches.
- Splash screen appears.
- Login screen appears.

### TC-082: Production API From iPhone

Steps:

1. Open TestFlight app on physical iPhone.
2. Log in.

Expected result:

- App connects to `https://api.clearcaseiq.com`.
- No localhost/network error.

### TC-083: Apple Review Demo Account

Steps:

1. Use the same test account intended for Apple review.
2. Log in and navigate key screens.

Expected result:

- Apple reviewer can access meaningful demo data.
- No admin-only or empty unusable state blocks review.

## Release Sign-Off Checklist

Before release, confirm:

- Public web smoke tests pass.
- Plaintiff intake works.
- Case report works.
- Evidence upload works.
- Attorney registration works.
- Attorney login works.
- License verification/manual upload works.
- Attorney dashboard loads.
- Case accept/decline works.
- Stripe toggle behavior works.
- Messaging works.
- Calendar sync works.
- Admin matching rules save.
- Mobile login works.
- Mobile case accept/decline works.
- Mobile calendar sync works.
- Production API health passes.
- Production web loads latest build.
- No critical console errors.
- TestFlight build tested on physical iPhone.

