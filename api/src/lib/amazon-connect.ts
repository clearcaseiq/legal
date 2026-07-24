/**
 * Amazon Connect wrapper for placing recorded outbound calls.
 *
 * The heavy lifting (bridging the two parties, playing the recording
 * disclosure, enabling recording + Contact Lens) lives in a Connect *contact
 * flow* configured in the AWS console. From the app's side we only need to:
 *   1. Kick off an outbound contact to the plaintiff's number.
 *   2. Pass the attorney's number + our internal callId as contact attributes
 *      so the flow can transfer the call and tag the recording.
 *
 * When Connect isn't configured (local dev / not provisioned yet) every helper
 * degrades gracefully and returns null, mirroring how sms/ses do it, so the
 * rest of the app keeps working.
 */
import {
  ConnectClient,
  StartOutboundVoiceContactCommand,
  StopContactCommand,
} from '@aws-sdk/client-connect'
import { ENV } from '../env'
import { logger } from './logger'

let client: ConnectClient | null = null

function getClient(): ConnectClient | null {
  if (!isConnectConfigured()) return null
  if (!client) {
    // No explicit credentials: the SDK default chain picks up the EC2 instance
    // role in production and the local AWS profile in dev. Region is the Connect
    // instance region (may differ from AWS_REGION used by Textract/SES).
    client = new ConnectClient({ region: ENV.CONNECT_REGION })
  }
  return client
}

export function isConnectConfigured(): boolean {
  return Boolean(
    ENV.CALLS_ENABLED &&
      ENV.CONNECT_INSTANCE_ID &&
      ENV.CONNECT_CONTACT_FLOW_ID &&
      (ENV.CONNECT_SOURCE_PHONE_NUMBER || ENV.CONNECT_QUEUE_ID),
  )
}

/** Normalize a phone string to a best-effort E.164 value Connect will accept. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits ? `+${digits}` : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  // Assume North American numbers when no country code is present.
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export type StartOutboundResult = {
  contactId: string
  instanceId: string
}

/**
 * Place an outbound recorded call to `destinationPhone` (the plaintiff). The
 * contact flow reads `attributes.attorneyPhone` to transfer/bridge the attorney
 * and `attributes.callId` to correlate the resulting recording back to our row.
 */
export async function startOutboundCall(params: {
  destinationPhone: string
  attributes: Record<string, string>
}): Promise<StartOutboundResult | null> {
  const connect = getClient()
  if (!connect) {
    logger.warn('Amazon Connect not configured; skipping outbound call')
    return null
  }

  const destination = toE164(params.destinationPhone)
  if (!destination) {
    logger.warn('Amazon Connect: invalid destination phone', { destinationPhone: params.destinationPhone })
    return null
  }

  try {
    const res = await connect.send(
      new StartOutboundVoiceContactCommand({
        InstanceId: ENV.CONNECT_INSTANCE_ID!,
        ContactFlowId: ENV.CONNECT_CONTACT_FLOW_ID!,
        DestinationPhoneNumber: destination,
        SourcePhoneNumber: ENV.CONNECT_SOURCE_PHONE_NUMBER || undefined,
        QueueId: ENV.CONNECT_QUEUE_ID || undefined,
        // Contact attributes are string->string and readable inside the flow.
        Attributes: sanitizeAttributes(params.attributes),
      }),
    )
    if (!res.ContactId) {
      logger.error('Amazon Connect: StartOutboundVoiceContact returned no ContactId')
      return null
    }
    return { contactId: res.ContactId, instanceId: ENV.CONNECT_INSTANCE_ID! }
  } catch (error: any) {
    logger.error('Amazon Connect: StartOutboundVoiceContact failed', { error: error?.message })
    return null
  }
}

/** Best-effort hang up of an in-progress contact (e.g. user cancels). */
export async function stopContact(contactId: string): Promise<boolean> {
  const connect = getClient()
  if (!connect || !ENV.CONNECT_INSTANCE_ID) return false
  try {
    await connect.send(
      new StopContactCommand({ ContactId: contactId, InstanceId: ENV.CONNECT_INSTANCE_ID }),
    )
    return true
  } catch (error: any) {
    logger.warn('Amazon Connect: StopContact failed', { error: error?.message, contactId })
    return false
  }
}

// Connect attribute keys/values must be strings; drop empties and clamp length.
function sanitizeAttributes(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue
    const val = String(v)
    if (!val) continue
    out[k] = val.slice(0, 1024)
  }
  return out
}
