import { useState, useEffect } from 'react'
import { 
  User, 
  Star, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Settings, 
  Upload, 
  Edit, 
  Plus, 
  Trash2,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface AttorneyProfile {
  id: string
  bio: string
  photoUrl: string
  specialties: string[]
  languages: string[]
  yearsExperience: number
  totalCases: number
  totalSettlements: number
  averageSettlement: number
  successRate: number
  verifiedVerdicts: any[]
  isFeatured: boolean
  boostLevel: number
  totalReviews: number
  averageRating: number
}

interface BoostOption {
  level: number
  name: string
  price: number
  duration: number
  description: string
  features: string[]
}

export default function AttorneyProfile() {
  const [profile, setProfile] = useState<AttorneyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([])
  const [newVerdict, setNewVerdict] = useState({
    caseType: '',
    settlementAmount: '',
    caseDescription: '',
    date: '',
    venue: ''
  })

  useEffect(() => {
    loadProfile()
    loadBoostOptions()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      // Mock data - will be replaced with actual API call
      const mockProfile: AttorneyProfile = {
        id: '1',
        bio: 'Experienced personal injury attorney with 15 years of practice. Dedicated to helping clients get the compensation they deserve.',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        specialties: ['Personal Injury', 'Auto Accidents', 'Premises Liability', 'Medical Malpractice'],
        languages: ['English', 'Spanish'],
        yearsExperience: 15,
        totalCases: 250,
        totalSettlements: 25000000,
        averageSettlement: 100000,
        successRate: 92,
        verifiedVerdicts: [
          {
            caseType: 'Auto Accident',
            settlementAmount: 2500000,
            description: 'Multi-vehicle accident resulting in severe injuries',
            date: '2023-01-15',
            venue: 'Los Angeles County',
            status: 'verified'
          },
          {
            caseType: 'Premises Liability',
            settlementAmount: 1800000,
            description: 'Slip and fall at commercial property',
            date: '2022-08-22',
            venue: 'Orange County',
            status: 'verified'
          }
        ],
        isFeatured: true,
        boostLevel: 3,
        totalReviews: 45,
        averageRating: 4.8
      }
      
      setProfile(mockProfile)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBoostOptions = async () => {
    const options: BoostOption[] = [
      {
        level: 1,
        name: 'Basic Boost',
        price: 99,
        duration: 30,
        description: 'Slight increase in visibility for 30 days',
        features: ['10% visibility boost', 'Priority in search results', 'Featured badge']
      },
      {
        level: 2,
        name: 'Standard Boost',
        price: 199,
        duration: 30,
        description: 'Moderate increase in visibility for 30 days',
        features: ['25% visibility boost', 'Top placement in results', 'Featured badge', 'Profile highlighting']
      },
      {
        level: 3,
        name: 'Premium Boost',
        price: 399,
        duration: 30,
        description: 'Maximum visibility boost for 30 days',
        features: ['50% visibility boost', 'Exclusive top placement', 'Premium badge', 'Profile highlighting', 'Email marketing inclusion']
      },
      {
        level: 4,
        name: 'Elite Boost',
        price: 699,
        duration: 30,
        description: 'Elite placement with exclusive benefits',
        features: ['75% visibility boost', 'Exclusive elite placement', 'Elite badge', 'Full profile highlighting', 'Email marketing inclusion', 'Direct lead routing']
      },
      {
        level: 5,
        name: 'Champion Boost',
        price: 999,
        duration: 30,
        description: 'Ultimate visibility with all premium features',
        features: ['100% visibility boost', 'Champion placement', 'Champion badge', 'Full profile highlighting', 'Email marketing inclusion', 'Direct lead routing', 'Priority support']
      }
    ]
    setBoostOptions(options)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const handleSaveProfile = async () => {
    // Save profile changes
    setEditing(false)
  }

  const handleAddVerdict = async () => {
    // Add new verified verdict
    if (newVerdict.caseType && newVerdict.settlementAmount) {
      const verdict = {
        ...newVerdict,
        settlementAmount: parseInt(newVerdict.settlementAmount),
        status: 'pending_verification'
      }
      
      if (profile) {
        setProfile({
          ...profile,
          verifiedVerdicts: [...profile.verifiedVerdicts, verdict]
        })
      }
      
      setNewVerdict({
        caseType: '',
        settlementAmount: '',
        caseDescription: '',
        date: '',
        venue: ''
      })
    }
  }

  const handlePurchaseBoost = async (boostLevel: number) => {
    // Purchase boost
    console.log('Purchasing boost level:', boostLevel)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-lg text-gray-600">Loading your profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Profile Not Found</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load your attorney profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Attorney Profile</h1>
          <p className="mt-2 text-gray-600">Manage your professional profile and reputation</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setEditing(!editing)}
            className="btn-secondary"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button className="btn-primary">
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <img
              src={profile.photoUrl}
              alt="Profile"
              className="h-32 w-32 rounded-full object-cover"
            />
            {editing && (
              <button className="mt-2 w-full btn-secondary text-sm">
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
              </button>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
              {profile.isFeatured && (
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">Featured</span>
                </div>
              )}
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                profile.boostLevel > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                Boost Level {profile.boostLevel}
              </span>
            </div>
            {editing ? (
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Write your professional bio..."
              />
            ) : (
              <p className="text-gray-600">{profile.bio}</p>
            )}
            
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.specialties.map((specialty, index) => (
                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {specialty}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{profile.averageRating}</div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.floor(profile.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <div className="text-sm text-gray-500">{profile.totalReviews} reviews</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'performance', name: 'Performance', icon: TrendingUp },
            { id: 'verdicts', name: 'Verified Verdicts', icon: Award },
            { id: 'boost', name: 'Featured Placement', icon: Zap }
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
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                  {editing ? (
                    <input
                      type="number"
                      value={profile.yearsExperience}
                      onChange={(e) => setProfile({ ...profile, yearsExperience: parseInt(e.target.value) })}
                      className="form-input"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.yearsExperience} years</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
                  {editing ? (
                    <div className="space-y-2">
                      {profile.languages.map((language, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={language}
                            onChange={(e) => {
                              const newLanguages = [...profile.languages]
                              newLanguages[index] = e.target.value
                              setProfile({ ...profile, languages: newLanguages })
                            }}
                            className="form-input flex-1"
                          />
                          <button
                            onClick={() => {
                              const newLanguages = profile.languages.filter((_, i) => i !== index)
                              setProfile({ ...profile, languages: newLanguages })
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setProfile({ ...profile, languages: [...profile.languages, ''] })}
                        className="btn-secondary text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Language
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((language, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {language}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {editing && (
                  <div className="pt-4">
                    <button onClick={handleSaveProfile} className="btn-primary">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{profile.totalCases}</div>
                  <div className="text-sm text-blue-700">Total Cases</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatPercentage(profile.successRate)}</div>
                  <div className="text-sm text-green-700">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(profile.averageSettlement)}</div>
                  <div className="text-sm text-purple-700">Avg Settlement</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(profile.totalSettlements)}</div>
                  <div className="text-sm text-yellow-700">Total Settlements</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Case Volume</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cases</span>
                  <span className="font-semibold">{profile.totalCases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cases This Year</span>
                  <span className="font-semibold">{Math.floor(profile.totalCases * 0.3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Cases</span>
                  <span className="font-semibold">{Math.floor(profile.totalCases * 0.1)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Settlements</span>
                  <span className="font-semibold">{formatCurrency(profile.totalSettlements)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Settlement</span>
                  <span className="font-semibold">{formatCurrency(profile.averageSettlement)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Largest Settlement</span>
                  <span className="font-semibold">{formatCurrency(profile.averageSettlement * 5)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Success Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold">{formatPercentage(profile.successRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client Satisfaction</span>
                  <span className="font-semibold">{profile.averageRating}/5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Repeat Clients</span>
                  <span className="font-semibold">35%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verdicts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Verified Verdicts & Settlements</h3>
            <button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Verdict
            </button>
          </div>

          {/* Add New Verdict Form */}
          <div className="card">
            <h4 className="text-md font-medium text-gray-900 mb-4">Add New Verdict</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                <input
                  type="text"
                  value={newVerdict.caseType}
                  onChange={(e) => setNewVerdict({ ...newVerdict, caseType: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Auto Accident"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Settlement Amount</label>
                <input
                  type="number"
                  value={newVerdict.settlementAmount}
                  onChange={(e) => setNewVerdict({ ...newVerdict, settlementAmount: e.target.value })}
                  className="form-input"
                  placeholder="2500000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Description</label>
                <textarea
                  value={newVerdict.caseDescription}
                  onChange={(e) => setNewVerdict({ ...newVerdict, caseDescription: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Brief description of the case..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newVerdict.date}
                  onChange={(e) => setNewVerdict({ ...newVerdict, date: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={newVerdict.venue}
                  onChange={(e) => setNewVerdict({ ...newVerdict, venue: e.target.value })}
                  className="form-input"
                  placeholder="Los Angeles County"
                />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={handleAddVerdict} className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Verdict
              </button>
            </div>
          </div>

          {/* Verdicts List */}
          <div className="space-y-4">
            {profile.verifiedVerdicts.map((verdict, index) => (
              <div key={index} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-md font-medium text-gray-900">{verdict.caseType}</h4>
                      <span className="text-2xl font-bold text-primary-600">{formatCurrency(verdict.settlementAmount)}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        verdict.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {verdict.status === 'verified' ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{verdict.description}</p>
                    <div className="flex space-x-4 text-sm text-gray-500">
                      <span>Date: {verdict.date}</span>
                      <span>Venue: {verdict.venue}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'boost' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Featured Placement Options</h3>
                <p className="text-gray-600">Increase your visibility and get more leads</p>
              </div>
              {profile.isFeatured && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Current Boost Level</div>
                  <div className="text-2xl font-bold text-purple-600">Level {profile.boostLevel}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boostOptions.map((option) => (
                <div key={option.level} className={`border-2 rounded-lg p-6 ${
                  option.level === profile.boostLevel ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{option.name}</h4>
                    {option.level === profile.boostLevel && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(option.price)}</div>
                    <div className="text-sm text-gray-500">for {option.duration} days</div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{option.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handlePurchaseBoost(option.level)}
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      option.level === profile.boostLevel
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : option.level > profile.boostLevel
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={option.level <= profile.boostLevel}
                  >
                    {option.level === profile.boostLevel ? 'Current Plan' : 
                     option.level < profile.boostLevel ? 'Downgrade' : 'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
