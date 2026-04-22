import OpenAI from 'openai'
import { logger } from '../lib/logger'
import { ENV } from '../env'
import { searchGroundedLegalContext } from '../lib/ml-service'

// Initialize OpenAI client (only if API key is available)
const openai = (ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY) 
  ? new OpenAI({
      apiKey: ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    })
  : null

export interface CaseAnalysisRequest {
  assessmentId: string
  caseData: {
    claimType: string
    venue: { state: string; county?: string }
    incident: {
      date?: string
      location?: string
      narrative?: string
      parties?: string[]
    }
    injuries?: any[]
    treatment?: any[]
    damages?: {
      med_charges?: number
      med_paid?: number
      wage_loss?: number
      services?: number
    }
    evidence?: any[]
  }
}

export interface CaseAnalysisResponse {
  assessmentId: string
  analysis: {
    caseStrength: {
      overall: number // 0-100
      liability: number
      causation: number
      damages: number
      evidence: number
    }
    keyIssues: string[]
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    estimatedValue: {
      low: number
      medium: number
      high: number
    }
    comparableCaseData: {
      count: number
      venueSignal: string
      outcomeDirection: string
      notableOutcomes: string[]
      inflationAdjusted: boolean
    }
    valuationBreakdown: {
      venueMultipliers: string[]
      damageSplits: {
        medical: number
        wages: number
        painSuffering: number
      }
      sensitivityScenarios: string[]
    }
    medicalChronology: {
      summary: string
      timeline: string[]
      providerGroups: string[]
      gapsAndRedFlags: string[]
    }
    demandPackage: {
      demandDraft: string
      damageSummary: string
      liabilityOutline: string
      attorneyEditable: boolean
    }
    expectedSettlementRange: {
      low: number
      mid: number
      high: number
      resolutionPaths: string[]
      timeToResolution: string
    }
    liabilityModel: {
      reasoning: string
      stateFaultRules: string
      scenarios: string[]
    }
    missingTreatmentAnalysis: {
      summary: string
      gaps: string[]
      redFlags: string[]
    }
    severityModel: {
      output: string
      surgeryFlags: string[]
      impairmentSignals: string[]
      lifetimeCareImplications: string
    }
    adjusterPrediction: {
      strategy: string
      riskIndicator: string
      frictionPoints: string[]
      counterPositions: string[]
    }
    timeline: string[]
    nextSteps: string[]
  }
  confidence: number
  analysisDate: string
}

export async function analyzeCaseWithChatGPT(request: CaseAnalysisRequest): Promise<CaseAnalysisResponse> {
  try {
    logger.info('Starting ChatGPT case analysis', { assessmentId: request.assessmentId })
    const caseData = normalizeCaseData(request.caseData)

    if (!openai) {
      logger.warn('OpenAI API key not configured, returning fallback analysis', { assessmentId: request.assessmentId })
      return createFallbackAnalysis(request.assessmentId, caseData)
    }

    const groundedContext = await loadGroundedContext(request.assessmentId, caseData)
    const prompt = createAnalysisPrompt(caseData, groundedContext)

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert legal analyst specializing in personal injury cases. You will analyze case data and provide comprehensive assessments including case strength, key issues, recommendations, and estimated settlement values. Always respond with valid JSON format as specified in the prompt.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from ChatGPT')
    }

    logger.info('ChatGPT analysis completed', { 
      assessmentId: request.assessmentId,
      tokensUsed: completion.usage?.total_tokens 
    })

    // Parse the JSON response
    try {
      const analysis = JSON.parse(responseText)
      return {
        assessmentId: request.assessmentId,
        analysis,
        confidence: 0.85, // Default confidence for GPT-4
        analysisDate: new Date().toISOString()
      }
    } catch (parseError) {
      logger.error('Failed to parse ChatGPT response', { 
        assessmentId: request.assessmentId,
        response: responseText,
        error: parseError 
      })
      
      // Return a fallback analysis if JSON parsing fails
      return createFallbackAnalysis(request.assessmentId, caseData)
    }

  } catch (error: any) {
    logger.error('ChatGPT analysis failed', { 
      assessmentId: request.assessmentId,
      error: error.message 
    })
    
    // Return a fallback analysis if ChatGPT fails
    return createFallbackAnalysis(request.assessmentId, normalizeCaseData(request.caseData))
  }
}

