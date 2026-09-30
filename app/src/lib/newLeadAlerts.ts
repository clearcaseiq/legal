/**
 * How an attorney is alerted when a new lead lands in New Matches.
 *
 * Stored per browser: a ringtone is a property of the device the attorney is
 * sitting at, and a desk machine and a phone often want different answers.
 */

export type NewLeadAlertMode = 'popup' | 'ringtone' | 'both' | 'off'

export const NEW_LEAD_ALERT_OPTIONS: { value: NewLeadAlertMode; label: string; description: string }[] = [
  { value: 'popup', label: 'Popup', description: 'Show a popup on screen (and a desktop notification when this tab is in the background).' },
  { value: 'ringtone', label: 'Ringtone', description: 'Play a short ringtone without a popup.' },
  { value: 'both', label: 'Popup + ringtone', description: 'Show the popup and play the ringtone.' },
  { value: 'off', label: 'Off', description: 'No alert — new leads still appear in the bell and New Matches.' },
]

const MODE_KEY = 'ccq.newLeadAlertMode'
const SEEN_KEY = 'ccq.newLeadAlertSeen'
const MAX_SEEN = 200

export function getNewLeadAlertMode(): NewLeadAlertMode {
  try {
    const v = localStorage.getItem(MODE_KEY)
    if (v === 'popup' || v === 'ringtone' || v === 'both' || v === 'off') return v
  } catch {
    /* storage unavailable */
  }
  return 'popup'
}

export function setNewLeadAlertMode(mode: NewLeadAlertMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent('ccq:new-lead-alert-mode', { detail: mode }))
}

export function wantsPopup(mode: NewLeadAlertMode): boolean {
  return mode === 'popup' || mode === 'both'
}

export function wantsRingtone(mode: NewLeadAlertMode): boolean {
  return mode === 'ringtone' || mode === 'both'
}

export function getSeenLeadAlertIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
    return new Set(Array.isArray(raw) ? raw.map(String) : [])
  } catch {
    return new Set()
  }
}

export function markLeadAlertsSeen(ids: string[]): void {
  if (!ids.length) return
  const seen = Array.from(getSeenLeadAlertIds())
  for (const id of ids) if (!seen.includes(id)) seen.push(id)
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-MAX_SEEN)))
  } catch {
    /* storage unavailable */
  }
}

let audioCtx: AudioContext | null = null

/**
 * A short two-tone chime, played three times. Synthesized so there is no audio
 * asset to ship. Browsers only allow sound after the user has interacted with
 * the page at least once; before that this silently does nothing.
 */
export function playNewLeadRingtone(): void {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    const start = ctx.currentTime + 0.05
    for (let ring = 0; ring < 3; ring++) {
      ;[880, 660].forEach((freq, i) => {
        const at = start + ring * 0.9 + i * 0.22
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
        osc.connect(gain).connect(ctx.destination)
        osc.start(at)
        osc.stop(at + 0.22)
      })
    }
  } catch {
    /* audio unavailable */
  }
}

export function desktopNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!desktopNotificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export function showDesktopNotification(title: string, body: string, onClick: () => void): void {
  if (!desktopNotificationsSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag: 'ccq-new-lead' })
    n.onclick = () => {
      window.focus()
      onClick()
      n.close()
    }
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}
