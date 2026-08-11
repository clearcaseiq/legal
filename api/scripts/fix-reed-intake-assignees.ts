/**
 * Normalize reed v. Test intake milestone assignees: attorney role (not
 * paralegal/plaintiff), and clear misleading client assignment.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })
const prisma = new PrismaClient()

const TITLES = [
  'Confirm signed representation agreement',
  'Confirm signed retainer agreement',
  'Send retainer to client',
  'Open matter & run conflict check',
  'Complete conflict check',
  'Run conflict check',
]

async function main() {
  const assessment = await prisma.assessment.findFirst({
    where: { caseName: { equals: 'reed v. Test', mode: 'insensitive' } },
    include: { leadSubmission: { select: { id: true, assignedAttorneyId: true } } },
  })
  if (!assessment?.leadSubmission) throw new Error('reed v. Test not found')

  const attorney = assessment.leadSubmission.assignedAttorneyId
    ? await prisma.attorney.findUnique({
        where: { id: assessment.leadSubmission.assignedAttorneyId },
        select: { id: true, name: true, email: true },
      })
    : null
  const user = attorney?.email
    ? await prisma.user.findUnique({ where: { email: attorney.email }, select: { id: true } })
    : null

  // Auto intake milestones should open with Assignee = Auto (no person set).
  const tasks = await prisma.caseTask.updateMany({
    where: {
      assessmentId: assessment.id,
      mergedIntoId: null,
      OR: TITLES.map((title) => ({ title: { equals: title, mode: 'insensitive' as const } })),
    },
    data: {
      assignedRole: 'attorney',
      assignedTo: null,
      assignedUserId: null,
    },
  })

  const items = await prisma.caseWorkflowItem.updateMany({
    where: {
      caseWorkflow: { assessmentId: assessment.id },
      OR: TITLES.map((title) => ({ title: { equals: title, mode: 'insensitive' as const } })),
    },
    data: {
      assigneeRole: 'attorney',
      assignedFirmMemberId: null,
    },
  })

  console.log(JSON.stringify({ taskUpdates: tasks.count, workflowItemUpdates: items.count, attorney }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
