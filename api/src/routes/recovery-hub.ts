import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'

const router = Router()

const RecoveryEntry = z.object({
  type: z.enum(['appointment', 'pt_session', 'prescription', 'pain_level', 'milestone']),
  date: z.string().datetime(),
  description: z.string(),
  provider: z.string().optional(),
  location: z.string().optional(),
  painLevel: z.number().min(1).max(10).optional(),
  medication: z.string().optional(),
  dosage: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.string().optional() // JSON for additional data
})

const ProgressGoal = z.object({
  title: z.string(),
  description: z.string(),
  targetDate: z.string().datetime(),
  category: z.enum(['pain_reduction', 'mobility', 'strength', 'endurance', 'functionality']),
  targetValue: z.number().optional(),
  unit: z.string().optional()
})

// Get user's recovery dashboard
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // Get recovery entries for the last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // In a real app, this would query a recovery_entries table
    // For now, return mock data
    const mockRecoveryData = {
      summary: {
        totalAppointments: 12,
        totalPTSessions: 24,
        currentPainLevel: 4,
        averagePainLevel: 5.2,
        recoveryProgress: 68,
        daysSinceInjury: 45,
        nextAppointment: '2024-02-15T10:00:00Z',
        treatmentPlanCompletion: 75
      },
      recentEntries: [
        {
          id: 'entry_1',
          type: 'pt_session',
          date: '2024-02-10T14:00:00Z',
          description: 'Physical therapy session - shoulder mobility',
          provider: 'Dr. Sarah Johnson, PT',
          location: 'Premier Physical Therapy',
          notes: 'Good progress on range of motion exercises',
          painLevel: 4
        },
        {
          id: 'entry_2',
          type: 'appointment',
          date: '2024-02-08T09:00:00Z',
          description: 'Follow-up with orthopedic surgeon',
          provider: 'Dr. Michael Chen, MD',
          location: 'City Medical Center',
          notes: 'X-rays show healing progress. Continue current treatment plan.',
          painLevel: 5
        },
        {
          id: 'entry_3',
          type: 'prescription',
          date: '2024-02-05T16:30:00Z',
          description: 'Pain medication refill',
          medication: 'Ibuprofen 800mg',
          dosage: 'Take 1 tablet every 8 hours as needed',
          notes: 'Reducing frequency as pain decreases'
        },
        {
          id: 'entry_4',
          type: 'pain_level',
          date: '2024-02-10T20:00:00Z',
          painLevel: 3,
          description: 'Evening pain assessment',
          notes: 'Significant improvement after PT session'
        }
      ],
      goals: [
        {
          id: 'goal_1',
          title: 'Reduce pain to level 3 or below',
          description: 'Achieve consistent pain levels of 3/10 or lower',
          category: 'pain_reduction',
          targetDate: '2024-03-01T00:00:00Z',
          targetValue: 3,
          unit: '/10',
          progress: 75,
          status: 'on_track'
        },
        {
          id: 'goal_2',
          title: 'Full shoulder mobility',
          description: 'Restore complete range of motion in injured shoulder',
          category: 'mobility',
          targetDate: '2024-03-15T00:00:00Z',
          progress: 60,
          status: 'on_track'
        },
        {
          id: 'goal_3',
          title: 'Return to work',
          description: 'Resume normal work duties without restrictions',
          category: 'functionality',
          targetDate: '2024-04-01T00:00:00Z',
          progress: 40,
          status: 'in_progress'
        }
      ],
      milestones: [
        {
          id: 'milestone_1',
          title: 'First pain-free day',
          date: '2024-01-25T00:00:00Z',
          description: 'Achieved first day with pain level below 4',
          category: 'pain_reduction'
        },
        {
          id: 'milestone_2',
          title: 'Completed 20 PT sessions',
          date: '2024-02-08T00:00:00Z',
          description: 'Reached 20 physical therapy sessions milestone',
          category: 'treatment'
        }
      ]
    }

    res.json(mockRecoveryData)
  } catch (error) {
    logger.error('Failed to get recovery dashboard', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add recovery entry
router.post('/entries', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = RecoveryEntry.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const userId = req.user!.id
    const entryData = parsed.data

    // In a real app, this would create a record in recovery_entries table
    const mockEntry = {
      id: `entry_${Date.now()}`,
      userId,
      ...entryData,
      createdAt: new Date().toISOString()
    }

    logger.info('Recovery entry created', { 
      userId,
      entryType: entryData.type,
      entryId: mockEntry.id
    })

    res.status(201).json({
      entry: mockEntry,
      message: 'Recovery entry added successfully'
    })
  } catch (error) {
    logger.error('Failed to create recovery entry', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get recovery entries
router.get('/entries', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, startDate, endDate, limit = 50 } = req.query
    const userId = req.user!.id

    // In a real app, this would query the recovery_entries table with filters
    const mockEntries = [
      {
        id: 'entry_1',
        type: 'pt_session',
        date: '2024-02-10T14:00:00Z',
        description: 'Physical therapy session - shoulder mobility',
        provider: 'Dr. Sarah Johnson, PT',
        location: 'Premier Physical Therapy',
        notes: 'Good progress on range of motion exercises',
        painLevel: 4,
        createdAt: '2024-02-10T14:30:00Z'
      },
      {
        id: 'entry_2',
        type: 'appointment',
        date: '2024-02-08T09:00:00Z',
        description: 'Follow-up with orthopedic surgeon',
        provider: 'Dr. Michael Chen, MD',
        location: 'City Medical Center',
        notes: 'X-rays show healing progress. Continue current treatment plan.',
        painLevel: 5,
        createdAt: '2024-02-08T09:30:00Z'
      }
    ]

    let filteredEntries = mockEntries

    if (type) {
      filteredEntries = filteredEntries.filter(entry => entry.type === type)
    }

    res.json({
      entries: filteredEntries.slice(0, parseInt(limit as string)),
      total: filteredEntries.length,
      hasMore: filteredEntries.length > parseInt(limit as string)
    })
  } catch (error) {
    logger.error('Failed to get recovery entries', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create recovery goal
router.post('/goals', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = ProgressGoal.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const userId = req.user!.id
    const goalData = parsed.data

    // In a real app, this would create a record in recovery_goals table
    const mockGoal = {
      id: `goal_${Date.now()}`,
      userId,
      ...goalData,
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    }

    logger.info('Recovery goal created', { 
      userId,
      goalTitle: goalData.title,
      goalId: mockGoal.id
    })

    res.status(201).json({
      goal: mockGoal,
      message: 'Recovery goal created successfully'
    })
  } catch (error) {
    logger.error('Failed to create recovery goal', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get recovery goals
router.get('/goals', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // In a real app, this would query the recovery_goals table
    const mockGoals = [
      {
        id: 'goal_1',
        title: 'Reduce pain to level 3 or below',
        description: 'Achieve consistent pain levels of 3/10 or lower',
        category: 'pain_reduction',
        targetDate: '2024-03-01T00:00:00Z',
        targetValue: 3,
        unit: '/10',
        progress: 75,
        status: 'on_track',
        createdAt: '2024-01-15T00:00:00Z'
      },
      {
        id: 'goal_2',
        title: 'Full shoulder mobility',
        description: 'Restore complete range of motion in injured shoulder',
        category: 'mobility',
        targetDate: '2024-03-15T00:00:00Z',
        progress: 60,
        status: 'on_track',
        createdAt: '2024-01-15T00:00:00Z'
      }
    ]

    res.json({
      goals: mockGoals,
      total: mockGoals.length
    })
  } catch (error) {
    logger.error('Failed to get recovery goals', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get pain level trends
router.get('/pain-trends', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { days = 30 } = req.query
    const userId = req.user!.id

    // In a real app, this would query pain level entries and calculate trends
    const mockTrends = {
      dailyAverages: [
        { date: '2024-01-15', average: 7.5 },
        { date: '2024-01-16', average: 7.2 },
        { date: '2024-01-17', average: 6.8 },
        { date: '2024-01-18', average: 6.5 },
        { date: '2024-01-19', average: 6.2 },
        { date: '2024-01-20', average: 5.9 },
        { date: '2024-01-21', average: 5.6 },
        { date: '2024-01-22', average: 5.4 },
        { date: '2024-01-23', average: 5.1 },
        { date: '2024-01-24', average: 4.8 },
        { date: '2024-01-25', average: 4.5 },
        { date: '2024-01-26', average: 4.3 },
        { date: '2024-01-27', average: 4.1 },
        { date: '2024-01-28', average: 3.9 },
        { date: '2024-01-29', average: 3.7 },
        { date: '2024-01-30', average: 3.5 },
        { date: '2024-01-31', average: 3.3 },
        { date: '2024-02-01', average: 3.2 },
        { date: '2024-02-02', average: 3.0 },
        { date: '2024-02-03', average: 2.9 },
        { date: '2024-02-04', average: 2.8 },
        { date: '2024-02-05', average: 2.7 },
        { date: '2024-02-06', average: 2.6 },
        { date: '2024-02-07', average: 2.5 },
        { date: '2024-02-08', average: 2.4 },
        { date: '2024-02-09', average: 2.3 },
        { date: '2024-02-10', average: 2.2 }
      ],
      weeklyTrends: [
        { week: 'Week 1', average: 7.2, trend: 'stable' },
        { week: 'Week 2', average: 6.1, trend: 'improving' },
        { week: 'Week 3', average: 5.3, trend: 'improving' },
        { week: 'Week 4', average: 4.2, trend: 'improving' },
        { week: 'Week 5', average: 3.4, trend: 'improving' },
        { week: 'Week 6', average: 2.8, trend: 'improving' },
        { week: 'Week 7', average: 2.2, trend: 'improving' }
      ],
      insights: [
        'Pain levels have decreased by 71% over the past 7 weeks',
        'Most significant improvement occurred in weeks 3-4',
        'Current trend suggests reaching target pain level within 2 weeks',
        'PT sessions appear to be most effective on Tuesdays and Thursdays'
      ]
    }

    res.json(mockTrends)
  } catch (error) {
    logger.error('Failed to get pain trends', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get treatment recommendations
router.get('/recommendations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    // In a real app, this would use ML to analyze recovery data and provide recommendations
    const mockRecommendations = {
      immediate: [
        {
          type: 'exercise',
          title: 'Continue daily stretching routine',
          description: 'Your flexibility has improved 15% this week. Maintain current routine.',
          priority: 'high',
          estimatedTime: '15 minutes'
        },
        {
          type: 'medication',
          title: 'Consider reducing pain medication frequency',
          description: 'Pain levels below 3 suggest you may be able to reduce medication.',
          priority: 'medium',
          estimatedTime: '5 minutes'
        }
      ],
      weekly: [
        {
          type: 'appointment',
          title: 'Schedule follow-up with physical therapist',
          description: 'Discuss progress and adjust treatment plan based on recent improvements.',
          priority: 'high',
          estimatedTime: '30 minutes'
        },
        {
          type: 'activity',
          title: 'Gradually increase daily activities',
          description: 'Consider adding light household tasks to build endurance.',
          priority: 'medium',
          estimatedTime: '20 minutes'
        }
      ],
      longTerm: [
        {
          type: 'goal',
          title: 'Set new mobility target',
          description: 'Consider setting a goal for returning to recreational activities.',
          priority: 'low',
          estimatedTime: '10 minutes'
        }
      ]
    }

    res.json(mockRecommendations)
  } catch (error) {
    logger.error('Failed to get treatment recommendations', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
