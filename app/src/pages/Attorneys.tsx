import { useState, useEffect } from 'react'
import { useSearchParams, Link, useLocation } from 'react-router-dom'
import { searchAttorneys, getAttorneyProfile } from '../lib/api'
import { type AttorneySummary } from '../lib/schemas'
import { 
  Search, 
  Star, 
  MapPin, 
  DollarSign, 
  Users, 
  Award,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  Globe,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'

export default function Attorneys() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const fromPath = (location.state as { from?: string })?.from ?? (localStorage.getItem('auth_token') ? '/dashboard' : '/')
  const [attorneys, setAttorneys] = useState<AttorneySummary[]>([])
  const [selectedAttorney, setSelectedAttorney] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searchForm, setSearchForm] = useState({
    venue: searchParams.get('venue') || '',
    claim_type: searchParams.get('claim_type') || '',
    limit: 10
  })

  const searchAttorneysList = async () => {
    setLoading(true)
    try {
      const results = await searchAttorneys(searchForm)
      setAttorneys(results)
      
      // Update URL params
      const params = new URLSearchParams()
      if (searchForm.venue) params.set('venue', searchForm.venue)
      if (searchForm.claim_type) params.set('claim_type', searchForm.claim_type)
      setSearchParams(params)
    } catch (error) {
      console.error('Failed to search attorneys:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    searchAttorneysList()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchAttorneysList()
  }

  const handleAttorneyClick = async (attorneyId: string) => {
    try {
      const attorney = await getAttorneyProfile(attorneyId)
      setSelectedAttorney(attorney)
    } catch (error) {
      console.error('Failed to load attorney details:', error)
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      )
    }
    return stars
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        to={fromPath}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Find Attorneys</h1>
        <p className="mt-2 text-gray-600">
          Connect with qualified attorneys who specialize in your type of case.
        </p>
      </div>

      {/* Search Form */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                value={searchForm.venue}
                onChange={(e) => setSearchForm(prev => ({ ...prev, venue: e.target.value }))}
                className="select"
              >
                <option value="">Any State</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="IL">Illinois</option>
                <option value="PA">Pennsylvania</option>
                <option value="OH">Ohio</option>
                <option value="GA">Georgia</option>
                <option value="NC">North Carolina</option>
                <option value="MI">Michigan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Type
              </label>
              <select
                value={searchForm.claim_type}
                onChange={(e) => setSearchForm(prev => ({ ...prev, claim_type: e.target.value }))}
                className="select"
              >
                <option value="">Any Type</option>
                <option value="auto">Auto Accident</option>
                <option value="slip_and_fall">Slip-and-Fall</option>
                <option value="dog_bite">Dog Bite</option>
                <option value="medmal">Medical Malpractice</option>
                <option value="product">Product Liability</option>
                <option value="nursing_home_abuse">Nursing Home Abuse</option>
                <option value="wrongful_death">Wrongful Death</option>
                <option value="high_severity_surgery">High-Severity / Surgery</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Searching...' : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attorney List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : attorneys.length > 0 ? (
            <div className="space-y-4">
              {attorneys.map((attorney) => (
                <div
                  key={attorney.attorney_id}
                  className="card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleAttorneyClick(attorney.attorney_id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {attorney.name}
                        </h3>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-600 mr-2">
                            {Math.round(attorney.fit_score * 100)}% fit
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${attorney.fit_score * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center mb-3">
                        {attorney.rating && (
                          <div className="flex items-center mr-4">
                            <div className="flex mr-1">
                              {renderStars(attorney.rating)}
                            </div>
                            <span className="text-sm text-gray-600 ml-1">
                              ({attorney.reviews_count} reviews)
                            </span>
                          </div>
                        )}
                        <div className="mr-4 inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {((attorney as any).verifiedReviewCount || 0) > 0
                            ? `${(attorney as any).verifiedReviewCount} verified reviews`
                            : 'New profile'}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          attorney.capacity === 'open' 
                            ? 'bg-green-100 text-green-800'
                            : attorney.capacity === 'limited'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {attorney.capacity}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {attorney.verified_outcomes.trials} trials
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Award className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {attorney.verified_outcomes.settlements} settlements
                          </span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            ${attorney.verified_outcomes.median_recovery.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {attorney.venues.join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center md:col-span-2">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {attorney.responseBadge || ((attorney.responseTimeHours ?? 24) <= 8 ? 'Same-day replies' : 'Replies within 24h')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {attorney.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attorneys found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria to find more attorneys.
              </p>
            </div>
          )}
        </div>

        {/* Attorney Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedAttorney ? (
            <div className="card sticky top-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedAttorney.name}
              </h3>

              <div className="mb-6 grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-sm text-gray-500">Response badge</div>
                  <div className="mt-1 flex items-center text-sm font-medium text-brand-700">
                    <Clock className="mr-2 h-4 w-4" />
                    {selectedAttorney.responseMetrics?.responseBadge || 'Replies within 24h'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Average response time: {selectedAttorney.responseMetrics?.averageResponseTime ?? 24}h
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-sm text-gray-500">Verified reviews</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedAttorney.responseMetrics?.totalReviews ?? selectedAttorney.reviews?.length ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {selectedAttorney.responseMetrics?.conversionMetrics?.verifiedReviews ?? 0} verified client reviews
                  </div>
                </div>
              </div>

              {(selectedAttorney.profile?.bio || selectedAttorney.bio) && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">About</h4>
                  <p className="text-sm text-gray-600">{selectedAttorney.profile?.bio || selectedAttorney.bio}</p>
                </div>
              )}

              {selectedAttorney.education && selectedAttorney.education.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Education</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedAttorney.education.map((edu: string, index: number) => (
                      <li key={index}>{edu}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAttorney.certifications && selectedAttorney.certifications.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Certifications</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedAttorney.certifications.map((cert: string, index: number) => (
                      <li key={index}>{cert}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Fee Structure</h4>
                <p className="text-sm text-gray-600">
                  Contingency: {Math.round((selectedAttorney.fee?.contingency_min ?? 0.3) * 100)}% - {Math.round((selectedAttorney.fee?.contingency_max ?? 0.4) * 100)}%
                </p>
              </div>

              {(selectedAttorney.contact || selectedAttorney.email || selectedAttorney.phone) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Contact</h4>
                  {(selectedAttorney.contact?.phone || selectedAttorney.phone) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedAttorney.contact?.phone || selectedAttorney.phone}
                    </div>
                  )}
                  {(selectedAttorney.contact?.email || selectedAttorney.email) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {selectedAttorney.contact?.email || selectedAttorney.email}
                    </div>
                  )}
                  {selectedAttorney.contact?.website && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="h-4 w-4 mr-2" />
                      <a
                        href={selectedAttorney.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(selectedAttorney.reviews) && selectedAttorney.reviews.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium text-gray-900">Recent verified reviews</h4>
                  {selectedAttorney.reviews.slice(0, 3).map((review: any) => (
                    <div key={review.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{review.user?.name || 'Client review'}</span>
                        {review.isVerified && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center">
                        {renderStars(Number(review.rating || 0))}
                      </div>
                      {review.title && <p className="mt-2 text-sm font-medium text-gray-900">{review.title}</p>}
                      {review.review && <p className="mt-1 text-sm text-gray-600">{review.review}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button className="btn-primary w-full">
                  Request Introduction
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Attorney</h3>
              <p className="text-gray-600">
                Click on an attorney to view detailed information and contact options.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
