import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { getPlaintiffLanguage, translateForPlaintiff } from '../lib/translate'
import { buildCaseCommandCenter } from '../lib/case-command-center'

const router = Router()

// Translations for plaintiff-facing status messages (es, zh)
const STATUS_TRANSLATIONS: Record<string, Record<string, { plain: string; next: string }>> = {
  es: {
    DRAFT: { plain: 'Estamos recopilando sus datos iniciales.', next: 'Complete las preguntas de admisión y suba los documentos.' },
    INTAKE: { plain: 'Estamos revisando su admisión y recopilando datos clave.', next: 'Suba los documentos o registros restantes.' },
    UNDER_REVIEW: { plain: 'Su caso está bajo revisión del abogado.', next: 'Nos comunicaremos si necesitamos más detalles.' },
    FILED: { plain: 'Su caso ha sido presentado y está avanzando.', next: 'Lo mantendremos informado sobre los próximos pasos.' },
    NEGOTIATION: { plain: 'Estamos negociando en su nombre.', next: 'Lo actualizaremos cuando recibamos ofertas.' },
    SETTLED: { plain: 'Se ha llegado a un acuerdo.', next: 'Estamos finalizando la documentación del acuerdo.' },
    TRIAL: { plain: 'Su caso se prepara o está en juicio.', next: 'Lo actualizaremos sobre fechas y hitos del juicio.' },
    CLOSED: { plain: 'Su caso está cerrado.', next: 'Contáctenos si necesita documentos finales.' }
  },
  zh: {
    DRAFT: { plain: '我们正在收集您的初步信息。', next: '完成入会问题并上传任何文件。' },
    INTAKE: { plain: '我们正在审查您的入会信息并收集关键事实。', next: '上传任何剩余的文件或记录。' },
    UNDER_REVIEW: { plain: '您的案件正在律师审阅中。', next: '如需更多详情，我们会与您联系。' },
    FILED: { plain: '您的案件已提交并正在推进。', next: '我们会及时告知您后续步骤。' },
    NEGOTIATION: { plain: '我们正在代表您进行谈判。', next: '收到报价后我们会通知您。' },
    SETTLED: { plain: '已达成和解。', next: '我们正在完成和解文件。' },
    TRIAL: { plain: '您的案件正在准备或进行审判。', next: '我们会告知您审判日期和重要进展。' },
    CLOSED: { plain: '您的案件已结案。', next: '如需最终文件，请联系我们。' }
  }
}

const PROGRESS_LABELS: Record<string, Record<string, string>> = {
  es: {
    'Intake completed': 'Admisión completada',
    'Documents uploaded': 'Documentos subidos',
    'Consultation scheduled': 'Consulta programada',
    'Demand prepared': 'Demanda preparada',
    'Negotiation / resolution': 'Negociación / resolución'
  },
  zh: {
    'Intake completed': '入会已完成',
    'Documents uploaded': '已上传文件',
    'Consultation scheduled': '已预约咨询',
    'Demand prepared': '已准备索赔',
    'Negotiation / resolution': '谈判/解决'
  }
}

const SETTLEMENT_NOTE: Record<string, string> = {
  es: 'Necesitamos más información para estimar el valor potencial.',
  zh: '我们需要更多信息来估算潜在价值。'
}

const SETTLEMENT_NOTE_EST: Record<string, string> = {
  es: 'Esta es una estimación y puede cambiar a medida que llegue nueva información.',
  zh: '这是估算值，可能会随着新信息的到来而改变。'
}


const CaseUpdate = z.object({
  status: z.enum(['INTAKE', 'UNDER_REVIEW', 'FILED', 'NEGOTIATION', 'SETTLED', 'TRIAL', 'CLOSED']).optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  deadline: z.string().datetime().optional(),
  documents: z.array(z.string()).optional()
})

