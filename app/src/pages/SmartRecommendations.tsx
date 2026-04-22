import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { 
  getSmartAttorneyRecommendations, 
  getCaseInsights, 
  getSmartTreatmentRecommendations,
  getSimilarCaseOutcomes 
} from '../lib/api'
import { formatCurrency, formatDate } from '../lib/formatters'
import { 
  Users, 
  Target, 
  TrendingUp, 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  BarChart3,
  Zap,
  Activity,
  Stethoscope,
  Filter,
  SortAsc,
  Shield,
  MessageSquare,
  DollarSign
} from 'lucide-react'
import Tooltip from '../components/Tooltip'

interface AttorneyRecommendation {
  rank: number
  attorney: {
    id: string
    name: string
    email: string
    phone: string
    specialties: string[]
    venues: string[]
    profile: any
    isVerified: boolean
    responseTimeHours: number
    averageRating: number
    totalReviews: number
    verifiedReviewCount: number
  }
  score: number
  matchPercentage: number
  reasons: string[]
  availability: any[]
  recentReviews: any[]
}

interface CaseInsight {
  type: string
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
  action: string
}

interface TreatmentRecommendation {
  type: string
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  provider: string
  expectedDuration: string
  benefits: string[]
}

interface SimilarCase {
  id: string
  description: string
  venue: string
  injuryType: string
  medicalBills: number
  settlementAmount: number
  duration: string
  keyFactors: string[]
}

