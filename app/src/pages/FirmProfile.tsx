import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Building2, CheckCircle, Clock, Globe, MapPin, Phone, Star, TrendingUp } from 'lucide-react'
import { getFirmProfile, type FirmProfile as FirmProfileData, type FirmTrustMetrics } from '../lib/api'
import { formatCurrency } from '../lib/formatters'

function pct(value: number) {
  return `${Math.round(value * 100)}%`
}

function MetricTile({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-gray-400">{hint}</div> : null}
    </div>
  )
}

export default function FirmProfile() {
  const { slug } = useParams<{ slug: string }>()
  const [firm, setFirm] = useState<FirmProfileData | null>(null)
  const [metrics, setMetrics] = useState<FirmTrustMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    getFirmProfile(slug)
      .then((data) => {
        if (cancelled) return
        setFirm(data.firm)
        setMetrics(data.metrics)
      })
      .catch(() => {
        if (!cancelled) setError('Firm not found')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10 text-gray-500">Loading firm…</div>
  if (error || !firm) return <div className="mx-auto max-w-5xl px-4 py-10 text-gray-500">{error || 'Firm not found'}</div>

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/firms" className="text-sm text-brand-600 hover:underline">&larr; All firms</Link>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        {firm.logoUrl ? (
          <img src={firm.logoUrl} alt={firm.name} className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Building2 className="h-8 w-8" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{firm.name}</h1>
          {firm.tagline ? <p className="mt-0.5 text-gray-600">{firm.tagline}</p> : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {firm.city || firm.state ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {[firm.city, firm.state, firm.zip].filter(Boolean).join(', ')}
              </span>
            ) : null}
            {firm.phone ? (
              <a href={`tel:${firm.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                <Phone className="h-4 w-4" />
                {firm.phone}
              </a>
            ) : null}
            {firm.website ? (
              <a href={firm.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-600">
                <Globe className="h-4 w-4" />
                Website
              </a>
            ) : null}
            {firm.foundedYear ? <span>Est. {firm.foundedYear}</span> : null}
          </div>
        </div>
      </div>

      {firm.description ? <p className="mt-4 whitespace-pre-line text-gray-700">{firm.description}</p> : null}

      {firm.practiceAreas.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {firm.practiceAreas.map((area) => (
            <span key={area} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{area}</span>
          ))}
        </div>
      ) : null}

      {/* Trust metrics */}
      {metrics ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Track record</h2>
          <p className="text-sm text-gray-500">Based on real marketplace activity across {metrics.attorneyCount} attorney{metrics.attorneyCount === 1 ? '' : 's'}.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricTile icon={Star} label="Avg rating" value={metrics.averageRating ? metrics.averageRating.toFixed(1) : '—'} hint={`${metrics.totalReviews} review${metrics.totalReviews === 1 ? '' : 's'}`} />
            <MetricTile icon={Clock} label="Avg response" value={metrics.averageResponseHours != null ? `${metrics.averageResponseHours}h` : '—'} />
            <MetricTile icon={CheckCircle} label="Acceptance rate" value={pct(metrics.acceptanceRate)} />
            <MetricTile icon={TrendingUp} label="Favorable outcomes" value={pct(metrics.favorableRate)} hint="Settled or won" />
            <MetricTile icon={CheckCircle} label="Retain rate" value={pct(metrics.retainRate)} />
            <MetricTile icon={TrendingUp} label="Avg settlement" value={metrics.averageSettlement > 0 ? formatCurrency(metrics.averageSettlement) : '—'} hint={`${metrics.settlementCount} case${metrics.settlementCount === 1 ? '' : 's'}`} />
            <MetricTile icon={TrendingUp} label="Total recovered" value={metrics.totalSettlements > 0 ? formatCurrency(metrics.totalSettlements) : '—'} />
            <MetricTile icon={Star} label="Client satisfaction" value={metrics.plaintiffSatisfaction != null ? `${metrics.plaintiffSatisfaction}/5` : '—'} />
          </div>
        </div>
      ) : null}

      {/* Attorneys */}
      {firm.attorneys.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Attorneys</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {firm.attorneys.map((a) => (
              <Link
                key={a.id}
                to={`/attorneys?attorneyId=${a.id}`}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{a.name}</span>
                  {a.isVerified ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : null}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {a.averageRating ? a.averageRating.toFixed(1) : 'New'}
                  </span>
                  <span>·</span>
                  <span>{a.totalReviews} review{a.totalReviews === 1 ? '' : 's'}</span>
                </div>
                {a.specialties.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.specialties.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{s}</span>
                    ))}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
