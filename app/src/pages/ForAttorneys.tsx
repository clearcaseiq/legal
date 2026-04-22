import { Link } from 'react-router-dom'
import { CheckCircle, BarChart3, FileText, MapPin } from 'lucide-react'

export default function ForAttorneys() {
  return (
    <div className="space-y-0">
      {/* 1️⃣ HERO */}
      <section className="text-center py-6 md:py-8">
        <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl md:text-6xl mb-4">
          Receive Qualified Personal Injury Cases
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-6">
          ClearCaseIQ matches attorneys with plaintiffs whose cases fit your
          practice area, jurisdiction, and litigation strategy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/attorney-register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
          >
            Join the Attorney Network
          </Link>
          <Link
            to="/login/attorney"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-xl hover:border-slate-400 transition-colors"
          >
            Attorney Sign In
          </Link>
        </div>
      </section>

      {/* 2️⃣ WHY ATTORNEYS USE CLEARCASEIQ */}
      <section className="py-4 bg-slate-50/70 rounded-2xl px-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-6">Why Attorneys Use ClearCaseIQ</h2>
        <ul className="max-w-2xl mx-auto space-y-4">
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700"><strong>Pre-qualified cases with structured case summaries</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700"><strong>Cases matched by practice area and jurisdiction</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700"><strong>AI-generated case insights and documentation</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700"><strong>Faster review with attorney-ready case packages</strong></span>
          </li>
        </ul>
      </section>

      {/* 3️⃣ HOW IT WORKS */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">How ClearCaseIQ Works for Attorneys</h2>
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold">1</span>
              <h3 className="text-lg font-semibold text-slate-900">Receive case matches</h3>
            </div>
            <p className="text-slate-600 ml-11">Cases are routed based on your:</p>
            <ul className="ml-11 mt-2 space-y-1 text-slate-600 list-disc list-inside">
              <li>practice area</li>
              <li>jurisdiction</li>
              <li>case complexity</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold">2</span>
              <h3 className="text-lg font-semibold text-slate-900">Review structured case summary</h3>
            </div>
            <p className="text-slate-600 ml-11">Each case includes:</p>
            <ul className="ml-11 mt-2 space-y-1 text-slate-600 list-disc list-inside">
              <li>incident timeline</li>
              <li>injury details</li>
              <li>evidence uploads</li>
              <li>estimated case value</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold">3</span>
              <h3 className="text-lg font-semibold text-slate-900">Accept or decline the case</h3>
            </div>
            <p className="text-slate-600 ml-11">You choose which cases to pursue.</p>
          </div>
        </div>
      </section>

      {/* 4️⃣ CASE INTELLIGENCE */}
      <section className="py-4 bg-slate-50/70 rounded-2xl px-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">Case Intelligence</h2>
        <p className="text-center text-slate-600 mb-4">Each case includes structured insights so you can review faster.</p>
        <div className="max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="font-medium text-slate-900">Case viability score</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="font-medium text-slate-900">Estimated settlement range</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="font-medium text-slate-900">Liability indicators</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="font-medium text-slate-900">Medical chronology</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200 sm:col-span-2">
            <p className="font-medium text-slate-900">Evidence completeness</p>
          </div>
        </div>
      </section>

      {/* 5️⃣ ATTORNEY TOOLS */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Attorney Tools</h2>
        <p className="text-center text-slate-600 mb-8">More than just leads — tools to work cases efficiently.</p>
        <div className="max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
            <FileText className="h-6 w-6 text-brand-600 flex-shrink-0" />
            <span className="text-slate-700">Case summaries</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
            <FileText className="h-6 w-6 text-brand-600 flex-shrink-0" />
            <span className="text-slate-700">Evidence viewer</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
            <FileText className="h-6 w-6 text-brand-600 flex-shrink-0" />
            <span className="text-slate-700">Medical record extraction</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
            <BarChart3 className="h-6 w-6 text-brand-600 flex-shrink-0" />
            <span className="text-slate-700">Settlement prediction</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 sm:col-span-2">
            <FileText className="h-6 w-6 text-brand-600 flex-shrink-0" />
            <span className="text-slate-700">Demand letter generation</span>
          </div>
        </div>
      </section>

      {/* 6️⃣ CASE QUALITY */}
      <section className="py-4 bg-slate-50/70 rounded-2xl px-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">Case Quality</h2>
        <p className="text-center text-slate-600 mb-4 max-w-2xl mx-auto">
          ClearCaseIQ analyzes injury severity, treatment history, documentation, and liability indicators. Cases are scored before being routed.
        </p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-brand-700" />
            <span className="text-slate-800 font-medium">10,000+ injury cases analyzed</span>
          </div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-brand-700" />
            <span className="text-slate-800 font-medium">Average case review time: &lt;5 minutes</span>
          </div>
        </div>
      </section>

      {/* 7️⃣ GEOGRAPHIC COVERAGE */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-6">Geographic Coverage</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-brand-600" />
            <span className="text-slate-700 font-medium">Currently serving cases in California</span>
          </div>
          <span className="text-slate-600">Expanding nationwide</span>
        </div>
      </section>

      {/* 8️⃣ JOIN THE NETWORK */}
      <section className="py-4 bg-slate-50/70 rounded-2xl px-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">Join the ClearCaseIQ Attorney Network</h2>
        <p className="text-center text-slate-600 mb-4">Apply to receive matched personal injury cases.</p>
        <div className="max-w-md mx-auto mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h3>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              Licensed attorney
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              Personal injury practice
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              Good standing with state bar
            </li>
          </ul>
        </div>
        <div className="text-center">
          <Link
            to="/attorney-register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
          >
            Apply to Join
          </Link>
        </div>
      </section>

      {/* 9️⃣ FAQ */}
      <section className="py-4">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">Frequently Asked Questions</h2>
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">How are cases matched?</h3>
            <p className="text-slate-600">Cases are matched based on jurisdiction, practice area, and case attributes.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Do I have to accept every case?</h3>
            <p className="text-slate-600">No. Attorneys can review and accept cases selectively.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">How quickly do I receive case details?</h3>
            <p className="text-slate-600">Immediately after a match is made.</p>
          </div>
        </div>
      </section>

      {/* 🔟 FOOTER CTA */}
      <section className="py-6 text-center border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Join the ClearCaseIQ Attorney Network</h2>
        <p className="text-slate-600 mb-4">Receive matched personal injury cases.</p>
        <Link
          to="/attorney-register"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
        >
          Apply Now
        </Link>
      </section>
    </div>
  )
}
