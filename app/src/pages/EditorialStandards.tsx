import { Link } from 'react-router-dom'
import { CONTENT_REVIEWERS } from '../data/contentReviewers'

/**
 * How the educational content is produced, who stands behind it, and what it is
 * not.
 *
 * For legal and medical subject matter the honest version of this page is worth
 * more than a flattering one. Every claim here has to be verifiable by someone
 * reading the site; anything aspirational belongs in a roadmap, not here.
 */
export default function EditorialStandards() {
  const hasReviewers = CONTENT_REVIEWERS.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Editorial</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          Editorial standards
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          How the educational material on ClearCaseIQ is written, dated, and corrected — and the limits you should hold
          it to when it concerns your own injury claim.
        </p>
      </header>

      <Section title="Who writes this">
        <p>
          The educational library is produced by ClearCaseIQ, a California legal technology company. It is written for
          people trying to understand an injury claim, drawing on published California statutes and court rules, federal
          motor carrier regulations, insurer claim practices that are publicly documented, and the recurring patterns we
          see in how claims are assembled.
        </p>
        <p>
          ClearCaseIQ Corp. is not a law firm, does not employ attorneys to advise the public, and does not provide legal
          advice. Nothing here creates an attorney-client relationship.
        </p>
      </Section>

      <Section title="Expert review">
        {hasReviewers ? (
          <>
            <p>The following people review content in their areas of qualification:</p>
            <ul className="list-disc space-y-2 pl-5">
              {CONTENT_REVIEWERS.map((reviewer) => (
                <li key={reviewer.id}>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {reviewer.name}, {reviewer.credentials}
                  </span>{' '}
                  — {reviewer.bio}
                  {reviewer.licenseUrl && (
                    <>
                      {' '}
                      <a
                        href={reviewer.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-700 underline"
                      >
                        Verify licence
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p>Pages a named reviewer has read carry their name and the review date in the byline.</p>
          </>
        ) : (
          <>
            <p>
              No page in the library is currently reviewed by an independent licensed attorney or clinician, and pages
              say so in their byline rather than leaving you to assume otherwise. We would rather tell you the content is
              unreviewed than imply an expertise it does not have.
            </p>
            <p>
              This is a limitation we intend to close. When a named reviewer with verifiable credentials reviews a page,
              their name, credentials, and a link to verify their licence will appear on that page and be listed here.
            </p>
          </>
        )}
      </Section>

      <Section title="Dates and revisions">
        <p>
          Every educational page shows when it was first published and when it was last revised. Those dates reflect
          actual changes to that page&rsquo;s content — we do not refresh a date to make a page look current. A page that
          has not needed revision keeps its original date.
        </p>
        <p>
          Law changes. California filing deadlines, damages caps, and minimum insurance requirements have all changed in
          recent years, and a page&rsquo;s revision date is your cue to check whether a figure is still current before
          relying on it.
        </p>
      </Section>

      <Section title="What our estimates are and are not">
        <p>
          Our calculators apply published methods — most often the multiplier method — to numbers you enter, and they
          show every step so you can check the arithmetic. They are educational aids for orientation.
        </p>
        <p>
          They are not valuations, offers, or predictions. They cannot see the evidence in your file, the venue, the
          adjuster, the liens against your recovery, or your credibility as a witness, all of which move real outcomes.
          Where a method fits an injury poorly, the page says so on the page rather than in a footnote.
        </p>
      </Section>

      <Section title="Corrections">
        <p>
          If something here is wrong, out of date, or misleading, we want to know and we will fix it. Email{' '}
          <a href="mailto:support@clearcaseiq.com" className="font-semibold text-brand-700 underline">
            support@clearcaseiq.com
          </a>{' '}
          with the page address and what is incorrect. Substantive corrections update the page&rsquo;s revision date.
        </p>
      </Section>

      <Section title="How we make money">
        <p>
          ClearCaseIQ is paid by participating law firms for technology and services. That is worth knowing when you read
          anything here about whether to involve an attorney, and it is why the educational content is written to help you
          understand your claim rather than to push you toward a particular decision.
        </p>
        <p>
          See our <Link to="/disclosures" className="font-semibold text-brand-700 underline">platform disclosures</Link>{' '}
          for the full picture, including how attorney matching works and what consent it requires.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  )
}
