import { createAdminClient } from '@/lib/supabase/admin'
import { verifyReferralToken } from '@/lib/referrals/referral-token'

export interface ReferralInviteDetails {
  referrerName: string
  companyName: string
}

/**
 * Loads public referrer details for a signed referral token.
 */
export async function resolveReferralInvite(
  token: string
): Promise<ReferralInviteDetails | null> {
  const companyId = verifyReferralToken(token.trim())
  if (!companyId) return null

  const admin = createAdminClient()
  const { data: company, error } = await admin
    .from('companies')
    .select('legal_name, contact_name')
    .eq('id', companyId)
    .maybeSingle()

  if (error || !company) return null

  const companyName = company.legal_name?.trim() || 'Ramply'
  const referrerName = company.contact_name?.trim() || companyName

  return { referrerName, companyName }
}
