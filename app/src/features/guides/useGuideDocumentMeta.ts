import { useEffect } from 'react'

/**
 * Keeps title, description and canonical right after a client-side navigation.
 * The server sets all three from `[[...slug]].tsx` on a cold load.
 */
export function useGuideDocumentMeta(title: string, description: string, path: string) {
  useEffect(() => {
    document.title = title
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta')
    meta.setAttribute('name', 'description')
    meta.setAttribute('content', description)
    if (!meta.parentElement) document.head.appendChild(meta)

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    canonical.setAttribute('href', `${window.location.origin}${path}`)
    if (!canonical.parentElement) document.head.appendChild(canonical)
  }, [title, description, path])
}
