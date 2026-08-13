/**
 * Per-case AI Copilot — readiness snapshot + cited Case Companion Q&A.
 * Lives as a case workspace tab (not a left-nav destination).
 */
import { useState } from 'react'
import { Bot, ClipboardCheck, Send, ShieldCheck, Sparkles } from 'lucide-react'
import {
  askLeadCommandCenterCopilot,
  type CaseCommandCenter,
} from '../../lib/api'

const FALLBACK_PROMPTS = [
  'What are the strongest facts in this case?',
  'What is blocking demand readiness?',
  'What will the insurer attack?',
]

type Props = {
  leadId: string
  cc: CaseCommandCenter | null
  onGoSection: (section: string) => void
}

export default function CaseCopilotPanel({ leadId, cc, onGoSection }: Props) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<{
    answer: string
    sources: Array<{ label: string; detail: string }>
  } | null>(null)

  const suggested =
    cc?.copilot?.suggestedPrompts?.length ? cc.copilot.suggestedPrompts : FALLBACK_PROMPTS

  const readinessScore = Math.round(Number(cc?.readiness?.score ?? 0))
  const readinessFactors = Array.isArray(cc?.readiness?.factors) ? cc!.readiness.factors : []

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await askLeadCommandCenterCopilot(leadId, trimmed)
      setAnswer({
        answer: res.answer,
        sources: Array.isArray(res.sources) ? res.sources : [],
      })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not get a Copilot answer. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">AI Copilot for this case</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Ask about facts, blockers, and next moves. Answers are grounded in intake, documents,
              chronology, and case activity — not a general chat bot.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Workup readiness</h3>
          </div>
          <button
            type="button"
            onClick={() => onGoSection('demand')}
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            {readinessScore}% · {cc?.readiness?.label || 'Not scored'}
          </button>
        </div>
        {readinessFactors.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {readinessFactors.slice(0, 6).map((f) => (
              <div
                key={f.key}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left"
              >
                <p className="text-xs font-medium text-slate-800">{f.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {f.points}/{f.max}
                  {f.hint ? ` · ${f.hint}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Open Overview for the full AI case summary.</p>
        )}
        {cc?.nextBestAction?.title ? (
          <p className="mt-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Suggested next:</span>{' '}
            {cc.nextBestAction.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">Ask Case Companion</h3>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const q = question
              setQuestion('')
              void ask(q)
            }}
            className="flex gap-2"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              placeholder="Ask about this case…"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {loading ? 'Asking…' : 'Ask'}
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggested.slice(0, 5).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void ask(prompt)}
                disabled={loading}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">Cited answer</h3>
          </div>
          {answer ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-800">{answer.answer}</p>
              {answer.sources.length > 0 ? (
                <div className="space-y-2">
                  {answer.sources.map((source) => (
                    <div
                      key={`${source.label}:${source.detail.slice(0, 40)}`}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                    >
                      <span className="font-semibold text-slate-900">{source.label}:</span>{' '}
                      {source.detail}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              Ask a question to get an answer grounded in this case file.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
