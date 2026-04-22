import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { searchAttorneys, getAttorneyProfile, getAttorneyAvailabilityProfile } from '../lib/api'
import { 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Calendar,
  CheckCircle,
  Users,
  Award,
  MessageSquare,
  BookOpen,
  Search,
  ArrowLeft
} from 'lucide-react'

interface Attorney {
  id: string
  name: string
  email?: string
  phone?: string
  specialties: string[]
  venues: string[]
  profile?: any
  meta?: any
  isVerified: boolean
  isActive: boolean
  responseTimeHours: number
  responseBadge?: string
  averageRating: number
  totalReviews: number
  verifiedReviewCount?: number
}

export default function AttorneysEnhanced() {
  const [attorneys, setAttorneys] = useState<Attorney[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAttorney, setSelectedAttorney] = useState<Attorney | null>(null)
  const [selectedAttorneyProfile, setSelectedAttorneyProfile] = useState<any | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [searchForm, setSearchForm] = useState({ venue: '', claim_type: '', limit: 20 })
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const location = useLocation()
  const stateFrom = (location.state as { from?: string })?.from
  const fromPath = (stateFrom && stateFrom !== '/attorneys-enhanced' ? stateFrom : null) ?? (localStorage.getItem('auth_token') ? '/dashboard' : '/')

  useEffect(() => {
    loadAttorneys()
  }, [])

  const loadAttorneys = async (params?: { venue?: string; claim_type?: string; limit?: number }) => {
    const p = params ?? searchForm
    try {
      setLoading(true)
      setError(null)
      const data = await searchAttorneys({
        venue: p.venue || '',
        claim_type: p.claim_type || '',
        limit: p.limit || 20
      })
      
      const rawList = Array.isArray(data) ? data : (data?.attorneys ?? [])
      
      // Map API response to Attorney interface (API returns attorney_id, rating, reviews_count)
      const parsedAttorneys = rawList.map((attorney: any) => {
        const specialties = typeof attorney.specialties === 'string'
          ? (() => { try { return JSON.parse(attorney.specialties) } catch { return [] } })()
          : (attorney.specialties ?? [])
        const venues = typeof attorney.venues === 'string'
          ? (() => { try { return JSON.parse(attorney.venues) } catch { return [] } })()
          : (attorney.venues ?? [])
        const profile = attorney.profile
          ? (typeof attorney.profile === 'string' ? (() => { try { return JSON.parse(attorney.profile) } catch { return null } })() : attorney.profile)
          : null
        const meta = attorney.meta
          ? (typeof attorney.meta === 'string' ? (() => { try { return JSON.parse(attorney.meta) } catch { return null } })() : attorney.meta)
          : null
        return {
          id: attorney.attorney_id ?? attorney.id,
          name: attorney.name,
          email: attorney.email,
          phone: attorney.phone,
          specialties: Array.isArray(specialties) ? specialties : [],
          venues: Array.isArray(venues) ? venues : [],
          profile,
          meta,
          isVerified: attorney.isVerified ?? false,
          isActive: attorney.isActive ?? true,
          responseTimeHours: attorney.responseTimeHours ?? 24,
          responseBadge: attorney.responseBadge,
          averageRating: attorney.averageRating ?? attorney.rating ?? 0,
          totalReviews: attorney.totalReviews ?? attorney.reviews_count ?? 0,
          verifiedReviewCount: attorney.verifiedReviewCount ?? 0,
        }
      })
      
      setAttorneys(parsedAttorneys)
    } catch (err) {
      console.error('Failed to load attorneys:', err)
      setError('Failed to load attorneys')
    } finally {
      setLoading(false)
    }
  }

  const handleBookConsultation = async (attorney: Attorney) => {
    setSelectedAttorney(attorney)
    setShowBookingModal(true)
    
    // Load availability for today
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
    await loadAvailability(attorney.id, today)
  }

  const handleViewProfile = async (attorney: Attorney) => {
    try {
      setSelectedAttorney(attorney)
      setLoadingProfile(true)
      setShowProfileModal(true)
      const profile = await getAttorneyProfile(attorney.id)
      setSelectedAttorneyProfile(profile)
    } catch (err) {
      console.error('Failed to load attorney profile:', err)
      setSelectedAttorneyProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadAvailability = async (attorneyId: string, date: string) => {
    try {
      setLoadingSlots(true)
      const data = await getAttorneyAvailabilityProfile(attorneyId, date)
      setAvailableSlots(data.slots || [])
    } catch (err) {
      console.error('Failed to load availability:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    if (selectedAttorney) {
      await loadAvailability(selectedAttorney.id, date)
    }
  }

  const getSpecialtyDisplay = (specialties: string[]) => {
    const specialtyMap: { [key: string]: string } = {
      'auto': 'Auto Accidents',
      'premises': 'Premises Liability',
      'medmal': 'Medical Malpractice',
      'product': 'Product Liability',
      'personal_injury': 'Personal Injury',
      'medical_malpractice': 'Medical Malpractice'
    }
    return specialties.map(s => specialtyMap[s] || s).join(', ')
  }

  const getResponseTimeDisplay = (hours: number) => {
    if (hours < 24) return `Typically responds in ${hours} hours`
    if (hours < 48) return 'Typically responds within 2 days'
    return 'Typically responds within 3 days'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Link
          to={fromPath}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attorneys...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Link
          to={fromPath}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => { void loadAttorneys() }} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back link - returns to previous page (Results, Dashboard, Home, etc.) */}
      <Link
        to={fromPath}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Link>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Find Your Perfect Attorney
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Connect with verified personal injury attorneys in your area. 
          Book free consultations and get expert legal guidance for your case.
        </p>
      </div>

      {/* Search Form */}
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadAttorneys(searchForm)
          }}
          className="flex flex-wrap gap-4 items-end"
        >
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={searchForm.venue}
              onChange={(e) => setSearchForm((prev) => ({ ...prev, venue: e.target.value }))}
              className="input w-full"
            >
              <option value="">Any State</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
            <select
              value={searchForm.claim_type}
              onChange={(e) => setSearchForm((prev) => ({ ...prev, claim_type: e.target.value }))}
              className="input w-full"
            >
              <option value="">Any Type</option>
              <option value="auto">Auto Accident</option>
              <option value="slip_and_fall">Slip-and-Fall</option>
              <option value="medmal">Medical Malpractice</option>
              <option value="product">Product Liability</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search Attorneys'}
          </button>
        </form>
      </div>

      {/* Attorney Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attorneys.map((attorney) => (
          <div key={attorney.id} className="card hover:shadow-lg transition-shadow">
            {/* Attorney Photo & Badges */}
            <div className="relative mb-4">
              <div className="aspect-square w-24 h-24 mx-auto rounded-full bg-gray-200 overflow-hidden">
                {attorney.profile?.photo ? (
                  <img 
                    src={attorney.profile.photo} 
                    alt={attorney.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                    {attorney.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
              
              {attorney.isVerified && (
                <div className="absolute top-0 right-0 bg-green-500 text-white p-1 rounded-full">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Attorney Info */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {attorney.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {getSpecialtyDisplay(attorney.specialties)}
              </p>
              
              {/* Rating */}
              <div className="flex items-center justify-center mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= attorney.averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {attorney.averageRating.toFixed(1)} ({attorney.totalReviews} reviews)
                </span>
              </div>
            </div>

            {/* Response Metrics */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                {attorney.responseBadge || getResponseTimeDisplay(attorney.responseTimeHours)}
              </div>
              
              {attorney.profile?.languages && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  Speaks: {attorney.profile.languages.join(', ')}
                </div>
              )}
              
              {attorney.profile?.achievements && attorney.profile.achievements.length > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <Award className="h-4 w-4 mr-2" />
                  {attorney.profile.achievements[0]}
                </div>
              )}
            </div>

            {/* Consultation Types */}
            {attorney.profile?.consultationTypes && (
              <div className="flex items-center justify-center space-x-4 mb-4 text-sm text-gray-600">
                {attorney.profile.consultationTypes.includes('in_person') && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    In-Person
                  </div>
                )}
                {attorney.profile.consultationTypes.includes('phone') && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone
                  </div>
                )}
                {attorney.profile.consultationTypes.includes('video') && (
                  <div className="flex items-center">
                    <Video className="h-4 w-4 mr-1" />
                    Video
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleBookConsultation(attorney)}
                className="w-full btn-primary"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book Free Consultation
              </button>
              
              <button
                onClick={() => handleViewProfile(attorney)}
                className="w-full btn-outline"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Profile
              </button>
            </div>

            {/* Free Consultation Badge */}
            {attorney.profile?.freeConsultation && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Free Consultation
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedAttorney && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Book Consultation with {selectedAttorney.name}
                </h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Date Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
                />
              </div>

              {/* Available Slots */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Times
                </label>
                {loadingSlots ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.slice(0, 6).map((slot, index) => (
                      <button
                        key={index}
                        className="p-2 text-sm border border-gray-300 rounded hover:border-primary-500 hover:bg-primary-50"
                        onClick={() => {
                          // Handle slot selection
                          console.log('Selected slot:', slot)
                        }}
                      >
                        {new Date(slot.start).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No available slots for this date</p>
                )}
              </div>

              {/* Consultation Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Type
                </label>
                <select className="input">
                  {selectedAttorney.profile?.consultationTypes?.includes('video') && (
                    <option value="video">Video Call</option>
                  )}
                  {selectedAttorney.profile?.consultationTypes?.includes('phone') && (
                    <option value="phone">Phone Call</option>
                  )}
                  {selectedAttorney.profile?.consultationTypes?.includes('in_person') && (
                    <option value="in_person">In-Person</option>
                  )}
                </select>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Brief description of your case..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button className="flex-1 btn-primary">
                  Book Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && selectedAttorney && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedAttorney.name}</h3>
                  <p className="text-sm text-gray-500">{selectedAttorneyProfile?.responseMetrics?.responseBadge || selectedAttorney.responseBadge || getResponseTimeDisplay(selectedAttorney.responseTimeHours)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    setSelectedAttorneyProfile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {loadingProfile ? (
                <div className="py-10 text-center text-gray-500">Loading profile...</div>
              ) : selectedAttorneyProfile ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-500">Average rating</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900">{Number(selectedAttorneyProfile.responseMetrics?.averageRating || selectedAttorney.averageRating || 0).toFixed(1)}</div>
                      <div className="mt-1 text-sm text-gray-500">{selectedAttorneyProfile.responseMetrics?.totalReviews || selectedAttorney.totalReviews || 0} reviews</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-500">Response badge</div>
                      <div className="mt-1 text-lg font-semibold text-brand-700">{selectedAttorneyProfile.responseMetrics?.responseBadge || selectedAttorney.responseBadge || 'Replies within 24h'}</div>
                      <div className="mt-1 text-sm text-gray-500">Average response time: {selectedAttorneyProfile.responseMetrics?.averageResponseTime || selectedAttorney.responseTimeHours || 24}h</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-500">Conversion quality</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">{selectedAttorneyProfile.responseMetrics?.conversionMetrics?.bookingRate ?? 0}% booked after acceptance</div>
                      <div className="mt-1 text-sm text-gray-500">{selectedAttorneyProfile.responseMetrics?.conversionMetrics?.verifiedReviews ?? 0} verified reviews</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">About</h4>
                    <p className="text-sm text-gray-600">{selectedAttorneyProfile.profile?.bio || selectedAttorneyProfile.profile?.headline || 'No profile summary yet.'}</p>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Verified Reviews</h4>
                    <div className="space-y-3">
                      {(selectedAttorneyProfile.reviews || []).length > 0 ? (
                        selectedAttorneyProfile.reviews.map((review: any) => (
                          <div key={review.id} className="rounded-lg border border-gray-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{review.user?.name || 'Client review'}</span>
                                  {review.isVerified && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Verified client
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${star <= Number(review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {review.title && <p className="mt-2 text-sm font-medium text-gray-900">{review.title}</p>}
                            {review.review && <p className="mt-1 text-sm text-gray-600">{review.review}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No reviews yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowProfileModal(false)
                        handleBookConsultation(selectedAttorney)
                      }}
                      className="btn-primary"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Consultation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500">Could not load this attorney profile.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-primary-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Can't Find What You're Looking For?
        </h2>
        <p className="text-gray-600 mb-6">
          Our team can help you find the perfect attorney for your specific case.
        </p>
        <Link to="/assess" className="btn-primary">
          Start Your Assessment
        </Link>
      </div>
    </div>
  )
}
