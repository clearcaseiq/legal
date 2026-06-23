# ClearCaseIQ → CMS browser extension (Phase 4)

A minimal Manifest V3 extension that lets attorneys/staff push the case they're
viewing into their connected case-management system (Clio, Filevine, etc.)
without leaving their workflow. It calls the ClearCaseIQ `/v1/integrations`
API directly — it does **not** scrape the CMS DOM.

## Load it (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `extension/` folder.
4. Open the popup → **Settings**, set the API base URL (e.g. `http://localhost:4000`)
   and paste a ClearCaseIQ bearer token, then **Save**.

## Use it

- Open a ClearCaseIQ case page (`/results/:id` or an attorney lead page). The
  popup auto-detects the assessment id, or paste one manually.
- Pick a target CMS (or "All connected CMS") and click **Push case to CMS**.

Connections are managed in the web app at `/integrations`.
