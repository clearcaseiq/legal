import { useState, useEffect } from 'react'
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, Target, FileText, Lightbulb } from 'lucide-react'
import { getChatGPTAnalysis, analyzeCaseWithChatGPT } from '../lib/api'

interface ChatGPTAnalysisProps {
  assessmentId: string
}

interface AnalysisData {
  assessmentId: string
  analysis: {
    caseStrength: {
      overall: number
      liability: number
      causation: number
      damages: number
      evidence: number
    }
    keyIssues: string[]
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    estimatedValue: {
      low: number
      medium: number
      high: number
    }
    timeline: string[]
    nextSteps: string[]
  }
  confidence: number
  analysisDate: string
}

export default function ChatGPTAnalysis({ assessmentId }: ChatGPTAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pollAttempts, setPollAttempts] = useState(0)

  useEffect(() => {
    if (assessmentId) loadAnalysis()
    else setLoading(false)
  }, [assessmentId])

  useEffect(() => {
    if (analysis || error) return
    if (pollAttempts >= 6) return
    const timer = setTimeout(() => {
      setPollAttempts(prev => prev + 1)
      loadAnalysis()
    }, 10000)
    return () => clearTimeout(timer)
  }, [analysis, error, pollAttempts])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getChatGPTAnalysis(assessmentId)
      if (response?.success && response?.data) {
        setAnalysis(response.data)
      } else {
        setError('')
      }
    } catch (err: any) {
      console.error('Error loading ChatGPT analysis:', err)
      const status = err.response?.status
      if (status === 404) {
        setError('')
      } else if (status === 401 || status === 403) {
        setError('Please log in to view your case analysis.')
      } else if (status === 500) {
        setError('Analysis data could not be loaded. Try generating a new analysis below.')
      } else {
        setError('Failed to load analysis. Please try refreshing the page.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAnalysis = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await analyzeCaseWithChatGPT(assessmentId)
      if (response?.success && response?.data) {
        setAnalysis(response.data)
      } else {
        setError('Analysis could not be generated. Please try again.')
      }
    } catch (err: any) {
      console.error('Error generating ChatGPT analysis:', err)
      const status = err.response?.status
      if (status === 403) {
        setError('Please log in to generate analysis.')
      } else {
        setError('Failed to generate analysis. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStrengthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const safeArray = (value: unknown): any[] => (Array.isArray(value) ? value : [])

  const analysisData = analysis?.analysis || {
    caseStrength: {},
    keyIssues: [],
    strengths: [],
    weaknesses: [],
    recommendations: [],
    estimatedValue: { low: 0, medium: 0, high: 0 },
    timeline: [],
    nextSteps: []
  }

  const caseStrength = analysisData.caseStrength || {}
  const keyIssues = safeArray(analysisData.keyIssues)
  const strengths = safeArray(analysisData.strengths)
  const weaknesses = safeArray(analysisData.weaknesses)
  const recommendations = safeArray(analysisData.recommendations)
  const timeline = safeArray(analysisData.timeline)
  const nextSteps = safeArray(analysisData.nextSteps)
  const estimatedValue = analysisData.estimatedValue || { low: 0, medium: 0, high: 0 }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'TBD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (!assessmentId) return null

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">AI is analyzing your case...</span>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    // Only show error if there's an actual error message (not just missing analysis)
    if (error) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Bot className="h-6 w-6 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Case Analysis</h3>
          </div>
          <p className="mt-2 text-red-600">
            {error}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={loadAnalysis}
              className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
            >
              Retry
            </button>
            <button
              onClick={handleGenerateAnalysis}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Generate analysis
            </button>
          </div>
        </div>
      )
    }
    
    // No error, just analysis not available yet
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <Bot className="h-6 w-6 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">AI Case Analysis</h3>
        </div>
        <p className="mt-2 text-gray-600">
          Analysis is being processed. We will refresh automatically.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={loadAnalysis}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Check again
          </button>
          <button
            onClick={handleGenerateAnalysis}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Generate analysis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Case Analysis</h3>
          </div>
          <div className="text-sm text-gray-500">
            Confidence: {Math.round((analysis?.confidence || 0) * 100)}%
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Case Strength Overview */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Case Strength Assessment
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(caseStrength as Record<string, number>).map(([key, score]) => (
              <div key={key} className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStrengthColor(score)}`}>
                  {Number(score)}%
                </div>
                <p className="text-xs text-gray-600 mt-1 capitalize">{key}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Estimated Value */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Estimated Settlement Value
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">Low Range</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(estimatedValue.low)}</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">Medium Range</div>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(estimatedValue.medium)}</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">High Range</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(estimatedValue.high)}</div>
            </div>
          </div>
        </div>

        {/* Key Issues */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Key Issues to Address
          </h4>
          <div className="space-y-2">
            {keyIssues.map((issue, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3"></div>
                <p className="text-gray-700">{issue}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Case Strengths
            </h4>
            <div className="space-y-2">
              {strengths.map((strength, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2 mr-3"></div>
                  <p className="text-gray-700">{strength}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Areas of Concern
            </h4>
            <div className="space-y-2">
              {weaknesses.map((weakness, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full mt-2 mr-3"></div>
                  <p className="text-gray-700">{weakness}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-blue-600" />
            Strategic Recommendations
          </h4>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">{index + 1}</span>
                </div>
                <p className="text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-600" />
            Immediate Next Steps
          </h4>
          <div className="space-y-2">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">{index + 1}</span>
                </div>
                <p className="text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-brand-600" />
            Case Timeline
          </h4>
          <div className="space-y-2">
            {timeline.map((timelineItem, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-brand-400 rounded-full mt-2 mr-3"></div>
                <p className="text-gray-700">{timelineItem}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This analysis was generated by AI and should be reviewed by a qualified attorney. 
            Analysis completed on {new Date(analysis.analysisDate).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
