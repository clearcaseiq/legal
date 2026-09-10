-- First-touch marketing attribution on the intake lead.
--
-- GA4 can report that a campaign produced sessions but never sees a conversion:
-- the intake wizard and results page carry no analytics tag, because their URLs
-- can hold an assessment id or a claim token. Recording the campaign here, in
-- our own database, is what lets "this campaign produced a retained case" be
-- answered at all -- by joining forward through IntakeLead.assessmentId.
--
-- All nullable. Organic and direct arrivals carry none of these, and that is
-- most of them.
ALTER TABLE "intake_leads" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN "gclid" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN "referrer" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN "landingPath" TEXT;
ALTER TABLE "intake_leads" ADD COLUMN "attributionExtra" TEXT;

-- Supports the channel breakdown on the admin analytics screen.
CREATE INDEX "intake_leads_utmSource_utmMedium_idx" ON "intake_leads"("utmSource", "utmMedium");