export default function SmartRecommendations() {
  const { assessmentId } = useParams()
  const [recommendations, setRecommendations] = useState<AttorneyRecommendation[]>([])
  const [insights, setInsights] = useState<CaseInsight[]>([])
  const [treatmentRecs, setTreatmentRecs] = useState<TreatmentRecommendation[]>([])
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'attorneys' | 'insights' | 'treatment' | 'similar'>('attorneys')
  const [sortBy, setSortBy] = useState<'score' | 'rating' | 'response'>('score')
  const [filters, setFilters] = useState({
    minRating: 0,
    maxResponseTime: 48,
    verifiedOnly: false,
    freeConsultation: false
  })

  useEffect(() => {
    if (assessmentId) {
      loadRecommendations()
    }
  }, [assessmentId])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const [recsData, insightsData, treatmentData, similarData] = await Promise.all([
        getSmartAttorneyRecommendations(assessmentId!),
        getCaseInsights(assessmentId!),
        getSmartTreatmentRecommendations(assessmentId!),
        getSimilarCaseOutcomes(assessmentId!)
      ])
      
      setRecommendations(recsData.recommendations)
      setInsights(insightsData.insights)
      setTreatmentRecs(treatmentData.recommendations)
      setSimilarCases(similarData.similarCases)
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMatchPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 75) return 'text-blue-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.minRating > 0 && rec.attorney.averageRating < filters.minRating) return false
    if (filters.maxResponseTime < 48 && rec.attorney.responseTimeHours > filters.maxResponseTime) return false
    if (filters.verifiedOnly && !rec.attorney.isVerified) return false
    if (filters.freeConsultation && !rec.attorney.profile?.freeConsultation) return false
    return true
  })

  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.attorney.averageRating - a.attorney.averageRating
      case 'response':
        return a.attorney.responseTimeHours - b.attorney.responseTimeHours
      default:
        return b.score - a.score
    }
  })

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating smart recommendations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Smart Recommendations
        </h1>
        <p className="text-xl text-gray-600">
          AI-powered insights and personalized recommendations for your case
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'attorneys', label: 'Attorney Matches', icon: Users, count: recommendations.length },
            { id: 'insights', label: 'Case Insights', icon: Lightbulb, count: insights.length },
            { id: 'treatment', label: 'Treatment', icon: Target, count: treatmentRecs.length },
            { id: 'similar', label: 'Similar Cases', icon: BarChart3, count: similarCases.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Attorney Recommendations Tab */}
      {activeTab === 'attorneys' && (
        <div className="space-y-6">
          {/* Filters and Sorting */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filter & Sort</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input text-sm"
                >
                  <option value="score">Best Match</option>
                  <option value="rating">Highest Rated</option>
                  <option value="response">Fastest Response</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({...filters, minRating: parseFloat(e.target.value)})}
                  className="input text-sm"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3.5}>3.5+ Stars</option>
                  <option value={4.0}>4.0+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Response Time
                </label>
                <select
                  value={filters.maxResponseTime}
                  onChange={(e) => setFilters({...filters, maxResponseTime: parseInt(e.target.value)})}
                  className="input text-sm"
                >
                  <option value={48}>Any Time</option>
                  <option value={24}>Within 24 hours</option>
                  <option value={4}>Within 4 hours</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verifiedOnly"
                  checked={filters.verifiedOnly}
                  onChange={(e) => setFilters({...filters, verifiedOnly: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="verifiedOnly" className="text-sm text-gray-700">
                  Verified Only
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="freeConsultation"
                  checked={filters.freeConsultation}
                  onChange={(e) => setFilters({...filters, freeConsultation: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="freeConsultation" className="text-sm text-gray-700">
                  Free Consultation
                </label>
              </div>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {sortedRecommendations.length === 0 ? (
              <div className="card text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              sortedRecommendations.map((rec) => (
                <div key={rec.attorney.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-lg">#{rec.rank}</span>
                      </div>
                    </div>

                    {/* Attorney Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {rec.attorney.name}
                            </h3>
                            {rec.attorney.isVerified && (
                              <Tooltip content="Verified Attorney">
                                <Shield className="h-4 w-4 text-green-500" />
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                              <span className="font-medium">{rec.attorney.averageRating}</span>
                              <span className="ml-1">({rec.attorney.totalReviews} reviews)</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>Responds in {rec.attorney.responseTimeHours}h</span>
                            </div>
                            <div className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {rec.attorney.verifiedReviewCount > 0
                                ? `${rec.attorney.verifiedReviewCount} verified reviews`
                                : 'New profile'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getMatchPercentageColor(rec.matchPercentage)}`}>
                            {rec.matchPercentage.toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600">Match Score</div>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {rec.attorney.specialties.slice(0, 3).map((specialty, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Match Reasons */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Why this match?</h4>
                        <div className="flex flex-wrap gap-1">
                          {rec.reasons.slice(0, 4).map((reason, index) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Recent Reviews */}
                      {rec.recentReviews.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Reviews</h4>
                          <div className="space-y-2">
                            {rec.recentReviews.slice(0, 2).map((review, index) => (
                              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                                <div className="flex items-center mb-1">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                    ))}
                                  </div>
                                  <span className="ml-2 text-xs text-gray-500">{formatDate(review.date)}</span>
                                </div>
                                <p className="text-gray-700">{review.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Link
                          to={`/attorneys-enhanced?attorney=${rec.attorney.id}`}
                          state={{ from: `/smart-recommendations/${assessmentId}` }}
                          className="flex-1 btn-primary text-sm"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          View Profile
                        </Link>
                        <Link
                          to={`/messaging?attorney=${rec.attorney.id}`}
                          className="flex-1 btn-outline text-sm"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Link>
                        <Link
                          to={`/attorneys-enhanced?attorney=${rec.attorney.id}&book=true`}
                          state={{ from: `/smart-recommendations/${assessmentId}` }}
                          className="flex-1 btn-outline text-sm"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Book
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Case Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.map((insight, index) => (
              <div key={index} className="card">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    insight.importance === 'high' ? 'bg-red-100' :
                    insight.importance === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    {insight.importance === 'high' ? 
                      <AlertTriangle className="h-5 w-5 text-red-600" /> :
                      insight.importance === 'medium' ?
                      <Lightbulb className="h-5 w-5 text-yellow-600" /> :
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(insight.importance)}`}>
                        {insight.importance}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{insight.description}</p>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Action:</strong> {insight.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Treatment Recommendations Tab */}
      {activeTab === 'treatment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {treatmentRecs.map((rec, index) => (
              <div key={index} className="card">
                <div className="flex items-start space-x-3 mb-4">
                  <div className={`p-2 rounded-full ${
                    rec.urgency === 'high' ? 'bg-red-100' :
                    rec.urgency === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    {rec.type === 'physical_therapy' ? 
                      <Activity className="h-5 w-5 text-blue-600" /> :
                      rec.type === 'specialist_consultation' ?
                      <Stethoscope className="h-5 w-5 text-green-600" /> :
                      rec.type === 'chiropractic_care' ?
                      <Zap className="h-5 w-5 text-purple-600" /> :
                      <Target className="h-5 w-5 text-orange-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(rec.urgency)}`}>
                        {rec.urgency} priority
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{rec.description}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Provider:</span>
                      <p className="text-gray-600">{rec.provider}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <p className="text-gray-600">{rec.expectedDuration}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700 text-sm">Benefits:</span>
                    <ul className="mt-1 space-y-1">
                      {rec.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Cases Tab */}
      {activeTab === 'similar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {similarCases.map((caseData, index) => (
              <div key={index} className="card">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{caseData.description}</h3>
                  <Award className="h-5 w-5 text-yellow-500" />
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Venue:</span>
                      <p className="text-gray-600">{caseData.venue}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <p className="text-gray-600">{caseData.duration}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Medical Bills:</span>
                      <p className="text-gray-600">{formatCurrency(caseData.medicalBills)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Settlement:</span>
                      <p className="text-green-600 font-semibold">{formatCurrency(caseData.settlementAmount)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700 text-sm">Key Success Factors:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {caseData.keyFactors.map((factor, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-primary-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Ready to Take Action?
        </h3>
        <p className="text-gray-600 mb-4">
          Use these insights to make informed decisions about your case and treatment.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/case-tracker" className="btn-primary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Track Your Case
          </Link>
          <Link to="/ai-copilot" className="btn-outline">
            <Lightbulb className="h-4 w-4 mr-2" />
            Ask AI Questions
          </Link>
        </div>
      </div>
    </div>
  )
}
