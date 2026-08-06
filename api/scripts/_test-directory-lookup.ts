import '../src/env'
import { prisma } from '../src/lib/prisma'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

async function fetchText(url: string): Promise<{ status: number; text: string } | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    return { status: res.status, text: await res.text() }
  } catch (e: any) {
    console.log(`  FETCH ERROR: ${e.message}`)
    return null
  }
}

async function main() {
  // Get a sample PI attorney with bar number
  const samples = await prisma.productionAttorney.findMany({
    where: { piRelevant: true, barNumber: { not: null }, barState: 'CA' },
    take: 3,
    select: { id: true, name: true, barNumber: true, city: true, firmName: true },
  })

  for (const atty of samples) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`Attorney: ${atty.name} | Bar#: ${atty.barNumber} | City: ${atty.city}`)
    console.log(`Firm: ${atty.firmName}`)
    console.log(`${'═'.repeat(60)}`)

    const nameParts = atty.name.toLowerCase().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]

    // Test Avvo patterns
    const avvoUrls = [
      `https://www.avvo.com/attorneys/california/${firstName}-${lastName}.html`,
      `https://www.avvo.com/search/lawyer_search?q=${encodeURIComponent(atty.name)}&loc=California`,
    ]
    for (const url of avvoUrls) {
      console.log(`\n  AVVO: ${url}`)
      const res = await fetchText(url)
      if (res) {
        console.log(`    Status: ${res.status} | Length: ${res.text.length}`)
        console.log(`    Contains bar#: ${res.text.includes(atty.barNumber!)}`)
        console.log(`    Contains name: ${res.text.toLowerCase().includes(lastName)}`)
        // Check for profile links
        const profileLinks = [...res.text.matchAll(/href="(https?:\/\/www\.avvo\.com\/attorneys\/[^"]+)"/gi)]
        if (profileLinks.length > 0) {
          console.log(`    Profile links found: ${profileLinks.length}`)
          profileLinks.slice(0, 3).forEach((m) => console.log(`      → ${m[1]}`))
        }
      }
    }

    // Test Justia patterns
    const justiaUrls = [
      `https://www.justia.com/lawyers/${firstName}-${lastName}-${atty.barNumber}`,
      `https://lawyers.justia.com/lawyer/${firstName}-${lastName}-${atty.barNumber}`,
    ]
    for (const url of justiaUrls) {
      console.log(`\n  JUSTIA: ${url}`)
      const res = await fetchText(url)
      if (res) {
        console.log(`    Status: ${res.status} | Length: ${res.text.length}`)
        console.log(`    Contains bar#: ${res.text.includes(atty.barNumber!)}`)
      }
    }

    // Test CalBar
    const calbarUrl = `https://apps.calbar.ca.gov/attorney/Licensee/Detail/${atty.barNumber}`
    console.log(`\n  CALBAR: ${calbarUrl}`)
    const calRes = await fetchText(calbarUrl)
    if (calRes) {
      console.log(`    Status: ${calRes.status} | Length: ${calRes.text.length}`)
      const snippet = calRes.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500)
      console.log(`    Snippet: ${snippet.slice(0, 300)}`)
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
