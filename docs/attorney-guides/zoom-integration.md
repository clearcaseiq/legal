<!-- Generated from app/src/data/attorneyGuides.ts. Do not edit by hand; run `pnpm --dir app guides:export`. -->

# Zoom video calls

Connect your Zoom account, start video calls and schedule Zoom consultations from a case, and disconnect or remove the Zoom app at any time.

_Last updated: 2026-10-21 · About 4 min read_

## Contents

- [What the Zoom integration does](#what-the-zoom-integration-does)
- [Connect your Zoom account](#connect-your-zoom-account)
- [Start a video call from a case](#start-a-video-call-from-a-case)
- [Schedule a Zoom consultation](#schedule-a-zoom-consultation)
- [After the call](#after-the-call)
- [Disconnect Zoom in ClearCaseIQ](#disconnect-zoom-in-clearcaseiq)
- [Remove the ClearCaseIQ app from Zoom](#remove-the-clearcaseiq-app-from-zoom)
- [What ClearCaseIQ stores](#what-clearcaseiq-stores)

## What the Zoom integration does

Connecting Zoom lets ClearCaseIQ create meetings on your own Zoom account. You can start an instant video call from a case or schedule a Zoom consultation, and the client gets the join link automatically. When a call ends, ClearCaseIQ adds a note to the case and drafts a time entry for you to review. Each attorney connects their own Zoom account; nothing is shared between attorneys.

## Connect your Zoom account

1. Open Case Management → Calendar and choose the Booking link tab.
2. Find the Zoom card and click Connect.
3. Sign in to Zoom if asked, review the permissions and click Allow.
4. You return to ClearCaseIQ and the Zoom card shows Connected with your Zoom email address.

> **Tip:** You can also connect from a case: if Zoom is not connected yet, clicking "Start video call" shows a "Connect Zoom" link.

> **Tip:** ClearCaseIQ asks Zoom only for what it needs: your basic profile, permission to create meetings, and the tokens used to start and join those meetings.

Where in the app: **Open Calendar settings** (`/attorney-dashboard/cases/calendar?tab=booking`)

## Start a video call from a case

1. Open the case and click "Start video call" in the case header.
2. A Zoom meeting is created on your account and opens in Zoom in a new tab, with you as the host.
3. The client is sent the join link as a message on the case, an in-app notification and an email.

> **Tip:** If the client has no email on file, ClearCaseIQ tells you so. Click "Copy link" and send the link another way.

> **Tip:** If nothing opens, allow pop-ups for ClearCaseIQ in your browser and click the button again.

## Schedule a Zoom consultation

1. Book a consultation from a case or from your calendar and choose "Video (Zoom)" as the meeting type.
2. ClearCaseIQ creates the Zoom meeting when the consultation is booked and adds the link to the appointment.
3. The client sees a "Join video call" button on their dashboard for the upcoming consultation.

## After the call

When a meeting on a case ends, ClearCaseIQ adds an internal note to the case, such as "Video call with client (Zoom), 18 min", and creates a draft, billable time entry for the call length at your hourly rate. Review and confirm the draft under Time & Billing before it can go on an invoice.

## Disconnect Zoom in ClearCaseIQ

1. Open Case Management → Calendar → Booking link.
2. On the Zoom card, click Disconnect.

> **Tip:** Disconnecting revokes ClearCaseIQ’s access at Zoom and deletes the Zoom tokens we stored for you.

> **Tip:** Meetings already created stay on your Zoom account, and past call notes and time entries stay on their cases. Click Connect any time to reconnect.

Where in the app: **Open Calendar settings** (`/attorney-dashboard/cases/calendar?tab=booking`)

## Remove the ClearCaseIQ app from Zoom

1. Sign in at marketplace.zoom.us.
2. Click Manage, then Added Apps.
3. Find ClearCaseIQ and click Remove.

> **Tip:** When you remove the app, Zoom notifies ClearCaseIQ and we delete the Zoom tokens and account details stored for you.

> **Tip:** Starting a video call afterwards asks you to connect Zoom again.

## What ClearCaseIQ stores

Your Zoom user ID, email address and display name; the access tokens that let us create meetings for you, encrypted at rest; and, for each meeting, its ID, join link, passcode, start and end times and duration. We do not store recordings, chat or anything said in the meeting. Questions: support@clearcaseiq.com.
