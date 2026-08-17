import { Link, type LinkProps } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { localizedPath } from '../data/localePathPairs'

/**
 * A `Link` that keeps the reader in the language they are reading.
 *
 * Used for in-page links whose target has a translation. Without it a reader on
 * a Spanish page follows a call to action straight into English, and the Spanish
 * pages have fewer links between them for a crawler to follow. Targets with no
 * translation pass through untouched, so this is safe to use for any internal
 * link.
 */
export default function LocaleLink({ to, ...rest }: LinkProps) {
  const { language } = useLanguage()
  const target = typeof to === 'string' ? localizedPath(to, language) : to
  return <Link to={target} {...rest} />
}
