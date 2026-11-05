# ClearCaseIQ for Zoom: Reviewer Test Plan

ClearCaseIQ is a case-management platform for personal injury law firms. The Zoom integration lets an attorney connect their own Zoom account and then start an instant video call from a client's case, or schedule a Zoom consultation, without leaving ClearCaseIQ. The client receives the join link automatically. When a call ends, ClearCaseIQ records it on the case.

This plan walks a reviewer through every step end to end, with one attorney and one client. It takes about 30 minutes.

## 1. Environment and prerequisites

| Item | Value |
| --- | --- |
| Web app | https://www.clearcaseiq.com |
| Attorney sign-in | https://www.clearcaseiq.com/attorney-login |
| Client sign-in | https://www.clearcaseiq.com/login |
| Marketplace landing / install page | https://www.clearcaseiq.com/connect/zoom |
| OAuth redirect URL | https://api.clearcaseiq.com/v1/attorney-zoom/callback |
| Event notification endpoint | https://api.clearcaseiq.com/v1/webhooks/zoom |
| User documentation | https://www.clearcaseiq.com/zoom |
| Support | support@clearcaseiq.com |

**What the reviewer needs**

- A Zoom account (a free Basic account is enough) to authorize the app. The reviewer uses their own Zoom test account. ClearCaseIQ never asks for Zoom credentials.
- A desktop browser (Chrome, Edge, Firefox or Safari) with pop-ups allowed for `clearcaseiq.com`.
- Optional for the two-person checks: a second browser profile or private window, so the attorney and the client can be signed in at the same time.

**Plan tiers and access controls**

- **ClearCaseIQ:** the Zoom features are not tied to a paid plan. The test accounts below have full access, and no payment or subscription step is needed.
- **Two-step verification:** two-step verification is not required for the test accounts, so signing in needs only the email and password.
- **Zoom:** every step works on a free Zoom Basic account. Zoom's own 40-minute limit on Basic meetings does not affect any test here.
- **Email:** clients are also emailed the join link, but the test client's mailbox is not accessible to reviewers. Every link sent by email also appears inside the client's ClearCaseIQ dashboard and messages, which is what this plan uses.

## 2. Test credentials

All three accounts share one password, provided in the submission's test credentials field.

| Role | Email | Purpose |
| --- | --- | --- |
| Attorney A (main account) | zoom-review-attorney@clearcaseiq.com | Connects Zoom, starts and schedules calls. Member of "Zoom Review Test Firm". |
| Client | zoom-review-client@clearcaseiq.com | Attorney A's client. Receives and joins calls. |
| Attorney B (isolation check) | zoom-review-attorney-b@clearcaseiq.com | A second attorney with no access to Attorney A's case or Zoom connection. |

Password: `[PROVIDED IN SUBMISSION]`

**Seed data already in place**

- An active personal injury case, "Zoom Review Client" (auto accident, Los Angeles County), owned by Attorney A, with the Client account as the claimant.
- Attorney A belongs to "Zoom Review Test Firm", which lets ended calls create a draft time entry on the case.
- Neither attorney receives real client cases, so no real claimant is ever involved in review testing.
- Attorney A starts with no Zoom connection. If an earlier review session left one, disconnect it first (section 6.1).

## 3. Scopes and where each one is tested

ClearCaseIQ requests only these scopes. It does not read recordings, chat, contacts or other meetings.

| Scope | Required or optional | Why ClearCaseIQ needs it | Tested in |
| --- | --- | --- | --- |
| `user:read` | Required | Reads the connected user's Zoom ID, name and email, so the attorney can see which Zoom account is connected. The ID also matches deauthorization events to the right attorney. | 4.2, 6.2 |
| `meeting:write` | Required | Creates instant meetings (Start video call) and scheduled meetings (Zoom consultations) on the attorney's own Zoom account. | 5.1, 5.2 |

There are no optional scopes. Meetings always open in the Zoom app or Zoom web client, so ClearCaseIQ needs no host or on-behalf-of tokens.

Event subscriptions: `meeting.started`, `meeting.ended` and `app_deauthorized` (tested in 5.3 and 6.2). Webhook requests are checked against Zoom's `x-zm-signature` header, and requests older than five minutes are rejected.

## 4. Setup and authorization

### 4.1 Sign in as Attorney A

1. Open https://www.clearcaseiq.com/attorney-login.
2. Sign in as `zoom-review-attorney@clearcaseiq.com` with the password provided.

**Expected:** the attorney dashboard opens. No two-step verification prompt appears.

### 4.2 Connect Zoom from inside ClearCaseIQ

