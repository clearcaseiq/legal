import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simple slug generator from firm name
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function linkAttorneysToFirms() {
  console.log('Linking attorneys to law firms...\n')

  // Get all attorney profiles with firm names
  const profiles = await prisma.attorneyProfile.findMany({
    where: {
      firmName: {
        not: null
      }
    },
    include: {
      attorney: true
    }
  })

  console.log(`Found ${profiles.length} attorney profiles with firm names\n`)

  const firmCache = new Map()
  let linkedCount = 0

  for (const profile of profiles) {
    const firmName = profile.firmName?.trim()
    if (!firmName) continue

    const key = firmName.toLowerCase()

    let firm = firmCache.get(key)

    if (!firm) {
      // Try to find existing law firm by name
      firm = await prisma.lawFirm.findFirst({
        where: { name: firmName }
      })

      if (!firm) {
        // Create new law firm
        const slug = slugify(firmName)

        firm = await prisma.lawFirm.create({
          data: {
            name: firmName,
            slug,
            primaryEmail: profile.attorney.email || null,
            phone: profile.attorney.phone || null,
            state: 'CA', // Default; can be extended later
          }
        })

        console.log(`✓ Created law firm: ${firmName} (id: ${firm.id})`)
      }

      firmCache.set(key, firm)
    }

    // Link attorney to firm if not already linked
    if (profile.attorney.lawFirmId !== firm.id) {
      await prisma.attorney.update({
        where: { id: profile.attorneyId },
        data: {
          lawFirmId: firm.id
        }
      })

      linkedCount++
      console.log(`  → Linked attorney ${profile.attorney.name} to firm ${firmName}`)
    }
  }

  console.log(`\n✅ Linked ${linkedCount} attorneys to law firms.`)

  await prisma.$disconnect()
}

linkAttorneysToFirms()
  .catch((e) => {
    console.error('Error linking attorneys to firms:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

