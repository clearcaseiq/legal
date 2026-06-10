/**
 * Add an event to the attorney's calendar.
 *
 * Uses a Google Calendar "template" URL opened via Linking so it works without a
 * native calendar module (the workspace can't currently add one). This opens the
 * Google Calendar app/site with the event pre-filled for the attorney to save —
 * covering the common case of Google/Workspace accounts. A future native build
 * can swap this for `expo-calendar` to write directly to the device calendar.
 */
import { Linking } from 'react-native'

export type CalendarEventInput = {
  title: string
  start: Date
  end?: Date
  allDay?: boolean
  details?: string
  location?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** UTC timestamp like 20260612T150000Z (used for timed events). */
function toGoogleUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** All-day date like 20260612 (Google expects start/exclusive-end for all-day). */
function toGoogleDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  let dates: string
  if (event.allDay) {
    const end = event.end ?? new Date(event.start.getTime() + 24 * 3_600_000)
    dates = `${toGoogleDate(event.start)}/${toGoogleDate(end)}`
  } else {
    const end = event.end ?? new Date(event.start.getTime() + 30 * 60_000)
    dates = `${toGoogleUtc(event.start)}/${toGoogleUtc(end)}`
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
  })
  if (event.details) params.set('details', event.details)
  if (event.location) params.set('location', event.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export async function addEventToCalendar(event: CalendarEventInput): Promise<boolean> {
  try {
    await Linking.openURL(buildGoogleCalendarUrl(event))
    return true
  } catch {
    return false
  }
}
