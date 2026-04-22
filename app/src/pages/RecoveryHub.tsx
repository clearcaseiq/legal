import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  getRecoveryDashboard, 
  getRecoveryEntries, 
  addRecoveryEntry, 
  getRecoveryGoals, 
  addRecoveryGoal,
  getPainTrends,
  getTreatmentRecommendations 
} from '../lib/api'
import { formatDate, formatCurrency } from '../lib/formatters'
import { 
  Heart, 
  Activity, 
  Calendar, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Stethoscope,
  Pill,
  Zap,
  Award,
  BarChart3,
  Lightbulb,
  ChevronRight
} from 'lucide-react'

interface RecoverySummary {
  totalAppointments: number
  totalPTSessions: number
  currentPainLevel: number
  averagePainLevel: number
  recoveryProgress: number
  daysSinceInjury: number
  nextAppointment: string
  treatmentPlanCompletion: number
}

interface RecoveryEntry {
  id: string
  type: 'appointment' | 'pt_session' | 'prescription' | 'pain_level' | 'milestone'
  date: string
  description: string
  provider?: string
  location?: string
  painLevel?: number
  medication?: string
  dosage?: string
  notes?: string
}

interface RecoveryGoal {
  id: string
  title: string
  description: string
  category: 'pain_reduction' | 'mobility' | 'strength' | 'endurance' | 'functionality'
  targetDate: string
  targetValue?: number
  unit?: string
  progress: number
  status: 'on_track' | 'behind' | 'completed' | 'in_progress'
}

