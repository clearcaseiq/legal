import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, FileText, Upload, Users, BarChart3, Shield, Mail, AlertCircle } from 'lucide-react'

const categories = [
  {
    title: 'Getting Started',
    description: 'Learn how the case assessment works.',
    articles: [
      { title: 'How does the assessment work?', content: 'Answer a few quick questions about your accident. The assessment takes about 60 seconds and helps you understand if you may have a personal injury case.' },
      { title: 'Do I need to create an account?', content: 'You can start the assessment without an account. Creating an account lets you save your progress, upload evidence, and track your case.' },
    ],
  },
  {
    title: 'Your Case Assessment',
    description: 'Understanding your case results.',
    articles: [
      { title: 'What will I learn from the assessment?', content: 'You\'ll see if you may have a case, an estimated case value range, and typical timelines. Results are based on similar injury cases.' },
      { title: 'How accurate are the estimates?', content: 'Estimates are based on patterns from similar cases but depend on your documentation and evidence. They are for informational purposes only.' },
    ],
  },
  {
    title: 'Uploading Evidence',
    description: 'How to add documents and photos.',
    articles: [
      { title: 'What documents should I upload?', content: 'Recommended documents include: medical bills, injury photos, police reports, and wage loss documentation. The more documentation you provide, the better we can assess your case.' },
      { title: 'What file types are supported?', content: 'We accept images (JPG, PNG), PDFs, and common document formats. You can upload from your computer or take photos with your phone.' },
    ],
  },
  {
    title: 'Attorney Matching',
    description: 'How we connect you with attorneys.',
    articles: [
      { title: 'How does attorney matching work?', content: 'We match your case with attorneys who specialize in your type of injury and practice in your jurisdiction. You choose when to submit your case for attorney review.' },
      { title: 'Will my case be shared automatically?', content: 'No. Your case is only sent to attorneys after you approve submission. You remain in control of your information.' },
    ],
  },
  {
    title: 'Case Value Estimates',
    description: 'How estimates are calculated.',
    articles: [
      { title: 'How are case values estimated?', content: 'Estimates are based on patterns from thousands of similar injury cases, including injury type, treatment, and documentation. They are not guarantees.' },
      { title: 'Why might my estimate change?', content: 'Adding evidence, medical records, or documentation can improve the accuracy and may affect the estimated range.' },
    ],
  },
  {
    title: 'Privacy & Security',
    description: 'How we protect your information.',
    articles: [
      { title: 'Is my information secure?', content: 'Yes. We use industry-standard encryption and security practices. Your data is stored securely and only shared with attorneys when you approve.' },
      { title: 'Who can see my case?', content: 'Only you, until you authorize us to send your case. Then it goes to the participating law firms you selected, one at a time in the order you set, so they can decide whether to offer to represent you. Medical records are included only if you have signed a HIPAA authorization. Participating firms have commercial agreements with ClearCaseIQ for technology and marketing services; you never pay us. See our Privacy Policy for exactly what is shared and when.' },
    ],
  },
  {
    title: 'Contact Support',
    description: 'Need help? Reach out to us.',
    articles: [
      { title: 'How do I contact support?', content: 'Email support@clearcaseiq.com. Most support requests are answered within 24 hours.' },
      { title: 'Can I report a technical issue?', content: 'Yes. Use the "Report a problem" link below to report technical issues. We appreciate your feedback.' },
    ],
  },
]

const faqs = [
  { q: 'Do I need a lawyer to use ClearCaseIQ?', a: 'No. ClearCaseIQ helps you understand your case before speaking with an attorney.' },
  { q: 'How accurate are the case value estimates?', a: 'Estimates are based on patterns from similar cases but depend on documentation and evidence.' },
  { q: 'Will my case be shared automatically?', a: 'No. Your case is only sent to attorneys after you approve submission.' },
  { q: 'How long does the assessment take?', a: 'Most users complete the assessment in about 60 seconds.' },
  { q: 'What information should I upload?', a: 'Recommended documents include: medical bills, injury photos, police reports, and wage loss documentation.' },
]

