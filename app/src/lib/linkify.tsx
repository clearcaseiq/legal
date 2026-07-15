import type { ReactNode } from 'react'

// Splits plain message text into nodes, turning http(s) URLs into clickable
// anchors. Used in chat threads so links an attorney/plaintiff sends (booking
// links, meeting URLs, upload portals) are tappable instead of dead text.
const URL_PATTERN = /(https?:\/\/[^\s]+)/g

export function linkify(text: string, linkClassName = 'underline break-all'): ReactNode[] {
  if (!text) return []
  return text.split(URL_PATTERN).map((part, i) => {
    URL_PATTERN.lastIndex = 0
    if (URL_PATTERN.test(part)) {
      // Trim trailing punctuation that commonly follows a URL in prose.
      const trailing = part.match(/[),.]+$/)?.[0] ?? ''
      const href = trailing ? part.slice(0, part.length - trailing.length) : part
      const shown = trailing ? part.slice(0, part.length - trailing.length) : part
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {shown}
          </a>
          {trailing}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}
