import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Users } from 'lucide-react'
import { getPublicFirms } from '../lib/api'

type FirmListItem = {
  id: string
  name: string
  slug: string
  tagline: string | null
  logoUrl: string | null
  city: string | null
  state: string | null
  practiceAreas: string[]
  attorneyCount: number
}

export default function Firms() {
  const [firms, setFirms] = useState<FirmListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPublicFirms(query ? { q: query } : undefined)
      .then((data) => {
        if (!cancelled) setFirms(data)
      })
      .catch(() => {
        if (!cancelled) setFirms([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Law Firms</h1>
      <p className="mt-1 text-gray-600">Browse firms in our marketplace and review their track record.</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search firms by name…"
        className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
      />

      {loading ? (
        <p className="mt-8 text-gray-500">Loading firms…</p>
      ) : firms.length === 0 ? (
        <p className="mt-8 text-gray-500">No firms found.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {firms.map((firm) => (
            <Link
              key={firm.id}
              to={`/firms/${firm.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                {firm.logoUrl ? (
                  <img src={firm.logoUrl} alt={firm.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-gray-900">{firm.name}</h3>
                  {firm.tagline ? <p className="truncate text-sm text-gray-500">{firm.tagline}</p> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {firm.city || firm.state ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[firm.city, firm.state].filter(Boolean).join(', ')}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {firm.attorneyCount} attorney{firm.attorneyCount === 1 ? '' : 's'}
                </span>
              </div>
              {firm.practiceAreas.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {firm.practiceAreas.slice(0, 4).map((area) => (
                    <span key={area} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      {area}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
