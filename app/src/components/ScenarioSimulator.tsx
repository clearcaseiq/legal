import { useState } from 'react'
import { TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'
import { simulateScenario } from '../lib/api'
import { formatPercentage } from '../lib/formatters'

const DEFAULT_TOGGLES = {
  increased_medical: false,
  additional_evidence: false,
  expert_witness: false,
  witness_testimony: false,
  surveillance_evidence: false
}

type ScenarioToggleKey = keyof typeof DEFAULT_TOGGLES

interface ScenarioSimulatorProps {
  basePrediction: any
  assessmentId: string
}

export default function ScenarioSimulator({ basePrediction, assessmentId }: ScenarioSimulatorProps) {
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES)
  
  const [simulation, setSimulation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleToggle = (key: ScenarioToggleKey) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const runSimulation = async () => {
    setLoading(true)
    try {
      const result = await simulateScenario(basePrediction, toggles)
      setSimulation(result)
    } catch (error) {
      console.error('Simulation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetSimulation = () => {
    setToggles(DEFAULT_TOGGLES)
    setSimulation(null)
  }

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-600'
    if (delta < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (delta < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return null
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Scenario Simulator</h2>
        <button
          onClick={resetSimulation}
          className="btn-outline text-sm"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </button>
      </div>

      <div className="space-y-6">
        {/* Scenario Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">What if scenarios:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'increased_medical',
                title: 'Increased Medical Bills',
                description: 'Higher medical expenses and treatment costs',
                impact: '+7%'
              },
              {
                key: 'additional_evidence',
                title: 'Additional Evidence',
                description: 'More documentation and witness statements',
                impact: '+5%'
              },
              {
                key: 'expert_witness',
                title: 'Expert Witness',
                description: 'Medical or technical expert testimony',
                impact: '+6%'
              },
              {
                key: 'witness_testimony',
                title: 'Witness Testimony',
                description: 'Independent witness accounts',
                impact: '+4%'
              },
              {
                key: 'surveillance_evidence',
                title: 'Surveillance Evidence',
                description: 'Video or photo documentation',
                impact: '+3%'
              }
            ].map((scenario) => (
              <label
                key={scenario.key}
                className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={toggles[scenario.key as keyof typeof toggles]}
                  onChange={() => handleToggle(scenario.key as ScenarioToggleKey)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      {scenario.title}
                    </h4>
                    <span className="text-xs font-medium text-primary-600">
                      {scenario.impact}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {scenario.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Simulation Button */}
        <div className="flex justify-center">
          <button
            onClick={runSimulation}
            disabled={loading || Object.values(toggles).every(v => !v)}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Simulating...
              </>
            ) : (
              'Run Simulation'
            )}
          </button>
        </div>

        {/* Simulation Results */}
        {simulation && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Simulation Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Viability Changes</h4>
                <div className="space-y-3">
                  {Object.entries(simulation.deltas as Record<string, number>).map(([key, delta]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <div className="flex items-center">
                        {getDeltaIcon(delta)}
                        <span className={`ml-1 font-medium ${getDeltaColor(delta)}`}>
                          {delta > 0 ? '+' : ''}{formatPercentage(Math.abs(delta))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">New Projected Viability</h4>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">
                    {formatPercentage(basePrediction.viability.overall + ((simulation.deltas as Record<string, number>).overall || 0))}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {(((simulation.deltas as Record<string, number>).overall || 0) > 0) ? 'Increased' : 'Decreased'} from baseline
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> These simulations are based on general patterns and may not 
            reflect the specific circumstances of your case. Consult with a qualified attorney 
            for personalized advice.
          </p>
        </div>
      </div>
    </div>
  )
}