const statusDescriptions: Record<string, { plain: string; next: string; progress: number }> = {
  DRAFT: { plain: 'We are collecting your initial details.', next: 'Complete intake questions and upload any documents.', progress: 10 },
  INTAKE: { plain: 'We are reviewing your intake and gathering key facts.', next: 'Upload any remaining documents or records.', progress: 25 },
  UNDER_REVIEW: { plain: 'Your case is under attorney review.', next: 'We will reach out if more details are needed.', progress: 40 },
  FILED: { plain: 'Your case has been filed and is moving forward.', next: 'We will keep you updated on upcoming steps.', progress: 55 },
  NEGOTIATION: { plain: 'We are negotiating on your behalf.', next: 'We will update you when offers are received.', progress: 70 },
  SETTLED: { plain: 'A settlement has been reached.', next: 'We are finalizing the settlement paperwork.', progress: 90 },
  TRIAL: { plain: 'Your case is preparing for or in trial.', next: 'We will update you on trial dates and milestones.', progress: 85 },
  CLOSED: { plain: 'Your case is closed.', next: 'Contact us if you need any final documents.', progress: 100 }
}

function buildProgressItems(assessment: any, appointments: any[], files: any[], demandLetters: any[]) {
  return [
    {
      label: 'Intake completed',
      status: assessment.status !== 'DRAFT' ? 'completed' : 'pending'
    },
    {
      label: 'Documents uploaded',
      status: files.length > 0 ? 'completed' : 'pending'
    },
    {
      label: 'Consultation scheduled',
      status: appointments.some(apt => apt.status === 'SCHEDULED') ? 'in_progress' : 'pending'
    },
    {
      label: 'Demand prepared',
      status: demandLetters.length > 0 ? 'completed' : 'pending'
    },
    {
      label: 'Negotiation / resolution',
      status: ['NEGOTIATION', 'SETTLED', 'TRIAL', 'CLOSED'].includes(assessment.status) ? 'in_progress' : 'pending'
    }
  ]
}

function buildSettlementExpectation(prediction: any) {
  if (!prediction?.bands) {
    return {
      median: 0,
      rangeLow: 0,
      rangeHigh: 0,
      confidence: 'low',
      note: 'We need more information to estimate potential value.'
    }
  }
  return {
    median: prediction.bands.median || 0,
    rangeLow: prediction.bands.p25 || 0,
    rangeHigh: prediction.bands.p75 || 0,
    confidence: prediction.bands.median ? 'medium' : 'low',
    note: 'This is an estimate and may change as new information arrives.'
  }
}

const caseTrackerAppointmentSelect = {
  id: true,
  type: true,
  scheduledAt: true,
  status: true,
  attorney: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true
    }
  }
} as const

const caseTrackerChatRoomPreviewSelect = {
  id: true,
  status: true,
  attorney: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      content: true,
      senderType: true,
      isRead: true,
      createdAt: true
    }
  }
} as const

const caseTrackerChatRoomDetailSelect = {
  id: true,
  status: true,
  attorney: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 100,
    select: {
      id: true,
      content: true,
      senderType: true,
      isRead: true,
      createdAt: true
    }
  }
} as const

const caseTrackerDemandLetterSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  title: true
} as const

const caseTrackerFileSelect = {
  id: true,
  name: true,
  originalName: true,
  mimetype: true,
  size: true,
  createdAt: true
} as const

const caseTrackerTimelineAssessmentSelect = {
  id: true,
  claimType: true,
  venueState: true,
  createdAt: true
} as const

const caseTrackerTimelinePredictionSelect = {
  id: true,
  createdAt: true
} as const

const caseTrackerTimelineAppointmentSelect = {
  id: true,
  type: true,
  scheduledAt: true,
  status: true,
  attorney: {
    select: {
      name: true
    }
  }
} as const

const caseTrackerTimelineDemandLetterSelect = {
  id: true,
  targetAmount: true,
  createdAt: true,
  status: true
} as const

const caseTrackerTimelineFileSelect = {
  id: true,
  originalName: true,
  createdAt: true
} as const

const caseTrackerTimelineChatRoomSelect = {
  id: true,
  createdAt: true,
  attorney: {
    select: {
      name: true
    }
  },
  _count: {
    select: {
      messages: true
    }
  }
} as const

