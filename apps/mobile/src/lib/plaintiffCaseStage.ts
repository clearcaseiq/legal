import type { PlaintiffDocumentRequestRow } from './api'
import { colors } from '../theme/tokens'

type MissingDocItem = {
  key?: string | null
  label?: string | null
}

export type PlaintiffCaseStageSummary = {
  title: string
  detail: string
  icon:
    | 'checkmark-circle-outline'
    | 'shield-checkmark-outline'
    | 'trending-up-outline'
    | 'card-outline'
    | 'folder-open-outline'
  label: string
  isSet: boolean
  accent: string
  background: string
  border: string
}

export function buildPlaintiffCaseStageSummary(params: {
  documentRequests?: PlaintiffDocumentRequestRow[]
  missingDocs?: MissingDocItem[]
}): PlaintiffCaseStageSummary {
  const openRequestKeys = (params.documentRequests || [])
    .filter((request) => request.status !== 'completed')
    .flatMap((request) => (request.items || []).filter((item) => !item.fulfilled).map((item) => item.key))
  const missingDocKeys = (params.missingDocs || []).map((item) => item.key).filter(Boolean) as string[]
  const activeKeys = openRequestKeys.length > 0 ? openRequestKeys : missingDocKeys

  if (activeKeys.length === 0) {
    return {
      title: 'Ready for attorney review',
      detail: 'Your current file looks complete enough for the next attorney review pass. New asks will appear if anything else is needed.',
      icon: 'checkmark-circle-outline',
      label: 'other',
      isSet: false,
      accent: colors.success,
      background: colors.successMuted,
      border: colors.success + '33',
    }
  }

  if (activeKeys.includes('police_report')) {
    return {
      title: 'Building liability picture',
      detail: 'The next steps are focused on confirming what happened and strengthening early fault review.',
      icon: 'shield-checkmark-outline',
      label: 'police_report',
      isSet: true,
      accent: colors.primary,
      background: colors.primary + '10',
      border: colors.primary + '22',
    }
  }

  if (activeKeys.includes('medical_records') || activeKeys.includes('wage_loss') || activeKeys.includes('injury_photos')) {
    return {
      title: 'Updating damages review',
      detail: 'The next steps are focused on treatment, losses, and the strength of the value story.',
      icon: 'trending-up-outline',
      label: activeKeys.includes('injury_photos') ? 'injury_photos' : 'medical_records',
      isSet: !activeKeys.includes('injury_photos'),
      accent: colors.warning,
      background: colors.warningMuted,
      border: colors.warning + '33',
    }
  }

  if (activeKeys.includes('insurance')) {
    return {
      title: 'Confirming coverage path',
      detail: 'The next steps are focused on insurance details and who may be involved in payment or notice.',
      icon: 'card-outline',
      label: 'insurance',
      isSet: false,
      accent: colors.primaryDark,
      background: colors.primary + '10',
      border: colors.primary + '22',
    }
  }

  return {
    title: 'Completing file review',
    detail: 'The next steps are focused on filling remaining gaps before the next attorney review.',
    icon: 'folder-open-outline',
    label: 'other',
    isSet: false,
    accent: colors.textSecondary,
    background: colors.card,
    border: colors.border,
  }
}
