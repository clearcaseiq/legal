import { Link } from 'react-router-dom'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Headline + intro */}
      <h1 className="text-3xl font-bold text-slate-900 text-center mb-4">How ClearCaseIQ Works</h1>
      <p className="text-slate-600 text-center mb-2">
        ClearCaseIQ helps you understand whether you may have a personal injury case before speaking with an attorney.
      </p>
      <p className="text-slate-600 text-center mb-12">
        Our AI-powered assessment analyzes your accident details and compares them with similar injury cases.
      </p>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-brand-100 text-brand-600 font-bold text-xl mb-4">1</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Tell Us About Your Accident</h2>
          <p className="text-slate-600 text-sm">Answer a few quick questions about what happened, your injuries, and where the accident occurred.</p>
        </div>
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-brand-100 text-brand-600 font-bold text-xl mb-4">2</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">See If You May Have a Case</h2>
          <p className="text-slate-600 text-sm">Our system estimates your case value, probability of success, and typical timeline based on similar cases.</p>
        </div>
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-brand-100 text-brand-600 font-bold text-xl mb-4">3</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Connect With Attorneys Who Handle Cases Like Yours</h2>
          <p className="text-slate-600 text-sm">If you choose, your case is securely sent to attorneys experienced in cases like yours.</p>
        </div>
      </div>

      {/* Timeline visual */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-12 py-6 px-4 bg-slate-50 rounded-xl">
        <span className="text-sm font-medium text-slate-700">Accident</span>
        <ArrowRight className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Case Assessment</span>
        <ArrowRight className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Attorney Review</span>
        <ArrowRight className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Negotiation</span>
        <ArrowRight className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Resolution</span>
      </div>

      {/* What Happens Next */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">What Happens Next</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">1</span>
            <div>
              <h3 className="font-semibold text-slate-900">Attorneys review your case summary</h3>
              <p className="text-slate-600 text-sm">Your case is sent to attorneys who specialize in your type of injury and jurisdiction.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">2</span>
            <div>
              <h3 className="font-semibold text-slate-900">Interested attorneys contact you</h3>
              <p className="text-slate-600 text-sm">You receive outreach from attorneys who want to discuss your case.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">3</span>
            <div>
              <h3 className="font-semibold text-slate-900">You decide whether to move forward</h3>
              <p className="text-slate-600 text-sm">There is no obligation to hire. You choose the attorney that feels right for you.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Case Insights */}
      <div className="mb-12 p-6 bg-white border border-slate-200 rounded-xl">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Example Case Insights</h2>
        <p className="text-center text-slate-600 text-sm mb-6">Here's what you might see after completing the assessment.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">Estimated Case Value</p>
            <p className="text-xl font-bold text-slate-900">$3,000 – $22,000</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">Probability of Success</p>
            <p className="text-xl font-bold text-slate-900">Moderate</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">Estimated Timeline</p>
            <p className="text-xl font-bold text-slate-900">8–14 months</p>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="mb-12">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Your information is secure and confidential</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">No obligation to hire an attorney</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Takes about 60 seconds</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Do I need a lawyer to use ClearCaseIQ?</h3>
            <p className="text-slate-600">No. ClearCaseIQ helps you understand your case before speaking with an attorney.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">How long does the assessment take?</h3>
            <p className="text-slate-600">Most users complete it in about 60 seconds.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Is my information shared automatically?</h3>
            <p className="text-slate-600">No. Your case is only shared with attorneys after you approve.</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Find Out If You May Have a Personal Injury Case</h2>
          <Link
            to="/assessment/start"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
          >
            Start Free Assessment
          </Link>
        </div>
      </div>
    </div>
  )
}
