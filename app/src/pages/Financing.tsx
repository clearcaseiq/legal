import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  getFundingPartners, 
  calculateFundingCosts, 
  submitFundingRequest, 
  getMedicalProviders,
  getFundingRequests 
} from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { 
  DollarSign, 
  Clock, 
  Shield, 
  CheckCircle, 
  Star,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  Heart,
  Stethoscope,
  Calculator
} from 'lucide-react'

interface FundingPartner {
  id: string
  name: string
  minAmount: number
  maxAmount: number
  interestRate: number
  termMonths: number
  approvalRate: number
  fundingTime: string
  description: string
  logo: string
  monthlyPayment: number
}

interface MedicalProvider {
  id: string
  name: string
  specialty: string
  location: string
  acceptsLiens: boolean
  lienTerms: string
  specialties: string[]
  rating: number
  reviews: number
  photo: string
}

export default function Financing() {
  const [fundingPartners, setFundingPartners] = useState<FundingPartner[]>([])
  const [medicalProviders, setMedicalProviders] = useState<MedicalProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'funding' | 'medical' | 'calculator'>('funding')
  const [selectedPartner, setSelectedPartner] = useState<FundingPartner | null>(null)
  const [showCalculator, setShowCalculator] = useState(false)
  const [calculatorResult, setCalculatorResult] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [partnersData, providersData] = await Promise.all([
        getFundingPartners(),
        getMedicalProviders()
      ])
      setFundingPartners(partnersData.partners)
      setMedicalProviders(providersData.providers)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateFunding = async () => {
    const formData = {
      loanAmount: parseFloat((document.getElementById('loanAmount') as HTMLInputElement)?.value || '0'),
      interestRate: parseFloat((document.getElementById('interestRate') as HTMLInputElement)?.value || '0'),
      termMonths: parseInt((document.getElementById('termMonths') as HTMLInputElement)?.value || '0'),
      settlementAmount: parseFloat((document.getElementById('settlementAmount') as HTMLInputElement)?.value || '0')
    }

    if (formData.loanAmount <= 0 || formData.interestRate <= 0 || formData.termMonths <= 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const result = await calculateFundingCosts(formData)
      setCalculatorResult(result)
      setShowCalculator(true)
    } catch (error) {
      console.error('Failed to calculate funding costs:', error)
    }
  }

  const getApprovalRateColor = (rate: number) => {
    if (rate >= 0.75) return 'text-green-600'
    if (rate >= 0.60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getApprovalRateText = (rate: number) => {
    if (rate >= 0.75) return 'High Approval Rate'
    if (rate >= 0.60) return 'Good Approval Rate'
    return 'Moderate Approval Rate'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financing options...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Legal Financing Solutions
        </h1>
        <p className="text-xl text-gray-600">
          Access funds now, pay after your case settles. Get the treatment you need without financial stress.
        </p>
      </div>

      {/* Benefits Banner */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <DollarSign className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">No Upfront Costs</h3>
            <p className="text-sm text-gray-600">Get funding without paying anything upfront</p>
          </div>
          <div className="flex flex-col items-center">
            <Clock className="h-8 w-8 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Fast Approval</h3>
            <p className="text-sm text-gray-600">Get approved in 24-48 hours</p>
          </div>
          <div className="flex flex-col items-center">
            <Shield className="h-8 w-8 text-purple-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Risk-Free</h3>
            <p className="text-sm text-gray-600">Only pay if you win your case</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'funding', label: 'Pre-Settlement Funding', icon: DollarSign },
            { id: 'medical', label: 'Medical Liens', icon: Stethoscope },
            { id: 'calculator', label: 'Cost Calculator', icon: Calculator }
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
            </button>
          ))}
        </nav>
      </div>

      {/* Pre-Settlement Funding Tab */}
      {activeTab === 'funding' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pre-Settlement Funding Partners
            </h2>
            <p className="text-gray-600">
              Choose from our verified funding partners with competitive rates and fast approval
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {fundingPartners.map((partner) => (
              <div key={partner.id} className="card hover:shadow-lg transition-shadow">
                {/* Partner Logo & Header */}
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={partner.logo} 
                      alt={partner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
                  <p className="text-sm text-gray-600">{partner.description}</p>
                </div>

                {/* Key Metrics */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Funding Range</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(partner.minAmount)} - {formatCurrency(partner.maxAmount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interest Rate</span>
                    <span className="font-medium text-gray-900">{partner.interestRate}% APR</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Term</span>
                    <span className="font-medium text-gray-900">{partner.termMonths} months</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Payment</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(partner.monthlyPayment)}/mo
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Funding Time</span>
                    <span className="font-medium text-gray-900">{partner.fundingTime}</span>
                  </div>
                </div>

                {/* Approval Rate */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Approval Rate</span>
                    <span className={`text-sm font-medium ${getApprovalRateColor(partner.approvalRate)}`}>
                      {Math.round(partner.approvalRate * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${partner.approvalRate * 100}%` }}
                    ></div>
                  </div>
                  <p className={`text-xs mt-1 ${getApprovalRateColor(partner.approvalRate)}`}>
                    {getApprovalRateText(partner.approvalRate)}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setSelectedPartner(partner)}
                  className="w-full btn-primary"
                >
                  Apply for Funding
                </button>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How Pre-Settlement Funding Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Apply Online</h4>
                <p className="text-sm text-gray-600">Complete a simple application with your case details</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Quick Review</h4>
                <p className="text-sm text-gray-600">Get approved in 24-48 hours based on your case strength</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Receive Funds</h4>
                <p className="text-sm text-gray-600">Get your money deposited directly to your account</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-600 font-bold">4</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Pay After Settlement</h4>
                <p className="text-sm text-gray-600">Only repay if and when your case settles successfully</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Liens Tab */}
      {activeTab === 'medical' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Medical Providers with Lien-Based Treatment
            </h2>
            <p className="text-gray-600">
              Get the medical care you need now, pay after your case settles
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {medicalProviders.map((provider) => (
              <div key={provider.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={provider.photo} 
                      alt={provider.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                        <p className="text-sm text-gray-600">{provider.specialty}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 text-sm font-medium text-gray-900">{provider.rating}</span>
                        </div>
                        <p className="text-xs text-gray-500">({provider.reviews} reviews)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      {provider.location}
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Specialties</h4>
                      <div className="flex flex-wrap gap-1">
                        {provider.specialties.slice(0, 3).map((specialty, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Lien Terms</h4>
                      <p className="text-sm text-gray-600">{provider.lienTerms}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 btn-primary text-sm">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </button>
                      <button className="flex-1 btn-outline text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lien Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About Medical Liens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Benefits
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• No upfront medical costs</li>
                  <li>• Access to quality healthcare</li>
                  <li>• Payment only after settlement</li>
                  <li>• Reduced financial stress during recovery</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Shield className="h-5 w-5 text-blue-500 mr-2" />
                  Requirements
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Valid personal injury case</li>
                  <li>• Attorney representation</li>
                  <li>• Signed lien agreement</li>
                  <li>• Insurance information provided</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Cost Calculator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Amount ($)
                </label>
                <input
                  id="loanAmount"
                  type="number"
                  placeholder="10000"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interest Rate (% APR)
                </label>
                <input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  placeholder="18"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term (months)
                </label>
                <input
                  id="termMonths"
                  type="number"
                  placeholder="24"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Settlement ($) - Optional
                </label>
                <input
                  id="settlementAmount"
                  type="number"
                  placeholder="50000"
                  className="input"
                />
              </div>
              
              <button
                onClick={handleCalculateFunding}
                className="w-full btn-primary"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Costs
              </button>
            </div>
          </div>

          {calculatorResult && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Results</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-primary-50 rounded-lg">
                    <div className="text-lg font-bold text-primary-600">
                      {formatCurrency(calculatorResult.loanDetails.monthlyPayment)}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Payment</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(calculatorResult.costBreakdown.totalPayback)}
                    </div>
                    <div className="text-sm text-gray-600">Total Payback</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Amount:</span>
                    <span className="font-medium">{formatCurrency(calculatorResult.loanDetails.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Interest:</span>
                    <span className="font-medium">{formatCurrency(calculatorResult.costBreakdown.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Effective Rate:</span>
                    <span className="font-medium">{calculatorResult.costBreakdown.effectiveRate.toFixed(1)}%</span>
                  </div>
                </div>

                {calculatorResult.settlementAnalysis && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Settlement Impact</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Net After Repayment:</span>
                        <span className="font-medium">{formatCurrency(calculatorResult.settlementAnalysis.netAfterRepayment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">% of Settlement:</span>
                        <span className="font-medium">{calculatorResult.settlementAnalysis.percentageOfSettlement.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {calculatorResult.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <TrendingUp className="h-4 w-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Application Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Apply with {selectedPartner.name}
                </h3>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    You'll be redirected to {selectedPartner.name}'s secure application portal 
                    to complete your funding request.
                  </p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium text-gray-900">What you'll need:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Case details and attorney information</li>
                    <li>• Medical records and bills</li>
                    <li>• Insurance information</li>
                    <li>• Proof of income (if applicable)</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedPartner(null)}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // In a real app, redirect to partner's application portal
                      alert(`Redirecting to ${selectedPartner.name} application portal...`)
                      setSelectedPartner(null)
                    }}
                    className="flex-1 btn-primary"
                  >
                    Continue Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-primary-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Ready to Get Started?
        </h3>
        <p className="text-gray-600 mb-4">
          Don't let financial stress delay your recovery or legal case.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/assess" className="btn-primary">
            Start Assessment
          </Link>
          <Link to="/attorneys-enhanced" state={{ from: '/financing' }} className="btn-outline">
            Find Attorneys
          </Link>
        </div>
      </div>
    </div>
  )
}
