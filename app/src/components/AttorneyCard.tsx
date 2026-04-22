import { Star, MapPin, Users, Award, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { type AttorneySummary } from '../lib/schemas'

interface AttorneyCardProps {
  attorney: AttorneySummary
  onClick?: () => void
  showActions?: boolean
}

export default function AttorneyCard({ attorney, onClick, showActions = true }: AttorneyCardProps) {
  const verifiedReviewCount = (attorney as any).verifiedReviewCount || 0

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
    <div
      className={`card hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {attorney.name}
          </h3>
          
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
              {verifiedReviewCount > 0 ? `${verifiedReviewCount} verified reviews` : 'New profile'}
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
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-gray-600 mb-1">
            {Math.round(attorney.fit_score * 100)}% fit
          </div>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${attorney.fit_score * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center text-sm">
          <Users className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">
            {attorney.verified_outcomes.trials} trials
          </span>
        </div>
        <div className="flex items-center text-sm">
          <Award className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">
            {attorney.verified_outcomes.settlements} settlements
          </span>
        </div>
        <div className="flex items-center text-sm">
          <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">
            ${attorney.verified_outcomes.median_recovery.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">
            {attorney.venues.join(', ')}
          </span>
        </div>
        <div className="flex items-center text-sm col-span-2">
          <Clock className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">
            {(attorney as any).responseBadge || (((attorney as any).responseTimeHours ?? 24) <= 8 ? 'Same-day replies' : 'Replies within 24h')}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {attorney.specialties.map((specialty) => (
          <span
            key={specialty}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
          >
            {specialty}
          </span>
        ))}
      </div>

      {showActions && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Fee: {Math.round(attorney.fee.contingency_min * 100)}% - {Math.round(attorney.fee.contingency_max * 100)}%
          </div>
          <button className="btn-primary text-sm">
            Request Intro
          </button>
        </div>
      )}
    </div>
  )
}
