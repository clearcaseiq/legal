import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { askAICopilot, analyzeDocument, checkSOL, simulateSettlement } from '../lib/api'
import { 
  MessageCircle, 
  FileText, 
  Clock, 
  Calculator,
  Upload,
  Send,
  Bot,
  User,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  confidence?: number
  sources?: string[]
  suggestions?: string[]
}

interface DocumentAnalysis {
  summary: string
  keyPoints: string[]
  recommendations: string[]
  extractedData: any
  confidence: number
}

export default function AICopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'sol' | 'calculator'>('chat')
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [solResult, setSolResult] = useState<any>(null)
  const [settlementSimulation, setSettlementSimulation] = useState<any>(null)

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'ai',
      content: "Hi! I'm your AI Legal Copilot. I can help you understand your case, analyze documents, check statute of limitations, and estimate settlement values. What would you like to know?",
      timestamp: new Date().toISOString(),
      confidence: 1.0,
      suggestions: [
        'Do I still have time to file?',
        'What is my case worth?',
        'What documents do I need?',
        'Do I need a lawyer?'
      ]
    }
    setMessages([welcomeMessage])
  }, [])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await askAICopilot(inputMessage)
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: response.answer,
        timestamp: response.timestamp,
        confidence: response.confidence,
        sources: response.sources,
        suggestions: response.suggestions
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Failed to get AI response:', error)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentUpload = async () => {
    if (!uploadedFile) return

    setIsLoading(true)
    try {
      const content = await readFileContent(uploadedFile)
      const analysis = await analyzeDocument({
        documentType: getDocumentType(uploadedFile.name),
        content,
        fileName: uploadedFile.name
      })
      setDocumentAnalysis(analysis)
    } catch (error) {
      console.error('Failed to analyze document:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSOLCheck = async () => {
    const incidentDate = (document.getElementById('incidentDate') as HTMLInputElement)?.value
    const venue = (document.getElementById('venue') as HTMLInputElement)?.value
    const caseType = (document.getElementById('caseType') as HTMLSelectElement)?.value

    if (!incidentDate || !venue || !caseType) {
      alert('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const result = await checkSOL({ incidentDate, venue, caseType })
      setSolResult(result)
    } catch (error) {
      console.error('Failed to check SOL:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettlementSimulation = async () => {
    const formData = {
      medicalBills: (document.getElementById('medicalBills') as HTMLInputElement)?.value,
      lostWages: (document.getElementById('lostWages') as HTMLInputElement)?.value,
      painSuffering: (document.getElementById('painSuffering') as HTMLInputElement)?.value,
      liability: (document.getElementById('liability') as HTMLInputElement)?.value,
      venue: (document.getElementById('venueSim') as HTMLInputElement)?.value,
      caseType: (document.getElementById('caseTypeSim') as HTMLSelectElement)?.value,
      treatmentLength: (document.getElementById('treatmentLength') as HTMLInputElement)?.value
    }

    setIsLoading(true)
    try {
      const result = await simulateSettlement(formData)
      setSettlementSimulation(result)
    } catch (error) {
      console.error('Failed to simulate settlement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const getDocumentType = (fileName: string): string => {
    if (fileName.toLowerCase().includes('medical')) return 'medical_record'
    if (fileName.toLowerCase().includes('police')) return 'police_report'
    if (fileName.toLowerCase().includes('insurance')) return 'insurance_correspondence'
    return 'general_document'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI Legal Copilot
        </h1>
        <p className="text-xl text-gray-600">
          Get instant answers, analyze documents, and understand your legal options
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'chat', label: 'Ask Questions', icon: MessageCircle },
            { id: 'documents', label: 'Document Analysis', icon: FileText },
            { id: 'sol', label: 'Statute Check', icon: Clock },
            { id: 'calculator', label: 'Settlement Calculator', icon: Calculator }
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

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Messages */}
          <div className="lg:col-span-2">
            <div className="card h-96 overflow-y-auto">
              <div className="space-y-4 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-xs lg:max-w-md ${
                      message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-primary-600 text-white ml-2' 
                          : 'bg-gray-200 text-gray-600 mr-2'
                      }`}>
                        {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        {message.confidence && (
                          <div className="text-xs mt-1 opacity-75">
                            Confidence: {Math.round(message.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex max-w-xs lg:max-w-md">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 text-gray-600 mr-2 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className="flex space-x-2 mt-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about your case..."
                className="flex-1 input"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="btn-primary"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Try asking:</h4>
                <div className="flex flex-wrap gap-2">
                  {messages[0].suggestions?.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(suggestion)}
                      className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                AI Insights
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>I can analyze legal documents and extract key information</span>
                </div>
                <div className="flex items-start">
                  <Clock className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Check statute of limitations for your specific case</span>
                </div>
                <div className="flex items-start">
                  <Calculator className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Estimate settlement values based on similar cases</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('documents')}
                  className="w-full btn-outline text-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Analyze Document
                </button>
                <button
                  onClick={() => setActiveTab('sol')}
                  className="w-full btn-outline text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Check Time Limits
                </button>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="w-full btn-outline text-sm"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Analysis Tab */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Document
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.txt,.doc,.docx"
                  className="input"
                />
              </div>
              <button
                onClick={handleDocumentUpload}
                disabled={!uploadedFile || isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Document'}
              </button>
            </div>
          </div>

          {documentAnalysis && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">{documentAnalysis.summary}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Points</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {documentAnalysis.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {documentAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500">
                  Confidence: {Math.round(documentAnalysis.confidence * 100)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statute of Limitations Tab */}
      {activeTab === 'sol' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check Time Limits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Date *
                </label>
                <input
                  id="incidentDate"
                  type="date"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue (State) *
                </label>
                <input
                  id="venue"
                  type="text"
                  placeholder="e.g., CA, NY, TX"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Type *
                </label>
                <select id="caseType" className="input">
                  <option value="">Select case type</option>
                  <option value="personal_injury">Personal Injury</option>
                  <option value="medical_malpractice">Medical Malpractice</option>
                  <option value="property_damage">Property Damage</option>
                  <option value="product_liability">Product Liability</option>
                </select>
              </div>
              
              <button
                onClick={handleSOLCheck}
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Checking...' : 'Check Statute of Limitations'}
              </button>
            </div>
          </div>

          {solResult && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  solResult.status === 'safe' ? 'bg-green-50 border border-green-200' :
                  solResult.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    {solResult.status === 'safe' ? 
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" /> :
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    }
                    <span className={`font-medium ${
                      solResult.status === 'safe' ? 'text-green-800' :
                      solResult.status === 'warning' ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                      {solResult.status === 'safe' ? 'Time Available' : 
                       solResult.status === 'warning' ? 'Time Running Out' : 'Time Expired'}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${
                    solResult.status === 'safe' ? 'text-green-700' :
                    solResult.status === 'warning' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {solResult.yearsRemaining > 0 ? 
                      `${solResult.yearsRemaining.toFixed(1)} years remaining` :
                      'Statute of limitations has expired'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Incident Date:</span>
                    <div className="text-gray-600">{formatDate(solResult.incidentDate)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Expires:</span>
                    <div className="text-gray-600">{formatDate(solResult.expiresAt)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Days Remaining:</span>
                    <div className="text-gray-600">{solResult.daysRemaining}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Rule:</span>
                    <div className="text-gray-600">{solResult.rule.years} years</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {solResult.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <ArrowRight className="h-4 w-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
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

      {/* Settlement Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Calculator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Bills ($)
                </label>
                <input
                  id="medicalBills"
                  type="number"
                  placeholder="0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lost Wages ($)
                </label>
                <input
                  id="lostWages"
                  type="number"
                  placeholder="0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pain & Suffering ($)
                </label>
                <input
                  id="painSuffering"
                  type="number"
                  placeholder="0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Liability (%) 
                </label>
                <input
                  id="liability"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue
                </label>
                <input
                  id="venueSim"
                  type="text"
                  placeholder="e.g., CA, NY, TX"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Type
                </label>
                <select id="caseTypeSim" className="input">
                  <option value="personal_injury">Personal Injury</option>
                  <option value="medical_malpractice">Medical Malpractice</option>
                  <option value="auto_accident">Auto Accident</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treatment Length (months)
                </label>
                <input
                  id="treatmentLength"
                  type="number"
                  placeholder="6"
                  className="input"
                />
              </div>
              
              <button
                onClick={handleSettlementSimulation}
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Calculating...' : 'Calculate Settlement'}
              </button>
            </div>
          </div>

          {settlementSimulation && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Estimate</h3>
              <div className="space-y-4">
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {formatCurrency(settlementSimulation.final)}
                  </div>
                  <div className="text-sm text-gray-600">Estimated Settlement Value</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Range:</span>
                    <div className="text-gray-600">
                      {formatCurrency(settlementSimulation.range.low)} - {formatCurrency(settlementSimulation.range.high)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Base Calculation:</span>
                    <div className="text-gray-600">{formatCurrency(settlementSimulation.base)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Liability Adjustment:</span>
                    <div className="text-gray-600">{formatCurrency(settlementSimulation.liability)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Venue Factor:</span>
                    <div className="text-gray-600">{formatCurrency(settlementSimulation.venue)}</div>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Disclaimer:</p>
                      <p>This is an estimate based on similar cases. Actual settlement values may vary significantly based on specific circumstances, evidence quality, and negotiation outcomes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div className="bg-primary-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Need More Personalized Help?
        </h3>
        <p className="text-gray-600 mb-4">
          Our AI provides general guidance. For specific legal advice, consult with a qualified attorney.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/attorneys-enhanced" state={{ from: '/ai-copilot' }} className="btn-primary">
            Find Attorneys
          </Link>
          <Link to="/assess" className="btn-outline">
            Start Assessment
          </Link>
        </div>
      </div>
    </div>
  )
}
