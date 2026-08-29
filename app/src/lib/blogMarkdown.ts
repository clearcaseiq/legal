/** Escape HTML, then apply a small markdown subset admins can type in the editor. */
export function renderBlogMarkdown(source: string): string {
  const escaped = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const blocks = escaped.split(/\n{2,}/)
  return blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^### /.test(trimmed)) return `<h3>${inline(trimmed.slice(4))}</h3>`
      if (/^## /.test(trimmed)) return `<h2>${inline(trimmed.slice(3))}</h2>`
      if (/^# /.test(trimmed)) return `<h1>${inline(trimmed.slice(2))}</h1>`
      if (/^[-*] /.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .map((line) => line.replace(/^[-*] /, '').trim())
          .filter(Boolean)
          .map((item) => `<li>${inline(item)}</li>`)
          .join('')
        return `<ul>${items}</ul>`
      }
      return `<p>${inline(trimmed).replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
}