function normalizeCaseData(caseData: CaseAnalysisRequest['caseData']): CaseAnalysisRequest['caseData'] {
  return {
    ...caseData,
    incident: {
      ...caseData.incident,
      date: caseData.incident.date || new Date().toISOString().slice(0, 10),
      narrative: caseData.incident.narrative || 'Narrative not yet provided.',
    },
  }
}

async function loadGroundedContext(assessmentId: string, caseData: CaseAnalysisRequest['caseData']) {
  if (!ENV.ML_RETRIEVAL_ENABLED) return null

  const query = [
    formatClaimType(caseData.claimType),
    caseData.venue.county,
    caseData.venue.state,
    caseData.incident.narrative,
  ].filter(Boolean).join(' ')

  const response = await searchGroundedLegalContext({
    query,
    filters: {
      jurisdiction: caseData.venue.state,
      claim_type: caseData.claimType,
    },
    topK: ENV.ML_RETRIEVAL_TOP_K,
  })

  if (!response?.matches?.length) {
    logger.info('No grounded legal context found for case analysis', { assessmentId })
    return null
  }

  return response
}

function formatClaimType(claimType?: string) {
  return (claimType || 'personal injury').replace(/_/g, ' ')
}

function createAnalysisPrompt(
  caseData: CaseAnalysisRequest['caseData'],
  groundedContext?: Awaited<ReturnType<typeof loadGroundedContext>> | null
): string {
  const groundingBlock = groundedContext?.matches?.length
    ? `

Grounded Legal Context:
${groundedContext.matches.map((match, index) => (
  `${index + 1}. ${match.title || 'Legal source'}${match.citation ? ` (${match.citation})` : ''} [${match.external_id}]
${match.excerpt}`
)).join('\n\n')}

Use the grounded legal context above before making assumptions. Reference its venue and outcome signals in your reasoning when relevant.
`
    : ''

  return `
Analyze the following personal injury case data and provide a comprehensive legal assessment. Respond with ONLY a valid JSON object in the following format:

{
  "caseStrength": {
    "overall": <number 0-100>,
    "liability": <number 0-100>,
    "causation": <number 0-100>,
    "damages": <number 0-100>,
    "evidence": <number 0-100>
  },
  "keyIssues": ["<issue1>", "<issue2>", "<issue3>"],
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<weakness1>", "<weakness2>", "<weakness3>"],
  "recommendations": ["<recommendation1>", "<recommendation2>", "<recommendation3>"],
  "estimatedValue": {
    "low": <number>,
    "medium": <number>,
    "high": <number>
  },
  "comparableCaseData": {
    "count": <number>,
    "venueSignal": "<short text>",
    "outcomeDirection": "<settlement-favored | trial-favored | mixed>",
    "notableOutcomes": ["<outcome1>", "<outcome2>"],
    "inflationAdjusted": <true|false>
  },
  "valuationBreakdown": {
    "venueMultipliers": ["<multiplier1>", "<multiplier2>"],
    "damageSplits": {
      "medical": <number>,
      "wages": <number>,
      "painSuffering": <number>
    },
    "sensitivityScenarios": ["<scenario1>", "<scenario2>"]
  },
  "medicalChronology": {
    "summary": "<short narrative>",
    "timeline": ["<event1>", "<event2>"],
    "providerGroups": ["<provider group1>", "<provider group2>"],
    "gapsAndRedFlags": ["<gap1>", "<gap2>"]
  },
  "demandPackage": {
    "demandDraft": "<short draft text>",
    "damageSummary": "<summary>",
    "liabilityOutline": "<outline>",
    "attorneyEditable": <true|false>
  },
  "expectedSettlementRange": {
    "low": <number>,
    "mid": <number>,
    "high": <number>,
    "resolutionPaths": ["<path1>", "<path2>"],
    "timeToResolution": "<estimate>"
  },
  "liabilityModel": {
    "reasoning": "<short reasoning>",
    "stateFaultRules": "<state rule summary>",
    "scenarios": ["<scenario1>", "<scenario2>"]
  },
  "missingTreatmentAnalysis": {
    "summary": "<short summary>",
    "gaps": ["<gap1>", "<gap2>"],
    "redFlags": ["<flag1>", "<flag2>"]
  },
  "severityModel": {
    "output": "<summary>",
    "surgeryFlags": ["<flag1>", "<flag2>"],
    "impairmentSignals": ["<signal1>", "<signal2>"],
    "lifetimeCareImplications": "<short summary>"
  },
  "adjusterPrediction": {
    "strategy": "<lowball | negotiate | litigate>",
    "riskIndicator": "<low | medium | high>",
    "frictionPoints": ["<point1>", "<point2>"],
    "counterPositions": ["<counter1>", "<counter2>"]
  },
  "timeline": ["<step1>", "<step2>", "<step3>"],
  "nextSteps": ["<action1>", "<action2>", "<action3>"]
}

Case Data:
- Claim Type: ${caseData.claimType}
- Venue: ${caseData.venue.state}${caseData.venue.county ? `, ${caseData.venue.county}` : ''}
- Incident Date: ${caseData.incident.date}
- Location: ${caseData.incident.location || 'Not specified'}
- Narrative: ${caseData.incident.narrative}
- Parties Involved: ${caseData.incident.parties?.join(', ') || 'Not specified'}
- Injuries: ${caseData.injuries?.length ? caseData.injuries.length + ' injuries reported' : 'No injuries specified'}
- Treatment: ${caseData.treatment?.length ? caseData.treatment.length + ' treatment records' : 'No treatment records'}
- Medical Charges: $${caseData.damages?.med_charges || 0}
- Medical Paid: $${caseData.damages?.med_paid || 0}
- Wage Loss: $${caseData.damages?.wage_loss || 0}
- Other Services: $${caseData.damages?.services || 0}
- Evidence Files: ${caseData.evidence?.length || 0} files
${groundingBlock}

Please provide a thorough legal analysis considering:
1. Liability assessment and fault determination
2. Causation between incident and injuries
3. Damages evaluation and documentation
4. Evidence strength and gaps
5. Jurisdictional considerations
6. Settlement value estimation based on similar cases
7. Strategic recommendations for case development

Focus on practical legal insights that would help an attorney evaluate and pursue this case effectively.
`
}

