# Google Ads lead quality

A note for whoever runs our Google Ads account. It covers what we now send back
to Google about which clicks became real cases, how to set the campaigns up to
use that, and what the suspicious-leads file we share with you contains.

## The short version

- Optimize bidding for **Qualified lead** or **Retained case**, not form submits.
- Turn off **Search Partners** and the **Display Network** on search campaigns.
- Target people **located in** our service area, not people **interested in** it.
- Review the search terms report every week and add negative keywords.
- IP exclusions help a little, but they are capped and easy to get around. Don't
  rely on them.

## What we send to Google

We upload two offline conversions. Both are matched to the ad click by its click
ID (the `gclid`). Nothing else about the person is sent: no name, email, phone
number, address, or case details. Each upload is just the click ID, the time,
and, for retained cases, an optional value.

| Conversion | When it fires |
| --- | --- |
| Qualified lead | The person confirmed their phone or email with a one-time code and sent their case to attorneys. |
| Retained case | An attorney signed the person as a client. |

Each case is uploaded at most once per conversion. Uploads run daily, so a
conversion can show up in Google Ads a day or two after it happens.

**Qualified lead** is the better bidding target to start with. It happens within
minutes of the click, so Google gets plenty of signal, and a bot or a person
typing someone else's number can't get past the one-time code. **Retained case**
is the signal that matters most to the business, but it can take weeks and is
much rarer. Once it has steady volume (roughly 30 or more a month), consider
switching to it or adding it as a secondary goal.

Please stop optimizing for raw form submits or page visits. Those count every
bot and every accidental click the same as a real person with a real injury.

## Campaign settings

**Networks.** On search campaigns, untick "Include Google search partners" and
"Include Google Display Network". Most of the junk traffic we see comes from
these.

**Location.** Under Locations, then Location options, choose "Presence: People
in or regularly in your included locations". The default also includes people
who have only searched about the area, which brings in clicks from outside where
our attorneys can take cases.

**Search terms.** Check the search terms report weekly. Add negatives for job
seekers ("paralegal jobs", "law school"), free legal aid we can't help with, and
case types we don't handle.

## The suspicious-leads file

We can send you a CSV of leads that look like bots, click fraud, or repeat
submissions, for use in invalid-click claims and exclusions. It contains no names,
email addresses, phone numbers or case details. The columns are:

- when the lead came in
- the visitor's IP address
- the ad click ID (`gclid`) and UTM campaign
- device type (mobile, desktop, tablet, or unknown, which includes known bots)
- how many times the same person submitted again
- how many leads came from the same IP address in the period
- whether they confirmed their phone or email with the one-time code
- whether they passed the bot check
- how far they got in the form, and the lead's status

A lead is included if any of these is true:

- the same email or phone submitted again;
- three or more leads came from the same IP address;
- it failed the bot check;
- it never confirmed a one-time code and hasn't responded in 7 days.

Being on the list doesn't mean a lead is fake. Some people really do fill the
form in twice, and several people can share an office or household IP. Use it
to spot patterns (one campaign, one placement, one IP range) rather than
judging single rows.

We keep IP addresses for 180 days, then delete them, so ask for the file while
the clicks are still recent.

## About IP exclusions

Google Ads allows at most 500 excluded IP addresses per campaign. Most mobile
visitors share IP addresses that change often, so excluding one can block real
people later and does little against the source. Use exclusions only for a
fixed address that keeps showing up, such as a single office or a data centre.
Use the bidding and network settings above for everything else.

## Setup on our side

This part is for our engineers, not the agency.

1. In Google Ads, under Goals, then Conversions, create two conversion actions
   with source "Import" and "Other data sources or CRMs", "Track conversions from
   clicks": **Qualified lead** and **Retained case**. Note each action's numeric
   ID.
2. Set these on the API (`.env.prod` on the production host; leave them unset on
   QA so test conversions never reach the live account):
   - `GOOGLE_ADS_CONVERSION_ENABLED=true`
   - `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`,
     `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, and
     `GOOGLE_ADS_LOGIN_CUSTOMER_ID` if the account sits under a manager account
   - `GOOGLE_ADS_CONVERSION_ACTION_ID`: the Retained case action
   - `GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION`: the Qualified lead action
3. Each conversion uploads only when its own action ID is set, so either can be
   turned on by itself. Check the results in the "Google Ads conversion uploads" panel on the admin
   Analytics page, and
   in the conversion action's "Uploads" history in Google Ads.
4. The bot check needs `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` from
   Cloudflare (Turnstile, then Add widget, Managed mode). With either blank it is
   off and nothing is checked.
5. Admins download the suspicious-leads file from the admin home page ("Download
   suspicious leads (CSV)"). It covers the last 30 days by default.
