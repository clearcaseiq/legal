import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { FavoriteAttorneyRequest } from '../lib/validators'
import { authMiddleware, AuthRequest } from '../lib/auth'

const router = Router()

// Get user's favorite attorneys
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const favorites = await prisma.favoriteAttorney.findMany({
      where: { userId: req.user!.id },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            specialties: true,
            venues: true,
            meta: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse JSON fields
    const formattedFavorites = favorites.map(fav => ({
      id: fav.id,
      attorney: {
        ...fav.attorney,
        specialties: JSON.parse(fav.attorney.specialties),
        venues: JSON.parse(fav.attorney.venues),
        meta: fav.attorney.meta ? JSON.parse(fav.attorney.meta) : null
      },
      notes: fav.notes,
      createdAt: fav.createdAt
    }))

    res.json(formattedFavorites)
  } catch (error) {
    logger.error('Failed to get favorite attorneys', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to get favorite attorneys' })
  }
})

// Add attorney to favorites
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = FavoriteAttorneyRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid favorite data', 
        details: parsed.error.flatten() 
      })
    }

    const { attorneyId, notes } = parsed.data

    // Check if attorney exists
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Check if already favorited
    const existing = await prisma.favoriteAttorney.findUnique({
      where: {
        userId_attorneyId: {
          userId: req.user!.id,
          attorneyId
        }
      }
    })

    if (existing) {
      return res.status(409).json({ error: 'Attorney already in favorites' })
    }

    // Add to favorites
    const favorite = await prisma.favoriteAttorney.create({
      data: {
        userId: req.user!.id,
        attorneyId,
        notes
      },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            specialties: true,
            venues: true,
            meta: true,
            isActive: true
          }
        }
      }
    })

    // Parse JSON fields
    const formattedFavorite = {
      id: favorite.id,
      attorney: {
        ...favorite.attorney,
        specialties: JSON.parse(favorite.attorney.specialties),
        venues: JSON.parse(favorite.attorney.venues),
        meta: favorite.attorney.meta ? JSON.parse(favorite.attorney.meta) : null
      },
      notes: favorite.notes,
      createdAt: favorite.createdAt
    }

    logger.info('Attorney added to favorites', { 
      userId: req.user!.id, 
      attorneyId,
      favoriteId: favorite.id 
    })

    res.status(201).json(formattedFavorite)
  } catch (error) {
    logger.error('Failed to add favorite attorney', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to add favorite attorney' })
  }
})

// Update favorite attorney notes
router.put('/:favoriteId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { favoriteId } = req.params
    const { notes } = req.body

    const favorite = await prisma.favoriteAttorney.findFirst({
      where: {
        id: favoriteId,
        userId: req.user!.id
      }
    })

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' })
    }

    const updated = await prisma.favoriteAttorney.update({
      where: { id: favoriteId },
      data: { notes },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            specialties: true,
            venues: true,
            meta: true,
            isActive: true
          }
        }
      }
    })

    // Parse JSON fields
    const formattedFavorite = {
      id: updated.id,
      attorney: {
        ...updated.attorney,
        specialties: JSON.parse(updated.attorney.specialties),
        venues: JSON.parse(updated.attorney.venues),
        meta: updated.attorney.meta ? JSON.parse(updated.attorney.meta) : null
      },
      notes: updated.notes,
      createdAt: updated.createdAt
    }

    logger.info('Favorite attorney updated', { 
      userId: req.user!.id, 
      favoriteId,
      attorneyId: updated.attorneyId 
    })

    res.json(formattedFavorite)
  } catch (error) {
    logger.error('Failed to update favorite attorney', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to update favorite attorney' })
  }
})

// Remove attorney from favorites
router.delete('/:favoriteId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { favoriteId } = req.params

    const favorite = await prisma.favoriteAttorney.findFirst({
      where: {
        id: favoriteId,
        userId: req.user!.id
      }
    })

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' })
    }

    await prisma.favoriteAttorney.delete({
      where: { id: favoriteId }
    })

    logger.info('Attorney removed from favorites', { 
      userId: req.user!.id, 
      favoriteId,
      attorneyId: favorite.attorneyId 
    })

    res.json({ message: 'Attorney removed from favorites' })
  } catch (error) {
    logger.error('Failed to remove favorite attorney', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to remove favorite attorney' })
  }
})

export default router
