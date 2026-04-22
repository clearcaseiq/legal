/**
 * Renders consent/legal text as plain structured paragraphs (no innerHTML).
 */
export function ConsentDocumentBody({ content }: { content: string }) {
  const lines = content.trim().split('\n')
  return (
    <div className="space-y-2 text-ui-sm">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" aria-hidden />
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
        if (headingMatch) {
          const level = headingMatch[1].length
          const text = headingMatch[2]
          const cls =
            level <= 1
              ? 'text-base font-bold text-slate-900 dark:text-slate-100 mt-4'
              : level === 2
                ? 'text-sm font-semibold text-slate-900 dark:text-slate-100 mt-3'
                : 'text-sm font-medium text-slate-800 dark:text-slate-200 mt-2'
          return (
            <p key={i} className={cls}>
              {text}
            </p>
          )
        }
        if (trimmed.startsWith('- ')) {
          return (
            <p key={i} className="text-slate-700 dark:text-slate-300 pl-2 border-l-2 border-slate-200 dark:border-slate-600">
              {trimmed.slice(2)}
            </p>
          )
        }
        return (
          <p key={i} className="text-slate-700 dark:text-slate-300">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}