// Get user's case dashboard
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // Get assessments with their related data
    const assessments = await prisma.assessment.findMany({
      where: { userId },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            viability: true,
            bands: true,
            explain: true,
            createdAt: true
          }
        },
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          select: caseTrackerAppointmentSelect
        },
        chatRooms: {
          select: caseTrackerChatRoomPreviewSelect
        },
        demandLetters: {
          orderBy: { createdAt: 'desc' },
          select: caseTrackerDemandLetterSelect
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: caseTrackerFileSelect
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse JSON fields and structure data
    const caseData = assessments.map(assessment => {
      const facts = JSON.parse(assessment.facts)
      const latestPrediction = assessment.predictions[0] ? {
        ...assessment.predictions[0],
        viability: JSON.parse(assessment.predictions[0].viability),
        bands: JSON.parse(assessment.predictions[0].bands),
        explain: JSON.parse(assessment.predictions[0].explain)
      } : null
      const statusInfo = statusDescriptions[assessment.status] || statusDescriptions.DRAFT
      const progressItems = buildProgressItems(assessment, assessment.appointments, assessment.files, assessment.demandLetters)
      const settlementExpectation = buildSettlementExpectation(latestPrediction)

      return {
        id: assessment.id,
        claimType: assessment.claimType,
        venue: {
          state: assessment.venueState,
          county: assessment.venueCounty
        },
        status: assessment.status,
        facts,
        prediction: latestPrediction,
        appointments: assessment.appointments.map(apt => ({
          id: apt.id,
          attorney: apt.attorney,
          type: apt.type,
          scheduledAt: apt.scheduledAt,
          status: apt.status
        })),
        chatRooms: assessment.chatRooms.map(room => ({
          id: room.id,
          attorney: room.attorney,
          lastMessage: room.messages[0] || null,
          status: room.status
        })),
        demandLetters: assessment.demandLetters,
        files: assessment.files,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        transparency: {
          statusSummary: assessment.status.replace('_', ' '),
          plainEnglish: statusInfo.plain,
          nextUpdate: statusInfo.next,
          progressPercent: statusInfo.progress,
          progressItems,
          settlementExpectation
        }
      }
    })

    // Calculate summary statistics
    const summary = {
      totalCases: caseData.length,
      activeCases: caseData.filter(c => !['SETTLED', 'CLOSED'].includes(c.status)).length,
      totalValue: caseData.reduce((sum, c) => {
        return sum + (c.prediction?.bands?.median || 0)
      }, 0),
      upcomingAppointments: caseData.reduce((sum, c) => {
        return sum + c.appointments.filter(apt => 
          apt.status === 'SCHEDULED' && 
          new Date(apt.scheduledAt) > new Date()
        ).length
      }, 0),
      pendingMessages: caseData.reduce((sum, c) => {
        return sum + c.chatRooms.filter(room => 
          room.lastMessage?.senderType === 'attorney' && 
          !room.lastMessage?.isRead
        ).length
      }, 0)
    }

    // Translate attorney messages and status text to plaintiff's preferred language
    const plaintiffLang = getPlaintiffLanguage(req)
    let outputCases = caseData
    if (plaintiffLang !== 'en') {
      outputCases = await Promise.all(
        caseData.map(async (c) => {
          const chatRooms = await Promise.all(
            (c.chatRooms || []).map(async (room: any) => {
              const last = room.lastMessage
              if (last?.senderType === 'attorney' && last?.content) {
                const content = await translateForPlaintiff(last.content, plaintiffLang)
                return { ...room, lastMessage: { ...last, content } }
              }
              return room
            })
          )
          const t = STATUS_TRANSLATIONS[plaintiffLang]
          const p = PROGRESS_LABELS[plaintiffLang]
          const noteEmpty = SETTLEMENT_NOTE[plaintiffLang]
          const noteEst = SETTLEMENT_NOTE_EST[plaintiffLang]
          return {
            ...c,
            chatRooms,
            transparency: c.transparency ? {
              ...c.transparency,
              plainEnglish: t?.[c.status]?.plain ?? c.transparency.plainEnglish,
              nextUpdate: t?.[c.status]?.next ?? c.transparency.nextUpdate,
              progressItems: c.transparency.progressItems?.map((item: any) => ({
                ...item,
                label: p?.[item.label] ?? item.label
              })),
              settlementExpectation: c.transparency.settlementExpectation ? {
                ...c.transparency.settlementExpectation,
                note: c.transparency.settlementExpectation.median === 0
                  ? (noteEmpty ?? c.transparency.settlementExpectation.note)
                  : (noteEst ?? c.transparency.settlementExpectation.note)
              } : c.transparency.settlementExpectation
            } : c.transparency
          }
        })
      )
    }

    res.json({
      summary,
      cases: outputCases
    })
  } catch (error) {
    logger.error('Failed to get case dashboard', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/case/:id/command-center', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      select: { id: true },
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    const summary = await buildCaseCommandCenter({ assessmentId: assessment.id })
    res.json(summary)
  } catch (error: any) {
    logger.error('Failed to get case command center', { error: error.message, assessmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get specific case details
router.get('/case/:caseId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const userId = req.user!.id

    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: caseId,
        userId 
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            viability: true,
            bands: true,
            explain: true,
            createdAt: true
          }
        },
        appointments: {
          orderBy: { scheduledAt: 'asc' },
          select: caseTrackerAppointmentSelect
        },
        chatRooms: {
          select: caseTrackerChatRoomDetailSelect
        },
        demandLetters: {
          orderBy: { createdAt: 'desc' },
          select: caseTrackerDemandLetterSelect
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: caseTrackerFileSelect
        }
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    // Parse JSON fields
    const facts = JSON.parse(assessment.facts)
    const predictions = assessment.predictions.map(pred => ({
      ...pred,
      viability: JSON.parse(pred.viability),
      bands: JSON.parse(pred.bands),
      explain: JSON.parse(pred.explain)
    }))

    const statusInfo = statusDescriptions[assessment.status] || statusDescriptions.DRAFT
    const progressItems = buildProgressItems(assessment, assessment.appointments, assessment.files, assessment.demandLetters)
    const settlementExpectation = buildSettlementExpectation(predictions[0])
    let caseDetails: any = {
      id: assessment.id,
      claimType: assessment.claimType,
      venue: {
        state: assessment.venueState,
        county: assessment.venueCounty
      },
      status: assessment.status,
      facts,
      predictions,
      appointments: assessment.appointments,
      chatRooms: assessment.chatRooms.map(room => ({
        ...room,
        messages: [...room.messages].reverse()
      })),
      demandLetters: assessment.demandLetters,
      files: assessment.files,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      transparency: {
        statusSummary: assessment.status.replace('_', ' '),
        plainEnglish: statusInfo.plain,
        nextUpdate: statusInfo.next,
        progressPercent: statusInfo.progress,
        progressItems,
        settlementExpectation
      }
    }

    // Translate attorney messages and status text to plaintiff's preferred language
    const plaintiffLang = getPlaintiffLanguage(req)
    if (plaintiffLang !== 'en') {
      const t = STATUS_TRANSLATIONS[plaintiffLang]
      const p = PROGRESS_LABELS[plaintiffLang]
      const noteEmpty = SETTLEMENT_NOTE[plaintiffLang]
      const noteEst = SETTLEMENT_NOTE_EST[plaintiffLang]
      caseDetails = {
        ...caseDetails,
        chatRooms: await Promise.all(
          caseDetails.chatRooms.map(async (room: any) => ({
            ...room,
            messages: await Promise.all(
              (room.messages || []).map(async (m: any) => {
                if (m.senderType === 'attorney' && m.content) {
                  const content = await translateForPlaintiff(m.content, plaintiffLang)
                  return { ...m, content }
                }
                return m
              })
            )
          }))
        ),
        transparency: {
          ...caseDetails.transparency,
          plainEnglish: t?.[assessment.status]?.plain ?? statusInfo.plain,
          nextUpdate: t?.[assessment.status]?.next ?? statusInfo.next,
          progressItems: progressItems.map((item: any) => ({
            ...item,
            label: p?.[item.label] ?? item.label
          })),
          settlementExpectation: {
            ...settlementExpectation,
            note: settlementExpectation.median === 0
              ? (noteEmpty ?? settlementExpectation.note)
              : (noteEst ?? settlementExpectation.note)
          }
        }
      }
    }

    res.json(caseDetails)
  } catch (error) {
    logger.error('Failed to get case details', { error, caseId: req.params.caseId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update case status
router.put('/case/:caseId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const parsed = CaseUpdate.safeParse(req.body)
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    // Verify user owns this case
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: caseId,
        userId: req.user!.id 
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    const updateData: any = {}
    if (parsed.data.status) updateData.status = parsed.data.status

    const updatedAssessment = await prisma.assessment.update({
      where: { id: caseId },
      data: updateData
    })

    logger.info('Case status updated', { 
      caseId,
      userId: req.user!.id,
      newStatus: parsed.data.status
    })

    res.json({
      caseId: updatedAssessment.id,
      status: updatedAssessment.status,
      updatedAt: updatedAssessment.updatedAt
    })
  } catch (error) {
    logger.error('Failed to update case status', { error, caseId: req.params.caseId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get case timeline/activity
router.get('/case/:caseId/timeline', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const userId = req.user!.id

    // Verify user owns this case
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: caseId,
        userId 
      },
      select: caseTrackerTimelineAssessmentSelect
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    // Get all related activities
    const [
      predictions,
      appointments,
      demandLetters,
      files,
      chatRooms
    ] = await Promise.all([
      prisma.prediction.findMany({
        where: { assessmentId: caseId },
        select: caseTrackerTimelinePredictionSelect,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.appointment.findMany({
        where: { assessmentId: caseId },
        select: caseTrackerTimelineAppointmentSelect,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.demandLetter.findMany({
        where: { assessmentId: caseId },
        select: caseTrackerTimelineDemandLetterSelect,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.file.findMany({
        where: { assessmentId: caseId },
        select: caseTrackerTimelineFileSelect,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.chatRoom.findMany({
        where: { assessmentId: caseId },
        select: caseTrackerTimelineChatRoomSelect,
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Create timeline events
    const timeline = [
      {
        id: `assessment-${assessment.id}`,
        type: 'assessment_created',
        title: 'Case Assessment Created',
        description: `${assessment.claimType} case in ${assessment.venueState}`,
        date: assessment.createdAt,
        status: 'completed'
      }
    ]

    // Add prediction events
    predictions.forEach(pred => {
      timeline.push({
        id: `prediction-${pred.id}`,
        type: 'prediction_generated',
        title: 'Case Analysis Completed',
        description: 'AI prediction and viability assessment generated',
        date: pred.createdAt,
        status: 'completed'
      })
    })

    // Add appointment events
    appointments.forEach(apt => {
      timeline.push({
        id: `appointment-${apt.id}`,
        type: 'appointment_scheduled',
        title: `Consultation with ${apt.attorney.name}`,
        description: `${apt.type} consultation scheduled`,
        date: apt.scheduledAt,
        status: apt.status.toLowerCase()
      })
    })

    // Add demand letter events
    demandLetters.forEach(demand => {
      timeline.push({
        id: `demand-${demand.id}`,
        type: 'demand_letter_created',
        title: 'Demand Letter Generated',
        description: `Demand for $${demand.targetAmount.toLocaleString()}`,
        date: demand.createdAt,
        status: demand.status.toLowerCase()
      })
    })

    // Add file upload events
    files.forEach(file => {
      timeline.push({
        id: `file-${file.id}`,
        type: 'document_uploaded',
        title: 'Document Uploaded',
        description: file.originalName,
        date: file.createdAt,
        status: 'completed'
      })
    })

    // Add chat events
    chatRooms.forEach(room => {
      if (room._count.messages > 0) {
        timeline.push({
          id: `chat-${room.id}`,
          type: 'conversation_started',
          title: `Started conversation with ${room.attorney.name}`,
          description: 'Initial consultation chat',
          date: room.createdAt,
          status: 'active'
        })
      }
    })

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    res.json(timeline)
  } catch (error) {
    logger.error('Failed to get case timeline', { error, caseId: req.params.caseId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
