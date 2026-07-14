/**
 * Firm Dashboard → Booking Links tab. Firm admins create shareable "team"
 * scheduling links that distribute bookings across a chosen pool of attorneys
 * (round-robin or first-available). Mirrors the attorney's personal scheduling
 * page but at the firm level.
 */

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Check, Copy, ExternalLink, Pencil, Plus, Trash2, Users2 } from 'lucide-react'
import {
  getFirmBookingLinks,
  createFirmBookingLink,
  updateFirmBookingLink,
  deleteFirmBookingLink,
  type FirmBookingLink,
  type FirmBookingLinkInput,
  type FirmBookingLinksResponse,
  type BookingLocationType,
} from '../../lib/api'
import { SectionCard, EmptyState, Badge } from '../shared/ui'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'

const LOCATION_LABELS: Record<BookingLocationType, string> = {
  video: 'Video call',
  phone: 'Phone call',
  in_person: 'In person',
}

const DURATIONS = [15, 30, 45, 60]

export function FirmBookingLinksTab() {
  const [data, setData] = useState<FirmBookingLinksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FirmBookingLink | 'new' | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getFirmBookingLinks()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const canManage = data?.canManage ?? false

  return (
    <div className="space-y-6">
      <SectionCard
        title="Team booking links"
        trailing={
          canManage && !editing ? (
            <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> New link
            </button>
          ) : undefined
        }
      >
        <p className="mb-4 text-sm text-slate-500">
          Share one link with prospects. When someone books, we automatically assign an available attorney from the
          rotation and send everyone the confirmation.
        </p>

        {editing && data ? (
          <LinkForm
            key={editing === 'new' ? 'new' : editing.id}
            value={editing === 'new' ? null : editing}
            firmAttorneys={data.firmAttorneys}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              load()
            }}
          />
        ) : loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : !data || data.links.length === 0 ? (
          <EmptyState message="No team booking links yet. Create one to start distributing bookings across attorneys." />
        ) : (
          <div className="space-y-3">
            {data.links.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                canManage={canManage}
                onEdit={() => setEditing(link)}
                onDeleted={load}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function LinkRow({
  link,
  canManage,
  onEdit,
  onDeleted,
}: {
  link: FirmBookingLink
  canManage: boolean
  onEdit: () => void
  onDeleted: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  const remove = async () => {
    if (!confirm(`Delete the "${link.name}" booking link? Existing appointments are unaffected.`)) return
    setBusy(true)
    try {
      await deleteFirmBookingLink(link.id)
      onDeleted()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-indigo-600" />
            <span className="font-semibold text-slate-900">{link.name}</span>
            {!link.isActive && <Badge tone="neutral">Inactive</Badge>}
            <Badge tone="blue">
              {link.assignmentStrategy === 'round_robin' ? 'Round-robin' : 'First available'}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {link.durationMinutes} min · {LOCATION_LABELS[link.locationType]} · {link.members.length} attorney
            {link.members.length === 1 ? '' : 's'}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {link.members.map((m) => (
              <span key={m.attorneyId} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                <Users2 className="h-3 w-3" /> {m.name}
              </span>
            ))}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button type="button" className={btnGhost} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              className={`${btnGhost} text-rose-600 hover:bg-rose-50`}
              onClick={remove}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <code className="flex-1 truncate text-xs text-slate-600">{link.publicUrl}</code>
        <button type="button" onClick={copy} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200" title="Copy link">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          href={link.publicUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
          title="Open"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

function LinkForm({
  value,
  firmAttorneys,
  onCancel,
  onSaved,
}: {
  value: FirmBookingLink | null
  firmAttorneys: Array<{ id: string; name: string }>
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(value?.name || '')
  const [description, setDescription] = useState(value?.description || '')
  const [durationMinutes, setDurationMinutes] = useState(value?.durationMinutes || 30)
  const [locationType, setLocationType] = useState<BookingLocationType>(value?.locationType || 'video')
  const [location, setLocation] = useState(value?.location || '')
  const [assignmentStrategy, setAssignmentStrategy] = useState<'round_robin' | 'first_available'>(
    value?.assignmentStrategy || 'round_robin',
  )
  const [isActive, setIsActive] = useState(value?.isActive ?? true)
  const [members, setMembers] = useState<string[]>(value?.members.map((m) => m.attorneyId) || [])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggleMember = (id: string) =>
    setMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const save = async () => {
    if (!name.trim()) {
      setErr('Please enter a name.')
      return
    }
    if (members.length === 0) {
      setErr('Select at least one attorney for the rotation.')
      return
    }
    setSaving(true)
    setErr(null)
    const payload: FirmBookingLinkInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      durationMinutes,
      locationType,
      location: location.trim() || undefined,
      assignmentStrategy,
      isActive,
      memberAttorneyIds: members,
    }
    try {
      if (value) await updateFirmBookingLink(value.id, payload)
      else await createFirmBookingLink(payload)
      onSaved()
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not save the booking link.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{value ? 'Edit booking link' : 'New booking link'}</h3>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Name *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Free case evaluation"
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Duration</span>
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} minutes
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Location</span>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as BookingLocationType)}
            className="rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="video">Video call</option>
            <option value="phone">Phone call</option>
            <option value="in_person">In person</option>
          </select>
        </label>
      </div>

      {locationType !== 'video' && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            {locationType === 'in_person' ? 'Address' : 'Phone / dial-in note'}
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Assignment</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(
            [
              { key: 'round_robin', label: 'Round-robin', hint: 'Rotate bookings evenly across attorneys' },
              { key: 'first_available', label: 'First available', hint: 'Prefer earlier attorneys in the list' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setAssignmentStrategy(opt.key)}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
                assignmentStrategy === opt.key
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 text-slate-700 hover:border-indigo-300'
              }`}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="text-xs text-slate-500">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Attorneys in rotation * <span className="text-xs font-normal text-slate-500">({members.length} selected)</span>
        </span>
        {firmAttorneys.length === 0 ? (
          <p className="text-xs text-slate-500">No attorneys in this firm yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {firmAttorneys.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <input type="checkbox" checked={members.includes(a.id)} onChange={() => toggleMember(a.id)} />
                <span className="text-slate-700">{a.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active (accepting bookings)
      </label>

      {err && <p className="text-sm text-rose-600">{err}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : value ? 'Save changes' : 'Create link'}
        </button>
      </div>
    </div>
  )
}
