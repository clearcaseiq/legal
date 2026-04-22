import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatPercentage } from '../lib/formatters'

interface ScoreCardProps {
  title: string
  value: number
  maxValue?: number
  trend?: 'up' | 'down' | 'neutral'
  description?: string
  className?: string
}

export default function ScoreCard({ 
  title, 
  value, 
  maxValue = 1, 
  trend = 'neutral',
  description,
  className = ''
}: ScoreCardProps) {
  const percentage = (value / maxValue) * 100
  
  const getColorClass = () => {
    if (percentage >= 70) return 'text-green-600 bg-green-50'
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className={`p-6 bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {getTrendIcon()}
      </div>
      
      <div className="flex items-baseline">
        <div className="text-3xl font-bold text-gray-900">
          {formatPercentage(value)}
        </div>
        {maxValue !== 1 && (
          <div className="ml-2 text-sm text-gray-500">
            / {formatPercentage(maxValue)}
          </div>
        )}
      </div>
      
      {description && (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      )}
      
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              percentage >= 70 
                ? 'bg-green-500' 
                : percentage >= 40 
                ? 'bg-yellow-500' 
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
