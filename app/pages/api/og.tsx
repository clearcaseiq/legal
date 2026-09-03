import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

/**
 * Social share card, drawn per page from query params.
 *
 * Runs on the edge because `ImageResponse` renders with a WASM rasterizer that
 * the Node runtime cannot load. Output is immutable for a given title, so it is
 * cached hard: the same card is regenerated on every social scrape otherwise.
 */
export const config = { runtime: 'edge' }

const WIDTH = 1200
const HEIGHT = 630

const BRAND = '#1e3045'
const ACCENT = '#38bdf8'

function clamp(value: string | null, max: number) {
  if (!value) return ''
  const text = value.trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}\u2026`
}

export default function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = clamp(searchParams.get('title'), 110) || 'Know what your injury case is worth'
  const eyebrow = clamp(searchParams.get('eyebrow'), 48)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          backgroundColor: BRAND,
          backgroundImage: `radial-gradient(circle at 85% 12%, rgba(56,189,248,0.28) 0%, rgba(30,48,69,0) 55%)`,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: ACCENT,
                fontWeight: 600,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 70 ? 60 : 72,
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                width: 14,
                height: 44,
                borderRadius: 999,
                backgroundColor: ACCENT,
              }}
            />
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>ClearCaseIQ</div>
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.62)' }}>
            Legal technology — not a law firm
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        'Cache-Control': 'public, immutable, no-transform, s-maxage=31536000, max-age=31536000',
        // Every page points og:image here with its own title, so the library
        // turns into several hundred distinct URLs. robots.txt has to keep
        // `Allow: /api/og` or link previews stop rendering on Facebook, X and
        // iMessage, which also lets Google crawl them: Search Console was
        // holding 578 of these under "crawled, currently not indexed".
        //
        // A header is the way out where robots.txt is not. Preview scrapers do
        // not read X-Robots-Tag and still fetch the image; Google does, and
        // drops the URLs. Covers the /es and /zh cards too, which arrive here
        // with translated titles and are otherwise the same problem again.
        'X-Robots-Tag': 'noindex',
      },
    },
  )
}