export default function RecoveryHub() {
  const [summary, setSummary] = useState<RecoverySummary | null>(null)
  const [recentEntries, setRecentEntries] = useState<RecoveryEntry[]>([])
  const [goals, setGoals] = useState<RecoveryGoal[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [painTrends, setPainTrends] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'entries' | 'goals' | 'trends'>('overview')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [dashboardData, trendsData, recommendationsData] = await Promise.all([
        getRecoveryDashboard(),
        getPainTrends(),
        getTreatmentRecommendations()
      ])
      
      setSummary(dashboardData.summary)
      setRecentEntries(dashboardData.recentEntries)
      setGoals(dashboardData.goals)
      setMilestones(dashboardData.milestones)
      setPainTrends(trendsData)
      setRecommendations(recommendationsData)
    } catch (error) {
      console.error('Failed to load recovery dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Stethoscope className="h-4 w-4" />
      case 'pt_session': return <Activity className="h-4 w-4" />
      case 'prescription': return <Pill className="h-4 w-4" />
      case 'pain_level': return <Heart className="h-4 w-4" />
      case 'milestone': return <Award className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-blue-100 text-blue-600'
      case 'pt_session': return 'bg-green-100 text-green-600'
      case 'prescription': return 'bg-purple-100 text-purple-600'
      case 'pain_level': return 'bg-red-100 text-red-600'
      case 'milestone': return 'bg-yellow-100 text-yellow-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800'
      case 'behind': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPainLevelColor = (level: number) => {
    if (level <= 3) return 'text-green-600'
    if (level <= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your recovery progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          My Recovery Hub
        </h1>
        <p className="text-xl text-gray-600">
          Track your healing journey and stay motivated with your progress
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{summary.currentPainLevel}</div>
            <div className="text-sm text-gray-600">Current Pain Level</div>
            <Heart className="h-8 w-8 text-red-500 mx-auto mt-2" />
            <div className="text-xs text-gray-500 mt-1">out of 10</div>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">{summary.recoveryProgress}%</div>
            <div className="text-sm text-gray-600">Recovery Progress</div>
            <TrendingUp className="h-8 w-8 text-primary-500 mx-auto mt-2" />
            <div className="text-xs text-gray-500 mt-1">toward full recovery</div>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{summary.totalPTSessions}</div>
            <div className="text-sm text-gray-600">PT Sessions</div>
            <Activity className="h-8 w-8 text-blue-500 mx-auto mt-2" />
            <div className="text-xs text-gray-500 mt-1">completed</div>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{summary.daysSinceInjury}</div>
            <div className="text-sm text-gray-600">Days Since Injury</div>
            <Calendar className="h-8 w-8 text-green-500 mx-auto mt-2" />
            <div className="text-xs text-gray-500 mt-1">on the road to recovery</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'entries', label: 'Recovery Log', icon: Calendar },
            { id: 'goals', label: 'Goals', icon: Target },
            { id: 'trends', label: 'Trends', icon: TrendingUp }
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button
                onClick={() => setShowAddEntry(true)}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Entry
              </button>
            </div>
            
            <div className="space-y-3">
              {recentEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${getEntryColor(entry.type)}`}>
                    {getEntryIcon(entry.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{entry.description}</h4>
                      <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                    </div>
                    {entry.provider && (
                      <p className="text-xs text-gray-600 mt-1">{entry.provider}</p>
                    )}
                    {entry.painLevel && (
                      <div className="flex items-center mt-1">
                        <span className={`text-xs font-medium ${getPainLevelColor(entry.painLevel)}`}>
                          Pain Level: {entry.painLevel}/10
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals Progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Goals Progress</h3>
              <button
                onClick={() => setShowAddGoal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </button>
            </div>
            
            <div className="space-y-4">
              {goals.slice(0, 3).map((goal) => (
                <div key={goal.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{goal.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalStatusColor(goal.status)}`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{goal.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-900">{goal.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Recommendations */}
          {recommendations && (
            <div className="card lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                Personalized Recommendations
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.immediate?.slice(0, 3).map((rec: any, index: number) => (
                  <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">{rec.title}</h4>
                        <p className="text-xs text-blue-700 mb-2">{rec.description}</p>
                        <span className="text-xs text-blue-600 font-medium">{rec.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recovery Log Tab */}
      {activeTab === 'entries' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recovery Log</h2>
            <button
              onClick={() => setShowAddEntry(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="card">
                <div className="flex items-start space-x-3">
                  <div className={`p-3 rounded-full ${getEntryColor(entry.type)}`}>
                    {getEntryIcon(entry.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{entry.description}</h3>
                      <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                    </div>
                    
                    {entry.provider && (
                      <p className="text-xs text-gray-600 mb-1">Provider: {entry.provider}</p>
                    )}
                    
                    {entry.location && (
                      <p className="text-xs text-gray-600 mb-1">Location: {entry.location}</p>
                    )}
                    
                    {entry.medication && (
                      <div className="text-xs text-gray-600 mb-1">
                        <p>Medication: {entry.medication}</p>
                        {entry.dosage && <p>Dosage: {entry.dosage}</p>}
                      </div>
                    )}
                    
                    {entry.painLevel && (
                      <div className="flex items-center mb-2">
                        <span className={`text-sm font-medium ${getPainLevelColor(entry.painLevel)}`}>
                          Pain Level: {entry.painLevel}/10
                        </span>
                      </div>
                    )}
                    
                    {entry.notes && (
                      <p className="text-xs text-gray-600 italic">"{entry.notes}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recovery Goals</h2>
            <button
              onClick={() => setShowAddGoal(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <div key={goal.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{goal.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        Target: {formatDate(goal.targetDate)}
                      </span>
                      {goal.targetValue && (
                        <span className="text-xs text-gray-500">
                          • {goal.targetValue} {goal.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalStatusColor(goal.status)}`}>
                    {goal.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-medium text-gray-900">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Category: {goal.category.replace('_', ' ')}</span>
                  <span>Days remaining: {Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && painTrends && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Recovery Trends</h2>
          
          {/* Pain Level Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pain Level Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingDown className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600">Pain levels decreasing over time</p>
                <p className="text-sm text-gray-500">Chart visualization would go here</p>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Insights</h3>
            <div className="space-y-3">
              {painTrends.insights.map((insight: string, index: number) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-5 w-5 text-yellow-500 mr-2" />
            Recovery Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Award className="h-5 w-5 text-yellow-600 mr-2" />
                  <h4 className="text-sm font-medium text-yellow-900">{milestone.title}</h4>
                </div>
                <p className="text-xs text-yellow-700 mb-1">{milestone.description}</p>
                <p className="text-xs text-yellow-600">{formatDate(milestone.date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-primary-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Keep Your Recovery on Track
        </h3>
        <p className="text-gray-600 mb-4">
          Stay motivated and track your progress with our comprehensive recovery tools.
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setShowAddEntry(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Recovery Activity
          </button>
          <button
            onClick={() => setShowAddGoal(true)}
            className="btn-outline"
          >
            <Target className="h-4 w-4 mr-2" />
            Set New Goal
          </button>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Recovery Entry</h3>
                <button
                  onClick={() => setShowAddEntry(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entry Type
                  </label>
                  <select className="input">
                    <option value="appointment">Medical Appointment</option>
                    <option value="pt_session">Physical Therapy</option>
                    <option value="prescription">Medication</option>
                    <option value="pain_level">Pain Assessment</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input type="text" className="input" placeholder="Describe the activity..." />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input type="datetime-local" className="input" />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddEntry(false)}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert('Entry added successfully!')
                      setShowAddEntry(false)
                    }}
                    className="flex-1 btn-primary"
                  >
                    Add Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Set Recovery Goal</h3>
                <button
                  onClick={() => setShowAddGoal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goal Title
                  </label>
                  <input type="text" className="input" placeholder="e.g., Reduce pain to level 3" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea className="input" rows={3} placeholder="Describe your goal..."></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Date
                  </label>
                  <input type="date" className="input" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select className="input">
                    <option value="pain_reduction">Pain Reduction</option>
                    <option value="mobility">Mobility</option>
                    <option value="strength">Strength</option>
                    <option value="endurance">Endurance</option>
                    <option value="functionality">Functionality</option>
                  </select>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddGoal(false)}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert('Goal created successfully!')
                      setShowAddGoal(false)
                    }}
                    className="flex-1 btn-primary"
                  >
                    Create Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
