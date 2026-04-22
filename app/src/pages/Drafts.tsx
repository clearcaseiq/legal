import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAssessment } from '../lib/api'

interface Assessment {
  id: string
  claimType: string
  venue?: { state: string; county?: string }
  venueState?: string
  venueCounty?: string
  facts: any
  created_at: string
}

export default function Drafts() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({
    demandLetter: '',
    incidentSummary: '',
    injuryChronology: '',
    damagesSummary: '',
    policeReportSummary: ''
  })

  useEffect(() => {
    const loadAssessment = async () => {
      if (!assessmentId) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const data = await getAssessment(assessmentId)
        setAssessment(data)

        const facts = typeof data.facts === 'string'
          ? JSON.parse(data.facts)
          : data.facts || {}
        const venueState = data.venue?.state || data.venueState || 'Unknown'
        const venueCounty = data.venue?.county || data.venueCounty
        const incidentNarrative = facts.incident?.narrative || 'Incident narrative is not available yet.'
        const timeline = Array.isArray(facts.incident?.timeline)
          ? facts.incident.timeline
              .slice()
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((event: any) => event.label)
              .join(' → ')
          : 'Timeline events are not available yet.'
        const damages = facts.damages || {}
        const policeReport = facts.liability?.policeReport === 'yes'
          ? `Police report filed for incident in ${venueState}${venueCounty ? `, ${venueCounty}` : ''}.`
          : 'Police report status is pending or not documented.'

        setDrafts({
          demandLetter:
            `Demand for settlement arising from ${facts.claimType || data.claimType || 'personal injury'} incident in ${venueState}${venueCounty ? `, ${venueCounty}` : ''}.\n\n` +
            `Medical damages pending. Treatment ongoing. Documentation continues to be collected.\n\n` +
            `Summary of incident: ${incidentNarrative}`,
          incidentSummary: incidentNarrative,
          injuryChronology: timeline,
          damagesSummary:
            `Medical charges: ${damages.med_charges ? `$${damages.med_charges}` : 'Pending'}\n` +
            `Medical paid: ${damages.med_paid ? `$${damages.med_paid}` : 'Pending'}\n` +
            `Wage loss: ${damages.wage_loss ? `$${damages.wage_loss}` : 'Pending'}\n` +
            `Other services: ${damages.services ? `$${damages.services}` : 'Pending'}`,
          policeReportSummary: policeReport
        })
      } catch (error) {
        console.error('Failed to load assessment drafts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAssessment()
  }, [assessmentId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading draft documents...</p>
        </div>
      </div>
    )
  }

  if (!assessmentId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-700">
          Please select a case to view draft documents.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Draft Legal Documents</h1>
          {assessment && (
            <p className="text-sm text-gray-600">
              Case: {assessment.claimType} • {assessment.venue?.state || assessment.venueState || 'Unknown'}
            </p>
          )}
        </div>
        {assessment && (
          <Link
            to={`/results/${assessment.id}`}
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Back to results
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Demand Letter (Editable)</h3>
          <textarea
            className="textarea w-full"
            rows={10}
            value={drafts.demandLetter}
            onChange={(e) => setDrafts(prev => ({ ...prev, demandLetter: e.target.value }))}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Incident Narrative Summary</h3>
          <textarea
            className="textarea w-full"
            rows={6}
            value={drafts.incidentSummary}
            onChange={(e) => setDrafts(prev => ({ ...prev, incidentSummary: e.target.value }))}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Injury Chronology (Plain English)</h3>
          <textarea
            className="textarea w-full"
            rows={5}
            value={drafts.injuryChronology}
            onChange={(e) => setDrafts(prev => ({ ...prev, injuryChronology: e.target.value }))}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Damages Summary Sheet</h3>
          <textarea
            className="textarea w-full"
            rows={5}
            value={drafts.damagesSummary}
            onChange={(e) => setDrafts(prev => ({ ...prev, damagesSummary: e.target.value }))}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Police Report Summary</h3>
          <textarea
            className="textarea w-full"
            rows={4}
            value={drafts.policeReportSummary}
            onChange={(e) => setDrafts(prev => ({ ...prev, policeReportSummary: e.target.value }))}
          />
        </div>
      </div>
    </div>
  )
}
