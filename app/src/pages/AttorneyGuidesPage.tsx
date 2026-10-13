import AttorneyGuidesIndex from '../features/guides/AttorneyGuidesIndex'
import { useGuideDocumentMeta } from '../features/guides/useGuideDocumentMeta'
import {
  ATTORNEY_GUIDES_INDEX_DESCRIPTION,
  ATTORNEY_GUIDES_INDEX_TITLE,
  ATTORNEY_GUIDES_PATH,
} from '../data/attorneyGuidesSeo'

/**
 * `/attorney-guides`: the public index of the attorney user guides. Rendered on
 * the server; the metadata and structured data come from `[[...slug]].tsx`.
 */
export default function AttorneyGuidesPage() {
  useGuideDocumentMeta(ATTORNEY_GUIDES_INDEX_TITLE, ATTORNEY_GUIDES_INDEX_DESCRIPTION, ATTORNEY_GUIDES_PATH)
  return <AttorneyGuidesIndex mode="public" />
}
