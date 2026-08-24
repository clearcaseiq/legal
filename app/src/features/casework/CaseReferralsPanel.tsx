import { useMemo } from 'react'
import ReferralFeeSplitSections from '../../components/ReferralFeeSplitSections'
import { useAttorneyFinanceCollaboration } from '../../hooks/useAttorneyFinanceCollaboration'
import { getStoredUser } from '../../lib/auth'

/**
 * Case sharing, referral fee splits, and co-counsel workflows for one case.
 *
 * Identity is read from storage rather than the workspace context so the panel
 * stays usable wherever the case workspace is mounted. It is only used to
 * decide whether the signed-in attorney is the recipient of a share/referral
 * and therefore sees Accept/Decline; the server re-checks on every action.
 */
export default function CaseReferralsPanel({ leadId }: { leadId: string }) {
  const fc = useAttorneyFinanceCollaboration(leadId)

  const identity = useMemo(() => {
    const attorney = getStoredUser<{ id?: string; email?: string }>('attorney')
    const user = getStoredUser<{ email?: string }>('user')
    return {
      attorneyId: attorney?.id ?? null,
      email: attorney?.email || user?.email || null,
    }
  }, [])

  return (
    <ReferralFeeSplitSections
      caseShareForm={fc.caseShareForm}
      setCaseShareForm={fc.setCaseShareForm}
      handleCreateCaseShare={fc.handleCreateCaseShare}
      caseShareMessage={fc.caseShareMessage}
      caseShares={fc.caseShares}
      currentUserEmail={identity.email}
      currentAttorneyId={identity.attorneyId}
      handleAcceptCaseShare={fc.handleAcceptCaseShare}
      handleDeclineCaseShare={fc.handleDeclineCaseShare}
      referralForm={fc.referralForm}
      setReferralForm={fc.setReferralForm}
      handleCreateReferral={fc.handleCreateReferral}
      referralMessage={fc.referralMessage}
      referrals={fc.referrals}
      handleAcceptReferral={fc.handleAcceptReferral}
      handleDeclineReferral={fc.handleDeclineReferral}
      coCounselForm={fc.coCounselForm}
      setCoCounselForm={fc.setCoCounselForm}
      handleCreateCoCounselWorkflow={fc.handleCreateCoCounselWorkflow}
      coCounselMessage={fc.coCounselMessage}
      coCounselWorkflows={fc.coCounselWorkflows}
      handleAcceptCoCounsel={fc.handleAcceptCoCounsel}
      handleDeclineCoCounsel={fc.handleDeclineCoCounsel}
    />
  )
}