export default function Help() {
  const location = useLocation()
  const { hash } = location
  const isAdminArea = location.pathname.startsWith('/admin') || localStorage.getItem('auth_role') === 'admin'
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null)

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const idx = categories.findIndex((c) => c.title.toLowerCase().replace(/\s+/g, '-') === id)
        if (idx >= 0) setExpandedCategory(idx)
      }
    }
  }, [hash])

  const searchLower = search.toLowerCase()
  const filteredCategories = categories.filter(
    (c) =>
      searchLower === '' ||
      c.title.toLowerCase().includes(searchLower) ||
      c.articles.some((a) => a.title.toLowerCase().includes(searchLower) || a.content.toLowerCase().includes(searchLower))
  )

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Help Center</h1>
      <p className="text-slate-600 mb-6">How can we help you?</p>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search help articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {/* Quick links — hide plaintiff-specific actions when an admin is browsing. */}
      {!isAdminArea && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/assessment/start"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <FileText className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">Start a Case Assessment</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/dashboard"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <Upload className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">Upload Evidence</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/attorneys-enhanced"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <Users className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">Submit Case to Attorneys</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/dashboard"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <BarChart3 className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">Download Case Report</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
      </div>
      )}

      {/* Category cards */}
      <div className="space-y-4 mb-8">
        {filteredCategories.map((cat, idx) => (
          <div
            key={idx}
            id={cat.title.toLowerCase().replace(/\s+/g, '-')}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-24"
          >
            <button
              onClick={() => setExpandedCategory(expandedCategory === idx ? null : idx)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{cat.title}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{cat.description}</p>
              </div>
              {expandedCategory === idx ? (
                <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
              )}
            </button>
            {expandedCategory === idx && (
              <div className="border-t border-slate-200 p-4 bg-slate-50/50 space-y-4">
                {cat.articles.map((art, i) => (
                  <div key={i}>
                    <h3 className="font-medium text-slate-900 mb-1">{art.title}</h3>
                    <p className="text-sm text-slate-600">{art.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <p className="text-slate-600 mb-8">No articles match your search. Try different keywords.</p>
      )}

      {/* Help guides */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Helpful Guides</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <h3 className="font-semibold text-slate-900 mb-2">What Makes a Strong Personal Injury Case</h3>
            <p className="text-sm text-slate-600">
              Key factors: <strong>liability</strong> (who was at fault), <strong>injury evidence</strong> (medical records, photos), <strong>documentation</strong> (bills, reports), and <strong>damages</strong> (medical costs, lost wages).
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <h3 className="font-semibold text-slate-900 mb-2">What Insurance Companies Look For</h3>
            <p className="text-sm text-slate-600">
              They may challenge <strong>treatment gaps</strong>, <strong>missing documentation</strong>, and <strong>inconsistent descriptions</strong>. Consistent records and complete documentation help protect your case.
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <h3 className="font-semibold text-slate-900 mb-2">How Attorneys Evaluate Cases</h3>
            <p className="text-sm text-slate-600">
              Attorneys consider <strong>liability</strong> (fault and causation), <strong>damages</strong> (injury severity and costs), and <strong>medical evidence</strong> (treatment records and prognosis).
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust statement */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-8">
        <p className="text-sm text-slate-600">
          <strong>ClearCaseIQ does not provide legal advice.</strong> The platform helps you understand your case before speaking with a licensed attorney.
        </p>
      </div>

      {/* How we resolve issues — sets expectations for the support process so the
          footer "Support" link lands somewhere that explains how we help, not just a
          mailto. Deep-linkable via /help#how-we-resolve. */}
      <div id="how-we-resolve" className="mb-8 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">How we resolve issues</h2>
        <p className="text-slate-600 mb-4">
          Every request follows the same path so you always know what to expect. Most issues are resolved within one business day.
        </p>
        <ol className="space-y-4">
          {[
            { title: 'You reach out', body: 'Email support@clearcaseiq.com or use “Report a problem” below. Include your name, the email on your case, and a short description (screenshots help).' },
            { title: 'We acknowledge', body: 'You get a confirmation that we received your request, typically within a few hours during business hours (Mon–Fri, Pacific Time).' },
            { title: 'We triage', body: 'We categorize the request — technical, case & attorney matching, or privacy — and prioritize anything urgent or privacy-related.' },
            { title: 'We resolve or escalate', body: 'Most requests are answered within 24 hours. Complex issues are escalated to the right team, and we keep you updated until it’s fixed.' },
            { title: 'We confirm it’s resolved', body: 'We follow up to make sure the issue is fully handled and record it so we can prevent it from happening again.' },
          ].map((step, i) => (
            <li key={i} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-0.5 text-sm text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-sm text-slate-600">
            Support helps you with the ClearCaseIQ platform. We don’t provide legal advice — questions about your specific case or legal strategy should go to your matched attorney.
          </p>
        </div>
      </div>

      {/* Contact & Report */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="p-6 bg-white border border-slate-200 rounded-xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Need more help?</h3>
          <p className="text-slate-600 mb-4">
            Email: <a href="mailto:support@clearcaseiq.com" className="text-brand-600 hover:text-brand-700 font-medium">support@clearcaseiq.com</a>
          </p>
          <p className="text-sm text-slate-500">Most support requests are answered within 24 hours.</p>
          <a
            href="mailto:support@clearcaseiq.com?subject=Support%20Request"
            className="inline-flex items-center gap-2 mt-4 text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            Submit a support request →
          </a>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Something not working?</h3>
          <p className="text-slate-600 mb-4">Report technical issues so we can fix them.</p>
          <a
            href="mailto:support@clearcaseiq.com?subject=Report%20a%20Problem"
            className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            <AlertCircle className="h-4 w-4" />
            Report a problem →
          </a>
        </div>
      </div>

      {/* Legal links */}
      <p className="text-sm text-slate-600">
        Visit our <Link to="/terms-of-service" className="text-brand-600 hover:text-brand-700">Terms of Service</Link> and{' '}
        <Link to="/privacy-policy" className="text-brand-600 hover:text-brand-700">Privacy Policy</Link>.
      </p>
    </div>
  )
}
