/**
 * Clears the client IP address from intake leads once it is no longer needed.
 *
 * The IP is stored so suspicious paid traffic can be reported to the ad agency,
 * which only ever needs recent addresses: IP exclusions go stale within weeks,
 * and mobile addresses rotate faster than that. Holding it longer is personal
 * information kept for no purpose, which is what the CCPA's retention rule
 * forbids. The rest of the lead row is untouched.
 */
import { prisma } from './prisma'

export const IP_RETENTION_DAYS = 180

export async function runIntakeLeadIpPurge(now: Date = new Date()): Promise<{ cleared: number }> {
  const cutoff = new Date(now.getTime() - IP_RETENTION_DAYS * 24 * 60 * 60_000)
  const { count } = await prisma.intakeLead.updateMany({
    where: { createdAt: { lt: cutoff }, ipAddress: { not: null } },
    data: { ipAddress: null },
  })
  return { cleared: count }
}
