import { useState, useEffect } from 'react'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  Shield, 
  DollarSign, 
  Clock, 
  Search, 
  Filter, 
  Plus,
  Eye,
  MessageSquare,
  Calendar,
  TrendingUp,
  CheckCircle
} from 'lucide-react'
import Tooltip from '../components/Tooltip'

interface MedicalProvider {
  id: string
  name: string
  specialty: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  acceptsLien: boolean
  lienTerms: any
  averageLienRate: number
  isVerified: boolean
  rating: number
  totalReviews: number
  serviceRadius: number
}

interface ProviderReferral {
  id: string
  providerId: string
  referralType: string
  status: string
  referralDate: string
  notes: string
  provider: MedicalProvider
}

export default function MedicalProviders() {
  const [providers, setProviders] = useState<MedicalProvider[]>([])
  const [referrals, setReferrals] = useState<ProviderReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('providers')
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    specialty: '',
    city: '',
    state: '',
    acceptsLien: false,
    isVerified: false,
    minRating: 0
  })

  useEffect(() => {
    loadProviders()
    loadReferrals()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      // Mock data - will be replaced with actual API call
      const mockProviders: MedicalProvider[] = [
        {
          id: '1',
          name: 'Dr. Michael Chen',
          specialty: 'Orthopedics',
          address: '456 Medical Center Dr',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          phone: '(555) 987-6543',
          email: 'dr.chen@ortho.com',
          acceptsLien: true,
          lienTerms: {
            rate: 15,
            terms: 'Payment due upon settlement or verdict',
            minimumAmount: 10000
          },
          averageLienRate: 15,
          isVerified: true,
          rating: 4.8,
          totalReviews: 156,
          serviceRadius: 25
        },
        {
          id: '2',
          name: 'Dr. Maria Rodriguez',
          specialty: 'Physical Therapy',
          address: '789 Rehab St',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90211',
          phone: '(555) 456-7890',
          email: 'dr.rodriguez@pt.com',
          acceptsLien: true,
          lienTerms: {
            rate: 12,
            terms: 'Payment due upon settlement',
            minimumAmount: 5000
          },
          averageLienRate: 12,
          isVerified: true,
          rating: 4.9,
          totalReviews: 89,
          serviceRadius: 30
        },
        {
          id: '3',
          name: 'Dr. James Wilson',
          specialty: 'Chiropractic',
          address: '321 Wellness Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90212',
          phone: '(555) 234-5678',
          email: 'dr.wilson@chiro.com',
          acceptsLien: false,
          lienTerms: null,
          averageLienRate: 0,
          isVerified: true,
          rating: 4.6,
          totalReviews: 67,
          serviceRadius: 20
        }
      ]
      
      setProviders(mockProviders)
    } catch (err) {
      console.error('Failed to load providers:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadReferrals = async () => {
    try {
      // Mock referrals data
      const mockReferrals: ProviderReferral[] = [
        {
          id: '1',
          providerId: '1',
          referralType: 'treatment',
          status: 'pending',
          referralDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Patient needs orthopedic evaluation for back injury',
          provider: providers[0] || {} as MedicalProvider
        }
      ]
      
      setReferrals(mockReferrals)
    } catch (err) {
      console.error('Failed to load referrals:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const filteredProviders = providers.filter(provider => {
    if (searchTerm && !provider.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !provider.city.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (filters.specialty && provider.specialty !== filters.specialty) return false
    if (filters.city && provider.city !== filters.city) return false
    if (filters.state && provider.state !== filters.state) return false
    if (filters.acceptsLien && !provider.acceptsLien) return false
    if (filters.isVerified && !provider.isVerified) return false
    if (filters.minRating && provider.rating < filters.minRating) return false
    return true
  })

  const specialties = [...new Set(providers.map(p => p.specialty))]
  const cities = [...new Set(providers.map(p => p.city))]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-lg text-gray-600">Loading medical providers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Medical Providers</h1>
          <p className="mt-2 text-gray-600">Find and coordinate with lien-based medical providers</p>
        </div>
        <div className="flex space-x-4">
          <button className="btn-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </button>
          <button className="btn-primary">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'providers', name: 'Provider Directory', icon: MapPin },
            { id: 'referrals', name: 'My Referrals', icon: Calendar },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="card">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search providers by name, specialty, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <select
                  value={filters.specialty}
                  onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.acceptsLien}
                    onChange={(e) => setFilters({ ...filters, acceptsLien: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Accepts Lien</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isVerified}
                    onChange={(e) => setFilters({ ...filters, isVerified: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified</span>
                </label>
              </div>
            </div>
          </div>

          {/* Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div key={provider.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                    <p className="text-sm text-gray-600">{provider.specialty}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {provider.isVerified && (
                      <Tooltip content="Verified Provider">
                        <Shield className="h-4 w-4 text-green-500" />
                      </Tooltip>
                    )}
                    {provider.acceptsLien && (
                      <Tooltip content="Accepts Lien">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {provider.address}, {provider.city}, {provider.state} {provider.zipCode}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {provider.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {provider.email}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">{provider.rating}</span>
                    <span className="ml-1 text-sm text-gray-500">({provider.totalReviews} reviews)</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {provider.serviceRadius} mi radius
                  </div>
                </div>

                {provider.acceptsLien && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="text-sm font-medium text-blue-900">Lien Terms</div>
                    <div className="text-sm text-blue-700">
                      {provider.averageLienRate}% rate • Min: {formatCurrency(provider.lienTerms?.minimumAmount || 0)}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button className="flex-1 btn-primary text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Refer Patient
                  </button>
                  <button className="btn-secondary text-sm">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button className="btn-secondary text-sm">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProviders.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No providers found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Referrals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{referral.provider.name}</div>
                          <div className="text-sm text-gray-500">{referral.provider.specialty}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.referralType.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(referral.referralDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          referral.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          referral.status === 'declined' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {referral.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {referral.notes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Referrals</p>
                  <p className="text-2xl font-semibold text-gray-900">{referrals.length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Accepted</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {referrals.filter(r => r.status === 'accepted').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Response Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">85%</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Response</p>
                  <p className="text-2xl font-semibold text-gray-900">2.3 days</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Specialty Breakdown</h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {specialties.map(specialty => {
                  const specialtyReferrals = referrals.filter(r => r.provider.specialty === specialty).length
                  const percentage = referrals.length > 0 ? (specialtyReferrals / referrals.length) * 100 : 0
                  
                  return (
                    <div key={specialty} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{specialty}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">{specialtyReferrals}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