function createFallbackAnalysis(assessmentId: string, caseData: CaseAnalysisRequest['caseData']): CaseAnalysisResponse {
  logger.info('Creating fallback analysis', { assessmentId })
  
  return {
    assessmentId,
    analysis: {
      caseStrength: {
        overall: 50,
        liability: 50,
        causation: 50,
        damages: 50,
        evidence: 50
      },
      keyIssues: [
        'Insufficient case data for comprehensive analysis',
        'Evidence documentation needs review',
        'Medical causation requires further investigation'
      ],
      strengths: [
        'Case has been documented in the system',
        'Basic incident information is available'
      ],
      weaknesses: [
        'Limited medical documentation',
        'Insufficient evidence for liability determination',
        'Missing detailed witness statements'
      ],
      recommendations: [
        'Gather additional medical records and bills',
        'Obtain witness statements and police reports',
        'Consult with medical experts for causation',
        'Document all damages and expenses'
      ],
      estimatedValue: {
        low: 0,
        medium: 0,
        high: 0
      },
      comparableCaseData: {
        count: 0,
        venueSignal: 'Not available',
        outcomeDirection: 'mixed',
        notableOutcomes: [],
        inflationAdjusted: false
      },
      valuationBreakdown: {
        venueMultipliers: [],
        damageSplits: {
          medical: 0,
          wages: 0,
          painSuffering: 0
        },
        sensitivityScenarios: []
      },
      medicalChronology: {
        summary: 'No medical chronology available',
        timeline: [],
        providerGroups: [],
        gapsAndRedFlags: []
      },
      demandPackage: {
        demandDraft: 'Demand draft not available',
        damageSummary: 'Not available',
        liabilityOutline: 'Not available',
        attorneyEditable: false
      },
      expectedSettlementRange: {
        low: 0,
        mid: 0,
        high: 0,
        resolutionPaths: ['Settlement'],
        timeToResolution: 'Unknown'
      },
      liabilityModel: {
        reasoning: 'Not available',
        stateFaultRules: 'Not available',
        scenarios: []
      },
      missingTreatmentAnalysis: {
        summary: 'Not available',
        gaps: [],
        redFlags: []
      },
      severityModel: {
        output: 'Not available',
        surgeryFlags: [],
        impairmentSignals: [],
        lifetimeCareImplications: 'Not available'
      },
      adjusterPrediction: {
        strategy: 'lowball',
        riskIndicator: 'high',
        frictionPoints: [],
        counterPositions: []
      },
      timeline: [
        'Gather additional evidence',
        'Obtain medical records',
        'Consult with experts',
        'Prepare demand package'
      ],
      nextSteps: [
        'Schedule consultation with attorney',
        'Gather missing documentation',
        'Prepare comprehensive case file'
      ]
    },
    confidence: 0.3,
    analysisDate: new Date().toISOString()
  }
}