1. Go to **Case Management → Calendar** and select the **Booking link** tab (direct link: https://www.clearcaseiq.com/attorney-dashboard/cases/calendar?tab=booking).
2. On the **Zoom** card, click **Connect**.
3. Zoom's sign-in page opens. Sign in with the reviewer's Zoom account.
4. Review the permissions on Zoom's consent screen and click **Allow**.

**Expected:**
- The browser returns to ClearCaseIQ's Zoom page (`/connect/zoom`), which says "Zoom is connected." and "Connected as <Zoom email>". The email comes from `user:read`.
- Back on **Calendar → Booking link**, the Zoom card also shows the account as connected.
- If **Deny** is clicked on the consent screen instead, the Zoom page says "Zoom was not connected. Please try again." and offers **Connect Zoom**.

### 4.3 Install from the Zoom App Marketplace (alternative entry point)

1. Sign out of ClearCaseIQ.
2. In the Zoom App Marketplace, open the ClearCaseIQ listing and click **Add** (or use the app's authorization URL), then click **Allow**.
3. Zoom redirects to https://www.clearcaseiq.com/connect/zoom. Because no one is signed in, ClearCaseIQ shows its attorney sign-in page.
4. Sign in as Attorney A.

**Expected:**
- After signing in, the browser returns to `/connect/zoom`, which finishes the connection and says "Zoom is connected." with the Zoom email.
- **Go to your dashboard** opens the attorney dashboard.
- If Attorney A was already signed in at step 2, the page skips the sign-in and confirms the connection directly.

## 5. Feature tests

### 5.1 Start an instant video call from a case (`meeting:write`)

1. As Attorney A, go to **Case Management → Active cases** and open **Zoom Review Client**.
2. In the case header, click **Start video call**.

**Expected:**
- A new tab opens the meeting in Zoom (the Zoom client or web client), with the reviewer's Zoom account as host.
- Back in ClearCaseIQ, under the button: "Join link sent to the client." with a **Copy link** option.

3. In a second browser profile, sign in as the Client at https://www.clearcaseiq.com/login.

**Expected:**
- The client has a notification, "Zoom Review Attorney A started a video call", and a message from Attorney A: "I started a video call. Join here: <link>".
- Opening the link joins the same Zoom meeting as a participant. The client does not need a Zoom account.

### 5.2 Schedule a Zoom consultation (`meeting:write`)

1. As Attorney A, open the **Zoom Review Client** case and click **Schedule consult**.
2. Choose **Video (Zoom)** as the meeting type, pick a time at least 15 minutes ahead, and click **Schedule consultation**.

**Expected:**
- The consultation appears on Attorney A's calendar (**Case Management → Calendar**) with a Zoom meeting link.
- A scheduled meeting with the same time appears in the reviewer's Zoom account.

3. As the Client, open the dashboard.

**Expected:**
- The upcoming consultation card shows the date and time, with a **Join video call** button.
- **Join video call** opens the scheduled Zoom meeting.

### 5.3 After the call (`meeting.started` and `meeting.ended` events)

1. Keep the meeting from 5.1 running for at least one minute, then click **End meeting for all** in Zoom.
2. As Attorney A, refresh the **Zoom Review Client** case.

**Expected (within about a minute of ending):**
- The case has an internal note: "Video call with client (Zoom), N min. Logged automatically when the meeting ended."
- **Time & Billing** shows a draft, billable time entry for the call's length. It stays a draft until the attorney confirms it.

## 6. Disconnect, deauthorization and data removal

### 6.1 Disconnect from ClearCaseIQ

1. As Attorney A, go to **Case Management → Calendar → Booking link**.
2. On the Zoom card, click **Disconnect**.

**Expected:**
- The card returns to **Connect**.
- ClearCaseIQ revokes its access token at Zoom and deletes the stored tokens. ClearCaseIQ no longer appears under **Manage → Added Apps** on marketplace.zoom.us.
- **Start video call** on the case now shows a **Connect Zoom** prompt instead of creating a meeting.
- Meetings already created stay in the reviewer's Zoom account, and past case notes stay on the case.

### 6.2 Remove the app from Zoom (`app_deauthorized`)

1. Reconnect Zoom (4.2).
2. Sign in at https://marketplace.zoom.us, open **Manage → Added Apps**, find ClearCaseIQ and click **Remove**.
3. As Attorney A, reload the Zoom card in ClearCaseIQ.

**Expected:**
- The card shows **Connect**: Zoom's deauthorization event caused ClearCaseIQ to delete the stored tokens and Zoom account details for that user.
- **Start video call** asks the attorney to connect Zoom again.

## 7. Multi-user and access-control checks

Each attorney connects their own Zoom account, and meetings are created only on the account of the attorney who starts them.

| Check | Steps | Expected |
| --- | --- | --- |
| Connections are per attorney | With Attorney A connected, sign in as Attorney B and open the Zoom card (4.2, step 1). | Attorney B sees **Connect**. Attorney A's Zoom account is not shown and cannot be used. |
| Cases are private to their attorney | As Attorney B, open Attorney A's case link (copy the URL from Attorney A's session). | Access is refused, and Attorney B cannot start a call on it. |
| Only the case's client is notified | After 5.1, sign in as Attorney B and check notifications and messages. | Nothing about Attorney A's call appears. The join link goes only to the case's client. |
| Clients cannot use attorney Zoom features | As the Client, try https://www.clearcaseiq.com/connect/zoom. | The page asks for an attorney sign-in. Clients have no Zoom connection of their own. |
| Optional: second Zoom account | Connect Attorney B to a different Zoom account. | Each attorney's Zoom card shows their own Zoom email. Meetings each starts appear only in their own Zoom account. |

## 8. Error handling

| Situation | How to trigger | Expected |
| --- | --- | --- |
| Not connected | Click **Start video call** before connecting Zoom. | "Connect your Zoom account to start calls." with a **Connect Zoom** link. No meeting is created. |
| Access revoked in Zoom | Remove the app in Zoom (6.2), then try to start a call. | The same **Connect Zoom** prompt. No error page. |
| Consent denied | Click **Deny** on Zoom's consent screen. | The browser returns to ClearCaseIQ with "Zoom was not connected. Please try again." |

## 9. Data handling summary

ClearCaseIQ stores the connected user's Zoom user ID, email and display name, OAuth tokens (encrypted at rest), and for each meeting its ID, join link, passcode, start and end times, and duration. It does not store recordings, chat or meeting content. Disconnecting or removing the app deletes the tokens and Zoom account details. Privacy policy: https://www.clearcaseiq.com/privacy-policy.
