import { useParams } from 'react-router-dom'
import AttorneyGuideArticle from '../features/guides/AttorneyGuideArticle'
import { useGuideDocumentMeta } from '../features/guides/useGuideDocumentMeta'
import { getAttorneyGuide } from '../data/attorneyGuides'
import {
  ATTORNEY_GUIDES_INDEX_DESCRIPTION,
  ATTORNEY_GUIDES_INDEX_TITLE,
  ATTORNEY_GUIDES_PATH,
  attorneyGuideMetaTitle,
  attorneyGuidePublicPath,
} from '../data/attorneyGuidesSeo'

/**
 * `/attorney-guides/:slug`: one public attorney guide. Rendered on the server;
 * the metadata and structured data come from `[[...slug]].tsx`. Unknown slugs
 * are sent back to the index by the article.
 */
export default function AttorneyGuidePage() {
  const { slug = '' } = useParams()
  const guide = getAttorneyGuide(slug)
  useGuideDocumentMeta(
    guide ? attorneyGuideMetaTitle(guide) : ATTORNEY_GUIDES_INDEX_TITLE,
    guide ? guide.summary : ATTORNEY_GUIDES_INDEX_DESCRIPTION,
    guide ? attorneyGuidePublicPath(guide.slug) : ATTORNEY_GUIDES_PATH
  )
  return <AttorneyGuideArticle mode="public" slug={slug} />
}
