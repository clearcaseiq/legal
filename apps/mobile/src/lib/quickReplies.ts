/**
 * Attorney quick-reply templates for chat and the post-accept intro message.
 * Built-in templates ship with the app; attorneys can save their own, persisted
 * to SecureStore. Templates support a small set of `{placeholders}`.
 */
import * as SecureStore from 'expo-secure-store'

const CUSTOM_KEY = 'attorney_quick_replies_v1'

export type QuickReply = {
  id: string
  label: string
  body: string
  builtIn?: boolean
}

export const DEFAULT_INTRO_TEMPLATE =
  "Hi, this is your attorney with ClearCaseIQ. I've reviewed your case and I'd like to help. Is now a good time to talk, or what works best to reach you?"

export const BUILT_IN_QUICK_REPLIES: QuickReply[] = [
  {
    id: 'intro',
    label: 'Intro',
    body: DEFAULT_INTRO_TEMPLATE,
    builtIn: true,
  },
  {
    id: 'schedule',
    label: 'Schedule call',
    body: "I'd like to set up a quick consultation. What day and time work best for you this week?",
    builtIn: true,
  },
  {
    id: 'documents',
    label: 'Request docs',
    body: 'To move your case forward, could you please send over any photos, medical records, and the police/incident report you have? You can upload them here.',
    builtIn: true,
  },
  {
    id: 'received',
    label: 'Got it',
    body: 'Thanks — I received this and will review it shortly. I will follow up with next steps.',
    builtIn: true,
  },
  {
    id: 'follow_up',
    label: 'Follow up',
    body: 'Just following up to check in on your case. Let me know if you have any questions or new information to share.',
    builtIn: true,
  },
]

export async function getCustomQuickReplies(): Promise<QuickReply[]> {
  try {
    const raw = await SecureStore.getItemAsync(CUSTOM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QuickReply[]) : []
  } catch {
    return []
  }
}

export async function saveCustomQuickReply(label: string, body: string): Promise<QuickReply[]> {
  const trimmedBody = body.trim()
  const trimmedLabel = label.trim() || trimmedBody.slice(0, 18)
  if (!trimmedBody) return getCustomQuickReplies()
  const existing = await getCustomQuickReplies()
  const next = [{ id: `custom-${Date.now()}`, label: trimmedLabel, body: trimmedBody }, ...existing].slice(0, 20)
  try {
    await SecureStore.setItemAsync(CUSTOM_KEY, JSON.stringify(next))
  } catch {
    /* best-effort */
  }
  return next
}

export async function deleteCustomQuickReply(id: string): Promise<QuickReply[]> {
  const existing = await getCustomQuickReplies()
  const next = existing.filter((r) => r.id !== id)
  try {
    await SecureStore.setItemAsync(CUSTOM_KEY, JSON.stringify(next))
  } catch {
    /* best-effort */
  }
  return next
}

/** All quick replies (built-in first, then the attorney's saved ones). */
export async function getAllQuickReplies(): Promise<QuickReply[]> {
  const custom = await getCustomQuickReplies()
  return [...BUILT_IN_QUICK_REPLIES, ...custom]
}
