import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCaseDashboard, getCaseDetails, getCaseTimeline, getCaseCommandCenter, type CaseCommandCenter } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/formatters'
import { formatClaimType } from '../lib/claimTypes'
import PlaintiffCaseCommandCenter from '../components/PlaintiffCaseCommandCenter'
import { useLanguage } from '../contexts/LanguageContext'
import { 
  Calendar, 
  MessageSquare, 
  FileText, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Users,
  DollarSign,
  Activity,
  ArrowRight,
  Phone,
  Video,
  MapPin
} from 'lucide-react'

interface CaseSummary {
  totalCases: number
  activeCases: number
  totalValue: number
  upcomingAppointments: number
  pendingMessages: number
}

interface CaseData {
  id: string
  claimType: string
  venue: { state: string; county?: string }
  status: string
  facts: any
  prediction?: any
  transparency?: {
    statusSummary: string
    plainEnglish: string
    nextUpdate: string
    progressPercent: number
    progressItems: Array<{ label: string; status: string }>
    settlementExpectation: {
      median: number
      rangeLow: number
      rangeHigh: number
      confidence: string
      note: string
    }
  }
  appointments: any[]
  chatRooms: any[]
  demandLetters: any[]
  files: any[]
  createdAt: string
  updatedAt: string
}

export default function CaseTracker() {
  const { t } = useLanguage()
  const [summary, setSummary] = useState<CaseSummary | null>(null)
  const [cases, setCases] = useState<CaseData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])
  const [selectedCaseCommandCenter, setSelectedCaseCommandCenter] = useState<CaseCommandCenter | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    const loadCommandCenter = async () => {
      if (!selectedCase?.id) {
        setSelectedCaseCommandCenter(null)
        return
      }
      try {
        const summary = await getCaseCommandCenter(selectedCase.id)
        setSelectedCaseCommandCenter(summary)
      } catch (err) {
        console.error('Failed to load case command center:', err)
        setSelectedCaseCommandCenter(null)
      }
    }
    loadCommandCenter()
  }, [selectedCase?.id])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const data = await getCaseDashboard()
      setSummary(data.summary)
      setCases(data.cases)
    } catch (err) {
      console.error('Failed to load case dashboard:', err)
      setError(t('caseTracker.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const loadCaseTimeline = async (caseId: string) => {
    try {
      const data = await getCaseTimeline(caseId)
      setTimeline(data)
      setShowTimeline(true)
    } catch (err) {
      console.error('Failed to load case timeline:', err)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'INTAKE': 'bg-blue-100 text-blue-800',
      'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800',
      'FILED': 'bg-purple-100 text-purple-800',
      'NEGOTIATION': 'bg-orange-100 text-orange-800',
      'SETTLED': 'bg-green-100 text-green-800',
      'TRIAL': 'bg-red-100 text-red-800',
      'CLOSED': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || colors.DRAFT
  }

  const getStatusIcon = (status: string) => {
    if (status === 'SETTLED' || status === 'CLOSED') return <CheckCircle className="h-4 w-4" />
    if (status === 'TRIAL' || status === 'NEGOTIATION') return <AlertTriangle className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('caseTracker.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('caseTracker.errorTitle')}</h2>
          <p className="text-gray-600">{error}</p>
          <button onClick={loadDashboard} className="btn-primary mt-4">
            {t('caseTracker.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('caseTracker.title')}
        </h1>
        <p className="text-xl text-gray-600">
          {t('caseTracker.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">{summary.totalCases}</div>
            <div className="text-sm text-gray-600">{t('caseTracker.totalCases')}</div>
            <Users className="h-8 w-8 text-primary-600 mx-auto mt-2" />
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">{summary.activeCases}</div>
            <div className="text-sm text-gray-600">{t('caseTracker.activeCases')}</div>
            <Activity className="h-8 w-8 text-green-600 mx-auto mt-2" />
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600 mb-2">
              {formatCurrency(summary.totalValue)}
            </div>
            <div className="text-sm text-gray-600">{t('caseTracker.totalValue')}</div>
            <DollarSign className="h-8 w-8 text-primary-600 mx-auto mt-2" />
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">{summary.upcomingAppointments}</div>
            <div className="text-sm text-gray-600">{t('caseTracker.upcomingAppointments')}</div>
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mt-2" />
          </div>
          
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">{summary.pendingMessages}</div>
            <div className="text-sm text-gray-600">{t('caseTracker.pendingMessages')}</div>
            <MessageSquare className="h-8 w-8 text-orange-600 mx-auto mt-2" />
          </div>
        </div>
      )}

      {/* Cases List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('caseTracker.yourCases')}</h2>
        
        {cases.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('caseTracker.noCasesTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('caseTracker.noCasesBody')}
            </p>
            <Link to="/assess" className="btn-primary">
              {t('caseTracker.startAssessment')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cases.map((caseData) => (
              <div key={caseData.id} className="card hover:shadow-lg transition-shadow">
                {/* Case Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {t('caseTracker.caseTitle', { type: formatClaimType(caseData.claimType) })}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {caseData.venue.state}{caseData.venue.county && `, ${caseData.venue.county}`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(caseData.status)}`}>
                    {getStatusIcon(caseData.status)}
                    <span className="ml-1">{caseData.status.replace('_', ' ')}</span>
                  </span>
                </div>

                {/* Case Value */}
                {caseData.prediction && (
                  <div className="mb-4 p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('caseTracker.estimatedValue')}</span>
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(caseData.prediction.bands?.median || 0)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t('caseTracker.rangeLabel', { low: formatCurrency(caseData.prediction.bands?.p25 || 0), high: formatCurrency(caseData.prediction.bands?.p75 || 0) })}
                    </div>
                  </div>
                )}

                {/* Case Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {caseData.appointments.length}
                    </div>
                    <div className="text-xs text-gray-600">{t('caseTracker.appointments')}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {caseData.chatRooms.length}
                    </div>
                    <div className="text-xs text-gray-600">{t('caseTracker.conversations')}</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {caseData.files.length}
                    </div>
                    <div className="text-xs text-gray-600">{t('caseTracker.documents')}</div>
                  </div>
                </div>

                {caseData.transparency && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-2">{t('caseTracker.clientStatusDashboard')}</div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${caseData.transparency.progressPercent}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-700">{caseData.transparency.plainEnglish}</div>
                    <div className="text-xs text-gray-500 mt-1">{caseData.transparency.nextUpdate}</div>
                  </div>
                )}

                {/* Upcoming Appointments */}
                {caseData.appointments.filter(apt => 
                  apt.status === 'SCHEDULED' && new Date(apt.scheduledAt) > new Date()
                ).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{t('caseTracker.upcomingAppointments')}</h4>
                    {caseData.appointments
                      .filter(apt => apt.status === 'SCHEDULED' && new Date(apt.scheduledAt) > new Date())
                      .slice(0, 2)
                      .map((apt) => (
                        <div key={apt.id} className="flex items-center text-sm text-gray-600 mb-1">
                          {apt.type === 'video' && <Video className="h-4 w-4 mr-2" />}
                          {apt.type === 'phone' && <Phone className="h-4 w-4 mr-2" />}
                          {apt.type === 'in_person' && <MapPin className="h-4 w-4 mr-2" />}
                          <span>{t('caseTracker.apptWith', { date: formatDate(apt.scheduledAt), name: apt.attorney.name })}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedCase(caseData)}
                    className="flex-1 btn-outline text-sm"
                  >
                    {t('caseTracker.viewDetails')}
                  </button>
                  {caseData.chatRooms && caseData.chatRooms.length > 0 && (
                    <Link
                      to="/messaging"
                      className="btn-primary text-sm flex items-center justify-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t('caseTracker.message')}
                    </Link>
                  )}
                  <button
                    onClick={() => loadCaseTimeline(caseData.id)}
                    className="flex-1 btn-primary text-sm"
                  >
                    {t('caseTracker.viewTimeline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedCase(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{t('caseTracker.caseDetailsTitle', { type: formatClaimType(selectedCase.claimType) })}</h2>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <PlaintiffCaseCommandCenter summary={selectedCaseCommandCenter} />

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.basicInfo')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('caseTracker.status')}</label>
                    <p className="text-gray-900 mt-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCase.status)}`}>
                        {getStatusIcon(selectedCase.status)}
                        <span className="ml-1">{selectedCase.status.replace('_', ' ')}</span>
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('caseTracker.venue')}</label>
                    <p className="text-gray-900 mt-1">
                      {selectedCase.venue.county && `${selectedCase.venue.county}, `}{selectedCase.venue.state}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('caseTracker.created')}</label>
                    <p className="text-gray-900 mt-1">{new Date(selectedCase.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('caseTracker.lastUpdated')}</label>
                    <p className="text-gray-900 mt-1">{new Date(selectedCase.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Prediction */}
              {selectedCase.prediction && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.aiPrediction')}</h3>
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('caseTracker.overallViability')}</label>
                        <p className="text-2xl font-bold text-primary-600 mt-1">
                          {Math.round((selectedCase.prediction.viability?.overall || 0) * 100)}%
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('caseTracker.estimatedValue')}</label>
                        <p className="text-2xl font-bold text-primary-600 mt-1">
                          {formatCurrency(selectedCase.prediction.bands?.median || 0)}
                        </p>
                      </div>
                    </div>
                    {selectedCase.prediction.bands && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('caseTracker.valueRange')}</label>
                        <p className="text-gray-900 mt-1">
                          {formatCurrency(selectedCase.prediction.bands.p25 || 0)} - {formatCurrency(selectedCase.prediction.bands.p75 || 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCase.transparency && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.clientTransparency')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">{t('caseTracker.plainEnglishStatus')}</div>
                      <div className="text-gray-900 mt-1">{selectedCase.transparency.plainEnglish}</div>
                      <div className="text-xs text-gray-500 mt-1">{selectedCase.transparency.nextUpdate}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-2">{t('caseTracker.progressTracking')}</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${selectedCase.transparency.progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {selectedCase.transparency.progressItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-gray-700">{item.label}</span>
                            <span className="text-xs text-gray-500">{item.status.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">{t('caseTracker.settlementExpectation')}</div>
                      <div className="text-gray-900 mt-1">
                        {formatCurrency(selectedCase.transparency.settlementExpectation.median)}
                        {' '}({formatCurrency(selectedCase.transparency.settlementExpectation.rangeLow)} - {formatCurrency(selectedCase.transparency.settlementExpectation.rangeHigh)})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedCase.transparency.settlementExpectation.note}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('caseTracker.milestonesNote')}
                    </div>
                  </div>
                </div>
              )}

              {/* Case Facts */}
              {selectedCase.facts && (() => {
                const facts = typeof selectedCase.facts === 'string' 
                  ? JSON.parse(selectedCase.facts) 
                  : selectedCase.facts;
                
                return (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.caseFacts')}</h3>
                    <div className="space-y-4">
                      {/* Incident Information */}
                      {facts.incident && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('caseTracker.incidentDetails')}</h4>
                          <div className="space-y-2 text-sm">
                            {facts.incident.date && (
                              <div className="flex">
                                <span className="font-medium text-gray-700 w-24">{t('caseTracker.dateLabel')}</span>
                                <span className="text-gray-900">{new Date(facts.incident.date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {facts.incident.location && (
                              <div className="flex">
                                <span className="font-medium text-gray-700 w-24">{t('caseTracker.locationLabel')}</span>
                                <span className="text-gray-900">{facts.incident.location}</span>
                              </div>
                            )}
                            {facts.incident.narrative && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">{t('caseTracker.narrativeLabel')}</span>
                                <p className="text-gray-900">{facts.incident.narrative}</p>
                              </div>
                            )}
                            {facts.incident.parties && facts.incident.parties.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">{t('caseTracker.partiesLabel')}</span>
                                <ul className="list-disc list-inside text-gray-900">
                                  {facts.incident.parties.map((party: string, idx: number) => (
                                    <li key={idx}>{party}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Liability */}
                      {facts.liability && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('caseTracker.liability')}</h4>
                          <div className="space-y-2 text-sm">
                            {facts.liability.fault && (
                              <div className="flex">
                                <span className="font-medium text-gray-700 w-24">{t('caseTracker.faultLabel')}</span>
                                <span className="text-gray-900 capitalize">{facts.liability.fault.replace('_', ' ')}</span>
                              </div>
                            )}
                            {facts.liability.evidence && facts.liability.evidence.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">{t('caseTracker.evidenceLabel')}</span>
                                <ul className="list-disc list-inside text-gray-900">
                                  {facts.liability.evidence.map((item: string, idx: number) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {facts.liability.notes && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">{t('caseTracker.notesLabel')}</span>
                                <p className="text-gray-900">{facts.liability.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Injuries */}
                      {facts.injuries && facts.injuries.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('caseTracker.injuries')}</h4>
                          <div className="space-y-3">
                            {facts.injuries.map((injury: any, idx: number) => (
                              <div key={idx} className="border-l-4 border-red-500 pl-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-900 capitalize">{injury.type?.replace('_', ' ')}</span>
                                  {injury.severity && (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                      {t('caseTracker.severity', { value: injury.severity })}
                                    </span>
                                  )}
                                </div>
                                {injury.description && (
                                  <p className="text-sm text-gray-700">{injury.description}</p>
                                )}
                                {injury.date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {t('caseTracker.dateValue', { date: new Date(injury.date).toLocaleDateString() })}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Treatment */}
                      {facts.treatment && facts.treatment.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('caseTracker.medicalTreatment')}</h4>
                          <div className="space-y-3">
                            {facts.treatment.map((treatment: any, idx: number) => (
                              <div key={idx} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                                <div className="flex items-start justify-between mb-1">
                                  <div>
                                    <span className="font-medium text-gray-900">{treatment.provider}</span>
                                    {treatment.date && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        {new Date(treatment.date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  {treatment.charges && (
                                    <span className="text-sm font-semibold text-gray-900">
                                      {formatCurrency(treatment.charges)}
                                    </span>
                                  )}
                                </div>
                                {treatment.diagnosis && (
                                  <p className="text-sm text-gray-700"><span className="font-medium">{t('caseTracker.diagnosisLabel')}</span> {treatment.diagnosis}</p>
                                )}
                                {treatment.treatment && (
                                  <p className="text-sm text-gray-600 mt-1">{treatment.treatment}</p>
                                )}
                                {treatment.type && (
                                  <span className="inline-block mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                                    {treatment.type.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Damages */}
                      {facts.damages && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('caseTracker.damagesSummary')}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {facts.damages.med_charges !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.medicalCharges')}</span>
                                <p className="text-gray-900">{formatCurrency(facts.damages.med_charges)}</p>
                              </div>
                            )}
                            {facts.damages.med_paid !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.medicalPaid')}</span>
                                <p className="text-gray-900">{formatCurrency(facts.damages.med_paid)}</p>
                              </div>
                            )}
                            {facts.damages.wage_loss !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.wageLoss')}</span>
                                <p className="text-gray-900">{formatCurrency(facts.damages.wage_loss)}</p>
                              </div>
                            )}
                            {facts.damages.services !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.services')}</span>
                                <p className="text-gray-900">{formatCurrency(facts.damages.services)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Insurance */}
                      {facts.insurance && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('caseTracker.insuranceInfo')}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {facts.insurance.health_coverage && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.healthCoverage')}</span>
                                <p className="text-gray-900 capitalize">{String(facts.insurance.health_coverage)}</p>
                              </div>
                            )}
                            {Array.isArray(facts.insurance.coverage_types) && facts.insurance.coverage_types.length > 0 && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">{t('caseTracker.coverageTypes')}</span>
                                <p className="text-gray-900">{facts.insurance.coverage_types.map((t: string) => t.replace(/_/g, ' ')).join(', ')}</p>
                              </div>
                            )}
                            {facts.insurance.medicare_plan_type && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.medicareType')}</span>
                                <p className="text-gray-900">{String(facts.insurance.medicare_plan_type).replace(/_/g, ' ')}</p>
                              </div>
                            )}
                            {facts.insurance.at_fault_party && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.atFaultInsurance')}</span>
                                <p className="text-gray-900">{facts.insurance.at_fault_party}</p>
                              </div>
                            )}
                            {facts.insurance.policy_limit !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.policyLimit')}</span>
                                <p className="text-gray-900">{formatCurrency(facts.insurance.policy_limit)}</p>
                              </div>
                            )}
                            {facts.insurance.own_insurance && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.ownInsurance')}</span>
                                <p className="text-gray-900">{facts.insurance.own_insurance}</p>
                              </div>
                            )}
                            {facts.insurance.uninsured !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">{t('caseTracker.uninsuredMotorist')}</span>
                                <p className="text-gray-900">{facts.insurance.uninsured ? t('caseTracker.yes') : t('caseTracker.no')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Appointments */}
              {selectedCase.appointments && selectedCase.appointments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.appointments')}</h3>
                  <div className="space-y-2">
                    {selectedCase.appointments.map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          {apt.type === 'video' && <Video className="h-4 w-4 mr-2 text-gray-500" />}
                          {apt.type === 'phone' && <Phone className="h-4 w-4 mr-2 text-gray-500" />}
                          {apt.type === 'in_person' && <MapPin className="h-4 w-4 mr-2 text-gray-500" />}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {apt.attorney?.name || t('caseTracker.attorneyFallback')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(apt.scheduledAt)} • {apt.type?.replace('_', ' ') || t('caseTracker.appointmentFallback')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          apt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          apt.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Rooms */}
              {selectedCase.chatRooms && selectedCase.chatRooms.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.conversations')}</h3>
                  <div className="space-y-2">
                    {selectedCase.chatRooms.map((room: any) => (
                      <Link
                        key={room.id}
                        to={`/messaging?roomId=${room.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {room.attorney?.name || t('caseTracker.attorneyFallback')}
                          </p>
                          {room.lastMessage && (
                            <p translate="no" className="notranslate text-xs text-gray-500 mt-1 truncate">
                              {room.lastMessage.content}
                            </p>
                          )}
                        </div>
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedCase.files && selectedCase.files.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('caseTracker.documents')}</h3>
                  <div className="space-y-2">
                    {selectedCase.files.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.originalName || file.name}</p>
                            <p className="text-xs text-gray-500">{file.mimetype || t('caseTracker.documentFallback')}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <Link
                  to={`/results/${selectedCase.id}`}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                >
                  {t('caseTracker.viewFullAssessment')}
                </Link>
                <button
                  onClick={() => {
                    setSelectedCase(null)
                    loadCaseTimeline(selectedCase.id)
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('caseTracker.viewTimeline')}
                </button>
                {selectedCase.chatRooms && selectedCase.chatRooms.length > 0 && (
                  <Link
                    to={`/messaging?roomId=${selectedCase.chatRooms[0].id}`}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t('caseTracker.messageAttorney')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('caseTracker.caseTimeline')}
                </h3>
                <button
                  onClick={() => setShowTimeline(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('caseTracker.noTimelineEvents')}</p>
                ) : (
                  timeline.map((event, index) => (
                    <div key={event.id || index} className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{event.title || event.type || t('caseTracker.eventFallback')}</h4>
                          <span className="text-xs text-gray-500">
                            {formatDate(event.date || event.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.description || event.content || ''}</p>
                        {event.status && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                            event.status === 'completed' ? 'bg-green-100 text-green-800' :
                            event.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            event.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-primary-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('caseTracker.quickActions')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/assess" className="btn-primary">
            <FileText className="h-4 w-4 mr-2" />
            {t('caseTracker.startNewAssessment')}
          </Link>
          <Link to="/attorneys-enhanced" state={{ from: '/case-tracker' }} className="btn-outline">
            <Users className="h-4 w-4 mr-2" />
            {t('caseTracker.findAttorneys')}
          </Link>
          <Link to="/financing" className="btn-outline">
            <DollarSign className="h-4 w-4 mr-2" />
            {t('caseTracker.exploreFunding')}
          </Link>
        </div>
      </div>
    </div>
  )
}
